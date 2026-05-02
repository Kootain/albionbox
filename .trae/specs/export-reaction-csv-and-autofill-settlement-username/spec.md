# 表情奖励 CSV 导出与结算导入自动补全用户名 Spec

## Why
目前 `test/kook-messages` 的“表情回复分析与奖励计算”结果只能在页面查看，无法直接进入“结算奖励”流程；同时结算资源导入 CSV 常常只有 kookId/discordId 而缺少 username，导致结算明细里无法展示玩家名。

## What Changes
- 在 `test/kook-messages` 的“表情回复分析与奖励计算”模块增加“导出 CSV”能力：
  - 导出格式与结算模块资源导入 CSV 格式一致：`username,kookId,discordId,green,blue,purple,gold`。
  - `green/blue/purple/gold` 分别对应 `🟢/🔵/🟣/🟡` 的计数。
- 在“奖励结算模块”的 CSV 导入流程中，支持用已绑定的 `username ↔ kookId` 映射自动补全 `username`：
  - 当导入行的 `username` 为空且 `kookId` 存在时，自动填充 username。
  - 映射来源：`GET /guilds/:id/provider_bindings?provider=kook`（使用 `gameAccountUsername`）。

## Impact
- Affected specs: test/kook-messages 的结果复用；结算模块导入数据质量提升。
- Affected code:
  - `apps/web/src/pages/test/KookMessageBrowserPage.tsx`（导出按钮与 CSV 生成）
  - `apps/web/src/pages/guild-dashboard/tabs/SettlementsTab.tsx`（导入 CSV 后 username 自动补全）
  - `apps/api/src/modules/guilds/guild_members.router.ts`（复用现有 provider_bindings API，不新增接口）

## ADDED Requirements
### Requirement: 表情统计 CSV 导出
The system SHALL allow users to export reaction analysis results to a CSV compatible with settlement resource import.

#### CSV Format
- Header: `username,kookId,discordId,green,blue,purple,gold`
- Row mapping:
  - `green` = count of `🟢`
  - `blue` = count of `🔵`
  - `purple` = count of `🟣`
  - `gold` = count of `🟡`
  - `kookId` = 当前统计用户的 KOOK 用户 ID（若可得）
  - `discordId` 留空（保留字段）
  - `username`：
    - 若能通过绑定关系解析出游戏角色名，则填 `gameAccountUsername`
    - 否则留空

#### Scenario: Success case
- **WHEN** 用户完成表情分析并点击“导出 CSV”
- **THEN** 浏览器下载一个 `.csv` 文件，内容符合上述格式且包含所有已参与统计的用户行

### Requirement: 结算导入自动补全 username
The system SHALL autofill `username` for imported settlement CSV rows using guild provider bindings.

#### Behavior
- **WHEN** 用户在结算模块导入 CSV（能量核心/力量水晶导入表）完成解析后
- **AND** 当前选择的工会为 `guildId`
- **THEN** 前端 SHALL 拉取 `GET /guilds/:guildId/provider_bindings?provider=kook`
- **AND** 对每一行导入数据：
  - 若 `row.username` 为空且 `row.kookId` 非空：
    - 若存在 `bindings[row.kookId] = gameAccountUsername`，则写入 `row.username = gameAccountUsername`
  - 其他情况不修改

#### Scenario: Success case
- **WHEN** 用户导入一份只包含 kookId 与数量列的 CSV
- **AND** 这些 kookId 在该工会已经绑定到游戏角色
- **THEN** 导入表预览/导入行数统计中，username 会被自动填上并随创建结算一起提交

## MODIFIED Requirements
### Requirement: 结算资源导入 CSV 解析流程
现有 CSV 解析流程在成功解析后新增一次“基于工会绑定补全 username”的步骤（仅补全，不改变行数、不新增/删除行）。

## REMOVED Requirements
### Requirement: 无
**Reason**: 不移除既有功能。
**Migration**: 无。

