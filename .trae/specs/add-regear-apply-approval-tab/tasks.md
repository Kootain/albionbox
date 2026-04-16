# Tasks

- [x] Task 1: 后端新增补装申请列表查询接口
  - [x] SubTask 1.1: 在 `packages/shared/src/schemas/regear_apply.ts` 新增 Query Schema（例如 `ListRegearAppliesQuerySchema`）与返回结构 Schema（例如 `ListRegearAppliesResponseSchema`）
  - [x] SubTask 1.2: 在 `apps/api/src/modules/regear_apply/router.ts` 新增 `GET /regear_applies`：
    - 支持 `msgGuild/status/msgChannel/msgUserid/victimName/limit/offset`
    - 返回 `{ items, total, limit, offset }`
    - 默认按 `createTime` 倒序

- [x] Task 2: 工会大盘新增「补装审批」Tab
  - [x] SubTask 2.1: 扩展 `TabType`，并在 `GuildTabs.tsx` 增加 Tab 按钮（例如 `regear-approval`）
  - [x] SubTask 2.2: 在 `GuildDashboardPage.tsx` 中挂载新 Tab 组件

- [x] Task 3: 实现补装审批页面（apps/web）
  - [x] SubTask 3.1: 新增 Tab 页面组件（例如 `apps/web/src/pages/guild-dashboard/tabs/RegearApprovalTab.tsx`）
  - [x] SubTask 3.2: 页面内实现筛选 UI
    - 状态筛选（绑定 ApplyStatus）
    - 频道（msgChannel）
    - 申请人（msgUserID）
    - 受害者（victimName）
  - [x] SubTask 3.3: 过滤条件转换为 API query 参数，并默认附带 `msgGuild=1248349507148974`（临时写死）
  - [x] SubTask 3.4: 展示列表（至少包含：createTime/status/msgChannel/msgUserid/victimName/msgUsername/regearId）
  - [x] SubTask 3.5: 支持分页（limit/offset 或页码换算）

- [x] Task 4: 文案与基础校验
  - [x] SubTask 4.1: 增加必要的 i18n key（Tab 名称、筛选标签、空态、加载态）

- [x] Task 5: 验证
  - [x] SubTask 5.1: `apps/web` build 通过（tsc + vite build）
  - [x] SubTask 5.2: `apps/api` TypeScript 检查通过（使用仓库既有命令）

# Task Dependencies
- [Task 2] depends on [Task 3]（或可并行，仅需在最后联调挂载）
- [Task 3] depends on [Task 1]
- [Task 5] depends on [Task 1-4]
