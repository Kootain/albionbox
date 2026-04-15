# 指令系统（Directive）

定位：把频道消息解析成类似 `/command parameter` 的结构，再按权限分发给 handler。

## 组件

- `DirectiveRegistry`：注册与查找指令（按 triggerWord）
- `parseDirective(event)`：从 event.content 提取指令名与参数
- `DirectiveDispatcher`：权限校验 + 调用 handler

## 权限模型

- `permissionGroups`：字符串数组
- 默认 resolver：包含 `everyone` 则通过，否则要求用户角色与 requiredPermissions 有交集

## 分发行为

- 解析失败：返回 false（不是指令）
- 找不到指令：返回 false（当普通消息处理）
- 无权限：返回 true（视为“已处理”，可选触发 onPermissionDenied）
- handler 抛错：内部 catch 并记录日志，返回 true

