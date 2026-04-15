# Tasks
- [x] Task 1: 新增补装图识别 consumer 骨架
  - [x] SubTask 1.1: 在 `kook-consumer-worker` 注册 `consumer_id = regear-image-recognition`
  - [x] SubTask 1.2: 实现消息类型识别与图片 URL 提取（type=2 / type=10 container.elements）
  - [x] SubTask 1.3: 为该 consumer 补充最小化日志（msg_id / guild_id / channel_id / imageUrl）

- [x] Task 2: 集成图像识别组件
  - [x] SubTask 2.1: 复用 `packages/shared/src/utils/api_image.ts` 的识别方法（或抽一层 wrapper）
  - [x] SubTask 2.2: 定义“关键字段非空”判定规则（victimName/timestamp）
  - [x] SubTask 2.3: 增加必要的环境变量约定（ARK_API_KEY、MODEL_ID 等）并更新 consumer-worker 配置说明

- [x] Task 3: 调用 apps/api 创建 regear_apply
  - [x] SubTask 3.1: consumer-worker 内新增 `API_BASE_URL` 与 `INTERNAL_API_TOKEN` 环境变量读取
  - [x] SubTask 3.2: 调用 `POST /regear_applies` 写入申请（映射 msg 字段 + applyDetail）
  - [x] SubTask 3.3:（可选）通过 msgId 做幂等：若已创建过则跳过

- [x] Task 4: apps/api 增加 regear_apply 内部鉴权入口
  - [x] SubTask 4.1: 新增 internal auth middleware（`Authorization: Bearer <INTERNAL_API_TOKEN>`）
  - [x] SubTask 4.2: 在 `POST /regear_applies` 路由上允许 internal auth（保留现有用户 auth）

- [x] Task 5: 验证与最小联调
  - [x] SubTask 5.1: 为 consumer-worker 增加一个本地可运行的事件样例（单元测试或脚本）
  - [x] SubTask 5.2: 本地运行 tsc，确保两个 apps 都无类型错误

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2 and Task 4
- Task 5 depends on Task 1-4
