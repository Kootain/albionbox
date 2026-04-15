# Tasks

- [ ] Task 0: 同步 origin/dev 最新代码（合并前置）
  - [ ] SubTask 0.1: 拉取远端并将当前分支基于 origin/dev 更新（rebase/merge 由现有团队流程决定）
  - [ ] SubTask 0.2: 解决冲突并确保 `apps/api` 可构建
  - [x] SubTask 0.3: 已尝试 rebase origin/dev，但出现大量 add/add 冲突，已中止（本次变更基于当前分支继续）

- [x] Task 1: 为 apps/api 引入 KOOK SDK 并封装 reaction 调用
  - [x] SubTask 1.1: 若 `apps/api` 未依赖 `@kookapp/js-sdk`，则在 `apps/api/package.json` 增加依赖并安装
  - [x] SubTask 1.2: 新增最小封装（例如 `apps/api/src/lib/kook-sdk.ts`），提供 `addReaction({ msgId, emoji })`
  - [x] SubTask 1.3: 对 KOOK token 缺失/请求失败进行错误隔离（抛出或返回失败结果由调用方处理）

- [x] Task 2: cron 绑定成功后添加 reaction
  - [x] SubTask 2.1: 在 `apps/api/src/modules/cron_regear_apply_binder.ts` 的绑定成功分支（写回 DB 后）调用 `addReaction`
  - [x] SubTask 2.2: reaction 仅在 `apply.msgId` 存在时触发；失败不影响绑定成功统计与状态推进

- [x] Task 3: 验证
  - [x] SubTask 3.1: 扩展 `apps/api/scripts/regear-apply-binder-smoke.ts`，新增对 reaction 封装的最小验证（例如对 request 参数组装/返回分支进行断言）
  - [x] SubTask 3.2: `pnpm --filter api run cf-typegen` 与 `pnpm --filter api exec tsc -p tsconfig.json --noEmit` 通过（使用仓库既有命令）

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1] & [Task 2]
