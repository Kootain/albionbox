# RestClient

定位：KOOK HTTP API 客户端，提供资源域方法封装与 `request()` 原始调用。

## 认证

- Header：`Authorization: Bot <token>`

## 返回结构（no-throw）

- 返回 `KResponseExt<T>`

```ts
type KResponseExt<T> = {
  success: boolean
  code: number
  message: string
  data: T
}
```

约定：`code === 0` 视为 success。

## Rate Limit

- `extractRateLimitHeader()` 从响应头提取限速信息
- `RateLimiter` 在请求前 `check(bucket)`，请求后 `update(bucket, header)`

## request() 行为摘要

- bucket：用 url 去掉 `/api/v3/` 得到（例如 `message/create`）
- GET：data 会被拼成 query string
- POST/PUT/DELETE：data 会 JSON 序列化作为 body（上传 asset 时使用 FormData）

## 本项目用法

- 封装调用：`client.api.createMessage()` 等（见 [KookProvider:sendMessage](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/bot/src/providers/kook/kook.provider.ts#L129-L139)）
- 原始调用：`client.api.request('/api/v3/message/list', 'GET', params)`（见 [KookProvider:getChannelMessages](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/bot/src/providers/kook/kook.provider.ts#L166-L194)）

