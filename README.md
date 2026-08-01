# BUYHKSIM Commerce V2

BUYHKSIM V2 是面向全球 SIM/eSIM 零售、企业采购和分销业务的商业级独立商城。V2 使用全新代码库与数据库，不迁移第一版用户或订单。

## 应用

- `apps/storefront`：消费者商城（Next.js）
- `apps/admin`：商家与平台运营后台（Next.js）
- `apps/api`：交易 API（NestJS 模块化单体）
- `packages/contracts`：跨端契约与状态机
- `packages/database`：PostgreSQL/Drizzle 模型与迁移
- `packages/design-system`：设计令牌与基础组件
- `packages/i18n`：简中、繁中、英文文案

## 安全边界

- 当前为生产级沙箱版，不接收真实资金。
- 服务端权威计价，金额统一为最小货币单位整数。
- 创建订单、支付、退款、提现、售后和批量导入必须提供 `Idempotency-Key`。
- AI 只读已审核商品与知识库；加入购物车必须由用户确认；禁止 AI 付款、退款、改库存或直接发布商品。
- 生产密钥不得进入浏览器、代码、日志或文件存储。

## 本地准备

1. 复制 `.env.example` 为 `.env` 并替换开发密钥。
2. 准备 PostgreSQL 16 与 Redis 7（本机当前未安装 Docker）。
3. `pnpm install`
4. `pnpm db:migrate`
5. `pnpm dev`

发布到 GitHub、创建公开网址或购买云资源前，必须单独确认授权。
