我将按照GMX官方界面 (`gmx-interface`) 的架构，为你设计一个专业的K线行情展示方案。这个方案将严格遵循其**模块化、状态驱动**的设计哲学，并结合 `@gmx-io/sdk` 与价格API。

### 🧠 核心实现思路

我们的目标是构建一个可维护、高性能的K线图表。核心思路如下：

1.  **数据分层**：遵循官方仓库的 `domain`（类型/模型）、`lib`（数据获取）、`contexts`（状态管理）、`components`（UI展示）四层架构。
2.  **双数据源驱动**：
    *   **历史K线**：从GMX官方或第三方API获取。
    *   **实时报价**：从 `https://arbitrum-api.gmxinfra.io/prices/tickers` 轮询获取，并通过 `@gmx-io/sdk` 的工具函数进行校验和增强。
3.  **专业图表**：使用 `lightweight-charts` 库，它是金融级的高性能图表库，我们将封装其复杂配置。
4.  **状态管理**：使用React Context（模仿官方 `MarketContext`）来全局管理当前选中的市场和图表数据，实现跨组件通信。

### 📁 目录结构与代码实现

我们将创建以下目录结构，并填充关键文件：
```
src/
├── domain/
│   └── charts.ts          # 定义K线、图表相关的核心数据类型
├── lib/
│   └── prices.ts          # 封装所有价格数据获取的逻辑（历史K线+实时Tick）
├── contexts/
│   └── ChartContext.tsx   # 管理图表所需全局状态（如选中的时间周期）
├── components/
│   └── Charts/
│       ├── CandleChart.tsx # 主图表组件，集成lightweight-charts
│       ├── ChartLoader.tsx # 加载与错误状态组件
│       └── utils/
│           └── chartFormatters.ts # 图表数据转换工具函数
└── hooks/
    └── useCandleData.ts   # 获取和处理K线数据的核心Hook
```

#### **第一步：定义领域模型 (`src/domain/charts.ts`)**
这是类型安全的基石。
```typescript
// 定义单根K线数据点的结构
export interface CandleData {
    time: number; // 时间戳 (以秒计，Lightweight Charts要求)
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number; // 可选成交量
}

// 定义图表支持的解析度/时间周期
export type ChartResolution = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

// 定义从外部API获取的原始K线数据格式（示例，需根据实际API调整）
export interface RawCandleFromApi {
    timestamp: string; // ISO时间字符串
    o: string; // 开盘价
    h: string; // 最高价
    l: string; // 最低价
    c: string; // 收盘价
    v?: string; // 成交量
}
```

#### **第二步：数据获取层 (`src/lib/prices.ts`)**
这里封装所有数据获取逻辑，保持UI层清洁。
```typescript
import { CandleData, ChartResolution, RawCandleFromApi } from '../domain/charts';

/**
 * 获取历史K线数据
 * @param marketAddress 目标市场的合约地址
 * @param resolution 图表周期，如 '1H'
 * @param limit 获取的K线数量
 * @returns 处理后的CandleData数组
 */
export async function fetchCandleHistory(
    marketAddress: string,
    resolution: ChartResolution,
    limit: number = 100
): Promise<CandleData[]> {
    // 注意：GMX官方并未直接提供历史K线API，此处为示例。
    // 你需要连接一个K线数据供应商（如CoinGecko, Binance Public API）或后端服务。
    const exampleApiUrl = `https://your-candle-data-provider.com/klines?symbol=${marketAddress}&interval=${resolution}&limit=${limit}`;

    try {
        const response = await fetch(exampleApiUrl);
        const rawData: RawCandleFromApi[] = await response.json();

        // 将原始API数据转换为我们定义的CandleData格式
        return rawData.map(candle => ({
            time: Math.floor(new Date(candle.timestamp).getTime() / 1000), // 转为秒级时间戳
            open: parseFloat(candle.o),
            high: parseFloat(candle.h),
            low: parseFloat(candle.l),
            close: parseFloat(candle.c),
            volume: candle.v ? parseFloat(candle.v) : undefined,
        }));
    } catch (error) {
        console.error('获取K线历史数据失败:', error);
        throw new Error(`无法加载历史价格数据: ${error.message}`);
    }
}

