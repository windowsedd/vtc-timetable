import { afterEach, expect, mock, test } from "bun:test";
import type { AuthenticatedUser } from "@/lib/authenticated-user";

const owner: AuthenticatedUser = {
	userId: "test-owner", discordId: "test-discord", vtcStudentId: null,
	vtcToken: "synthetic-mobile-token", gracePeriodThreshold: 0, gracePeriodThresholdOverride: null,
};
let user: AuthenticatedUser | null = owner;
mock.module("@/lib/authenticated-user", () => ({ getAuthenticatedUser: async () => user }));
const { getStudentCardQr } = await import("./student-card-qr");
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; user = owner; });

function upstream(failure?: "registration" | "expired" | "time") {
	const calls: string[] = [];
	globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(String(input));
		calls.push(url.pathname);
		if (url.pathname === "/v1/register") {
			expect(new Headers(init?.headers).get("Authorization")).toBe(owner.vtcToken);
			return Response.json({ isSuccess: failure !== "registration", payload: { accessToken: "synthetic-ecard-token" } });
		}
		if (url.pathname === "/v1/ecard") {
			expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer synthetic-ecard-token");
			return Response.json({ isSuccess: true, payload: {
				doorAccessKey: "000102030405060708090a0b0c0d0e0f",
				userInfo: { smartcardId: "00112233445566" },
				expiryDate: failure === "expired" ? "2026-01-01T00:00:00Z" : "2027-01-01T00:00:00Z",
			} });
		}
		if (url.pathname === "/v1/time") {
			if (failure === "time") throw new Error("sensitive upstream details");
			return Response.json({ isSuccess: true, payload: { currentTime: "2026-09-15T04:00:00Z" } });
		}
		throw new Error("Unexpected request");
	});
	return calls;
}

test("requires authentication before any VTC request", async () => {
	const calls = upstream();
	user = null;
	expect(await getStudentCardQr()).toEqual({ success: false, reason: "unauthenticated" });
	expect(calls).toEqual([]);
});

test("requires the signed-in owner's stored VTC token", async () => {
	const calls = upstream();
	user = { ...owner, vtcToken: null };
	expect(await getStudentCardQr()).toEqual({ success: false, reason: "no_token" });
	expect(calls).toEqual([]);
});

test("returns an expiring QR image without card material or credentials", async () => {
	const calls = upstream();
	const result = await getStudentCardQr();
	if (!result.success) throw new Error("Expected generated QR");
	expect(result.image.startsWith("data:image/png;base64,")).toBe(true);
	expect(result.remainingMs).toBeGreaterThan(0);
	expect(result.remainingMs).toBeLessThanOrEqual(60_000);
	expect(Object.keys(result).toSorted()).toEqual(["image", "remainingMs", "success"]);
	expect(calls).toEqual(["/v1/register", "/v1/ecard", "/v1/time"]);
});

test("rejects registration failure, expired cards and time failures without leaking details", async () => {
	for (const failure of ["registration", "expired", "time"] as const) {
		upstream(failure);
		expect(await getStudentCardQr()).toEqual({ success: false, reason: "unavailable" });
	}
});
