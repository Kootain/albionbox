# Regear Apply Module Spec

## Why
需要与第三方平台（如 KOOK、Discord）对接，将平台中的补装贴图消息同步为补装申请（regear apply）。当补装申请与系统内的战斗记录匹配后，会转换成一条有效的补装（regear）记录。为了支持该业务流，需要建立 `regear_apply` 模块。

## What Changes
- 在 `@albionbox/db` 中新增 `regear_applies` 表结构。
- 在 `@albionbox/shared` 中新增对应的 Zod Schema 定义和 TypeScript 类型。
- 在 `apps/api` 中新增 `regear_apply` 相关的 API 路由和逻辑：
  - 创建申请 (Create)
  - 删除申请 (Delete)
  - 更新状态 (Update status)
  - 绑定 regear 记录 (Bind regear)
  - 更新 apply_detail (Update detail)

## Impact
- Affected specs: 补装管理流程
- Affected code:
  - `packages/db/src/schema/regear_apply.ts`
  - `packages/db/src/schema/index.ts`
  - `packages/shared/src/schemas/regear_apply.ts`
  - `packages/shared/src/index.ts`
  - `apps/api/src/modules/regear_apply/router.ts`
  - `apps/api/src/index.ts`

## ADDED Requirements
### Requirement: 补装申请数据持久化
系统必须能够持久化来自第三方平台的补装申请，包含原始消息的各种元信息及解析出的游戏内战斗详情。

### Requirement: 补装申请生命周期管理
系统必须提供管理补装申请的 API 接口，包括：
- 创建接口：接收第三方 webhook 同步的消息并创建申请。
- 更新状态接口：流转申请状态 ('binding', 'bind_failed', 'pending_audit', 'pending_regear', 'reject', 'done')。
- 绑定接口：将申请与某条有效的 `regear_id` 绑定。
- 更新详情接口：在 OCR/图像解析完成后，异步更新 `apply_detail`。
- 删除接口：删除失效或错误的申请。
