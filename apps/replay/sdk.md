本文为您介绍如何将 Web 上传 SDK 集成至您的项目，包含引入 SDK、初始化上传配置、添加上传文件、设置监听事件和开始上传等内容。
<span id="78a5be72"></span>
## 前提条件

* 在视频点播控制台[创建空间](https://www.volcengine.com/docs/4/65669)。
* 在视频点播控制台创建应用并获取 App ID。详情请见[应用管理](https://www.volcengine.com/docs/4/79594)。

<span id="引入-sdk"></span>
## 引入 SDK
根据实际需要选择以下任意一种方式引入 SDK。

```mixin-react
return (<Tabs>
<Tabs.TabPane title="使用 npm" key="CXOgIJiwX5"><RenderMd content={`运行以下命令：
\`\`\`Bash
npm install tt-uploader
\`\`\`

`}></RenderMd></Tabs.TabPane>
<Tabs.TabPane title="使用 script 标签" key="Qoz1pQ9MYj"><RenderMd content={`在您的 HTML 文件里添加以下代码：
:::tip
请参见[发布历史](/docs/4/156291)获取 SDK 最新版本号。
:::
\`\`\`HTML
<script src="https://unpkg.com/tt-uploader@{SDK_VERSION}/dist/index.js"></script>
\`\`\`

`}></RenderMd></Tabs.TabPane></Tabs>);
 ```

<span id="初始化上传配置"></span>
## 初始化上传配置
参考以下示例代码始化 `TTUploader` 实例：
```js
import TTUploader from 'tt-uploader';
const uploader = new TTUploader({
  userId: 'xxx', // 建议设置能识别用户的唯一标识 ID，用于上传出错时排查问题，不要传入非 ASCII 编码
  appId: xxx, // 在视频点播控制台应用管理页面创建的应用的 AppID。视频点播的质量监控等都是以这个参数来区分业务方的，务必正确填写
  // 仅视频/普通文件上传时需要配置
  videoConfig: {
    spaceName: 'xxx' //在视频点播控制台创建的空间的名称
  }
});
```

:::tip
* 在视频点播控制台**应用管理**页面创建应用并获取 App ID，详情操作请参见[新建应用](/docs/4/79594)。
* 默认上传的地域为华北 `cn-north-1`。
* 更多初始化配置请见 [initConfig](/docs/4/66560#initconfig)。
:::
<span id="4abc14fd"></span>
## 获取临时上传 Token
上传前，您需要在应用服务端通过视频点播服务端 SDK 签发临时上传 Token，下发给客户端，再设置给 SDK。鉴权参数说明详见[客户端上传](https://www.volcengine.com/docs/4/3151)。
<span id="添加上传文件"></span>
## 添加上传文件
调用 `addFile` 方法添加上传文件，示例代码如下所示。
```javascript
const fileKey = uploader.addFile({
    file: Blob,
    stsToken: token, //从应用服务端获取到的临时上传 token
    type : 'video', // 上传文件类型，四个可选值：video（视频或者音频，默认值），image（图片），object（普通文件，例如字幕），media（素材文件）
});
```

<span id="d08fddb6"></span>
## 设置监听事件
参考以下示例代码设置监听事件：
```javascript
uploader.on('complete', (infor) => {
    console.log('complete');
    console.log(infor.uploadResult);
});

uploader.on('error', (infor) => {
    console.log(infor.extra);
});

