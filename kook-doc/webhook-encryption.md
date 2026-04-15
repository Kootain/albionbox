# Webhook 加密

官方文档：https://developer.kookapp.cn/doc/webhook#%E9%85%8D%E7%BD%AE%E6%B6%88%E6%81%AF%E5%8A%A0%E5%AF%86

## 入参

- 请求体（可能仍被 deflate 压缩）：

```json
{ "encrypt": "..." }
```

## 解密算法

- aes-256-cbc

## 解密步骤（按官方描述）

- base64 解码 `encrypt` 得到原始文本
- 前 16 位作为 `iv`
- 后续部分再次 base64 解码得到密文字节
- `encryptKey` 右侧补 `\\0` 到 32 字节作为 key
- 用 key + iv 做 aes-256-cbc 解密得到事件 JSON 字符串

## 注意点

- 即使开启加密，在未通过 `compress=0` 关闭压缩时，平台仍可能在加密后的消息上再做一次 deflate 压缩
- Worker 场景建议：先尝试按 JSON 解析，不行再按 deflate 解压，再做 decrypt

