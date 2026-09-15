"use server";

import { createApiToken } from "@/lib/api-token";
import { getAuthenticatedUser } from "@/lib/authenticated-user";
import connectDB from "@/lib/db";
import User from "@/models/User";

/**
 * The bearer token the iOS widget sends to `/api/classes`. It is stored in the
 * clear so the settings panel can show it again for a second device, the same
 * trade-off the calendar share token already makes; revoking is a one-click
 * unset, and newly issued tokens grant access to class times and the live student-card QR.
 */
export type ApiTokenState = {
	success: boolean;
	enabled: boolean;
	token?: string;
	error?: string;
};

export async function getApiTokenState(): Promise<ApiTokenState> {
	const user = await getAuthenticatedUser();
	if (!user) return { success: false, enabled: false, error: "Not authenticated" };

	try {
		await connectDB();
		const record = await User.findOne({ discordId: user.discordId }).select("apiToken").lean();
		if (!record) return { success: false, enabled: false, error: "User not found" };

		return { success: true, enabled: Boolean(record.apiToken), token: record.apiToken || undefined };
	} catch {
		return { success: false, enabled: false, error: "Could not load your API token" };
	}
}

/** Issues the first token, or replaces the current one so an old device loses access. */
export async function regenerateApiToken(): Promise<ApiTokenState> {
	const user = await getAuthenticatedUser();
	if (!user) return { success: false, enabled: false, error: "Not authenticated" };

	try {
		await connectDB();
		const token = createApiToken();
		await User.updateOne({ discordId: user.discordId }, { $set: { apiToken: token, apiTokenStudentCardAccess: true } });
		return { success: true, enabled: true, token };
	} catch {
		return { success: false, enabled: false, error: "Could not create an API token" };
	}
}

export async function revokeApiToken(): Promise<ApiTokenState> {
	const user = await getAuthenticatedUser();
	if (!user) return { success: false, enabled: false, error: "Not authenticated" };

	try {
		await connectDB();
		await User.updateOne({ discordId: user.discordId }, { $unset: { apiToken: "", apiTokenStudentCardAccess: "" } });
		return { success: true, enabled: false };
	} catch {
		return { success: false, enabled: false, error: "Could not revoke your API token" };
	}
}