uploader.on('progress', (infor) => {
    console.log(infor.percent)
});
```

详情请参见[生命周期](/docs/4/66560#生命周期)。
<span id="开始上传"></span>
## 开始上传
调用 `start` 方法开始上传文件，您需传入[添加上传文件](/docs/4/1222537#添加上传文件)返回的 `filekey` 值。示例代码如下所示。
```javascript
uploader.start(fileKey);
```


本文为您介绍如何通过 Web 上传 SDK 以简单便捷的方式将音频或视频文件上传至视频点播服务。
<span id="初始化上传配置"></span>
## 初始化上传配置
初始化 `TTUploader` 实例时，通过 `initConfig` 进行初始化配置。详细参数说明请见 [initConfig](/docs/4/66560#initconfig)。
```javascript
const uploader = new TTUploader(initConfig);
```

代码示例如下：
```javascript
const uploader = new TTUploader({
    // 必填，在视频点播控制台创建应用并获取 AppID
    appId: '',
    // 必填，建议设置能识别用户的唯一标识 ID，用于上传出错时排查问题，不要传入非 ASCII 编码  
    userId: '',
    // 必填，上传相关配置
    videoConfig: {
        // 必填，上传到的点播空间名
        spaceName: '',
        // 非必填，视频/文件上传后的处理 action 对象，类型是一个数组，有多个处理请求时可以配置多个动作对象。对象中的 input 会被透传到对应的处理服务中
    }
});
```

<span id="3d33c96f"></span>
## 添加上传文件
调用 `addFile` 方法，设置 `stsToken` 签名，同时添加视频上传文件。代码示例如下：
:::warning
请注意，`CurrentTime` 、`ExpiredTime` 、`SessionToken`、`AccessKeyID`、`SecretAccessKey` 参数名称为**驼峰大写**，所有单词的首字母都大写。
:::
```javascript
const fileKey = ttUploader.addFile({
    file: fileList[0],
    stsToken: {   // 从服务端拿到的 ststoken，token 为一个包含多个属性的对象
        CurrentTime: 'xxx',
        ExpiredTime: 'xxx',
        SessionToken: 'xxx',
        AccessKeyID: 'xxx',
        SecretAccessKey: 'xxx'
    }, 
    type : 'video', // 视频须为 video
  });
```

<span id="开始上传"></span>
## 开始上传
调用 `start` 方法开始上传文件您需传入[添加上传文件](/docs/4/1222533#添加上传文件)返回的 `filekey` 值。代码示例如下：
```javascript
uploader.start(fileKey);
```

<span id="设置监听事件"></span>
## 设置监听事件
设置监听事件示例代码如下，具体说明请参见[生命周期](/docs/4/66560#生命周期)。
```javascript
uploader.on('complete', (infor) => {
    console.log('complete');
    console.log(infor.uploadResult);
});

uploader.on('error', (infor) => {
    console.log(infor.extra);
});

