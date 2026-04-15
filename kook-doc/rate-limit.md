# Rate Limit

官方文档：https://developer.kookapp.cn/doc/rate-limit

## Header 字段

- `X-Rate-Limit-Limit`：时间窗口内允许的最大请求次数
- `X-Rate-Limit-Remaining`：窗口内剩余请求次数
- `X-Rate-Limit-Reset`：恢复到最大次数还需要等待的秒数
- `X-Rate-Limit-Bucket`：限速桶标识（通常是接口名或资源域）
- `X-Rate-Limit-Global`：触发全局限速

## 触发后行为

- HTTP 429
- 返回体仍是标准格式（code/message/data）
- 多次超速会警告，持续超速可能封禁 bot

## 工程建议

- 做 per-bucket 限速 + 全局限速两层
- 对 429 做退避与排队，不要“立即重试”

