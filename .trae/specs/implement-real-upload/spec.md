# Implement Real Upload Spec

## Why
当前 `/apps/replay-v2` 的上传功能 (`UploadModal.tsx`) 是将视频直接存储到浏览器的本地 IndexedDB 中 (`storeVideoBlob`)，这只能供当前浏览器单机查看。为了支持真实的云端存储、多人共享，需要参考 `/apps/replay` 下的 `UploadPage.tsx`，将火山引擎 (Volcengine VOD) 的真实上传逻辑（使用 `tt-uploader`）移植并替换现有的上传逻辑。

## What Changes
- 在 `/apps/replay-v2` 中引入 `tt-uploader` 依赖。
- 修改 `VideoRecord` 数据结构，增加 `vid?: string` 字段以存储火山引擎返回的视频唯一标识。
- 在 `UploadModal.tsx` 中集成 `TTUploader`：
  - 实现从远程鉴权服务器获取 STS Token (`fetchStsToken`) 的逻辑。
  - 使用 `TTUploader` 实例化并上传视频文件。
  - 增加上传进度的 UI 状态（0-100%）。
  - 在上传成功后，获取 `uploadResult.Vid` 并存储至元数据中，**不再调用 `storeVideoBlob`**。

## Impact
- Affected specs: 上传流程转为云端上传，依赖网络状况。
- Affected code:
  - `apps/replay-v2/package.json`
  - `apps/replay-v2/src/types/index.ts`
  - `apps/replay-v2/src/components/modals/UploadModal.tsx`

## ADDED Requirements
### Requirement: 真实火山引擎 VOD 上传
系统必须通过 `TTUploader` 将视频分片上传至火山引擎。

#### Scenario: Success case
- **WHEN** 用户选择文件，填写 PlayerId/Role/Date 后点击“上传”
- **THEN** 按钮变为不可用，显示上传进度条（如 0% -> 100%）。完成后，记录包含 `vid` 的数据到本地 DB 并关闭弹窗。

## MODIFIED Requirements
### Requirement: 移除本地 Blob 存储
由于替换为真实上传，上传过程**不再**调用 `storeVideoBlob(blobId, file)`。为了兼容原有字段结构，`blobId` 可保留一个以 `remote_` 开头的占位符。

## REMOVED Requirements
### Requirement: 单机本地上传
**Reason**: 业务需要将视频存储在云端进行团队复盘分享。
**Migration**: 原本调用 `storeVideoBlob` 的逻辑直接删除，替换为 `uploader.start()` 流程。