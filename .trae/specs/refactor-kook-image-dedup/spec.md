# Refactor Kook Image Deduplication Spec

## Why
目前 `KooKMessageBrowserPage.tsx` 中的图片查重逻辑由于多次修改变得复杂且混乱，存在单条消息内部图片错误判重的问题。需要按照清晰、简单的数据流重新实现查重逻辑，确保结果准确并易于维护。

## What Changes
- 重写 `handleCheckDuplicates` 流程，分为清晰的三个步骤：
  1. **统计图片映射**：遍历所有消息，提取图片 URL，并建立 `Map<url, KookMessage[]>` 映射关系（记录哪些消息包含该图片 URL，确保去重）。
  2. **下载与 Hash 计算**：遍历上述映射中的所有唯一 URL，下载图片并计算 Hash。
  3. **分组与展示**：根据算出的 Hash 对 URL 进行分组，找出 Hash 相同的重复组。然后通过之前的映射关系，将 URL 还原回包含该图片的消息列表，展示到页面上。

## Impact
- Affected specs: 简化图片查重逻辑，提高准确性。
- Affected code: `apps/web/src/pages/test/KooKMessageBrowserPage.tsx`

## ADDED Requirements
### Requirement: Refactored Image Deduplication
The system SHALL perform image deduplication strictly following the 3-step pipeline (URL extraction -> Hashing -> Grouping) to prevent false positives within the same message.

#### Scenario: Success case
- **WHEN** user clicks "开始扫描当前消息"
- **THEN** the system groups identical images by Hash correctly without self-duplication within a single message.