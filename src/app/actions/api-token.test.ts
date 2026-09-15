import { expect, mock, test } from "bun:test";

let signedIn = true;
let record: { apiToken?: string; apiTokenStudentCardAccess?: boolean } = {};
mock.module("@/lib/authenticated-user", () => ({
	getAuthenticatedUser: async () => signedIn ? { discordId: "owner" } : null,
}));
mock.module("@/lib/db", () => ({ default: async () => {} }));
mock.module("@/models/User", () => ({ default: {
	updateOne: async (
		filter: { discordId: string },
		update: { $set?: typeof record; $unset?: Record<string, string> },
	) => {
		if (filter.discordId !== "owner") throw new Error("Wrong account");
		if (update.$set) record = { ...record, ...update.$set };
		if (update.$unset) {
			if ("apiToken" in update.$unset) delete record.apiToken;
			if ("apiTokenStudentCardAccess" in update.$unset) delete record.apiTokenStudentCardAccess;
		}
	},
} }));
const { regenerateApiToken, revokeApiToken } = await import("./api-token");

test("new tokens enable QR access and revocation removes both token and access", async () => {
	const result = await regenerateApiToken();
	expect(result.success).toBe(true);
	expect(record.apiToken).toMatch(/^vtct_[A-Za-z0-9_-]{32}$/);
	expect(record.apiToken).toBe(result.token);
	expect(record.apiTokenStudentCardAccess).toBe(true);
	const previousToken = record.apiToken;
	await regenerateApiToken();
	expect(record.apiToken).not.toBe(previousToken);
	expect((await revokeApiToken()).success).toBe(true);
	expect(record).toEqual({});
});

test("signed-out callers cannot issue card access credentials", async () => {
	signedIn = false;
	record = {};
	expect((await regenerateApiToken()).success).toBe(false);
	expect(record).toEqual({});
});
