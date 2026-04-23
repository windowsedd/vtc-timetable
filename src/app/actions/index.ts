/**
 * Barrel re-export — all public actions and types.
 *
 * Consumers can continue to import from "@/app/actions" without changes.
 * Each module lives in its own file for maintainability.
 */

// ── Types ────────────────────────────────────────────
export type { AttendanceStats, ClassRecord, HybridAttendanceStats } from "./types";

// ── Sync ─────────────────────────────────────────────
export {
	autoSyncFromStoredToken,
	checkAndSyncBackground,
	fetchTimetable,
	shouldAutoSync,
	syncTimetable,
	syncVtcData,
} from "./sync";

// ── Attendance ───────────────────────────────────────
export {
	deduplicateData,
	getAttendance,
	getHybridAttendanceStats,
	getStoredAttendance,
	refreshAttendance,
	toggleEventAttendance,
} from "./attendance";

// ── Events ───────────────────────────────────────────
export {
	finishCourseEarly,
	getStoredEvents,
	getUniqueCourses,
	setEventStatus,
	updateEventDetails,
} from "./events";

// ── Export ────────────────────────────────────────────
export { exportSemesterIcs } from "./export";

// ── Moodle ───────────────────────────────────────────
export { getMoodleDeadlines } from "./moodle";

// ── User ─────────────────────────────────────────────
export { checkStoredToken, saveUserLocale } from "./user";

// ── Settings ─────────────────────────────────────────
export { getUserSettings, updateEmailPassword } from "./settings";
