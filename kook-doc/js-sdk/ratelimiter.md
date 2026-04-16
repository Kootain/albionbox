# RateLimiter

定位：基于响应头的轻量限速状态跟踪器，分 per-bucket 与全局两层。

## Header 提取

- `extractRateLimitHeader(headers)` 读取：
  - `X-Rate-Limit-Limit`
  - `X-Rate-Limit-Remaining`
  - `X-Rate-Limit-Reset`
  - `X-Rate-Limit-Bucket`
  - `X-Rate-Limit-Global`

## 状态更新

- `update(bucket, header)`：
  - 如果触发全局限速，记录 `globalDisabledUntil = resetTimestamp * 1000`
  - 更新 bucket 的剩余次数与恢复时间戳

## 请求前检查

- `check(bucket)`：
  - 若处于全局限速窗口，直接拒绝
  - 若 bucket 剩余请求很低，会以概率方式拒绝（属于“粗粒度削峰”策略）

## 工程建议

- 生产环境如果需要更严格的限速与排队，可在 `RestClient.request()` 外层再包一层队列
- 多实例部署需要共享限速状态（KV/Redis/集中队列），否则每个实例都会把自己当成“独占配额”

