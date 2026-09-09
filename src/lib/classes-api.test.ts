import { describe, expect, test } from "bun:test";
import { apiTokenFromRequest, bearerToken, createApiToken, isValidApiToken, maskApiToken } from "./api-token";
import { buildClassesPayload, dayKey, resolveClassRange, toApiClass } from "./classes-api";

// 2026-09-09 10:30 Hong Kong time.
const NOW = new Date("2026-09-09T02:30:00.000Z");

function classAt(courseCode: string, startIso: string, endIso: string, status = "UPCOMING") {
	return {
		courseCode,
		courseTitle: `${courseCode} course`,
		lessonType: "Lecture",
		location: "DL-IT-B217",
		lecturerName: "Chan",
		startTime: new Date(startIso),
		endTime: new Date(endIso),
		status,
		semester: 1,
		colorIndex: 2,
	};
}

describe("api tokens", () => {
	test("mints a prefixed token that validates and masks", () => {
		const token = createApiToken();
		expect(token.startsWith("vtct_")).toBe(true);
		expect(isValidApiToken(token)).toBe(true);
		expect(maskApiToken(token)).toContain("vtct_");
		expect(maskApiToken(token)).not.toBe(token);
	});

	test("rejects share-link tokens and other near misses", () => {
		expect(isValidApiToken("a".repeat(32))).toBe(false);
		expect(isValidApiToken("vtct_short")).toBe(false);
		expect(isValidApiToken(`vtct_${"a".repeat(33)}`)).toBe(false);
		expect(maskApiToken("nope")).toBe("");
	});

	test("falls back to the query token, but the header wins", () => {
		expect(apiTokenFromRequest(null, "vtct_query")).toBe("vtct_query");
		expect(apiTokenFromRequest("Bearer vtct_header", "vtct_query")).toBe("vtct_header");
		expect(apiTokenFromRequest("Basic nope", "vtct_query")).toBe("vtct_query");
		expect(apiTokenFromRequest(null, "   ")).toBeNull();
		expect(apiTokenFromRequest(null, null)).toBeNull();
	});

	test("reads the bearer scheme however the client capitalises it", () => {
		expect(bearerToken("Bearer vtct_abc")).toBe("vtct_abc");
		expect(bearerToken("bearer   vtct_abc")).toBe("vtct_abc");
		expect(bearerToken("Basic vtct_abc")).toBeNull();
		expect(bearerToken("vtct_abc")).toBeNull();
		expect(bearerToken(null)).toBeNull();
	});
});

describe("class range", () => {
	test("defaults to today through the next week in Hong Kong time", () => {
		const result = resolveClassRange(null, null, NOW);
		expect("range" in result).toBe(true);
		if (!("range" in result)) return;
		expect(result.range.fromDay).toBe("2026-09-09");
		expect(result.range.toDay).toBe("2026-09-16");
		// Midnight Hong Kong is 16:00 UTC the day before.
		expect(result.range.from.toISOString()).toBe("2026-09-08T16:00:00.000Z");
		expect(result.range.to.toISOString()).toBe("2026-09-16T16:00:00.000Z");
	});

	test("treats `to` as inclusive", () => {
		const result = resolveClassRange("2026-09-09", "2026-09-09", NOW);
		if (!("range" in result)) throw new Error("expected a range");
		expect(result.range.to.toISOString()).toBe("2026-09-09T16:00:00.000Z");
	});

	test("rejects malformed, backwards and oversized ranges", () => {
		expect(resolveClassRange("09/09/2026", null, NOW)).toEqual({ error: "invalidDate" });
		expect(resolveClassRange("2026-02-31", null, NOW)).toEqual({ error: "invalidDate" });
		expect(resolveClassRange("2026-09-09", "2026-09-08", NOW)).toEqual({ error: "invalidOrder" });
		expect(resolveClassRange("2026-01-01", "2026-12-31", NOW)).toEqual({ error: "rangeTooLong" });
	});

	test("dayKey follows the Hong Kong calendar day", () => {
		expect(dayKey(new Date("2026-09-08T16:00:00.000Z"))).toBe("2026-09-09");
		expect(dayKey(new Date("2026-09-08T15:59:00.000Z"))).toBe("2026-09-08");
	});
});

describe("classes payload", () => {
	const range = (() => {
		const result = resolveClassRange(null, null, NOW);
		if (!("range" in result)) throw new Error("expected a range");
		return result.range;
	})();

	test("sorts classes and picks the live one and the one after it", () => {
		const payload = buildClassesPayload(
			[
				classAt("ITE3102", "2026-09-09T03:30:00.000Z", "2026-09-09T05:30:00.000Z"),
				classAt("ITP4501", "2026-09-09T01:30:00.000Z", "2026-09-09T03:30:00.000Z"),
			],
			range,
			NOW,
		);

		expect(payload.classes.map((item) => item.courseCode)).toEqual(["ITP4501", "ITE3102"]);
		expect(payload.current?.courseCode).toBe("ITP4501");
		expect(payload.next?.courseCode).toBe("ITE3102");
		expect(payload.range).toEqual({ from: "2026-09-09", to: "2026-09-16" });
		expect(payload.timezone).toBe("Asia/Hong_Kong");
	});

	test("never offers a cancelled class as current or next, but still lists it", () => {
		const payload = buildClassesPayload(
			[classAt("ITP3901", "2026-09-09T03:30:00.000Z", "2026-09-09T05:30:00.000Z", "CANCELED")],
			range,
			NOW,
		);

		expect(payload.next).toBeNull();
		expect(payload.classes).toHaveLength(1);
		expect(payload.classes[0].status).toBe("CANCELED");
	});

	test("maps a stored event onto the widget shape", () => {
		const mapped = toApiClass(classAt("ITP4903", "2026-09-09T01:30:00.000Z", "2026-09-09T03:30:00.000Z"));
		expect(mapped).toMatchObject({
			courseCode: "ITP4903",
			lessonType: "Lecture",
			location: "DL-IT-B217",
			lecturer: "Chan",
			minutes: 120,
			semester: 1,
		});
	});
});
