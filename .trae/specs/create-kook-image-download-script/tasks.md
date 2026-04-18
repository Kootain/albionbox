# Tasks
- [x] Task 1: 实现 KOOK 频道图片下载脚本
  - [x] SubTask 1.1: 在 `packages/shared/src/utils/test-kookimage-download.ts` 中引入必要的依赖（如 `@kookapp/js-sdk`, `fs`, `path`, `dotenv`）。
  - [x] SubTask 1.2: 实现兼容 API 返回格式的图片 URL 提取逻辑，参考 `extractImageUrlsFromKookMessageEvent`，但适配 API 的 Message 对象结构。
  - [x] SubTask 1.3: 使用 `RestClient` 循环调用 `/api/v3/message/list` 获取目标频道的全量消息（处理分页逻辑）。
- [x] Task 2: 增加图片重复性检查模块
  - [x] SubTask 2.1: 在脚本中增加 `checkDuplicates` 函数，读取目录下文件并计算 sha256 hash
  - [x] SubTask 2.2: 使用 Map 存储相同 Hash 的文件列表，输出重复文件名对
  - [x] SubTask 2.3: 在 `main` 中增加参数解析逻辑，支持 `check [目录]` 命令