uploader.on('progress', (infor) => {
    console.log(infor.percent)
});
```

<span id="3487c567"></span>
## 触发工作流
若您需要在上传后自动执行特定的[工作流](https://www.volcengine.com/docs/4/65675)，调用 `addFile` 方法时可在 `processAction` 数组设置 `Name` 为`StartWorkflow` ，同时在 `Input` 结构体中传入工作流 ID。具体参数说明请参见[接口说明](/docs/4/66560#addfile-fileoption)。
```JavaScript
const filekey = uploader.addFile({
    file: Blob, // 上传文件的 Blob 对象
    stsToken: {},
    type: 'video',
    processAction: [
        {
            Name: 'StartWorkflow', // 触发工作流配置
            Input: {
                TemplateId: '25524a2dae4541db93b2e891d******' // 工作流 ID
            }
        }
    ]
});
console.log(filekey);  // 示例：file_1495442273603_999031
```

<span id="53101818"></span>
## 设置封面图抽帧时间
若您需要设置固定时间点截取视频帧，作为视频的封面图，调用 `addFile` 方法时可在 `processAction` 数组设置 `Name` 为 `Snapshot`，同时在 `Input` 结构体中设置 `SnapshotTime`。具体参数说明请参见[接口说明](/docs/4/66560#addfile-fileoption)。
```JavaScript
const key = uploader.addFile({
    file: Blob, // 上传文件的 Blob 对象
    stsToken: {},
    type: 'video',
    processAction: [
        {
            Name: 'Snapshot',      // 截图配置。默认抽第一帧，可以指定视频时间点抽帧做封面图
            Input: {
                SnapshotTime: 2  // 截图时间，单位为秒
            }
        }
    ]
});
console.log(key);   // 示例：file_1495442273603_999031
```

<span id="fc3db9e7"></span>
## 设置媒资信息
若您需要在上传时设置视频名称、标签、描述或者对视频进行分类，调用 `addFile` 方法时可在 `processAction` 数组设置 `Name` 为`AddOptionInfo` ，同时在 `Input` 结构体中传入相关信息以及分类 ID。音视频的分类是由您自行创建并管理的。您可在视频点播控制台**分类管理**页面创建，或通过 [CreateVideoClassification](https://www.volcengine.com/docs/4/101617) 接口创建。
```JavaScript
const key = uploader.addFile({
    file: Blob, // 上传文件的 Blob 对象
    stsToken: {},
    type: 'video',
    processAction: [
        {
            Name: 'AddOptionInfo',   // 媒资信息
            Input: {
                ClassificationId: '********' // 视频的分类 ID
                Description: '********'   // 视频描述
                Tags: '********'     // 视频标签
                Title: '********'    // 视频名称
        }
    ]
});
console.log(key);   // 示例：file_1495442273603_999031
```

Web 上传 SDK 支持上传视频、图片、普通文件。本文介绍 Web 上传 SDK 的相关参数、方法、生命周期和错误码等内容。
<span id="配置"></span>
## 配置参数
<span id="initconfig"></span>
### initConfig
在初始化 `TTUploader` 实例时，您可以通过 `initConfig` 进行初始化配置。
```javascript
const uploader = new TTUploader(initConfig);
```

`initConfig` 支持的参数如下表所示。

| | | | | | \
|参数 |类型 |是否必传 |默认值 |说明 |
|---|---|---|---|---|
| | | | | | \
|userId |String |是 |null |用户 ID。用于进行单点追踪日志，定位某一个用户的日志，请设置一个唯一 ID。 |
| | | | | | \
|appId |Number |是 |null |应用 ID。用于定位某一条业务线的日志。 |
| | | | | | \
|region |String |否 |`cn-north-1` |上传地域。支持以下取值： |\
| | | | | |\
| | | | |* `cn-north-1`：华北 |\
| | | | |* `ap-southeast-1`：亚太东南（柔佛） |\
| | | | | |\
| | | | |:::warning |\
| | | | |亚太东南（柔佛）地域仅针对企业用户开放。功能支持情况详见[服务地域](/docs/4/1215505)。 |\
| | | | |::: |
| | | | | | \
|videoConfig |[videoConfig](/docs/4/66560#videoconfig) |是 |null |上传视频或普通文件使用到的配置。 |
| | | | | | \
|useFileExtension |Boolean |否 |`false` |是否带上文件扩展名。 |\
| | | | |:::tip |\
| | | | |类型为 `Object` 时，上传设置有效。 |\
| | | | |::: |
| | | | | | \
|useLocalStorage |Boolean |否 |`true` |是否开启本地缓存写入上传信息。默认开启；关闭则断点续传失效。 |
| | | | | | \
|useServerCurrentTime |Boolean |否 |`false` |是否使用 `STSToken` 中的 `CurrentTime` 作为请求时间。该参数取值为 `true` 时，可以避免因为用户本地时间不准确导致的请求过期问题。 |\
| | | | |:::tip |\
| | | | |`CurrentTime` 需为能被 [Date.parse()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Date/parse) 正常解析的日期格式字符串，即 RFC2822 或 ISO 8601。 |\
| | | | |::: |
| | | | | | \
|taskParallelLimit |Number |否 |3 |单个 Uploader 实例下，设置并行上传的文件数量。 |\
| | | | |:::tip |\
| | | | |* 适用于多次调用 `addFile` 方法添加多个文件同时上传的场景。 |\
| | | | |* 添加文件的数量大于该值时会串行排队执行上传。 |\
| | | | |::: |

<span id="videoconfig"></span>
### videoConfig
`videoConfig` 为视频或普通文件上传专用配置，支持的参数如下表所示。

| | | | | | \
|参数 |类型 |是否必传 |默认值 |说明 |
|---|---|---|---|---|
| | | | | | \
|spaceName |String |是 |null |空间名，在[视频点播控制台](https://console.volcengine.com/vod/welcome/)中创建。 |

示例代码如下：
```javascript
videoConfig: {
    spaceName: 'xxx', 
}
```

<span id="方法"></span>
## 方法
本节为您介绍 Web 上传 SDK 提供的方法。
<span id="addfile-fileoption"></span>
### addFile(fileOption)
添加待上传的文件。调用该方法时，您需传入 [fileOption](/docs/4/66560#fileoption)。该方法返回当前文件的 key 值，在启动和取消文件上传时使用。示例代码如下：
```JavaScript
const key = uploader.addFile({
    file: yourFileBlob, // 上传文件的 Blob 对象
    stsToken: {},
    type: 'video',
    processAction: [
        {
            Name: 'StartWorkflow',
            Input: {
                TemplateId: '25524a2dae4541db93b2e891d******' // 工作流 ID
            }
        },
        {
            Name: 'Snapshot',
            Input: {
                SnapshotTime: 2
            }
        }
    ]
});
console.log(key);  // 示例：file_1495442273603_999031
```

<span id="fileoption"></span>
#### fileOption
`fileOption` 支持的参数如下表所示。

| | | | | | \
|参数 |类型 |是否必传 |默认值 |说明 |
|---|---|---|---|---|
| | | | | | \
|file |Blob |是 |null |待上传文件。 |
| | | | | | \
|stsToken |Object |是 |null |临时上传 Token，需由应用服务端下发给客户端。详情请见[客户端上传](https://www.volcengine.com/docs/4/3151)。 |
| | | | | | \
|type |String |否 |`video` |上传文件类型。取值如下： |\
| | | | | |\
| | | | |* `video` |\
| | | | |* `image` |\
| | | | |* `object` |\
| | | | |* `media` |
| | | | | | \
|callbackArgs |String |否 |null |自定义信息。该参数值会通过 [FileUploadComplete](https://www.volcengine.com/docs/4/4655) 回调中的 `CallbackArgs` 参数透传给您的服务端。 |
| | | | | | \
|fileName |String |否 |null |文件路径。文件在视频点播存储中的存储位置，等同于传统对象存储的对象键（ObjectKey）概念。最大不超过 1024 个字符。您可根据业务需求自定义文件路径。 |\
| | | | |:::tip |\
| | | | |* 视频点播的文件路径必须携带文件后缀，例如 `".mp4"`。不强制要求携带文件前缀。 |\
| | | | |* 具体的字符规则，请见[文件命名通用字符规则](/docs/4/1200126)。 |\
| | | | |* 设置 `FileName` 后， 当 `FileName` 相同时，有文件覆盖的风险。您需确保不同文件的 `FileName` 不同。 |\
| | | | |* 传入 `FileName` 后，不需要再传入 `FileExtension` 参数。 |\
| | | | |::: |
| | | | | | \
|fileExtension |String |否 |null |文件后缀。视频点播存储中文件的类型。 |\
| | | | |:::tip |\
| | | | |* 当您传入 `fileExtension` 时，不需要重复传入 `fileName` 参数，视频点播将生成 32 位随机字符串，和您传入的 `fileExtension` 共同拼接成文件路径。 |\
| | | | |* 以 `.` 开头，不超过 8 位。 |\
| | | | |::: |
| | | | | | \
|storageClass |Number |否 |1 |存储类型。取值如下： |\
| | | | | |\
| | | | |* `1`: 标准存储。 |\
| | | | |* `2`: 归档存储。 |
| | | | | | \
|processAction |JSON Array |否 |null |媒资上传后的处理动作对象数组，可用于实现截图、设置媒资信息、触发工作流等功能。详见[上传功能函数说明](https://www.volcengine.com/docs/4/1185644)。 |

<span id="18f28348"></span>
### start(key)
启动上传任务。调用该方法时，您可传入文件的 key 值。如不传，则开始所有文件的上传。示例代码如下：
```javascript
uploader.start();
```

<span id="removefile-key"></span>
### removeFile(key)
移除某个待上传的文件。Key 值从 `addFile` 方法中返回。如果已调用 `start` 开始上传某文件，则必须使用 `cancel` 取消上传。示例代码如下：
```javascript
uploader.removeFile('file_1495442273603_999031');
```

<span id="cancel-key"></span>
### cancel(key)
取消某一文件的上传，同时删除暂存的上传信息。调用该方法时，您可传入文件的 key 值；如不传，则取消所有文件的上传。示例代码如下：
```javascript
uploader.cancel();
```

<span id="pause-key"></span>
### pause(key)
暂停上传，将暂存当前文件的上传信息。调用该方法时，您可传入文件的 key 值；如不传，则暂停所有文件的上传。示例代码如下：
```javascript
uploader.pause();
```

<span id="4db4a463"></span>
### restart(key)
如果上传被暂停，调用此方法将从断点处恢复上传。调用该方法时，您可传入文件的 key 值；如不传，则恢复所有已暂停文件的上传。
```javascript
uploader.restart();
```

<span id="生命周期"></span>
## 生命周期
此处的生命周期是指上传某一个文件时的生命周期，即一个视频上传产品线上的各个任务。
捕获某个生命周期的示例代码如下所示。
```javascript
uploader.on('xxx', function(data) {
    console.log('xxx', data);
});
```

生命周期各阶段如下表所示。

| | | \
|阶段名称 |描述 |
|---|---|
| | | \
|crc32 |文件分片并获取 crc32。完成后得到 crc32Array（crc32 信息数组）和 sliceLength（每个分片的长度）。 |
| | | \
|preUpload |获取视频上传信息。完成后得到 signature（上传签名）、token（complete 时依赖 token）、oid 和 vid。 |
| | | \
|initUploadID |初始化分片上传。完成后得到上传所需的 uploadID。 |
| | | \
|progress |视频并行分片上传进行中。实时更新 percent（总体进度）。 |
| | | \
|fileMerge |分片上传成功，合并文件。 |
| | | \
|complete |视频上传并获取封面完成。部分已开获取分片权限的用户，上传完成后可得到 video、poster 和 speed（上传速度）。 |

<span id="returned-value"></span>
### Returned Value
在捕获每一个生命周期时都可获得描述当前状态的 data 信息，该信息在整个周期中不断完善，最终得到的 data 信息如下表所示：

| | | \
|参数 |描述 |
|---|---|
| | | \
|uploadResult |上传完成后的各种信息，包括 vid，uri 等（complete 获取）。详见 [uploadResult](/docs/4/66560#uploadresult) |
| | | \
|startTime |文件开始上传的时间戳 |
| | | \
|endTime |文件完成上传的时间戳 |
| | | \
|stageStartTime |各阶段开始时间戳 |
| | | \
|stageEndTime |各阶段完成时间戳 |
| | | \
|duration |各阶段持续时间，计算公式：stageEndTime - stageStartTime |
| | | \
|extra |当前状态的描述（随着生命周期不断变化） |
| | | \
|fileSize |当前视频文件大小（crc32 获取） |
| | | \
|key |当前视频文件的 key（addFile 时自动生成） |
| | | \
|oid |存放的文件 ID （preUpload 获取） |
| | | \
|percent |当前上传总体进度百分比（％） |
| | | \
|speed |上传速度，单位为 KB/s，上传成功后计算 |
| | | \
|signature |上传所需的签名信息（preUpload 获取） |
| | | \
|sliceLength |每一个分片的 size（crc32 获取） |
| | | \
|stage |当前所处生命周期，如果是不支持的浏览器，则该值为 'browserError' |
| | | \
|status |文件上传运行状态。取值如下： |\
| | |\
| |* `1`：正在运行。 |\
| |* `2`：代表取消运行。 |\
| |* `3`：暂停运行。 |\
| |* `4`：运行成功。 |\
| |* `5`：运行失败。 |
| | | \
|task |队列实例 |
| | | \
|type |当前任务状态，成功／失败 |
| | | \
|uploadID |上传所需的 uploadID（ initUploadID 获取） |

<span id="uploadresult"></span>
### uploadResult
<span id="视频上传"></span>
#### 视频上传
对于视频上传的返回结果，默认情况下只会返回 Vid，如果想获取详细的视频 meta 信息、封面图，请在上传时添加配置。

| | | | \
|参数 |类型 |描述 |
|---|---|---|
| | | | \
|Vid |String |视频 ID，vid 是视频在视频架构中的唯一 id。 |
| | | | \
|PosterUri |String |封面图 URI，当添加有截取封面信息的配置时返回。 |
| | | | \
|VideoMeta |Object |视频 meta 信息，当添加有获取 meta 信息的配置时返回。 |
| | | | \
|VideoMeta.Duration |Number |视频时长，单位：秒。 |
| | | | \
|VideoMeta.Width |Number |视频宽度。 |
| | | | \
|VideoMeta.Height |Number |视频高度。 |
| | | | \
|VideoMeta.Format |String |视频格式。 |
| | | | \
|VideoMeta.Bitrate |Number |视频码率，单位：bps。 |
| | | | \
|VideoMeta.FileType |String |文件类型。 |
| | | | \
|VideoMeta.Size |Number |视频文件大小。 |
| | | | \
|VideoMeta.Md5 |String |视频文件 MD5 值。 |
| | | | \
|VideoMeta.Uri |String |视频源文件在 TOS 中的 URI，获取视频播放地址请不要使用这种方式访问。 |
| | | | \
|SourceInfo.VodVideoStreamMeta |Object |视频流 meta 信息，当添加有获取 meta 信息的配置时返回。 |
| | | | \
|SourceInfo.VodVideoStreamMeta.Duration |Number |视频时长，单位：秒。 |
| | | | \
|SourceInfo.VodVideoStreamMeta.Width |Number |视频宽度。 |
| | | | \
|SourceInfo.VodVideoStreamMeta.Height |Number |视频高度。 |
| | | | \
|SourceInfo.VodVideoStreamMeta.Codec |String |视频编码格式。 |
| | | | \
|SourceInfo.VodVideoStreamMeta.Bitrate |Number |视频流码率，单位：bps。 |
| | | | \
|SourceInfo.VodVideoStreamMeta.Definition |String |视频清晰度。 |
| | | | \
|SourceInfo.VodVideoStreamMeta.Fps |Number |视频流帧率。 |
| | | | \
|AudioStreamMeta |Object |音频流 meta 信息。 |
| | | | \
|AudioStreamMeta.Code |String |音频编码格式。 |
| | | | \
|AudioStreamMeta.Duration |Number |音频时长。 |
| | | | \
|AudioStreamMeta.SampleRate |Number |音频采样率。 |
| | | | \
|AudioStreamMeta.Bitrate |Number |音频码率，单位：bps。 |
| | | | \
|AudioStreamMeta.Quality |String |音频质量。 |

<span id="普通文件上传"></span>
#### 普通文件上传

| | | | \
|参数 |类型 |描述 |
|---|---|---|
| | | | \
|Uri |String |源文件在 TOS 中的 URI，格式为 bucket/oid。 |
| | | | \
|ObjectMeta |Object |文件 meta 信息，当添加有获取meta信息的配置时返回。 |
| | | | \
|ObjectMeta.Md5 |String |文件 MD5 值。 |
| | | | \
|ObjectMeta.Uri |String |与上层中的 Uri 一致。 |

<span id="错误码"></span>
## 错误码
详见[上传 SDK 错误码](/docs/4/1162070#web)。

