# Support Mock Raw Event in KOOK Consumer Worker Spec

## Why
Currently, the `kook-consumer-worker` has an endpoint to simulate message-to-event conversions, but it is hardcoded to a specific consumer (`regearImageRecognitionConsumer`). We need a way to mock and send raw KOOK events (such as system messages or reactions) directly from the UI to test different consumers without needing actual KOOK activity.

## What Changes
- Add a new section in the worker's frontend UI to send mock raw events.
- The UI will allow selecting a specific consumer and inputting a raw event JSON payload.
- Update the API to support a `consumer_id` field for routing the event to the correct consumer.
- Maintain backwards compatibility by defaulting to the previously hardcoded consumer (`regearImageRecognitionConsumer`) if no `consumer_id` is provided.
- Add a new API endpoint `/api/consumer/raw_event` to directly accept and process raw events.

## Impact
- Affected specs: `kook-consumer-worker` mock testing capabilities.
- Affected code:
  - `apps/kook-consumer-worker/src/router.ts`
  - `apps/kook-consumer-worker/src/frontend.ts`

## ADDED Requirements
### Requirement: Mock Raw Event API
The system SHALL provide an API endpoint `/api/consumer/raw_event` that accepts a JSON payload containing `event` (the raw KOOK event data) and an optional `consumer_id`.

#### Scenario: Success case
- **WHEN** a user sends a POST request to `/api/consumer/raw_event` with a valid JSON payload and `consumer_id`
- **THEN** the event is routed to the specified consumer and processed successfully.

### Requirement: Send Mock Raw Event UI
The system SHALL provide a UI section on the worker's frontend page to send mock raw events.

#### Scenario: Success case
- **WHEN** a user selects a consumer, pastes a raw KOOK event JSON into the textarea, and clicks "Send Raw Event"
- **THEN** the payload is sent to the `/api/consumer/raw_event` API and a success message is displayed.

## MODIFIED Requirements
### Requirement: Message to Event API
The existing `/api/consumer/message_to_event` API SHALL support an optional `consumer_id` parameter to route the generated event to a specific consumer.

#### Scenario: Backwards Compatibility
- **WHEN** a request is made to `/api/consumer/message_to_event` or `/api/consumer/raw_event` without a `consumer_id`
- **THEN** the system SHALL default to using `regear_image_recognition` as the consumer to preserve existing behavior.
