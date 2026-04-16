# 火山引擎 VOD 鉴权 Worker API 文档

**Base URL**: `http://<your-worker-domain>`

所有接口均已配置跨域 (CORS) 头部，支持前端（如 React）直接调用。支持 `GET`, `POST`, `OPTIONS` 方法。

---

## 1. 获取临时上传 Token

用于客户端直传文件到火山引擎视频点播（VOD）。

- **URL**: `/api/vod/upload-token`
- **Method**: `GET`
- **Query Parameters**: 无

**Success Response (200 OK)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "..."
  }
}
```

---

## 2. 签发临时播放 Token

用于客户端播放器自动获取播放地址进行播放。Token 默认有效期为 3600 秒。

- **URL**: `/api/vod/play-token`
- **Method**: `GET`
- **Query Parameters**:
  - `Vid` (必填, String): 视频 ID。
  - `FileType` (选填, String): 流文件类型（默认 `video`。支持：evideo, eaudio, video, audio）。
  - `Quality` (选填, String): 音频音质参数（medium, higher, highest）。
  - `Definition` (选填, String): 视频流清晰度（240p, 360p, 480p, 540p, 720p, 1080p, 2k, 4k）。
  - `Format` (选填, String): 封装格式。
  - `Codec` (选填, String): 编码格式。
  - `LogoType` (选填, String): 水印贴片标签。
  - `Ssl` (选填, String): 是否返回 HTTPS 播放地址 (1-是, 0-否)。
  - `NeedThumbs` (选填, String): 是否返回雪碧图 (1-是, 0-否)。
  - `NeedBarrageMask` (选填, String): 是否需要蒙版弹幕 (1-是, 0-否)。
  - `UnionInfo` (选填, String): 播放端唯一性标识（加密音视频使用）。
  - `DrmExpireTimestamp` (选填, String): DRM 过期时间戳（秒级）。
  - `HDRDefinition` (选填, String): HDR 清晰度查询。
  - `PlayScene` (选填, String): 播放场景（如 `preview`-试看）。

**Success Response (200 OK)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "..."
  }
}
```

---

## 3. 获取播放地址

根据视频 ID 直接获取该视频的播放地址及详细信息。

- **URL**: `/api/vod/play-info`
- **Method**: `GET`
- **Query Parameters**:
  - `Vid` (必填, String): 视频 ID。

**Success Response (200 OK)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "Result": {
      "Vid": "...",
      "Status": 1,
      "PlayInfoList": [
         // ... 火山引擎返回的播放信息字段
      ]
    }
  }
}
```

---

## 4. 签发私有加密 Token (DRM)

用于 Web 播放器 SDK 播放私有加密视频。Token 默认有效期为 3600 秒。

- **URL**: `/api/vod/private-drm-token`
- **Method**: `GET`
- **Query Parameters**:
  - `Vid` (必填, String): 视频 ID。
  - `DrmType` (选填, String): DRM 类型，默认为 `webdevice`。
  - `PlayAuthIds` (选填, String): 播放许可 ID 列表，以逗号分割。
  - `UnionInfo` (选填, String): 播放端唯一性标识。

**Success Response (200 OK)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "..."
  }
}
```

---

## 错误响应规范

所有接口发生错误或缺失参数时，将返回 `400` 或 `500` HTTP 状态码，并采用以下统一的数据结构：

**Error Response (400 Bad Request)** - 缺少必填参数:
```json
{
  "code": 400,
  "message": "Missing required parameter: Vid"
}
```

**Error Response (500 Internal Server Error)** - 服务端或 SDK 错误:
```json
{
  "code": 500,
  "message": "Failed to generate play token",
  "error": "Detailed error message from SDK"
}
```
