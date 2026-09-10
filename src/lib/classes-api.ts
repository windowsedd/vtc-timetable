import { APP_TIME_ZONE, formatCompactClassDate } from "@/lib/event-date";

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

/** The locales the app ships copy in; labels come back in the account's own. */
export type ApiLocale = "en" | "zh-HK";

export type ApiClass = {
	courseCode: string;
	courseTitle: string;
	lessonType: string;
	location: string;
	lecturer: string;
	startsAt: string;
	endsAt: string;
	/** Ready to print: "Thu, Sep 10" / "9月10日週四". */
	dateLabel: string;
	/** Ready to print: "10:30 AM - 12:00 PM" / "上午10:30-下午12:00". */
	timeLabel: string;
	minutes: number;
	status: string;
	semester: number | null;
	colorIndex: number;
};

export type ClassesPayload = {
	timezone: string;
	/** Which language the `dateLabel` and `timeLabel` strings are written in. */
	locale: ApiLocale;
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

/**
 * ISO-8601 carrying the app's offset rather than a `Z`, so the time reads as
 * the one on the timetable. Hong Kong has had no daylight saving since 1979,
 * so the offset is a constant.
 */
export function toLocalIso(instant: Date): string {
	const shifted = new Date(instant.getTime() + HONG_KONG_UTC_OFFSET_MS);
	return `${shifted.toISOString().slice(0, 19)}+08:00`;
}

/** "10:30 AM - 12:00 PM", in the account's language and the app's timezone. */
export function formatTimeRange(start: Date, end: Date, locale: ApiLocale): string {
	const time = new Intl.DateTimeFormat(locale, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
		timeZone: APP_TIME_ZONE,
	});
	return `${time.format(start)} \u2013 ${time.format(end)}`;
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

export function toApiClass(event: ClassSource, locale: ApiLocale = "en"): ApiClass {
	const startsAt = new Date(event.startTime);
	const endsAt = new Date(event.endTime);
	const semester = typeof event.semester === "number" ? event.semester : Number(event.semester);

	return {
		courseCode: event.courseCode,
		courseTitle: event.courseTitle,
		lessonType: event.lessonType ?? "",
		location: event.location ?? "",
		lecturer: event.lecturerName ?? "",
		startsAt: toLocalIso(startsAt),
		endsAt: toLocalIso(endsAt),
		dateLabel: formatCompactClassDate(startsAt, locale) ?? "",
		timeLabel: formatTimeRange(startsAt, endsAt, locale),
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
	locale: ApiLocale = "en",
): ClassesPayload {
	const classes = events
		.map((event) => toApiClass(event, locale))
		.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
	const nowMs = now.getTime();
	const live = classes.filter((item) => item.status !== "CANCELED");

	return {
		timezone: APP_TIME_ZONE,
		locale,
		generatedAt: toLocalIso(new Date(nowMs)),
		range: { from: range.fromDay, to: range.toDay },
		current: live.find((item) =>
			Date.parse(item.startsAt) <= nowMs && Date.parse(item.endsAt) > nowMs) ?? null,
		next: live.find((item) => Date.parse(item.startsAt) > nowMs) ?? null,
		classes,
	};
}
