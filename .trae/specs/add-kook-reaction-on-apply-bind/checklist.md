- [ ] `apps/api` 已具备可用的 KOOK reaction 调用封装（基于 KOOK SDK，使用 `KOOK_BOT_TOKEN`）。
- [ ] cron 绑定成功后会对 apply 的 `msg_id` 添加 `🔗` reaction；缺少 `msg_id` 时跳过。
- [ ] KOOK reaction 失败不会回滚/影响 apply 的绑定结果与状态推进。
- [ ] smoke 脚本覆盖 reaction 封装的最小验证，并可运行通过。
- [ ] `apps/api` 类型生成与 TypeScript 检查通过（使用仓库既有命令）。

