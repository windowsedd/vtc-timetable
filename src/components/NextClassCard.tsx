"use client";

import { useNow } from "@/lib/use-now";
import type { CalendarEvent } from "@/types/timetable";
import { ArrowUpRight, Clock, GraduationCap, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

interface NextClassCardProps {
	events: CalendarEvent[];
	onSelectEvent?: (event: CalendarEvent) => void;
	onNavigateToDate?: (date: Date) => void;
}

/**
 * How far ahead of a class the countdown bar starts filling when there is no
 * earlier class to measure the gap from. Without a cap the bar would sit at
 * zero all evening for a 09:00 class, which says nothing.
 */
const COUNTDOWN_WINDOW_MS = 3 * 60 * 60 * 1000;

type SessionProgress =
	| { ongoing: true; ratio: number; minutesLeft: number }
	| { ongoing: false; ratio: number };

/**
 * Hero class card on the home dashboard. Shows the class the user is sitting in
 * right now if there is one, otherwise the soonest upcoming class, with a bar
 * tracking either the time left in the class or the wait until the next one.
 */
export default function NextClassCard({ events, onSelectEvent, onNavigateToDate }: NextClassCardProps) {
	const t = useTranslations("dashboard");
	const locale = useLocale();
	const now = useNow();

	const timeLabel = useMemo(
		() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }),
		[locale],
	);

	const { session, previousEnd } = useMemo(() => {
		const nowMs = now.getTime();
		const classes = events.filter(
			(event) => event.resource?.eventType !== "deadline" && event.resource?.status !== "CANCELED",
		);

		// The end time the countdown bar fills from: a class that runs straight
		// into the next one leaves no gap worth drawing, a long one does.
		let previous: number | null = null;
		for (const event of classes) {
			const endMs = event.end.getTime();
			if (endMs <= nowMs && (previous === null || endMs > previous)) previous = endMs;
		}

		const ongoing = classes
			.filter((event) => event.start.getTime() <= nowMs && event.end.getTime() > nowMs)
			.toSorted((a, b) => a.end.getTime() - b.end.getTime())[0];
		const upcoming = classes
			.filter((event) => event.start.getTime() >= nowMs)
			.toSorted((a, b) => a.start.getTime() - b.start.getTime())[0];

		return { session: ongoing ?? upcoming ?? null, previousEnd: previous };
	}, [events, now]);

	const progress = useMemo<SessionProgress | null>(() => {
		if (!session) return null;
		const nowMs = now.getTime();
		const startMs = session.start.getTime();
		const endMs = session.end.getTime();

		if (nowMs >= startMs) {
			const span = endMs - startMs;
			return {
				ongoing: true,
				ratio: span > 0 ? Math.min(1, (nowMs - startMs) / span) : 1,
				minutesLeft: Math.max(0, Math.ceil((endMs - nowMs) / 60_000)),
			};
		}

		const earliest = startMs - COUNTDOWN_WINDOW_MS;
		const windowStart = previousEnd === null ? earliest : Math.max(previousEnd, earliest);
		if (nowMs <= windowStart) return null;
		return { ongoing: false, ratio: (nowMs - windowStart) / (startMs - windowStart) };
	}, [session, now, previousEnd]);

	const inClass = progress?.ongoing === true;
	const kicker = inClass ? t("inClassLabel") : t("nextClassLabel");
	// The English gloss is for the localized UI; it would read the same word
	// twice in English, the way the rail suppresses its own gloss.
	const kickerEn = inClass ? t("inClassEn") : t("nextClassEn");

	const countdown = useMemo(() => {
		if (!session) return null;
		if (progress?.ongoing) return t("classMinutesLeft", { count: progress.minutesLeft });
		const mins = Math.max(0, Math.round((session.start.getTime() - now.getTime()) / 60_000));
		if (mins < 60) return t("nextClassInMinutes", { count: mins });
		const hours = Math.floor(mins / 60);
		if (hours < 24) return t("nextClassInHours", { count: hours });
		const days = Math.floor(hours / 24);
		return t("nextClassInDays", { count: days });
	}, [session, progress, now, t]);

	const open = () => {
		if (!session) return;
		onNavigateToDate?.(session.start);
		onSelectEvent?.(session);
	};

	if (!session) {
		return (
			<section className="next-class-card is-empty" aria-label={t("nextClassLabel")}>
				<p className="next-class-kicker">{t("nextClassLabel")}</p>
				<h2>{t("nextClassEmptyTitle")}</h2>
				<p>{t("nextClassEmptyHint")}</p>
			</section>
		);
	}

	const heading = session.resource?.courseTitle || session.title;
	const code = session.resource?.courseCode;
	const sessionName = session.title && session.title !== heading ? session.title : null;
	const subtitle = [sessionName, code].filter(Boolean).join(" · ");
	const location = session.resource?.location;
	const lessonType = session.resource?.lessonType;

	return (
		<section className="next-class-card" aria-label={inClass ? t("inClassLabel") : t("nextClassLabel")}>
			<div className="next-class-card-glow" aria-hidden="true" />
			<div className="next-class-card-body">
				<p className="next-class-kicker">
					<span aria-hidden="true">📅</span>
					{kicker}
					{kicker === kickerEn ? null : (
						<>
							<span aria-hidden="true"> · </span>
							{kickerEn}
						</>
					)}
				</p>
				<h2>{heading}</h2>
				{subtitle ? <p className="next-class-sub">{subtitle}</p> : null}

				<div className="next-class-chips">
					<span>
						<Clock aria-hidden="true" />
						{timeLabel.format(session.start)} – {timeLabel.format(session.end)}
					</span>
					{lessonType ? (
						<span>
							<GraduationCap aria-hidden="true" />
							{lessonType}
						</span>
					) : null}
					{location ? (
						<span>
							<MapPin aria-hidden="true" />
							{location}
						</span>
					) : null}
					{countdown ? <span className="next-class-countdown">{countdown}</span> : null}
				</div>

				{progress ? (
					<div
						className="next-class-progress"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(progress.ratio * 100)}
						aria-label={inClass ? t("classProgressLabel") : t("nextClassProgressLabel")}
					>
						<span className="next-class-progress-fill" style={{ width: `${progress.ratio * 100}%` }} />
					</div>
				) : null}

				<button type="button" className="next-class-action" onClick={open}>
					{t("viewClass")}
					<ArrowUpRight aria-hidden="true" />
				</button>
			</div>
		</section>
	);
}
