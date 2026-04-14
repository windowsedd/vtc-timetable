# VTC Timetable - Copilot Instructions

## Project Summary

This is a Next.js 16 (App Router) web app for VTC students.
Primary capabilities:

- Sync timetable and attendance from VTC mobile API.
- Store synced data in MongoDB.
- Render timetable and attendance insights in the UI.
- Support Discord OAuth and optional email/password login.
- Export and subscribe to calendar feeds.

Data flow is:

```text
VTC API -> Server Actions -> MongoDB -> Client UI
```

Important: UI reads persisted database data, not live API payloads.

## Clean Structure Snapshot

Use this command when reviewing the repo:

```bash
tree -I "node_modules|.git|.next|.dart_tool|build|data" -L 4 src vtc-api
```

Notes:

- `data` is excluded on purpose to ignore `vtc-api/data` fixture files.
- Keep focus on app code in `src` and API client code in `vtc-api/src`.

## Current Project Tree (High Level)

```text
src
├── app
│   ├── actions
│   │   └── settings.ts
│   ├── actions.ts
│   ├── api
│   │   ├── auth
│   │   │   └── [...nextauth]
│   │   └── calendar
│   │       └── [discordId]
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── settings
│       └── page.tsx
├── auth.ts
├── components
│   ├── AttendanceModal.tsx
│   ├── BackgroundSync.tsx
│   ├── CalendarHeader.tsx
│   ├── CourseDetailsModal.tsx
│   ├── EventDetailsModal.tsx
│   ├── ExportSemesterButton.tsx
│   ├── Providers.tsx
│   ├── SemesterSummaryCard.tsx
│   ├── Sidebar.tsx
│   ├── SignInModal.tsx
│   ├── SkippingCalculator.tsx
│   ├── SubscribeButton.tsx
│   ├── SyncModal.tsx
│   ├── TimetableCalendar.tsx
│   └── UserDropdown.tsx
├── lib
│   ├── attendance-logic.ts
│   ├── colors.ts
│   ├── db.ts
│   ├── manual-attendance.ts
│   └── utils.ts
├── models
│   ├── Attendance.ts
│   ├── Event.ts
│   └── User.ts
└── types
    ├── next-auth.d.ts
    └── timetable.ts
vtc-api
├── bun.lock
├── combined.json
├── package.json
└── src
    ├── core
    │   ├── api.ts
    │   └── utils.ts
    ├── index.ts
    └── types
        ├── combined.ts
        ├── getClassAttendanceDetail.ts
        ├── getClassAttendanceList.ts
        ├── getMoodleTimetable.ts
        ├── getTimeTableAndReminderList.ts
        └── user.ts
```

## Core Features

1. Authentication
- NextAuth v5 with Discord provider.
- Credentials login (email/password) with bcrypt hashing.
- `discordId` is the canonical user identity.

2. Timetable Sync
- `syncVtcData` extracts token, validates token, fetches semester timetable, stores events.
- Insert pattern is check-then-insert using `insertMany({ ordered: false })`.
- Duplicate prevention uses deterministic composite `vtc_id`.

3. Semester Logic and Backfill
- Semester month mapping:
  - SEM 1: Sep-Dec
  - SEM 2: Jan-Apr
  - SEM 3: May-Aug
- Backfill rules prevent missing events across term boundaries.

4. Attendance Sync and Aggregation
- Attendance stored per course in `Attendance` model.
- Hybrid stats combine API attendance + calendar totals + manual event adjustments.

5. Calendar UI
- React Big Calendar with Month/Work Week/Day/Agenda views.
- Deterministic course colors from `getColorIndex(courseCode)`.
- Event status rendering includes upcoming, finished, canceled, absent.

6. Manual Attendance Actions
- Toggle event attendance status (for manual override workflows).
- Supports early-finish and status updates in server actions.

7. Skipping Calculator
- Estimates projected final attendance after skipping classes.
- Surfaces safe-to-skip threshold against 80% target.

8. Calendar Export and Subscription
- Export semester events to `.ics`.
- Calendar subscription endpoint at `/api/calendar/[discordId]`.
- Endpoint is intentionally unauthenticated for calendar app compatibility.

9. Settings Management
- Read account settings and linked auth providers.
- Set/update email and password.

10. Background Sync
- Periodic sync checks for logged-in users.
- Throttling logic prevents excessive API calls.

## Architecture and Conventions

1. Server Actions First
- All data operations are in `src/app/actions.ts` with `"use server"`.
- Do not add redundant client-side API routes for DB operations.

2. Database Access
- Always use cached `connectDB()` from `src/lib/db.ts`.
- Never create ad-hoc MongoDB connections.

3. Identity Mapping
- Map `discordId` to `vtcStudentId` via `User` model.
- Event/attendance queries should be scoped by `vtcStudentId`.

4. Date/Time Handling
- VTC date strings can be `DD/MM/YYYY`; normalize before storage.
- VTC timestamps are Unix seconds.

5. Bulk Insert Behavior
- Keep insert-only sync semantics for timetable events.
- Do not replace with per-row update loops unless explicitly required.

6. Attendance Accuracy
- Prefer minute-based attendance calculations for projections.
- Use hybrid attendance helpers rather than raw counters in isolation.

## Main Files You Should Read First

- `src/app/actions.ts`
- `src/auth.ts`
- `src/models/Event.ts`
- `src/models/Attendance.ts`
- `src/models/User.ts`
- `src/lib/attendance-logic.ts`
- `src/components/TimetableCalendar.tsx`
- `src/app/api/calendar/[discordId]/route.ts`
- `vtc-api/src/core/api.ts`

## Typical Local Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Environment Variables

Create `.env.local` with at least:

- `MONGODB_URI`
- `AUTH_SECRET`
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`

## Common Pitfalls

1. Querying by `discordId` directly in event/attendance models instead of `vtcStudentId`.
2. Forgetting semester filters when rendering or exporting data.
3. Mixing raw attendance stats with manual overrides without hybrid merge.
4. Misreading VTC timestamp units (seconds vs milliseconds).
5. Breaking insert-only sync behavior by introducing update-heavy logic.
