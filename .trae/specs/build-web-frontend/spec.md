# Albion Online ERP 前端实现 Spec

## Why
当前 `apps/web` 仍是 Vite 默认示例页，尚未承接已完成的用户、工会、战斗补装后端能力。需要参考 `apps/web_sample` 的视觉风格与交互组织，在正式前端中落地可运行的业务页面，同时保持清晰的模块拆分与高复用结构。

## What Changes
- 基于 `apps/web_sample` 的视觉语言，在 `apps/web` 中建立正式的前端应用骨架、路由、布局与页面导航。
- 新增前端 API 访问层、认证状态管理、受保护路由与会话持久化，接入现有 Hono API。
- 实现用户认证、个人主页、工会管理、补装管理、管理员审核等核心页面。
- 抽离共享 UI 组件、页面容器、表单组件、业务 hooks 与领域模块，避免页面文件堆积。
- 建立基础的前端样式系统与复用规范，优先复用 token、布局、卡片、按钮、表单等通用组件。

## Impact
- Affected specs: 前端应用壳、认证流程、用户中心、工会管理、补装管理、管理员审核、共享组件体系
- Affected code: `apps/web/package.json`、`apps/web/src/**/*`

## ADDED Requirements
### Requirement: 前端应用壳与视觉体系
系统 SHALL 在 `apps/web` 中提供完整的 SPA 应用壳，包含导航布局、响应式侧边栏、页面切换、统一视觉样式，并参考 `apps/web_sample` 的暗色金色风格。

#### Scenario: 用户进入主应用
- **WHEN** 已登录用户访问前端首页
- **THEN** 系统展示带侧边栏导航的业务布局，并可在不同业务页面间切换

### Requirement: 认证与会话管理
系统 SHALL 提供登录、注册、忘记密码相关页面与前端状态管理，并将后端返回的 session token 持久化到浏览器中。

#### Scenario: 登录成功
- **WHEN** 用户输入正确邮箱与密码完成登录
- **THEN** 系统保存 session token、刷新用户上下文并跳转到受保护页面

#### Scenario: 未登录访问受保护页面
- **WHEN** 游客访问需要登录的业务页面
- **THEN** 系统自动重定向到登录页

### Requirement: 用户中心与角色上下文
系统 SHALL 提供用户主页与个人中心页面，展示当前用户、第三方绑定、游戏角色、绑定申请与当前角色上下文。

#### Scenario: 查看个人上下文
- **WHEN** 已登录用户打开个人主页或个人中心
- **THEN** 系统展示用户基础信息、当前角色、第三方绑定列表、游戏账号申请与可切换角色

#### Scenario: 切换当前角色
- **WHEN** 用户在前端选择一个已审核通过的游戏角色
- **THEN** 系统调用后端切换接口并刷新页面中的角色上下文

### Requirement: 工会管理前端
系统 SHALL 提供工会申请、工会详情、角色权限、成员管理、箱子坐标管理等前端页面与交互。

#### Scenario: 创建工会申请
- **WHEN** 用户提交工会名称与服务器
- **THEN** 系统创建申请并在页面中展示最新申请状态与绑定 token

#### Scenario: 管理工会成员
- **WHEN** 具备权限的成员进入工会详情页
- **THEN** 系统展示工会角色、权限、成员、箱子坐标，并支持增删改操作

### Requirement: 补装业务前端
系统 SHALL 提供战斗记录导入、补装 session 列表与详情、补装审批、自动审批规则、装备汇总等前端页面与交互。

#### Scenario: 创建补装 session
- **WHEN** 有权限成员在前端勾选战斗记录并创建补装 session
- **THEN** 系统创建 session 并在详情页展示进度、补装记录与自动审批结果

#### Scenario: 查看装备汇总
- **WHEN** 有权限成员打开某个补装 session 的汇总视图
- **THEN** 系统按 P 级展示总体装备汇总，并支持按成员查看分组结果

### Requirement: 管理员审核前端
系统 SHALL 提供管理员页面，用于审核游戏账号绑定申请与工会注册申请。

#### Scenario: 审核通过申请
- **WHEN** 平台管理员在前端执行通过操作
- **THEN** 系统更新申请状态并即时刷新列表数据

### Requirement: 模块化与可维护性
系统 SHALL 采用清晰的前端模块分层，至少将页面、布局、共享组件、领域 hooks、API 客户端、表单/展示逻辑拆分，避免单个页面或单个 hook 承担过多职责。

#### Scenario: 页面复用共享能力
- **WHEN** 多个页面需要使用统一卡片、按钮、表单状态、数据拉取或布局逻辑
- **THEN** 系统通过共享组件和 hooks 复用实现，而不是复制代码

## MODIFIED Requirements
### Requirement: Web 应用初始模板
现有 `apps/web` SHALL 从 Vite 默认示例页升级为业务前端应用，替换演示素材与无关示例代码。

## REMOVED Requirements
### Requirement: 默认计数器演示页
**Reason**: 默认 Vite 页面不再满足 ERP 业务需求。
**Migration**: 使用业务化应用壳、登录页和功能页面替换默认示例内容。
