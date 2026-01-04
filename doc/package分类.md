你现在的目标是 **只实现三个核心功能**：

1. **展示行情**（价格、K线、深度等）  
2. **连接钱包**（MetaMask、WalletConnect 等）  
3. **永续合约交易**（开仓、平仓、调整杠杆、订单、仓位管理）

下面我按 **“必须保留 / 可选 / 可以完全移除”** 三类给你精简 dependencies 和 devDependencies，帮你把 package.json 瘦身到最小可运行状态，同时保证功能完整、类型安全、构建正常。

### 一、必须保留的 dependencies（运行时必备）

这些是**核心功能直接依赖**，一个都不能删。

| 包名                               | 必须原因                                      | 所属功能          |
|------------------------------------|-----------------------------------------------|-------------------|
| react@18.2.0                       | React 核心                                    | 所有              |
| react-dom@18.2.0                   | DOM 渲染                                      | 所有              |
| ethers@6.12.1 或 viem@2.39.0        | 合约调用、签名、RPC 交互（任选其一，推荐 viem）| 钱包 + 永续       |
| wagmi@2.19.3                       | 钱包连接、账户管理、链切换 React Hooks        | 连接钱包          |
| @wagmi/connectors@6.1.4            | wagmi 实际连接器（MetaMask、WalletConnect 等）| 连接钱包          |
| @wagmi/core@2.22.1                  | wagmi 非 React 核心（wagmi 主包依赖它）       | 连接钱包          |
| @rainbow-me/rainbowkit@2.2.9       | 最美最全的钱包连接 UI 模态框                  | 连接钱包（强烈推荐保留） |
| @headlessui/react@1.7.19           | 无样式可访问性组件（Dropdown、Modal 等）      | UI 基础 + 行情选择 |
| recharts@2.12.7                    | 轻量图表库，用于展示价格走势、深度图等        | 展示行情          |
| tailwindcss@3.4.4                  | （虽然在 devDep，但运行时需要其生成 CSS）     | UI 样式           |

**推荐额外保留（强烈建议）**：
- **@tanstack/react-query@5.25.0**  
  数据缓存、自动刷新行情、仓位、订单状态，几乎所有 Web3 前端都用它。删了你会自己写一堆 useEffect。

**可以删但不推荐删**：
- framer-motion（动画） → 保留的话体验更好，删了也没问题。

### 二、可以完全移除的 dependencies（跟你目标无关）

这些包跟你现在的三个功能完全无关，可以安全删除。

| 包名                                     | 原因说明                              |
|------------------------------------------|---------------------------------------|
| @uniswap/sdk-core + @uniswap/v3-sdk      | 只用于现货 Swap 聚合路由              |
| @stargatefinance/stg-evm-sdk-v2 + @layerzerolabs/lz-v2-utilities | 跨链桥接（Stargate/LayerZero）        |
| @gelatonetwork/relay-sdk                 | Gasless 交易（relayer）               |
| @apollo/client + graphql                 | GraphQL 查询（通常用于 Subgraph）     |
| swr                                      | 和 react-query 重复，可删              |
| @lingui/* 全家桶                         | 国际化（多语言）                      |
| lodash / immer / reselect / use-context-selector | 状态优化工具（目前规模不需要）        |
| crypto-js / bigdecimal / bowser          | 辅助工具（精度、UA检测）非核心        |

### 三、devDependencies 精简建议

构建、类型检查、测试、代码质量相关，保留最少必要集合。

#### 必须保留（构建 + 类型安全）
- vite@^5.4.18  
- @vitejs/plugin-react@4.3.1  
- typescript  
- tsx@4.19.0（如果你要写 TS 脚本，如部署脚本）  
- tailwindcss@3.4.4 + postcss + autoprefixer  
- @types/react + @types/react-dom  

#### 强烈推荐保留（代码质量）
- eslint + eslint-plugin-react + eslint-plugin-react-hooks  
- prettier + prettier-plugin-tailwindcss  
- husky + lint-staged（提交时自动格式化 + lint）

#### 可以删除（短期目标不需要）
- vitest + happy-dom + @testing-library/*（单元测试）  
- rollup-plugin-visualizer / vite-bundle-analyzer（打包分析）  
- 所有 lingui 相关开发工具（如 @lingui/cli）

### 四、最终推荐的最小 dependencies 列表（仅实现你的三个功能）

```json
"dependencies": {
  "react": "18.2.0",
  "react-dom": "18.2.0",
  "viem": "2.39.0",                    // 推荐用 viem（更现代、类型更好）
  "wagmi": "2.19.3",
  "@wagmi/connectors": "6.1.4",
  "@wagmi/core": "2.22.1",
  "@rainbow-me/rainbowkit": "2.2.9",
  "@headlessui/react": "1.7.19",
  "@tanstack/react-query": "5.25.0",
  "recharts": "2.12.7",
  "framer-motion": "11.1.9"            // 可选，动画更好看
},

"devDependencies": {
  "vite": "^5.4.18",
  "@vitejs/plugin-react": "4.3.1",
  "typescript": "^5",
  "tailwindcss": "3.4.4",
  "postcss": "^8",
  "autoprefixer": "^10",
  "@types/react": "18.2.0",
  "@types/react-dom": "18.2.0",
  "eslint": "^8",
  "eslint-plugin-react": "^7",
  "eslint-plugin-react-hooks": "^4",
  "prettier": "^3",
  "prettier-plugin-tailwindcss": "^0.6",
  "husky": "^9",
  "lint-staged": "^15"
}
```

### 五、总结：你现在只需要关注这些技术栈

- **钱包连接**：wagmi + rainbowkit（最省事最美）  
- **合约交互**：viem（或 ethers）  
- **数据刷新**：react-query  
- **行情图表**：recharts（简单走势）或接入 TradingView Lightweight Charts（专业K线）  
- **UI 组件**：Headless UI + Tailwind  
- **构建**：Vite

这样你的 bundle 会大幅缩小，构建更快，维护成本最低，同时完全覆盖“展示行情 + 连接钱包 + 永续合约交易”三个核心需求。

等以后要做 Swap 聚合、跨链、国际化、多语言时，再把对应包加回来即可。

需要我帮你写一个精简后的 package.json 完整模板吗？