import { describe, expect, test } from "bun:test";
import { generateStudentCardQr } from "./student-card-qr";

// Synthetic inputs, independently checked with Java AES and Asia/Hong_Kong dates.
const key = "000102030405060708090a0b0c0d0e0f";
const time = "2026-09-15T04:00:00Z";

describe("student card QR encryption", () => {
	test("matches the Android block format and Hong Kong epoch", () => {
		expect(generateStudentCardQr(key, "00112233445566", time)).toBe("ec9c6f98c676959784622ef1912ff527");
		expect(generateStudentCardQr(key, "112233445566", "2026-09-15T12:00:00+08:00")).toBe("ec9c6f98c676959784622ef1912ff527");
	});

	test("changes with time and card identity", () => {
		const first = generateStudentCardQr(key, "00112233445566", time);
		expect(generateStudentCardQr(key, "00112233445566", "2026-09-15T04:01:00Z")).not.toBe(first);
		expect(generateStudentCardQr(key, "00112233445567", time)).not.toBe(first);
	});

	test("rejects invalid card material and ambiguous timestamps", () => {
		for (const badKey of ["", "ab", "gg".repeat(16)]) {
			expect(() => generateStudentCardQr(badKey, "00112233445566", time)).toThrow();
		}
		for (const card of ["", "not-hex", "0".repeat(15)]) {
			expect(() => generateStudentCardQr(key, card, time)).toThrow();
		}
		for (const badTime of ["invalid", "2026-09-15T04:00:00", "1999-01-01T00:00:00Z"]) {
			expect(() => generateStudentCardQr(key, "00112233445566", badTime)).toThrow();
		}
	});
});
