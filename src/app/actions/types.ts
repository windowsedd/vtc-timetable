// Individual class attendance record
export interface ClassRecord {
	id: string;
	date: string;
	lessonTime: string;
	attendTime: string;
	roomName: string;
	status: "attended" | "late" | "absent";
}

// Attendance stats interface
export interface AttendanceStats {
	courseCode: string;
	courseName: string;
	semester: string; // "SEM 1", "SEM 2", "SEM 3"
	status: string; // "ACTIVE", "FINISHED"
	attendRate: number;
	totalClasses: number;
	conductedClasses: number;
	attended: number;
	late: number;
	absent: number;
	isLow: boolean; // < 80%
	isFinished: boolean; // all classes conducted
	isFollowUp: boolean; // course code ends with 'A' (follow-up course)
	baseCourseCode: string; // base course code without suffix
	classes: ClassRecord[]; // detailed class records
}

// Hybrid attendance stats - combines Attendance API (what you DID) with Calendar DB (what is POSSIBLE)
export interface HybridAttendanceStats extends AttendanceStats {
	// Calendar-based counts (source of truth for totals)
	calendarTotalClasses: number; // All scheduled classes (non-canceled)
	calendarConductedClasses: number; // Past classes (endTime < now)
	calendarRemainingClasses: number; // Future classes (endTime >= now)
	calendarTotalHours: number; // Total scheduled hours
	calendarConductedHours: number; // Past hours
	calendarRemainingHours: number; // Future hours

	// Minute-based calculations (more accurate than class counts)
	totalAttendedMinutes: number; // Sum of attended class durations
	totalConductedMinutes: number; // Sum of past class durations
	totalSemesterMinutes: number; // Sum of all class durations (past + future)
	totalRemainingMinutes: number; // Sum of future class durations

	// Derived calculations
	currentAttendanceRate: number; // (attended / calendarConductedClasses) * 100
	maxPossibleRate: number; // ((attended + calendarRemaining) / calendarTotal) * 100
	minutesAttendanceRate: number; // (totalAttendedMinutes / totalConductedMinutes) * 100
	maxPossibleMinutesRate: number; // ((totalAttendedMinutes + totalRemainingMinutes) / totalSemesterMinutes) * 100
	safeToSkipCount: number; // How many can skip and stay above 80%
	safeToSkipMinutes: number; // How many minutes can skip and stay above 80%

	// Recovery status (grace = early semester, no warning shown)
	recoveryStatus: "safe" | "recoverable" | "failed" | "grace"; // Current standing
}

// Define the expected response structure from vtc-api
export interface TimetableData {
	add: import("@/types/timetable").TimetableEvent[];
	delete: unknown[];
	update: unknown[];
}

export interface VtcApiResponse {
	isSuccess: boolean;
	errorCode: number;
	errorMsg: string | null;
	payload: {
		timetable: TimetableData;
		exam: TimetableData;
		currentTimestamp: number;
		lastUpdatedTimestamp: number;
		isDropDB: boolean;
		holiday: TimetableData;
		personal: TimetableData;
	};
}
