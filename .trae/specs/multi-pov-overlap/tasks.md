# Tasks

- [x] Task 1: 优化 PlayerModal 的 Overlap 逻辑
  - [x] SubTask 1.1: 重构 `otherPovs` 的 `useMemo`。
  - [x] SubTask 1.2: 基于真实的 `duration` (如果缺失则给个合理的较小 fallback 如 `1800`秒，或者不展示) 进行 `[start, end]` 交叉计算。
  - [x] SubTask 1.3: 移除 `v.date === mainVideo.date` 作为唯一回退条件的限制，完全依赖绝对时间进行匹配。

- [x] Task 2: 验证更改
  - [x] SubTask 2.1: 运行 `tsc --noEmit` 检查代码正确性。