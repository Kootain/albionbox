# Kook Image Download Script Spec

## Why
需要学习并理解 `apps/kook-consumer-worker` 中对于 KOOK 消息图片解析的逻辑，并基于该逻辑，编写一个一次性脚本，使用 KOOK SDK 的 `RestClient` 获取指定频道（Guild Channel）的历史消息，并将包含的图片全部拉取（下载）下来。

## What Changes
- 编写 `packages/shared/src/utils/test-kookimage-download.ts` 脚本。
- 脚本中实现提取图片的逻辑：参考 `regear_image_recognition.ts` 中的逻辑。Consumer Worker 中的 `type === 2` (图片) content 直接是 URL，`type === 10` (卡片) content 是 JSON 字符串。API 拉回来的消息结构略有不同，但 `type` 和 `content` 的核心结构相似，需要兼容 API 返回的 Message 格式。
- 使用 `@kookapp/js-sdk` 的 `RestClient` 分页请求 `/api/v3/message/list`，获取频道内的所有历史消息。
- 提取消息中的所有图片 URL，并将其下载保存到本地 `downloads` 目录。
- 增加图片去重检查模块，读取本地目录中的文件，使用 node `crypto` 模块计算 SHA-256 哈希值，识别并输出重复图片名单。

## Impact
- Affected specs: 这是一个独立的测试/辅助脚本，不影响现有生产逻辑。
- Affected code: `packages/shared/src/utils/test-kookimage-download.ts`

## ADDED Requirements
### Requirement: Kook Channel Image Downloader and Checker
系统应提供一个可执行的 TypeScript 脚本，用于从指定 KOOK 频道下载所有图片，并可验证已下载文件的重复性。

#### Scenario: Success case (Download)
- **WHEN** 运行该脚本并提供合法的 `KOOK_TOKEN` 和 `CHANNEL_ID` 时
- **THEN** 脚本应通过 RestClient 分页拉取所有的频道消息。
- **THEN** 脚本应正确解析 `type=2` (图片) 和 `type=10` (卡片) 类型的消息，提取图片 URL。
- **THEN** 脚本应将图片下载至本地 `downloads` 文件夹，并以特定的命名格式（如消息ID-序号）保存。

#### Scenario: Success case (Check Duplicates)
- **WHEN** 运行该脚本，并传入 `check [目录]` 参数时
- **THEN** 脚本将计算目录中每个文件的 Hash
- **THEN** 脚本应在终端输出拥有相同 Hash 值的重复文件名对。