/**
 * 获取实时报价（用于更新最新K线）
 * 此函数从GMX官方预言机API获取数据。
 * @returns 一个Promise，解析为所有市场的实时报价字典
 */
export async function fetchRealtimeTickers(): Promise<Record<string, any>> {
    const response = await fetch('https://arbitrum-api.gmxinfra.io/prices/tickers');
    if (!response.ok) throw new Error(`预言机API请求失败: ${response.status}`);
    const tickers = await response.json();
    // 转换为以市场地址为键的字典，便于查找
    const tickerMap: Record<string, any> = {};
    tickers.forEach((ticker: any) => {
        tickerMap[ticker.marketAddress] = ticker;
    });
    return tickerMap;
}
```

#### **第三步：核心数据Hook (`src/hooks/useCandleData.ts`)**
这是连接数据与UI的桥梁，负责状态管理和数据流。
```typescript
import { useState, useEffect, useCallback } from 'react';
import { CandleData, ChartResolution } from '../domain/charts';
import { fetchCandleHistory, fetchRealtimeTickers } from '../lib/prices';
import { useMarketContext } from '../contexts/MarketContext'; // 假设你有一个市场上下文

export function useCandleData(resolution: ChartResolution) {
    // 从全局上下文中获取当前选中的市场
    const { currentMarket } = useMarketContext();
    const [candles, setCandles] = useState<CandleData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 主函数：加载历史数据并初始化图表
    const loadHistory = useCallback(async () => {
        if (!currentMarket?.marketTokenAddress) return;
        setIsLoading(true);
        setError(null);
        try {
            const history = await fetchCandleHistory(
                currentMarket.marketTokenAddress,
                resolution,
                100
            );
            setCandles(history);
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentMarket?.marketTokenAddress, resolution]);

    // 副作用：当市场或周期改变时，重新加载历史数据
    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // 副作用：建立实时数据连接，用于更新最新的K线
    useEffect(() => {
        if (!currentMarket || candles.length === 0) return;
        const intervalId = setInterval(async () => {
            try {
                const tickers = await fetchRealtimeTickers();
                const currentTicker = tickers[currentMarket.marketTokenAddress];
                if (currentTicker) {
                    // 使用SDK工具函数获取有意义的实时价格
                    // import { getMidPrice } from '@gmx-io/sdk/utils/tokens';
                    // const currentPrice = getMidPrice({ minPrice: currentTicker.minPrice, maxPrice: currentTicker.maxPrice });
                    const currentPrice = (parseFloat(currentTicker.minPrice) + parseFloat(currentTicker.maxPrice)) / 2;
                    const currentTime = Math.floor(Date.now() / 1000);

                    setCandles(prevCandles => {
                        const lastCandle = prevCandles[prevCandles.length - 1];
                        const newCandles = [...prevCandles];

                        // 判断是否处于同一根K线周期内
                        const isSameCandle = currentTime < lastCandle.time + getResolutionInSeconds(resolution);
                        if (isSameCandle) {
                            // 更新当前K线
                            newCandles[newCandles.length - 1] = {
                                ...lastCandle,
                                high: Math.max(lastCandle.high, currentPrice),
                                low: Math.min(lastCandle.low, currentPrice),
                                close: currentPrice,
                            };
                        } else {
                            // 创建新的K线
                            newCandles.push({
                                time: currentTime,
                                open: lastCandle.close,
                                high: currentPrice,
                                low: currentPrice,
                                close: currentPrice,
                            });
                            // 保持数组长度，移除最老的数据
                            if (newCandles.length > 200) newCandles.shift();
                        }
                        return newCandles;
                    });
                }
            } catch (err) {
                console.error('实时价格更新失败:', err);
            }
        }, 2000); // 每2秒更新一次

        return () => clearInterval(intervalId);
    }, [currentMarket, candles, resolution]);

    return { candles, isLoading, error, refresh: loadHistory };
}

// 辅助函数：将周期字符串转换为秒数
function getResolutionInSeconds(resolution: ChartResolution): number {
    const unit = resolution.slice(-1);
    const value = parseInt(resolution.slice(0, -1));
    switch (unit) {
        case 'm': return value * 60;
        case 'H': return value * 3600;
        case 'D': return value * 86400;
        default: return 3600;
    }
}
```

#### **第四步：图表上下文 (`src/contexts/ChartContext.tsx`)**
管理图表相关的全局状态，如周期。
```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ChartResolution } from '../domain/charts';

