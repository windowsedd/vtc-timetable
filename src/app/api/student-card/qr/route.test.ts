import { afterEach, expect, mock, test } from "bun:test";

const token = `vtct_${"a".repeat(32)}`;
let account: { vtcToken?: string; apiTokenStudentCardAccess?: boolean } | null;
let databaseFailure = false;
const lookups: unknown[] = [];
mock.module("@/lib/db", () => ({ connectDB: async () => {
	if (databaseFailure) throw new Error("sensitive database details");
} }));
mock.module("@/models/User", () => ({ default: {
	findOne: (filter: { apiToken: string }) => {
		lookups.push(filter);
		return { select: () => ({ lean: async () => filter.apiToken === token ? account : null }) };
	},
} }));

const { GET } = await import("./route");
const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
	lookups.length = 0;
	databaseFailure = false;
});

function setup(failure?: "registration" | "expired" | "time" | "invalidTime") {
	account = { vtcToken: "synthetic-owner-token", apiTokenStudentCardAccess: true };
	const calls: string[] = [];
	globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
		const url = new URL(String(input));
		calls.push(url.pathname);
		if (url.pathname === "/v1/register") {
			expect(new Headers(init?.headers).get("Authorization")).toBe("synthetic-owner-token");
			return Response.json({ isSuccess: failure !== "registration", payload: { accessToken: "synthetic-card-token" } });
		}
		if (url.pathname === "/v1/ecard") {
			expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer synthetic-card-token");
			return Response.json({ isSuccess: true, payload: {
				doorAccessKey: "000102030405060708090a0b0c0d0e0f",
				userInfo: { smartcardId: "00112233445566" },
				expiryDate: failure === "expired" ? "2026-01-01T00:00:00Z" : "2027-01-01T00:00:00Z",
			} });
		}
		if (url.pathname === "/v1/time") {
			if (failure === "time") throw new Error("sensitive upstream details");
			return Response.json({ isSuccess: true, payload: {
				currentTime: failure === "invalidTime" ? "invalid" : "2026-09-15T04:00:00Z",
			} });
		}
		throw new Error("Unexpected upstream request");
	});
	return calls;
}

function request(authorization: string | null = `Bearer ${token}`, query = "") {
	return new Request(`https://example.test/api/student-card/qr${query}`, {
		headers: authorization ? { Authorization: authorization } : {},
	});
}

test("rejects missing, malformed and URL-only tokens before database or upstream access", async () => {
	const calls = setup();
	for (const req of [request(null), request("Bearer invalid"), request(null, `?token=${token}`)]) {
		const response = await GET(req);
		expect(response.status).toBe(401);
		expect(response.headers.get("www-authenticate")).toContain("Bearer");
		expect(response.headers.get("cache-control")).toContain("no-store");
	}
	expect(lookups).toEqual([]);
	expect(calls).toEqual([]);
});

test("rejects revoked tokens and does not broaden old class-only tokens", async () => {
	const calls = setup();
	account = null;
	expect((await GET(request())).status).toBe(401);
	account = { vtcToken: "synthetic-owner-token" };
	expect((await GET(request())).status).toBe(403);
	account.apiTokenStudentCardAccess = false;
	expect((await GET(request())).status).toBe(403);
	expect(calls).toEqual([]);
});

test("returns a PNG with a bounded lifetime using only the token owner's VTC account", async () => {
	setup();
	const response = await GET(request(`bEaReR ${token}`, "?userId=another-user&token=ignored"));
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("image/png");
	expect(response.headers.get("cache-control")).toBe("private, no-store");
	const remaining = Number(response.headers.get("x-qr-remaining-ms"));
	expect(remaining).toBeGreaterThan(0);
	expect(remaining).toBeLessThanOrEqual(60_000);
	const bytes = new Uint8Array(await response.arrayBuffer());
	expect(bytes.subarray(0, 8)).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
	// PNG IHDR dimensions, independent of the image encoder.
	const data = new DataView(bytes.buffer);
	expect(data.getUint32(16)).toBe(320);
	expect(data.getUint32(20)).toBe(320);
	expect(lookups).toEqual([{ apiToken: token }]);
});

test("returns an actionable status when the owner has no VTC token", async () => {
	const calls = setup();
	account = { apiTokenStudentCardAccess: true };
	const response = await GET(request());
	expect(response.status).toBe(409);
	expect(response.headers.get("cache-control")).toContain("no-store");
	expect(calls).toEqual([]);
});

test("returns uncached JSON errors instead of expired images or upstream secrets", async () => {
	for (const failure of ["registration", "expired", "time", "invalidTime"] as const) {
		setup(failure);
		const response = await GET(request());
		expect(response.status).toBe(502);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(response.headers.get("cache-control")).toContain("no-store");
		expect(await response.json()).toEqual({ error: "unavailable" });
	}
});

test("redacts database failures", async () => {
	const calls = setup();
	databaseFailure = true;
	const response = await GET(request());
	expect(response.status).toBe(500);
	expect(await response.json()).toEqual({ error: "unavailable" });
	expect(calls).toEqual([]);
});
