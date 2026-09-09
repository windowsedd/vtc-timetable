"use client";

import { CalendarEvent } from "@/types/timetable";
import { APP_TIME_ZONE, formatClassDate } from "@/lib/event-date";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Ban, Check, Pencil, UserX, X } from "lucide-react";
import { LINE_COLORS } from "@/lib/colors";
import { useState, type CSSProperties } from "react";
import { updateEventDetails, setEventStatus, finishCourseEarly, toggleEventAttendance } from "@/app/actions";
import { resolveMoodleActivityUrl, resolveMoodleCourseUrl } from "@/lib/moodle-links";

/** Status values map onto the copy in the `event` namespace. */
const STATUS_LABEL_KEYS: Record<string, string> = {
    UPCOMING: "upcoming",
    FINISHED: "finished",
    CANCELED: "canceled",
    RESCHEDULED: "rescheduled",
    ABSENT: "absent",
};

interface EventDetailsModalProps {
    event: CalendarEvent | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh?: () => void;
}

export default function EventDetailsModal({
    event,
    isOpen,
    onClose,
    onRefresh,
}: EventDetailsModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editStartTime, setEditStartTime] = useState("");
    const [editEndTime, setEditEndTime] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const locale = useLocale();
    const tEvent = useTranslations("event");

    if (!isOpen || !event) return null;

    const classDate = formatClassDate(event.start, locale);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 180);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString(locale, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: APP_TIME_ZONE,
        });
    };

    const startTime = formatTime(event.start);
    const endTime = formatTime(event.end);

    // Compute effective status based on current time
    const storedStatus = event.resource?.status || "UPCOMING";
    const now = new Date();
    const isPast = event.end < now; // Has the event ended?
    const status = storedStatus === "UPCOMING" && isPast ? "FINISHED" : storedStatus;

    const handleEditTime = async () => {
        if (!editStartTime || !editEndTime) return;
        setIsLoading(true);

        const newStart = new Date(event.start);
        const [sh, sm] = editStartTime.split(":").map(Number);
        newStart.setHours(sh, sm);

        const newEnd = new Date(event.end);
        const [eh, em] = editEndTime.split(":").map(Number);
        newEnd.setHours(eh, em);

        const vtc_id = event.resource?.vtc_id;
        if (!vtc_id) {
            alert("Unexpected error: missing event ID");
            setIsLoading(false);
            return;
        }

        const result = await updateEventDetails(vtc_id, newStart, newEnd);
        // Actually Event model has vtc_id. vtc_id is not exposed in CalendarEvent yet?
        // Wait, vtc_id is unique. Let's send it.
        // I need to add vtc_id to CalendarEvent resource in actions.ts

        setIsLoading(false);
        setIsEditing(false);
        if (onRefresh) onRefresh();
        handleClose();
    };

    const handleCancelClass = async () => {
        setIsLoading(true);
        // I'll need the vtc_id here. Let's assume I added it to resource.
        const vtc_id = event.resource?.vtc_id;
        if (vtc_id) {
            await setEventStatus(vtc_id, "CANCELED");
        }
        setIsLoading(false);
        if (onRefresh) onRefresh();
        handleClose();
    };

    const handleFinishEarly = async () => {
        if (!confirm("Are you sure you want to finish this course early? All future classes will be marked as FINISHED.")) return;
        setIsLoading(true);
        const courseCode = event.resource?.courseCode;
        const semester = event.resource?.semester;
        if (!courseCode || !semester) {
            setIsLoading(false);
            return;
        }
        await finishCourseEarly(courseCode, semester);
        setIsLoading(false);
        if (onRefresh) onRefresh();
        handleClose();
    };

    const isMarkedAbsent = event.resource?.status === "ABSENT";

    const handleToggleAttendance = async () => {
        const vtc_id = event.resource?.vtc_id;
        console.log("Toggle attendance:", { vtc_id, isMarkedAbsent, storedStatus: event.resource?.status });
        if (!vtc_id) {
            console.error("No vtc_id found!");
            return;
        }
        setIsLoading(true);
        // Toggle between ABSENT and UPCOMING
        const newStatus = isMarkedAbsent ? "UPCOMING" : "ABSENT";
        console.log("Setting status to:", newStatus);
        const result = await toggleEventAttendance(vtc_id, newStatus);
        console.log("Toggle result:", result);
        setIsLoading(false);
        if (onRefresh) onRefresh();
        handleClose();
    };

    const startInputVal = `${event.start.getHours().toString().padStart(2, '0')}:${event.start.getMinutes().toString().padStart(2, '0')}`;
    const endInputVal = `${event.end.getHours().toString().padStart(2, '0')}:${event.end.getMinutes().toString().padStart(2, '0')}`;


    // ── Moodle Deadline Modal ──────────────────────────────────────
    if (event.resource?.eventType === "deadline") {
        const dueDate = event.start.toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", year: "numeric",
        });
        const dueTime = formatTime(event.start);
        const isPast = event.start < new Date();

        return (
            <div className={`modal-overlay ${isClosing ? "modal-closing" : ""}`} onClick={handleClose}>
                <div
                    className={`modal-content max-w-md ${isClosing ? "modal-closing" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">🚩</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${isPast ? "bg-overlay text-text-tertiary" : "bg-error/15 text-error"}`}>
                                    {isPast ? "Overdue" : "Deadline"}
                                </span>
                            </div>
                            <h2 className="font-display text-lg font-semibold text-[var(--foreground)] leading-snug">
                                {event.title}
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                {event.resource.courseTitle}
                            </p>
                        </div>
                        <button onClick={handleClose} className="btn-icon shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-[var(--calendar-header-bg)] flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[var(--text-secondary)]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Due</p>
                            <p className={`text-sm font-semibold font-mono ${isPast ? "text-text-tertiary line-through" : "text-error"}`}>
                                {dueDate} · {dueTime}
                            </p>
                        </div>
                    </div>

                    {/* Course */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-[var(--calendar-header-bg)] flex items-center justify-center shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[var(--text-secondary)]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Course</p>
                            <p className="text-sm font-medium">{event.resource.courseCode}</p>
                        </div>
                    </div>

                    {/* Actions — only verified VTC Moodle hosts (incl. moodleNNNN). */}
                    {(() => {
                        const activityHref = resolveMoodleActivityUrl(event.resource.actionUrl);
                        const courseHref = resolveMoodleCourseUrl(event.resource.courseUrl);
                        return (
                    <div className="flex flex-col gap-2">
                        {activityHref && (
                            <a
                                href={activityHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleClose}
                                className="btn-primary flex items-center justify-center gap-2 text-sm no-underline active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                </svg>
                                Open Assignment
                            </a>
                        )}
                        {courseHref && (
                            <a
                                href={courseHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleClose}
                                className="btn-secondary flex items-center justify-center gap-2 text-sm no-underline active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253" />
                                </svg>
                                Visit Course
                            </a>
                        )}
                    </div>
                        );
                    })()}
                </div>
            </div>
        );
    }
    // ── End Deadline Modal ─────────────────────────────────────────
    const lineColor = LINE_COLORS[event.resource?.colorIndex ?? 0] ?? LINE_COLORS[0];
    const statusKey = STATUS_LABEL_KEYS[status] ?? "upcoming";
    const totalMinutes = Math.max(0, Math.round((event.end.getTime() - event.start.getTime()) / 60_000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const durationLabel = hours && minutes
        ? tEvent("durationHourMinute", { hours, minutes })
        : hours
            ? tEvent("durationHour", { hours })
            : tEvent("durationMinute", { minutes: totalMinutes });

    const startEditing = () => {
        setEditStartTime(startInputVal);
        setEditEndTime(endInputVal);
        setIsEditing(true);
    };

    return (
        <div className={`modal-overlay ${isClosing ? "modal-closing" : ""}`} onClick={handleClose}>
            <div
                className={`modal-content class-modal ${isClosing ? "modal-closing" : ""}`}
                style={{ "--class-line": lineColor } as CSSProperties}
                onClick={(e) => e.stopPropagation()}
            >
                {/* The course keeps the line colour it carries on the calendar, so the
                    sheet reads as the same class the user just tapped. */}
                <span className="class-modal-line" aria-hidden="true" />

                <header className="class-modal-header">
                    <div className="min-w-0">
                        <h2>{event.resource?.courseCode}</h2>
                        <p>{event.resource?.courseTitle}</p>
                    </div>
                    <button onClick={handleClose} className="btn-icon shrink-0" aria-label={tEvent("close")}>
                        <X aria-hidden="true" />
                    </button>
                </header>

                <div className="class-modal-chips">
                    <span className={`class-modal-status is-${statusKey}`}>{tEvent(statusKey)}</span>
                    {event.resource?.isAdjusted && (
                        <span className="class-modal-chip">{tEvent("manuallyAdjusted")}</span>
                    )}
                </div>

                {/* When it runs and for how long: the two things the sheet is opened for. */}
                <section className="class-modal-run">
                    <p className="class-modal-day">{classDate}</p>
                    {isEditing ? (
                        <div className="class-modal-rail">
                            <input
                                type="time"
                                className="class-modal-time-input"
                                defaultValue={startInputVal}
                                onChange={(e) => setEditStartTime(e.target.value)}
                                aria-label={tEvent("startTime")}
                            />
                            <span className="class-modal-track" aria-hidden="true" />
                            <input
                                type="time"
                                className="class-modal-time-input"
                                defaultValue={endInputVal}
                                onChange={(e) => setEditEndTime(e.target.value)}
                                aria-label={tEvent("endTime")}
                            />
                        </div>
                    ) : (
                        <div className="class-modal-rail">
                            <time className="class-modal-time" dateTime={event.start.toISOString()}>{startTime}</time>
                            <span className="class-modal-track"><em>{durationLabel}</em></span>
                            <time className="class-modal-time" dateTime={event.end.toISOString()}>{endTime}</time>
                        </div>
                    )}
                </section>

                <dl className="class-modal-facts">
                    {event.resource?.location && (
                        <div>
                            <dt>{tEvent("location")}</dt>
                            <dd>{event.resource.location}</dd>
                        </div>
                    )}
                    {event.resource?.lecturer && (
                        <div>
                            <dt>{tEvent("lecturer")}</dt>
                            <dd>{event.resource.lecturer}</dd>
                        </div>
                    )}
                    {event.resource?.lessonType && (
                        <div>
                            <dt>{tEvent("type")}</dt>
                            <dd>{event.resource.lessonType}</dd>
                        </div>
                    )}
                </dl>

                {(isEditing || !isPast || status !== "FINISHED") && (
                <div className="class-modal-actions">
                    {isEditing ? (
                        <div className="class-modal-action-row">
                            <button onClick={handleEditTime} disabled={isLoading} className="class-modal-btn is-primary">
                                {tEvent("save")}
                            </button>
                            <button onClick={() => setIsEditing(false)} className="class-modal-btn">
                                {tEvent("cancel")}
                            </button>
                        </div>
                    ) : isPast ? (
                        status !== "FINISHED" && (
                            <>
                                <div className="class-modal-action-row">
                                    <button
                                        onClick={handleToggleAttendance}
                                        disabled={isLoading || status === "CANCELED"}
                                        className={`class-modal-btn ${isMarkedAbsent ? "is-positive" : "is-warning"}`}
                                    >
                                        {isMarkedAbsent ? <Check aria-hidden="true" /> : <UserX aria-hidden="true" />}
                                        {isMarkedAbsent ? tEvent("markPresentBtn") : tEvent("markAbsentBtn")}
                                    </button>
                                    <button
                                        onClick={handleCancelClass}
                                        disabled={isLoading || status === "CANCELED"}
                                        className="class-modal-btn is-danger"
                                    >
                                        <Ban aria-hidden="true" />
                                        {status === "CANCELED" ? tEvent("voided") : tEvent("voidClass")}
                                    </button>
                                </div>
                                <button onClick={startEditing} className="class-modal-btn">
                                    <Pencil aria-hidden="true" />
                                    {tEvent("editTime")}
                                </button>
                            </>
                        )
                    ) : (
                        <>
                            <div className="class-modal-action-row">
                                <button onClick={startEditing} className="class-modal-btn">
                                    <Pencil aria-hidden="true" />
                                    {tEvent("editTime")}
                                </button>
                                <button
                                    onClick={handleCancelClass}
                                    disabled={isLoading || status === "CANCELED"}
                                    className="class-modal-btn is-danger"
                                >
                                    <Ban aria-hidden="true" />
                                    {status === "CANCELED" ? tEvent("canceled") : tEvent("cancelClass")}
                                </button>
                            </div>

                            {/* Reaches every later session of the course, so it sits apart
                                from the two actions that touch only this class. */}
                            <div className="class-modal-danger">
                                <button onClick={handleFinishEarly} disabled={isLoading} className="class-modal-btn is-danger">
                                    <AlertTriangle aria-hidden="true" />
                                    {tEvent("finishCourseEarly")}
                                </button>
                                <p>{tEvent("finishCourseEarlyHint")}</p>
                            </div>
                        </>
                    )}
                </div>
                )}
            </div>
        </div>
    );
}
