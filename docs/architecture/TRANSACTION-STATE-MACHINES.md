# 交易状态机

## 订单

`PENDING_PAYMENT → PAID → FULFILLING → COMPLETED`

允许终止：

- `PENDING_PAYMENT → CLOSED`
- `PAID/FULFILLING → AFTER_SALE → REFUNDED`
- 部分退款保持原履约状态，并记录累计退款金额。

任何逆向状态迁移必须来自显式补偿命令并写入审计日志，不接受客户端直接指定状态。

## 库存

下单事务内执行条件更新：`available >= quantity`，同时增加 `locked`。支付成功后 `locked → sold`；超时关闭或支付失败后释放锁定。SKU 使用版本号实施乐观并发控制。

## 支付

`CREATED → PENDING → SUCCEEDED | FAILED | CLOSED`

回调处理先验签，再核对渠道商户号、订单号、金额与币种。唯一约束 `(channel, channel_transaction_id)` 和幂等记录保证重复、晚到、乱序回调可重入。

## 佣金

`OBSERVING → AVAILABLE → WITHDRAWING → PAID`

发生退款时按商品和优惠快照比例冲正；余额不足时形成负向待抵扣，不允许覆盖历史流水。
