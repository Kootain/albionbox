# Webhook

官方文档：https://developer.kookapp.cn/doc/webhook

## 请求形态

- 默认：请求体会被 `zlib(deflate)` 压缩后发送（可能是二进制）
- 可选：CallbackUrl 带 `compress=0` 可关闭压缩
- 可选：启用消息加密后，请求体为 `{ "encrypt": "..." }`，并且在未关闭压缩时可能“先加密再压缩”

## Challenge 校验

- 触发：开发者后台点击“重试”或上线机器人
- 请求体（解压/解密后）：

```json
{
  "s": 0,
  "d": {
    "type": 255,
    "channel_type": "WEBHOOK_CHALLENGE",
    "challenge": "bkes654x09XY",
    "verify_token": "xxxxxx"
  }
}
```

- 响应：1s 内返回

```json
{ "challenge": "bkes654x09XY" }
```

## 事件回调

- 处理要求：1s 内返回 200
- 超时/失败重试：约 2s, 4s, 8s, 16s, 32s, 64s，最多 5 次
- 安全校验：检查 `d.verify_token`
- 幂等：使用 `sn` 去重，避免重复处理（尤其在重试时）

