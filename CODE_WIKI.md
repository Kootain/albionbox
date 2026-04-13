# AlbionBox - Code Wiki

本文档旨在提供 AlbionBox 项目的整体技术架构、模块划分、核心实现及运行方式说明。AlbionBox 是一个为 Albion Online 打造的公会 ERP 系统。

## 1. 项目概览

- **项目描述**：为 Albion Online 设计的 ERP 系统，核心功能包括用户管理、游戏账号绑定、公会管理与权限分配、战斗统计、以及 Regear（补装）系统。
- **技术栈**：
  - **包管理**：[pnpm workspace](file:///Users/kootain/Code/github.com/Kootain/albionbox/pnpm-workspace.yaml)
  - **后端**：[Hono](https://hono.dev/) 框架，运行在 Cloudflare Workers 上
  - **前端**：React 19 + Vite + Tailwind CSS v4 + React Router + Framer Motion
  - **通信协议**：Hono RPC (`hono/client`) 实现前后端类型安全的 API 调用
  - **数据库**：Cloudflare D1 (SQLite) + [Drizzle ORM](https://orm.drizzle.team/)
  - **缓存/会话**：Cloudflare KV
  - **数据验证**：Zod

---

## 2. 项目整体架构

项目采用 Monorepo 结构组织，代码主要划分为 `apps`（应用）和 `packages`（共享包）：

```text
albionbox/
├── apps/
│   ├── api/            # 后端服务 (Hono + Cloudflare Workers)
│   ├── web/            # 官方前端应用 (React + Vite)
│   └── web_sample/     # 前端示例应用 (React + Vite)
├── packages/
│   ├── db/             # 数据库层 (Schema 定义、Drizzle 配置及迁移脚本)
│   └── shared/         # 共享层 (Zod Schemas、公共类型及常量等)
```

### 依赖关系
- `apps/api` 依赖 `packages/db`（执行数据库操作）和 `packages/shared`（请求体验证）。
- `apps/web` 依赖 `apps/api` 导出的类型 `AppType`（用于 RPC 调用）以及 `packages/shared`（复用类型和校验逻辑）。

---

## 3. 主要模块职责

后端的业务逻辑集中在 [apps/api/src/modules](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/modules) 目录下，各模块职责明确：

### 3.1 用户模块 (`users`)
- **功能**：处理用户的注册、登录、邮箱验证、密码重置等。支持记录用户当前激活的游戏角色（Active Game Account），后续操作强依赖该状态。
- **核心文件**：[router.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/modules/users/router.ts)、[auth.middleware.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/modules/users/auth.middleware.ts)

### 3.2 游戏账号模块 (`game_accounts`)
- **功能**：处理 Albion Online 游戏账号的绑定申请和验证。一个平台账号最多可关联 10 个游戏账号，绑定时需要验证签名 Token。目前一期由平台管理员后台人工核实。

### 3.3 公会与权限模块 (`guilds` & `permissions`)
- **功能**：
  - 提供公会注册、角色（Role）管理、成员管理。
  - 基于 RBAC（Role-Based Access Control）实现细粒度的公会权限系统。
  - 成员状态和游戏账号/服务器强绑定。
- **核心文件**：[guilds.service.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/modules/guilds/guilds.service.ts)、[middleware.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/modules/permissions/middleware.ts)

### 3.4 平台管理模块 (`admin`)
- **功能**：为平台超级管理员提供的人工审核接口，用于审批公会新建申请和游戏账号绑定申请。

### 3.5 战斗记录模块 (`battle_records`)
- **功能**：统计公会战斗记录，支持从外部数据源导入战斗日志。

### 3.6 补装模块 (`regear`)
- **功能**：ERP 的核心业务模块。基于战斗记录中的死亡数据自动生成补装记录（Regear Records）。
- **特性**：
  - 支持 Regear Session，批量管理多场战斗的补装。
  - 提供基于规则（Approval Rules）的自动化审批 Pipeline（热插拔拦截器）。
  - 根据装备 Tier + 附魔等级 (如 P9) 进行物资汇总与箱子分配。
- **核心文件**：[regear.pipeline.service.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/modules/regear/regear.pipeline.service.ts)、[regear.service.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/modules/regear/regear.service.ts)

---

## 4. 关键类与函数说明

### 4.1 后端 (API)

- **`app.route()`** ([index.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/api/src/index.ts)): 
  Hono 实例挂载路由的入口，将各个子模块的 Router 集中注册，并导出 `AppType` 供前端使用。
- **`factory.createHandlers()`**: 
  利用 Hono Factory 创建类型安全的中间件和路由处理函数。常结合 `@hono/zod-validator` (`zValidator`) 对请求参数进行校验。
- **`authMiddleware`**: 
  提取请求头中的 Token，从 Cloudflare KV 中校验并还原 Session，获取用户基本信息并挂载到 Context (`c.get('user')`)。
- **`drizzle(c.env.DB)`**: 
  数据库连接实例化函数，利用传入的 D1 Binding 初始化 ORM 进行 SQL 交互。

### 4.2 前端 (Web)

- **`hc<AppType>()`** ([api-client.ts](file:///Users/kootain/Code/github.com/Kootain/albionbox/apps/web/src/lib/api-client.ts)): 
  前端核心的 API 客户端封装。利用 Hono RPC，前端无需手写 axios/fetch 类型，直接享用后端的入参和返回值类型提示。该文件也负责自动注入用户的 Authorization Header。
- **`useAuth` Hook**: 
  负责管理前端的用户状态和会话（Token 存储与清除）。

### 4.3 数据库 (DB)

- **Schema 定义** ([packages/db/src/schema](file:///Users/kootain/Code/github.com/Kootain/albionbox/packages/db/src/schema)): 
  使用 Drizzle 定义的所有表（如 `users`, `guilds`, `regear_sessions` 等）。这些定义通过 Drizzle-Kit 转换为 SQL 迁移文件。

---

## 5. 项目运行方式

### 环境要求
- Node.js (推荐 v20+)
- pnpm (通过 `corepack enable` 或 npm 安装)
- Wrangler CLI (Cloudflare Workers 本地开发环境)

### 1. 安装依赖
在项目根目录执行：
```bash
pnpm install
```

### 2. 初始化本地数据库
项目依赖 Cloudflare D1，本地开发时需要先执行 Drizzle 的迁移脚本生成本地 SQLite 数据库：
```bash
cd packages/db
pnpm run migrate:local
```
*(注意：此命令会读取 `apps/api/wrangler.jsonc` 的配置并在 `.wrangler` 目录下生成本地 DB 文件)*

### 3. 启动开发服务器
在根目录下执行：
```bash
pnpm run dev
```
该命令基于 `pnpm-workspace.yaml`，会并行启动：
1. **后端 API**：在 `http://127.0.0.1:8787` 启动 Wrangler 本地模拟环境。
2. **前端 Web**：在 Vite 默认端口（如 `http://localhost:5173`）启动前端开发环境。

### 4. 其他配置 (环境变量)
- 若需修改前端调用的后端地址，可配置前端的 `.env` 文件中的 `VITE_API_BASE_URL`。
- 后端所需的第三方服务（如 Resend 邮件服务）的密钥，需要在后端的 `.dev.vars` 或通过 Wrangler Secret 进行配置。
