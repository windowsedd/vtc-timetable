import { createCalendarShareToken } from "@/lib/calendar-share";

/**
 * Personal read-only token for the classes API, used by the iOS widget. Tagged
 * with a prefix so one found in a log or a shortcut is recognisable, and so a
 * pasted share-link token is rejected outright rather than silently failing the
 * database lookup.
 */
export const API_TOKEN_PREFIX = "vtct_";

const API_TOKEN_PATTERN = /^vtct_[A-Za-z0-9_-]{32}$/;

/** Same 24-byte base64url secret the share links use. */
export function createApiToken(): string {
	return `${API_TOKEN_PREFIX}${createCalendarShareToken()}`;
}

export function isValidApiToken(token: string): boolean {
	return API_TOKEN_PATTERN.test(token);
}

/**
 * The token out of an `Authorization: Bearer <token>` header. The scheme is
 * matched case-insensitively because RFC 7235 says it is case-insensitive and
 * URLSession capitalises it differently from curl.
 */
export function bearerToken(header: string | null | undefined): string | null {
	if (!header) return null;
	const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
	return match ? match[1] : null;
}

/**
 * The token for a request: the Authorization header first, then a `token`
 * query parameter for clients that cannot set headers. A token in a URL is
 * recorded by server logs, browser history and any proxy on the way, so the
 * header stays the documented default.
 */
export function apiTokenFromRequest(
	header: string | null | undefined,
	queryToken: string | null | undefined,
): string | null {
	return bearerToken(header) ?? (queryToken?.trim() || null);
}

/** Shows the first and last characters only, for the settings panel and logs. */
export function maskApiToken(token: string): string {
	if (!isValidApiToken(token)) return "";
	const secret = token.slice(API_TOKEN_PREFIX.length);
	return `${API_TOKEN_PREFIX}${secret.slice(0, 4)}…${secret.slice(-4)}`;
}
