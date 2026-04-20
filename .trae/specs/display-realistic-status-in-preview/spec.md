# Display Realistic Status in Preview Spec

## Why
在补装 Preview 页面，之前会在生成列表时直接把在别的工单中“处理中（非 excluded）”的记录过滤掉不显示。但用户的诉求是：希望在预览时能**看到所有的死亡记录及其真实状态**，不要隐藏它们；仅仅是在**创建工单**的时候将那些已经有（非 excluded）状态的工单拦截掉、不重复创建即可。

## What Changes
- **前端 `RegearTab.tsx`**：
  - 恢复原先的逻辑：不在 `generatedRecords` 的生成阶段过滤非 excluded 记录。
  - 读取到的 `existingRegears` 将会把其真实状态（包括 `pending_review`, `pending_regear`, `completed` 等）赋值到预览列表中。
  - 对于已经存在且状态不是 `excluded` 的记录，在前端将其 `regearedSlots` 也一并读取赋值过来，方便界面展示。
- **后端 `apps/api/src/modules/regear/router.ts`**：
  - 原本逻辑已经实现：通过 `ne(regears.status, 'excluded')` 找出了 `existing`。在遍历传入的事件准备入库时，通过 `if (existing.some(e => e.eventId === eventId)) return;` 进行了直接的拦截（丢弃）。因此**不需要**改动后端 API，它本身已经支持只拦截、不抛错地忽略已存在的记录。

## Impact
- Affected code:
  - `apps/web/src/pages/guild-dashboard/tabs/RegearTab.tsx`

## ADDED Requirements
### Requirement: 预览展现真实状态
系统 SHALL 在预览页面展示该场战斗产生的所有本公会玩家死亡记录，并附带它们在系统内真实的补装状态，不做隐藏过滤。

#### Scenario: 预览数据合并
- **WHEN** 用户触发补装预览
- **THEN** 即使该记录已经在其他工单中变为了 `pending_regear` 甚至 `completed`，它也会展示在列表中并反映对应状态。

### Requirement: 创建工单时拦截
系统 SHALL 在创建工单时忽略已经在系统中且非 `excluded` 的事件。

#### Scenario: 拦截重复记录
- **WHEN** 客户端提交创建工单请求，其中包含已处于 `completed` 的 eventId
- **THEN** 后端 API 不抛出错误，但会自动跳过为该 eventId 再次创建 `regears` 记录，正常完成剩余记录的落库。