interface ChartContextValue {
    resolution: ChartResolution;
    setResolution: (res: ChartResolution) => void;
}

const ChartContext = createContext<ChartContextValue | undefined>(undefined);

export function ChartProvider({ children }: { children: ReactNode }) {
    const [resolution, setResolution] = useState<ChartResolution>('1H');
    return (
        <ChartContext.Provider value={{ resolution, setResolution }}>
            {children}
        </ChartContext.Provider>
    );
}

export function useChartContext() {
    const context = useContext(ChartContext);
    if (!context) {
        throw new Error('useChartContext 必须在 ChartProvider 内部使用');
    }
    return context;
}
```

#### **第五步：主图表组件 (`src/components/Charts/CandleChart.tsx`)**
这是最核心的UI组件，集成 `lightweight-charts`。
```typescript
import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { useCandleData } from '../../hooks/useCandleData';
import { useChartContext } from '../../contexts/ChartContext';
import { ChartLoader } from './ChartLoader';
import { formatChartData } from './utils/chartFormatters';
import './CandleChart.css'; // 用于一些基础样式

export function CandleChart() {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    const { resolution } = useChartContext();
    const { candles, isLoading, error } = useCandleData(resolution);

    // 初始化图表
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 清理旧图表
        if (chartRef.current) {
            chartRef.current.remove();
        }

        // 创建新图表实例
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#0E0E0E' }, // 深色背景，专业风格
                textColor: '#D9D9D9',
            },
            grid: {
                vertLines: { color: '#2B2B2B' },
                horzLines: { color: '#2B2B2B' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 500,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#3A3A3A',
            },
            rightPriceScale: {
                borderColor: '#3A3A3A',
                scaleMargins: { top: 0.1, bottom: 0.1 }, // 给价格刻度留出边距
            },
        });

        chartRef.current = chart;

        // 添加蜡烛图系列
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });
        candlestickSeriesRef.current = candlestickSeries;

        // 响应容器大小变化
        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []); // 空依赖数组，仅初始化一次

    // 当数据或周期变化时，更新图表数据
    useEffect(() => {
        if (candlestickSeriesRef.current && candles.length > 0) {
            const formattedData: CandlestickData[] = formatChartData(candles);
            candlestickSeriesRef.current.setData(formattedData);
        }
    }, [candles]);

    // 当分辨率变化时，调整图表的时间刻度
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({
                timeScale: {
                    barSpacing: resolution === '1D' ? 10 : 6, // 根据周期调整K线间距
                }
            });
        }
    }, [resolution]);

    if (isLoading) return <ChartLoader type="loading" />;
    if (error) return <ChartLoader type="error" message={error} />;

    return <div ref={chartContainerRef} className="candle-chart-container" />;
}
```

### 🚀 如何使用
1.  **包裹根组件**：在应用最外层用 `ChartProvider` 包裹。
2.  **放置图表组件**：在需要展示K线的地方（如交易页面）使用 `<CandleChart />`。
3.  **控制周期**：在任意子组件中，调用 `useChartContext()` 获取 `{ resolution, setResolution }` 来控制图表周期。

### ⚠️ 重要注意事项
1.  **历史数据源**：上述代码中的 `fetchCandleHistory` **需要你连接真实的历史K线API**。GMX官方不直接提供此数据。你可以考虑：
    *   第三方金融API（如CoinAPI、Cryptowatch）。
    *   通过公共节点或The Graph索引链上事件自行计算（复杂）。
    *   后端服务聚合。
2.  **性能**：实时更新使用 `setInterval` 是为清晰起见。在生产环境中，可考虑使用WebSocket连接预言机以实现更低延迟。
3.  **样式**：`lightweight-charts` 的样式（颜色、字体等）可根据你的UI设计系统深度定制。

这个架构为你提供了一个坚实、可扩展的基础。如果你需要进一步的帮助，例如：
1.  实现**成交量子图**。
2.  添加**技术指标（如MA, Bollinger Bands）**。
3.  处理**多时间周期切换UI**。
4.  连接**具体的历史K线数据源**。

我可以为你提供相应模块的补充代码和实现思路。