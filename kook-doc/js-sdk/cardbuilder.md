# CardBuilder

定位：卡片消息的链式构建器，输出给 HTTP API 的 `content`（JSON 字符串）。

## 使用方式

- `CardBuilder.fromTemplate()` 创建，默认生成一个 card（theme=secondary, size=lg）
- 连续 `addXxx()` 追加 modules
- `build()` 序列化输出字符串

## 常用方法

- `theme(size/color)`：设置卡片外观
- `addHeader()` / `addDivider()`
- `addKMarkdownText()` / `addPlainText()`
- `addActionGroup([{ text, value, theme? }])`
- `addImage()` / `addFile()`
- `addHourCountDown()` / `addDayCountDown()` / `addSecondCountDown()`
- `undoLastAdd()`
- `createSnapshot()` + `restore(snapshot)`：用于回滚

## 工程注意点

- build() 返回的是字符串，不是对象
- serializedLength 可以用于做长度预警/分片策略
- 本项目当前回复消息示例见 [KookProvider:reply](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/bot/src/providers/kook/kook.provider.ts#L96-L110)

