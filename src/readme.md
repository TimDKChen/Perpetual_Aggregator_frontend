| 目录           | 职责                    |
| ------------ | --------------------- |
| `config`     | 链 & GMX 参数            |
| `lib`        | 工具函数                  |
| `sdk/gmx`    | **唯一和 GMX SDK 交互的地方** |
| `domain`     | 纯业务逻辑（K 线、计算）         |
| `hooks`      | 把 domain + sdk 组合     |
| `components` | UI                    |
| `pages`      | 页面级                   |
| `app`        | 启动 & 路由               |
