# Tasks

- [x] Task 1: Database Migration: 添加 `regeared_slots` 字段
  - [x] 修改 `packages/db/src/schema/regear.ts`，给 `regears` 表添加 `regearedSlots: text('regeared_slots')` 字段。
  - [x] 生成 Drizzle SQL migration 文件 (`pnpm db:generate` 或 `drizzle-kit generate`)。

- [x] Task 2: Shared Schema Update: 增加字段定义
  - [x] 修改 `packages/shared/src/schemas/regear.ts`，将 `UpdateRegearStatusSchema` 中的 `status` 改为 `.optional()`，并添加 `regearedSlots: z.array(z.string()).optional()`。

- [x] Task 3: Backend API Modification: 处理状态更新逻辑
  - [x] 修改 `apps/api/src/modules/regear/router.ts` 中 `updateStatusHandler`。
  - [x] 在提取请求体时解析 `regearedSlots` 并在更新逻辑里支持只更新 `regearedSlots`。如果传入了 `status` 且与当前记录状态一致，则跳过 `validTransitions` 校验。

- [x] Task 4: Frontend Types & State: 更新记录接口
  - [x] 修改 `apps/web/src/pages/guild-dashboard/tabs/regear-components/types.ts`，在 `RegearRecord` 里增加 `regearedSlots?: string[]` 属性。
  - [x] 修改 `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx` 中的 `fetchTicketData`，从数据库返回的 `regearedSlots` 字段中解析出数组。
  - [x] 在 `fetchPreviewData` 时，给新记录初始化默认值 `regearedSlots: []`。

- [x] Task 5: Frontend UI & Interaction: 渲染绿色蒙层并增加交互
  - [x] 修改 `apps/web/src/pages/guild-dashboard/tabs/regear-components/RegearDetail.tsx`。
  - [x] 在装备展示的 `div` 上添加 `onClick` 事件处理函数，实现乐观更新和 API 调用。
  - [x] 根据 `regearedSlots.includes(slot)` 判断当前栏位是否被勾选，展示绿色的透明蒙层（例如：`<div className="absolute inset-0 bg-emerald-500/40 z-20 pointer-events-none rounded-lg" />`）。

- [x] Task 6: Frontend List & Stats Sync: 同步列表与统计状态
  - [x] 在 `RegearDetail.tsx` 中，删除 `equipmentStatusFilter` 状态，将 “补装物品统计” 模块的筛选逻辑改为依赖 `statusFilter`。
  - [x] 删除底部 “补装物品统计” 区域的状态筛选按钮 UI。
  - [x] 修改 `groupedEquipmentStats` 的计算逻辑，当迭代 `group.records` 聚合装备时，如果该装备的 slot 包含在 `r.regearedSlots` 中，则跳过不计入统计（`if (r.regearedSlots?.includes(eq.slot)) return;`）。
