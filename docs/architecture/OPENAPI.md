# API v1 契约摘要

所有 JSON 响应均为：

```json
{ "ok": true, "data": {}, "requestId": "uuid" }
```

或：

```json
{ "ok": false, "error": { "code": "HTTP_409", "message": "可读提示", "requestId": "uuid", "recoverable": true } }
```

## 主要接口

| 方法 | 路径 | 幂等键 | 说明 |
|---|---|---:|---|
| POST | `/api/v1/auth/register` | 否 | 注册 |
| POST | `/api/v1/auth/login` | 否 | 登录与 HttpOnly 刷新会话 |
| GET | `/api/v1/catalog/products` | 否 | 商品列表与搜索 |
| POST | `/api/v1/checkout/preview` | 否 | 服务端计价并签发短期预览令牌 |
| POST | `/api/v1/checkout/orders` | 是 | 校验快照、锁库存并创建订单 |
| POST | `/api/v1/payments` | 是 | 创建微信/支付宝/银联沙箱支付 |
| POST | `/api/v1/payment-webhooks/{channel}` | 渠道事件唯一键 | 回调验签和可重入处理 |
| POST | `/api/v1/refunds` | 是 | 全额或部分退款 |
| POST | `/api/v1/admin/imports/products/validate` | 否 | CSV/Excel 暂存校验 |
| POST | `/api/v1/admin/imports/products/commit` | 是 | 提交有效行到任务队列 |
| POST | `/api/v1/ai/recommend` | 否 | 只读智能选卡 |

创建订单、支付、退款、提现、售后和批量提交若缺少合法 `Idempotency-Key`，返回 400。所有敏感写接口还必须通过会话、RBAC、商户隔离和风险检查。
