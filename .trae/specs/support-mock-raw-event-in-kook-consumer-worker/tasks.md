# Tasks
- [x] Task 1: Update API router to support `consumer_id` routing and raw events
  - [x] SubTask 1.1: Modify `/api/consumer/message_to_event` to accept an optional `consumer_id` in its schema and route the event using the `registry`.
  - [x] SubTask 1.2: Add fallback logic to use `regearImageRecognitionConsumer` if `consumer_id` is omitted.
  - [x] SubTask 1.3: Create a new POST endpoint `/api/consumer/raw_event` that accepts an optional `consumer_id` and an `event` object, and routes it accordingly.
- [x] Task 2: Add "Send Mock Raw Event" UI to frontend
  - [x] SubTask 2.1: Add a new section in `frontend.ts` with a form containing a consumer select dropdown, a JSON textarea for the event payload, and a submit button.
  - [x] SubTask 2.2: Add JavaScript logic to populate the consumer select dropdown and handle the form submission, sending a POST request to `/api/consumer/raw_event`.
  - [x] SubTask 2.3: Add success/error message display logic for the mock event submission.
