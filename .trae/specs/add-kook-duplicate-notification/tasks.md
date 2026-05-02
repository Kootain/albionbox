# Tasks
- [x] Task 1: Add UI element for notification
  - [x] SubTask 1.1: 在每一个图片重复分组（`duplicateGroups.map`）的操作区（如在“标记重复项 (🔁)”旁边），添加一个 “通知重复作者” 的按钮。
- [x] Task 2: Implement Notification Logic
  - [x] SubTask 2.1: 在 `KooKMessageBrowserPage.tsx` 中编写一个 `handleNotifyDuplicates(group)` 方法。
  - [x] SubTask 2.2: 方法触发时调用 `window.prompt` 获取自定义通知文本（例如默认："您发送的图片已经被提交过了，请勿重复提交。"）。
  - [x] SubTask 2.3: 获取该分组里除了首发消息（`index === 0`）之外的重复消息列表，并根据 `msg.id` 进行去重（同一条消息不发两遍）。
  - [x] SubTask 2.4: 遍历这些需要通知的消息，通过 `api.kook.messages.send` 接口发送消息，消息内容包含 `(met)${msg.author.id}(met)` 以 @作者，以及用户输入的文本，并带上 `quote` 引用该重复消息 `msg.id`。
  - [x] SubTask 2.5: 记录发送状态，最后通过 `showToast` 显示成功/失败的通知总数。