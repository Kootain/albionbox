# Tasks

- [ ] Task 1: 优化 VideoCard 封面与尺寸
  - [ ] SubTask 1.1: 在 `VideoCard.tsx` 中，将原有的 `h-[110px]` 调整为相对更紧凑的尺寸（例如 `aspect-video` 或者适当减小固定高度）。
  - [ ] SubTask 1.2: 在封面区域内，使用 `username` 的前两个字母或者直接居中展示 `username` 作为一个设计感的文字背景。

- [ ] Task 2: 修复 PlayerModal 底部响应式
  - [ ] SubTask 2.1: 在 `PlayerModal.tsx` 底部控制栏外层添加 `flex-wrap` 或者允许横向滚动的容器类，防止极端窄屏下的挤压。
  - [ ] SubTask 2.2: 在每个按钮元素（如 "UTC 对齐", "其他视角", "全屏" 等）上添加 `whitespace-nowrap` 防止文字竖向折行。
  - [ ] SubTask 2.3: 在移动端（`sm:` 之前）隐藏非必须的文字，或者减小按钮的 padding 和字体大小。

- [ ] Task 3: 验证修改
  - [ ] SubTask 3.1: 确保改动不破坏原有的功能逻辑，运行 `tsc --noEmit` 检查。