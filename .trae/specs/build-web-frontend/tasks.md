# Tasks
- [x] Task 1: 搭建前端应用基础骨架
  - [x] SubTask 1.1: 清理 `apps/web` 默认示例代码，建立新的目录结构，拆分 `app`、`layouts`、`components`、`modules`、`hooks`、`lib`
  - [x] SubTask 1.2: 引入路由、全局样式、主题 token 与基础布局，参考 `apps/web_sample` 的暗色金色风格实现响应式导航
  - [x] SubTask 1.3: 建立前端 API 客户端、错误处理、认证 token 存储与受保护路由能力

- [x] Task 2: 实现认证与用户中心页面
  - [x] SubTask 2.1: 实现登录、注册、忘记密码页面与表单交互
  - [x] SubTask 2.2: 实现用户主页/仪表盘，展示用户上下文、当前角色与概览信息
  - [x] SubTask 2.3: 实现个人中心页面，支持第三方绑定列表、游戏账号绑定申请、角色切换

- [x] Task 3: 实现工会管理前端
  - [x] SubTask 3.1: 实现工会申请页与工会列表/详情入口
  - [x] SubTask 3.2: 实现工会详情中的角色权限、成员管理、箱子坐标管理界面
  - [x] SubTask 3.3: 抽离工会模块专属 hooks、表单组件与展示组件，避免页面文件臃肿

- [x] Task 4: 实现补装与管理员页面
  - [x] SubTask 4.1: 实现战斗记录导入、补装 session 列表与详情页面
  - [x] SubTask 4.2: 实现补装记录审批、自动审批规则管理、装备汇总视图
  - [x] SubTask 4.3: 实现管理员审核页面，支持审核游戏账号绑定与工会注册申请

- [x] Task 5: 完成前端质量收尾与验证
  - [x] SubTask 5.1: 统一清理重复样式与重复业务逻辑，补充可复用组件/工具
  - [x] SubTask 5.2: 运行类型检查、lint、构建验证，修复前端编译问题
  - [x] SubTask 5.3: 同步更新 `tasks.md` 与 `checklist.md`，确认所有前端功能达到 Spec 要求

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1, Task 3
- Task 5 depends on Task 2, Task 3, Task 4
