# CardMessage

官方文档：https://developer.kookapp.cn/doc/cardmessage

## 结构限制

- 一条卡片消息最多 5 个 card
- 所有 card 的 modules 总数最多 50

## 全局字段

- `theme`：primary/success/danger/warning/info/secondary/none
- `size`：xs/sm/md/lg（card 中仅支持 sm/lg，移动端基本等价）

## 发送方式

- 消息 type=10
- HTTP `content` 需要是卡片对象序列化后的 JSON 字符串

## 关键模块

- header：标题
- section：图文/按钮组合区域（accessory 可为 image/button）
- context：备注区域（elements 可为 plain-text/kmarkdown/image）
- divider：分割线
- container / image-group：图片容器
- action-group：按钮组（最多 4 个 button）
- file/audio/video：附件模块
- countdown：倒计时
- invite：邀请

## Button 交互

- button.click 为 `return-val` 时，平台会通过事件回传消息 id、点击用户 id 与 value

## 媒体资源建议

- 卡片中使用的图片/文件建议先通过 asset 上传获取 KOOK 侧链接，避免第三方外链转存失败导致卡片发送失败

