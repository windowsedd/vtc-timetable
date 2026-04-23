/**
 * Extracts the token from a VTC API URL
 * @param urlString The full URL containing the token parameter
 * @returns The token string if found, null otherwise
 */
export function getTokenFromUrl(urlString: string): string | null {
    try {
        const url = new URL(urlString);
        return url.searchParams.get("token");
    } catch (error) {
        console.error("Invalid URL provided", error);
        return null;
    }
}

/**
 * Converts Unix timestamp (seconds) to a date array for ICS format
 * @param timestamp Unix timestamp in seconds
 * @returns Array of [year, month, day, hour, minute]
 */
export function getDateArray(timestamp: number): [number, number, number, number, number] {
    const date = new Date(timestamp * 1000);
    return [
        date.getFullYear(),
        date.getMonth() + 1, // ICS months are 1-indexed
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
    ];
}

/**
 * Detect current semester based on date.
 * SEM 1: September–December (returns 1)
 * SEM 2: January–April     (returns 2)
 * SEM 3: May–August         (returns 3)
 */
export function getCurrentSemester(date: Date = new Date()): number {
    const month = date.getMonth() + 1; // 1-12
    if (month >= 9 && month <= 12) return 1;
    if (month >= 1 && month <= 4) return 2;
    return 3;
}

/**
 * Get the academic year string (e.g., "2025/26").
 * Academic year starts in September.
 * Sept 2025 → "2025/26", Jan 2026 → "2025/26"
 */
export function getAcademicYear(date: Date = new Date()): string {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const startYear = month >= 9 ? year : year - 1;
    const endYear = (startYear + 1) % 100;
    return `${startYear}/${endYear.toString().padStart(2, "0")}`;
}

/**
 * Get semester label from number (e.g., 2 → "SEM 2")
 */
export function getSemesterLabel(semNum: number): "SEM 1" | "SEM 2" | "SEM 3" {
    const map: Record<number, "SEM 1" | "SEM 2" | "SEM 3"> = {
        1: "SEM 1",
        2: "SEM 2",
        3: "SEM 3",
    };
    return map[semNum] || "SEM 2";
}

/**
 * Auto-detect semester and return a human-readable label.
 * Sem 1: September–December
 * Sem 2: January–April
 * Summer: May–August
 */
export function getAutoSemester(date: Date = new Date()): "Sem 1" | "Sem 2" | "Summer" {
    const month = date.getMonth() + 1; // 1-12
    if (month >= 9 && month <= 12) return "Sem 1";
    if (month >= 1 && month <= 4) return "Sem 2";
    return "Summer";
}

/**
 * Map getAutoSemester label to semester number for API calls.
 */
export function autoSemesterToNum(label: "Sem 1" | "Sem 2" | "Summer"): number {
    const map: Record<string, number> = { "Sem 1": 1, "Sem 2": 2, "Summer": 3 };
    return map[label] ?? 2;
}

/**
 * Alias for getCurrentSemester — auto-detect semester number (1/2/3).
 */
export const getDefaultSemester = getCurrentSemester;

/**
 * Get a human-friendly semester display label with month range.
 * e.g. 1 → "Semester 1 (Sep–Dec)", 2 → "Semester 2 (Jan–Apr)", 3 → "Summer (May–Aug)"
 */
export function getSemesterDisplayLabel(semNum: number): string {
    const labels: Record<number, string> = {
        1: "Semester 1 (Sep–Dec)",
        2: "Semester 2 (Jan–Apr)",
        3: "Summer (May–Aug)",
    };
    return labels[semNum] || "Unknown";
}
