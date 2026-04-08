# Tasks
- [x] Task 1: 扩展用户域数据库与共享契约
  - [x] SubTask 1.1: 在 `packages/db/src/schema` 中重构用户相关表，补齐邮箱认证、密码恢复、第三方绑定、游戏账号绑定申请、当前角色字段
  - [x] SubTask 1.2: 在 `packages/shared/src/schemas` 中新增用户认证、第三方绑定、游戏账号绑定申请、角色切换相关 Zod Schemas
  - [x] SubTask 1.3: 更新 `packages/shared/src/index.ts` 统一导出新增用户契约

- [x] Task 2: 实现用户认证、绑定与角色切换 API
  - [x] SubTask 2.1: 在 `apps/api/src/routes` 中实现注册、登录、忘记密码、第三方绑定、游戏账号绑定申请与审核查询接口
  - [x] SubTask 2.2: 增加当前角色切换与主页聚合接口，确保返回角色上下文
  - [x] SubTask 2.3: 将用户路由挂载到主入口，并更新 API 类型导出

- [x] Task 3: 建立工会基础模块
  - [x] SubTask 3.1: 在数据库层新增工会、工会申请、工会角色、权限、成员、成员箱子分配等表结构
  - [x] SubTask 3.2: 在共享契约层新增工会注册、审核、角色权限、成员管理相关 Schemas
  - [x] SubTask 3.3: 在 API 层实现工会注册、人工审核、角色权限、成员管理接口并挂载入口

- [x] Task 4: 建立战斗统计与补装模块
  - [x] SubTask 4.1: 在数据库层新增战斗记录、补装 session、补装记录、审批流水、自动审批规则等表结构
  - [x] SubTask 4.2: 在共享契约层新增战斗导入、补装 session、审批流、装备汇总相关 Schemas
  - [x] SubTask 4.3: 在 API 层实现战斗导入、session 管理、补装审批、自动审批规则、装备汇总接口并挂载入口

- [x] Task 5: 完成验证与交付
  - [x] SubTask 5.1: 运行类型检查或项目可用的验证命令，确认新增模块可编译
  - [x] SubTask 5.2: 补充或调整必要测试，验证用户、工会、补装核心流程
  - [x] SubTask 5.3: 根据检查结果修复问题，并同步勾选 `tasks.md` 与 `checklist.md`

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 2, Task 3, Task 4
