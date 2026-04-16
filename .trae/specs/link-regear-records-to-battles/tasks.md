# Tasks

- [x] Task 1: 数据库新增 `regears.battle_id`
  - [x] SubTask 1.1: 在 `packages/db/src/schema/regear.ts` 的 `regears` 表增加 `battleId` 字段映射到 `battle_id`（可为空以兼容历史数据）
  - [x] SubTask 1.2: 新增 drizzle migration，为 `regears` 表添加 `battle_id` 列，并补充必要索引（如 `regears_battle_id_idx`，若需要）

- [x] Task 2: 更新 shared Schema（**BREAKING**）
  - [x] SubTask 2.1: 修改 `packages/shared/src/schemas/regear.ts` 的 `CreateRegearTicketSchema`：
    - 移除 `battleIds`、`eventIds`
    - 新增 `battleEvents: z.record(z.string(), z.array(z.string()).min(1)).refine(...)`（至少包含 1 个 key）
  - [x] SubTask 2.2: 如有必要，同步调整 `UpdateRegearTicketSchema`（仅当更新接口也需要表达 battle-event 关联时）

- [x] Task 3: 更新 API 创建逻辑（apps/api）
  - [x] SubTask 3.1: 修改 `apps/api/src/modules/regear/router.ts` 的创建 handler，使用 `battleEvents` 生成：
    - `regear_ticket_battles` 插入 battleIds（来自 Object.keys）
    - `regears` 插入 eventIds（来自 Object.entries 展开），并写入 `battleId`
  - [x] SubTask 3.2: 增加基础校验/去重策略（例如展开后 eventId 去重，避免重复插入导致异常）

- [x] Task 4: 更新所有前端调用点（apps/web）
  - [x] SubTask 4.1: 全局检索 `api.guilds[':guildId'].regear.tickets.$post` 的调用点，并记录清单
    - 当前检索结果：仅 1 处
      - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`（创建工单：`handleCreateOrderFromPreview` 内调用）
  - [x] SubTask 4.2: 更新 `RegearTab.tsx` 创建工单请求体
    - 将 `{ battleIds, eventIds }` 改为 `{ battleEvents }`
    - `battleEvents` 由预览 records 构建：`Record<battleId, eventId[]>`
    - 仍保留 `players: Record<eventId, playerName>` 的传递逻辑（如后端仍使用）
  - [x] SubTask 4.3: 为前端预览模式补齐 battle-event 关联信息
    - 在 `apps/web/src/pages/guild-dashboard/tabs/regear-components/types.ts` 为 `RegearRecord` 增加 `battleId?: string`
    - 在 `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx` 的预览生成逻辑（fetch/生成 records 的位置）写入 `record.battleId = 当前 battleId`
  - [x] SubTask 4.4: 保持“非预览创建入口”一致性
    - 若存在其他创建入口（例如未来新增/表单创建），需同样按 `battleEvents` 构造请求体

- [x] Task 5: 验证
  - [x] SubTask 5.1: `apps/web` build 通过（tsc + vite build）
  - [x] SubTask 5.2: `apps/api` TypeScript 检查通过（仓库既有检查命令）

# Task Dependencies
- [Task 3] depends on [Task 1] & [Task 2]
- [Task 4] depends on [Task 2]
- [Task 5] depends on [Task 1-4]
