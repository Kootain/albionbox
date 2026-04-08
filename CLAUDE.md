# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Albion Box 是一个 Albion Online 游戏工会管理 ERP 系统，采用 pnpm Monorepo 架构，运行在 Cloudflare Workers 上。

## Commands

所有命令从项目根目录运行。

```bash
# API 开发 (Cloudflare Workers + Hono)
pnpm --filter api dev          # 启动本地 wrangler dev 服务
pnpm --filter api deploy       # 部署到 Cloudflare Workers
pnpm --filter api run cf-typegen  # 重新生成 Cloudflare Bindings 类型 (worker-configuration.d.ts)

# Web 前端 (React + Vite)
pnpm --filter web dev          # 启动 Vite 开发服务器 (http://localhost:5173)
pnpm --filter web build        # TypeScript 编译 + Vite 打包
pnpm --filter web lint         # ESLint 检查

# 数据库 (Drizzle ORM + Cloudflare D1)
pnpm --filter @albionbox/db run generate        # 根据 schema 生成迁移文件
pnpm --filter @albionbox/db run migrate:local   # 应用迁移到本地 D1
```

## Architecture

### Monorepo 包结构

| 包 | 路径 | 职责 |
|---|---|---|
| `@albionbox/db` | `packages/db` | 数据库层：Drizzle ORM schema + D1 migrations |
| `@albionbox/shared` | `packages/shared` | 业务契约层：Zod Schemas + 全局 Types（会打包进浏览器，禁止放敏感内容） |
| `api` | `apps/api` | 后端运行层：Hono + Cloudflare Workers |
| `web` | `apps/web` | 前端展示层：React + Vite |

### API 后端模块结构

每个业务域以 `apps/api/src/modules/<domain>/` 目录组织：
- `index.ts` — 导出 router 和 service
- `router.ts` — Hono 路由定义
- `service.ts` — 业务逻辑（可拆分为 `*.service.ts`）
- `types.ts` — 模块内部类型

路由在 `apps/api/src/index.ts` 中链式挂载，并通过 `export type AppType = typeof routes` 导出类型供前端使用。

### Cloudflare Bindings

- `c.env.DB` — D1 数据库（强一致性业务数据）
- `c.env.KV` — KV 存储（Session token 缓存，30天 TTL）
- Env 类型由 `wrangler types` 自动生成，**不要手动定义 `Bindings` 类型**

### 认证与权限

- Session 使用 KV 存储，通过 `Authorization: Bearer <token>` 传递
- 认证中间件负责注入用户身份到 context，权限中间件按需组合（基础认证、平台管理员、工会权限）
- 工会权限检查支持"所有权限满足"和"任一权限满足"两种模式

### 前端 API 调用

- 前端使用 Hono 的 `hc` 客户端调用后端，享受端到端类型推导（依赖 `AppType` 导出）
- API base URL 通过 `VITE_API_BASE_URL` 环境变量注入，默认 `http://127.0.0.1:8787`
- 统一封装 Bearer Token 注入，不在业务代码中手动设置 Header

## Development Conventions

### 新增后端模块的标准流程

1. **Schema** — `packages/db/src/schema/<复数>.ts`
   - 使用 `drizzle-orm/sqlite-core`，主键用 `text('id').primaryKey()`（业务层用 `crypto.randomUUID()` 填充）
   - 完成后运行 `pnpm --filter @albionbox/db run generate` 生成迁移文件

2. **Zod Schemas** — `packages/shared/src/schemas/<单数>.ts`
   - 命名格式：`[Action][Entity]Schema`，例如 `CreateOrderSchema`、`UpdateOrderSchema`
   - 在 `packages/shared/src/index.ts` 中 `export * from './schemas/<单数>'`

3. **Router** — `apps/api/src/modules/<domain>/router.ts`
   - 使用 `@hono/zod-validator` 拦截非法请求：`zValidator('json', XxxSchema)`
   - 用 `drizzle(c.env.DB)` 实例化数据库，每个请求内按需创建

4. **挂载** — 在 `apps/api/src/index.ts` 的 `routes` 链式调用中挂载，保持 `AppType` 类型推导不断裂

### 关键规则

- **URL 路径**：多单词必须用 `snake_case`（如 `/battle_records`），**严禁连字符**，否则前端 hc 客户端需用 `['xxx-xxx']` 调用
- **并发查询**：无依赖的多个 DB 查询必须用 `Promise.all()` 并发执行，降低 Serverless 延迟
- **禁止深度导入**：`@albionbox/shared` 只用根路径导入，禁止 `@albionbox/shared/src/schemas/user`
- **shared 包安全**：`packages/shared` 会打包进浏览器，禁止放数据库敏感字段（如密码盐值）或特权枚举

