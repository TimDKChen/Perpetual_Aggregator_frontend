User Interface (TradingView Chart)
┌───────────────────────────┐
│ TVChartContainer          │
│  - 初始化图表              │
│  - 请求历史 K 线           │
└───────────┬───────────────┘
            │ calls
            ▼
DataFeed (TV DataFeed Adapter)
┌───────────────────────────┐
│ getBars(symbol, resolution, periodParams) │
│  - 判断是 Stable Token 或普通Token │
│  - 计算 countBack & offset        │
│  - 调用 fetchCandles / getStableCandles │
└───────────┬─────────────────────┘
            │ async await
            ▼
OracleKeeperFetcher (SDK)
┌───────────────────────────┐
│ fetchCandles(symbol, period, limit) │
│  - 调用 request("/prices/candles") │
│  - 处理普通 Token 或 Chainlink 数据 fallback │
│  - parseOracleCandle() → 转换 raw 数组为 Bar │
└───────────┬─────────────────────┘
            │ async await
            ▼
OracleFallbackTracker
┌───────────────────────────┐
│ FallbackTracker (智能路由) │
│  - endpoints: 主节点 + fallback │
│  - checkEndpoint(): 健康检测 │
│  - selectNextPrimary(): 节点切换策略 │
│  - 返回可用 endpoints       │
└───────────┬─────────────────────┘
            │ fetch → HTTP Request
            ▼
OracleKeeper Backend / Chainlink GraphQL
┌───────────────────────────┐
│ OracleKeeper API           │
│  - /prices/candles         │
│  - 返回 OHLC Raw 数组       │
│    [[time, open, high, low, close], ...] │
└───────────┬─────────────────────┘
            │ JSON Response
            ▼
OracleKeeperFetcher
┌───────────────────────────┐
│ parseOracleCandle(rawCandle) │
│  - raw 数组 → {time, open, high, low, close} │
│  - 返回 FromOldToNewArray<Bar> │
└───────────┬─────────────────────┘
            │ Promise<Bar[]>
            ▼
DataFeed
┌───────────────────────────┐
│ barsToReturn (filtered by 'to' timestamp) │
│  - 乘以 visualMultiplier (单位转换) │
│  - 返回给 TVChartContainer 的 onResult │
└───────────┬─────────────────────┘
            ▼
TVChartContainer
┌───────────────────────────┐
│ TradingView Chart          │
│  - 接收 barsToReturn        │
│  - 绘制 OHLC K 线          │
└───────────────────────────┘
