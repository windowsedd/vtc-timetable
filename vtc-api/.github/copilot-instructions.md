# Moodle Timetable to ICS Converter

## Project Overview

This repository converts VTC mobile API timetable data into structured JSON and, when the missing ICS generator is restored, calendar exports. The current workspace is TypeScript-first and centered on the code in `src/`.

## Current Layout

### Core files

- `src/core/api.ts`: VTC mobile API wrapper.
- `src/core/utils.ts`: semester fetch and JSON export logic.
- `src/types/`: API response and shared data interfaces.
- `src/index.ts`: entry module that re-exports `API`, `Icsgenerator`, and `utils`.

### Data files

- `data/timetable_YYYY_M.json`: month-by-month API captures.
- `data/semester_N_combined.json`: merged semester payload.
- `data/class_attendance_list.json`: cached attendance data.
- `combined.json`: local sample merged data.

## Important Constraints

- Treat the workspace as TypeScript-only; do not assume legacy root-level JavaScript scripts exist.
- `src/index.ts` still imports `./core/ics`, but `src/core/ics.ts` is not present in the workspace. Treat that as stale scaffolding unless the generator is intentionally reintroduced.
- Preserve the current file and JSON output shapes when making changes.
- Prefer narrow, typed edits over broad refactors.

## API Conventions

The VTC API base URL is `https://mobile.vtc.edu.hk/api?cmd=...&token=...`.

Methods currently wrapped in `src/core/api.ts`:

- `getTimeTableAndReminderList(month, year)`.
- `getMoodleTimetable(isPlural, month, year)`.
- `getClassAttendanceList()`.
- `getClassAttendanceDetail(courseCode)`.
- `checkAccessToken()`.

All responses follow the same pattern: `isSuccess`, `errorCode`, `errorMsg`, and `payload`.

## Data Model

Shared timetable entries use `combinedData` in `src/types/combined.ts` and the same shape appears in the timetable response types:

- `id`
- `courseCode`
- `courseTitle`
- `lessonType`
- `campusCode`
- `roomNum`
- `weekNum`
- `lecturerName`
- `startTime`
- `endTime`

`startTime` and `endTime` are Unix timestamps in seconds.

## Semester Logic

`src/core/utils.ts` defines three semester buckets:

- Semester 1: September to December.
- Semester 2: January to April.
- Semester 3: May to August.

When extending this logic, keep the existing `semster_timetable` name unless you are intentionally renaming it everywhere.

## Editing Rules For Copilot

- Add or update types in `src/types/` before wiring new API behavior.
- Keep API method signatures explicit and return typed promises.
- Avoid introducing `any` in new code.
- Use `fetch` and the built-in Node runtime APIs; Node 18+ is assumed.
- Remember that API timestamps are in seconds, while date libraries and calendar APIs often want milliseconds.

## Known Issues

- `src/types/getTimeTableAndReminderList.ts` still uses `any[]` for `delete` and `update` arrays.
- `src/index.ts` references a missing `src/core/ics.ts` module.
- The workspace currently has no formal test suite.

## Common Tasks

- To add an API endpoint, define the response type in `src/types/`, add the wrapper in `src/core/api.ts`, then expose it from the caller that needs it.
- To fetch a different semester, call `semster_timetable(client, semesterNumber)` with `1`, `2`, or `3`.
- To inspect generated or cached data, read the JSON files under `data/` rather than reconstructing the API payload from scratch.
