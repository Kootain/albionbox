# 事件目录（按域）

官方目录入口：https://developer.kookapp.cn/doc/event/event-introduction

建议的阅读方式：先掌握 [事件格式](file:///Users/kootain/Code/github.com/Kootain/albionbox/kook-doc/event-envelope.md)，再按业务只看你会用到的事件域。

## 事件域

- 频道相关事件：https://developer.kookapp.cn/doc/event/channel
- 私聊消息事件：https://developer.kookapp.cn/doc/event/direct-message
- 服务器成员相关事件：https://developer.kookapp.cn/doc/event/guild-member
- 服务器角色相关事件：https://developer.kookapp.cn/doc/event/guild-role
- 服务器相关事件：https://developer.kookapp.cn/doc/event/guild
- 消息相关事件：https://developer.kookapp.cn/doc/event/message
- 用户相关事件：https://developer.kookapp.cn/doc/event/user

## 常用事件子集（工程里最常见）

- 频道文本消息（type=1/9/10）：做指令、自动回复、内容触发器
- Button 点击事件：Card 交互入口
- 成员加入/退出：欢迎、权限发放、绑定引导
- 角色变更：权限联动、白名单联动
- 消息删除：审计、撤回联动

