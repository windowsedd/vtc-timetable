import { APP_TIME_ZONE } from "@/lib/event-date";

/**
 * Shapes the `/api/classes` payload for the iOS widget. Kept apart from the
 * route so the range maths and the current/next pick can be tested without a
 * database or a request.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HONG_KONG_UTC_OFFSET_MS = 8 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;

/** A widget asking for a year of classes is a mistake, not a use case. */
export const MAX_RANGE_DAYS = 92;
export const DEFAULT_RANGE_DAYS = 7;

export type ClassRangeError = "invalidDate" | "invalidOrder" | "rangeTooLong";

export type ClassRange = { from: Date; to: Date; fromDay: string; toDay: string };

export type ClassSource = {
	courseCode: string;
	courseTitle: string;
	lessonType?: string | null;
	location?: string | null;
	lecturerName?: string | null;
	startTime: Date | string;
	endTime: Date | string;
	status?: string | null;
	semester?: number | string | null;
	colorIndex?: number | null;
};

export type ApiClass = {
	courseCode: string;
	courseTitle: string;
	lessonType: string;
	location: string;
	lecturer: string;
	startsAt: string;
	endsAt: string;
	minutes: number;
	status: string;
	semester: number | null;
	colorIndex: number;
};

export type ClassesPayload = {
	timezone: string;
	generatedAt: string;
	range: { from: string; to: string };
	current: ApiClass | null;
	next: ApiClass | null;
	classes: ApiClass[];
};

/** Midnight Hong Kong time for a `YYYY-MM-DD` day, as a UTC instant. */
function startOfDay(day: string): Date | null {
	if (!DATE_PATTERN.test(day)) return null;
	const parsed = new Date(`${day}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime())) return null;
	// Round-trips the parts so "2026-02-31" is rejected instead of rolling over.
	if (parsed.toISOString().slice(0, 10) !== day) return null;
	return new Date(parsed.getTime() - HONG_KONG_UTC_OFFSET_MS);
}

/** The Hong Kong calendar day an instant falls on. */
export function dayKey(instant: Date): string {
	return new Date(instant.getTime() + HONG_KONG_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * `from`/`to` are inclusive Hong Kong days; both are optional. The default is
 * today through the next week, which is what a home-screen widget shows.
 */
export function resolveClassRange(
	from: string | null,
	to: string | null,
	now: Date,
): { range: ClassRange } | { error: ClassRangeError } {
	const fromDay = from ?? dayKey(now);
	const start = startOfDay(fromDay);
	if (!start) return { error: "invalidDate" };

	const toDay = to ?? dayKey(new Date(start.getTime() + DEFAULT_RANGE_DAYS * DAY_MS));
	const toStart = startOfDay(toDay);
	if (!toStart) return { error: "invalidDate" };

	// `to` is inclusive, so the query runs to the end of that day.
	const end = new Date(toStart.getTime() + DAY_MS);
	if (end <= start) return { error: "invalidOrder" };
	if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) return { error: "rangeTooLong" };

	return { range: { from: start, to: end, fromDay, toDay } };
}

export function toApiClass(event: ClassSource): ApiClass {
	const startsAt = new Date(event.startTime);
	const endsAt = new Date(event.endTime);
	const semester = typeof event.semester === "number" ? event.semester : Number(event.semester);

	return {
		courseCode: event.courseCode,
		courseTitle: event.courseTitle,
		lessonType: event.lessonType ?? "",
		location: event.location ?? "",
		lecturer: event.lecturerName ?? "",
		startsAt: startsAt.toISOString(),
		endsAt: endsAt.toISOString(),
		minutes: Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000)),
		status: event.status ?? "UPCOMING",
		semester: Number.isFinite(semester) ? semester : null,
		colorIndex: event.colorIndex ?? 0,
	};
}

/**
 * The class happening right now and the one after it. Both are drawn from the
 * requested range, so a widget asking for a past week gets nulls rather than a
 * class it did not ask for.
 */
export function buildClassesPayload(
	events: ClassSource[],
	range: ClassRange,
	now: Date,
): ClassesPayload {
	const classes = events
		.map(toApiClass)
		.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
	const nowMs = now.getTime();
	const live = classes.filter((item) => item.status !== "CANCELED");

	return {
		timezone: APP_TIME_ZONE,
		generatedAt: new Date(nowMs).toISOString(),
		range: { from: range.fromDay, to: range.toDay },
		current: live.find((item) =>
			Date.parse(item.startsAt) <= nowMs && Date.parse(item.endsAt) > nowMs) ?? null,
		next: live.find((item) => Date.parse(item.startsAt) > nowMs) ?? null,
		classes,
	};
}
