# Tasks
- [x] Task 1: Refactor the Deduplication Logic
  - [x] SubTask 1.1: Replace the existing `handleCheckDuplicates` logic with the new 3-step pipeline.
  - [x] SubTask 1.2: Step 1 - Extract all image URLs from messages and build a mapping of `url -> KookMessage[]` (using a Map to ensure unique URLs and distinct messages).
  - [x] SubTask 1.3: Step 2 - Iterate over the unique URLs, download the image (via proxied URL), and calculate the SHA-256 hash. Build a mapping of `url -> hash`.
  - [x] SubTask 1.4: Step 3 - Group the URLs by their Hash. For groups with more than one URL (or a single URL shared by multiple messages), combine the associated messages and render the result.
  - [x] SubTask 1.5: Remove or simplify the old complex `hashedImages` logic and idx handling, focusing purely on URL-based hashing.