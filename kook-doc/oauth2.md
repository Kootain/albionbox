# OAuth2

官方文档：https://developer.kookapp.cn/doc/oauth2

## 适用场景

- 让用户使用 KOOK 账号登录第三方站点
- 获取用户基础信息与用户加入的服务器列表（受 scope 限制）

## 授权方式

- 当前仅支持 `authorization_code`
- redirect_uri 必须在白名单内
- 回调会携带 `code` 与 `state`

示例：

```
https://xxx.xxx.xx/oauth/?code=099096f...&state=c2275a...
```

## AccessToken

- 使用 `code` 调用 OAuth HTTP API 获取 AccessToken
- 请求 Header：`Authorization: Bearer <access_token>`
- AccessToken 过期后需要重新授权（文档当前描述为“再次引导授权”）

## Scope 与能力

- `get_user_info`：允许读取用户信息（`api/v3/user/me` 在 OAuth 场景只返回基础信息）
- `get_user_guilds`：允许获取用户加入的服务器信息（`api/v3/guild/list`）

