"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { API } from "../../../vtc-api/src/core/api";

/**
 * Validate the stored VTC access token.
 * Called on page load to detect expired tokens early.
 *
 * Returns:
 *  { valid: true }                        – token is still active
 *  { valid: false, reason: "no_token" }   – user never synced (silent, no popup)
 *  { valid: false, reason: "expired" }    – token is expired / invalid
 */
export async function checkStoredToken(): Promise<{
	valid: boolean;
	reason?: "no_token" | "expired";
}> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { valid: false, reason: "no_token" };
		}

		await connectDB();
		const user = await User.findOne({ discordId: session.user.discordId }).lean();

		if (!user?.vtcToken) {
			return { valid: false, reason: "no_token" };
		}

		const api = new API({ token: user.vtcToken });
		const result = await api.checkAccessToken();

		if (result.isSuccess) {
			return { valid: true };
		}

		return { valid: false, reason: "expired" };
	} catch (error) {
		console.error("Error checking stored token:", error);
		// On network / server error, don't falsely flag as expired
		return { valid: true };
	}
}

/**
 * Save user preferred locale to the database
 * Called when the user switches language in the UI
 */
export async function saveUserLocale(locale: "en" | "zh-HK"): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "Not authenticated" };
		}

		await connectDB();
		await User.findOneAndUpdate({ discordId: session.user.discordId }, { locale }, { upsert: false });

		return { success: true };
	} catch (error) {
		console.error("Error saving user locale:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to save locale",
		};
	}
}
