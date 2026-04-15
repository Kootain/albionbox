# KMarkdown

官方文档：https://developer.kookapp.cn/doc/kmarkdown

## 定位

- 在 KOOK 中用于替代“纯 Markdown”的富文本标准
- 消息 type=9 时，`content` 是一段长字符串

## 常用语法

- 加粗：`**text**`
- 斜体：`*text*`
- 删除线：`~~text~~`
- 链接：`[text](https://example.com)`
- 引用：`> quoted`
- 下划线：`(ins)text(ins)`
- 剧透：`(spl)text(spl)`
- @用户：`(met)用户id(met)`，`(met)all(met)`，`(met)here(met)`
- @角色：`(rol)角色ID(rol)`
- 提及频道：`(chn)频道ID(chn)`
- 服务器表情：`(emj)表情名(emj)[表情id]`

## 工具

- 官方可视化编辑器：https://kookapp.cn/tools/message-builder.html#/kmarkdown

## 工程注意点

- 用户输入建议转义 `\\`、`(`、`)`、`[`、`]`、`*` 等，避免被意外解析
- 机器人收到的 `content` 可能包含 mention/role/channel 等标签，可按需做“提纯”再解析指令

