# Add Kook Duplicate Notification Spec

## Why
在对 Kook 消息里的图片进行查重后，需要能通知重复图片发送者（即消息作者）。为了提高管理效率，系统应该提供一键通知（并附带自定义文本）的功能。

## What Changes
- 在查重分组的每一组重复项旁边，增加一个 “通知作者” 的操作按钮。
- 点击“通知作者”时，弹出输入框（Prompt）让用户填写想要回复/通知的附加内容（可以预设一个默认模板如“您发送的图片与之前的重复”）。
- 使用 Kook SDK / API （如 `kook.messages.send` 或者带引用的回复接口），对该组内**所有被判定为重复**的消息（跳过首发原图）的作者进行 `@` 提及并发送通知内容。
- 展示通知成功或失败的状态。

## Impact
- Affected specs: 拓展图片查重的后续管理能力。
- Affected code: `apps/web/src/pages/test/KooKMessageBrowserPage.tsx`

## ADDED Requirements
### Requirement: Notify duplicate message authors
The system SHALL provide a feature to send custom notifications mentioning the authors of duplicated messages.

#### Scenario: Success case
- **WHEN** user clicks "通知作者" on a duplicate group and inputs text
- **THEN** the system iterates over the duplicated messages (skipping the original first message).
- **THEN** the system sends a reply message to the Kook channel, mentioning the author (`(met)${authorId}(met)`) and attaching the user's custom text.
- **THEN** a success toast is shown indicating how many authors were notified.