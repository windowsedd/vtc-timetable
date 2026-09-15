# Classes API request-time status design

## Goal

Make `GET /api/classes` report a naturally ended class as `FINISHED` using the server time captured for that request. The endpoint remains read-only and does not persist this derived status to MongoDB.

## Status rules

The API derives one effective status for each returned class:

1. Start with the stored status, defaulting a missing value to `UPCOMING`.
2. If that status is `UPCOMING` and `endTime` is equal to or earlier than the request time, return `FINISHED`.
3. Preserve every explicit non-`UPCOMING` status: `FINISHED`, `CANCELED`, `ABSENT`, and `RESCHEDULED`.

The comparison uses the event and request instants, not the `from` or `to` calendar-date parameters and not the client's clock. An event becomes finished at the exact instant represented by `endTime`.

## Payload selection

`classes` continues to include every event overlapping the requested range, in start-time order, with each event's effective status.

`current` is the overlapping event for which `startTime <= now < endTime`, excluding events whose effective status is `FINISHED` or `CANCELED`.

`next` is the first event in the requested range whose `startTime` is later than `now`, excluding events whose effective status is `FINISHED` or `CANCELED`. This ensures that a future event marked `FINISHED` by the existing “finish course early” action is not advertised as the next class.

`ABSENT` and `RESCHEDULED` remain eligible for `current` and `next`, matching the endpoint's existing behavior for all statuses other than `CANCELED` while adding the required handling for `FINISHED`.

## Architecture and data flow

The route captures `now` once before querying, as it does today, and passes that same value into the pure payload builder. The payload builder applies a small pure status-derivation rule while mapping database events to API classes, then uses the resulting effective statuses for `current` and `next` selection.

No database update, cache invalidation, background job, or new endpoint is introduced. The existing authentication, user scoping, date-range validation, locale formatting, projections, response headers, and error responses remain unchanged.

## API contract and documentation

The response shape does not change. The meaning of the existing `status` field is clarified: it is the effective status at `generatedAt`, and an otherwise-upcoming class whose end time has passed is returned as `FINISHED`.

The public API documentation should describe this behavior in every supported locale. No new localized runtime labels are required.

## Verification

Focused unit tests for the pure classes payload builder will cover:

- an upcoming class before its start time;
- a class in progress;
- an `UPCOMING` class exactly at its end time;
- an `UPCOMING` class after its end time;
- preservation of `CANCELED`, `ABSENT`, `RESCHEDULED`, and stored `FINISHED` statuses;
- exclusion of future stored-`FINISHED` and `CANCELED` events from `next`;
- a historical requested range, where naturally ended classes are listed as `FINISHED` while `current` and `next` are null.

After the focused tests, run the repository linter because the implementation changes TypeScript.

## Non-goals

- Persisting naturally finished statuses to MongoDB.
- Adding a scheduled cleanup or status-update job.
- Changing manual status actions or timetable synchronization.
- Changing which events overlap a requested date range.