### 避坑指南

- **幻影依赖**：`apps/api` 不能直接使用 `packages/db` 中安装的依赖。使用 `eq`、`drizzle` 等方法前，必须确认 `apps/api/package.json` 中已独立安装 `drizzle-orm`。
- **KV vs D1**：KV 适用于读多写少、可容忍最终一致性的数据（如 Session 缓存、验证码）；强一致性业务数据必须使用 D1。
- **Env 类型**：不要手动写 `type Bindings = { DB: D1Database }`，始终用 `wrangler types` 自动生成的全局 `Env`。

## Modular Design & Clean Code

### 核心原则

**单一职责（SRP）**：每个文件、函数、模块只做一件事。一个模块的修改理由有且只有一个。

**低耦合**：模块间通过明确的接口通信，不直接访问其他模块的内部实现。跨模块调用必须通过模块的 `index.ts` 导出的公开 API，禁止跨模块深度导入（如 `../auth/service` 直接引用另一模块的内部文件）。

**高内聚**：同一模块内的代码紧密相关，属于同一业务关注点。

### 文件行数限制

| 文件类型 | 软上限 | 超出时的处理方式 |
|---|---|---|
| Router 文件 | 80 行 | 按资源拆分子路由，如 `guild.router.ts`、`guild-member.router.ts` |
| Service 文件 | 150 行 | 按业务操作拆分，如 `guild-query.service.ts`、`guild-mutation.service.ts` |
| React 组件 | 150 行 | 拆分子组件或提取自定义 Hook |
| Hook / 工具函数 | 80 行 | 拆分为更小的单一职责函数 |
| Schema 文件 | 100 行 | 按实体分文件 |

超出软上限不是硬错误，但必须有充分理由；若无理由，应立即拆分。

### 后端模块拆分规范

当 `service.ts` 超过行数上限，按以下模式拆分：

```
modules/<domain>/
├── index.ts                  # 仅负责 re-export
├── router.ts                 # 路由定义，不含业务逻辑
├── <domain>.query.service.ts    # 读操作（查询类）
├── <domain>.mutation.service.ts # 写操作（增删改类）
└── types.ts                  # 模块内部类型
```

router 中只调用 service 函数，**不内联任何业务逻辑**（DB 查询、计算、条件分支等不写在 router 里）。

### 前端模块拆分规范

```
src/
├── pages/<Page>/
│   ├── index.tsx             # 页面入口，仅负责组合
│   ├── components/           # 该页面私有组件
│   └── hooks/                # 该页面私有 Hook
├── components/               # 全局复用组件
│   └── <Component>/
│       ├── index.tsx
│       └── <SubComponent>.tsx
└── hooks/                    # 全局复用 Hook
```

**组件职责边界**：
- 容器组件（Container）负责数据获取和状态管理，不写 UI 样式
- 展示组件（Presentational）只接收 props 渲染 UI，不调用 API
- 单个组件超过 150 行时，优先考虑提取子组件，而非添加注释分隔

**Hook 原则**：
- 一个 Hook 只封装一类副作用或状态逻辑，命名清晰反映其用途（`useGuildMembers`、`usePermissionCheck`）
- 禁止在一个 Hook 中混用不相关的业务逻辑（如同时处理权限检查和数据拉取）

### 命名即文档

函数和变量名必须自解释，避免依赖注释说明行为：

```typescript
// 禁止
const data = await get(id)           // data 是什么？get 做什么？
const flag = check(user, guild)      // flag 代表什么布尔含义？

// 正确
const member = await getMemberById(memberId)
const hasManagePermission = checkGuildPermission(user, guild, 'MANAGE_MEMBERS')
```

函数命名规范：
- 查询：`get<Entity>`, `list<Entities>`, `find<Entity>By<Field>`
- 写操作：`create<Entity>`, `update<Entity>`, `delete<Entity>`
- 布尔判断：`is<State>`, `has<Thing>`, `can<Action>`

### 抽象时机

**不要过早抽象**。满足以下条件之一才提取公共函数/组件：
1. 相同逻辑在 **3 处或以上** 重复出现
2. 单元可以被独立测试且复用价值明确
3. 提取后能让调用处代码更易读

三行相同代码不是抽象的充分理由；若抽象后反而需要更多解释，则不应抽象。
