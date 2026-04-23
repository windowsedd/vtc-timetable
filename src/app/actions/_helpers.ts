/**
 * Internal helpers shared across action modules.
 * NOT exported from the barrel — these are implementation details.
 */

// Semester to months mapping
export const SEMESTER_MAP: Record<number, number[]> = {
	1: [9, 10, 11, 12], // Sept-Dec
	2: [1, 2, 3, 4], // Jan-Apr
	3: [5, 6, 7, 8], // May-Aug (Summer)
};

// Semester category mapping
export const SEMESTER_CATEGORY_MAP: Record<number, "SEM 1" | "SEM 2" | "SEM 3"> = {
	1: "SEM 1", // Fall
	2: "SEM 2", // Spring
	3: "SEM 3", // Summer
};

// Semester end dates for ACTIVE/FINISHED detection
export const SEMESTER_END_DATES: Record<string, { month: number; day: number }> = {
	"SEM 1": { month: 12, day: 31 }, // December 31st
	"SEM 2": { month: 5, day: 31 }, // May 31st
	"SEM 3": { month: 8, day: 31 }, // August 31st
};

// Semester ordering for comparison
export const SEMESTER_ORDER_MAP: Record<string, number> = {
	"SEM 1": 1,
	"SEM 2": 2,
	"SEM 3": 3,
};

/**
 * Extract token from VTC URL
 */
export function extractToken(vtcUrl: string): string | null {
	try {
		const url = new URL(vtcUrl);
		return url.searchParams.get("token");
	} catch {
		return null;
	}
}

/**
 * Calculate duration in minutes between two dates
 */
export function getDurationInMinutes(start: Date, end: Date): number {
	return (new Date(end).getTime() - new Date(start).getTime()) / 1000 / 60;
}

/**
 * Normalize a date string to ISO format (YYYY-MM-DD)
 * Handles DD/MM/YYYY (VTC API format) and YYYY-MM-DD (ISO format)
 */
export function normalizeToISODate(dateStr: string): string {
	if (!dateStr) return "";
	// Check if already in ISO format (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
		return dateStr.split("T")[0]; // Remove time portion if present
	}
	// Handle DD/MM/YYYY format (VTC API)
	const parts = dateStr.split("/");
	if (parts.length === 3) {
		const [day, month, year] = parts;
		return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
	}
	// Handle D/M/YYYY format (VTC API with single digits)
	if (dateStr.includes("/")) {
		const [day, month, year] = dateStr.split("/");
		return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
	}
	return dateStr;
}
