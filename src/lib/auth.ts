import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { discordUserFieldsFromProfile, rememberDiscordUserFieldsForEmail, withRememberedDiscordUserFields } from "@/lib/discord-profile";
import { ensurePartialUniqueDiscordIdIndex } from "@/lib/user-indexes";

// Dedicated MongoClient for better-auth. Connection is established lazily.
const client = new MongoClient(process.env.MONGODB_URI!, {
	serverSelectionTimeoutMS: 8000,
	connectTimeoutMS: 8000,
});
const db = client.db();

// WebAuthn is bound to one hostname: the relying-party id has to be the site's
// own domain, and the plugin's default ("localhost") only works in dev. Both
// come from the URL better-auth is already configured with.
const baseURL = process.env.BETTER_AUTH_URL ?? process.env.AUTH_URL ?? process.env.APP_URL;
const passkeyOrigin = baseURL?.replace(/\/$/, "");
const passkeyRpID = passkeyOrigin ? new URL(passkeyOrigin).hostname : "localhost";

void client.connect().then(async () => {
	await ensurePartialUniqueDiscordIdIndex(db.collection("users"));
}).catch((error) => {
	console.error("failed to ensure discordId index", { name: error instanceof Error ? error.name : "Error" });
});

export const auth = betterAuth({
	secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
	baseURL,
	database: mongodbAdapter(db),
	advanced: {
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
			trustedProxies: ["127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
		},
	},
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		discord: {
			clientId: process.env.AUTH_DISCORD_ID!,
			clientSecret: process.env.AUTH_DISCORD_SECRET!,
			// Populate the legacy `users` fields straight from the Discord profile so
			// the single `users` collection stays the source of truth.
			mapProfileToUser: (profile) => {
				const fields = discordUserFieldsFromProfile(profile);
				rememberDiscordUserFieldsForEmail(profile.email, fields);
				return fields;
			},
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => ({ data: withRememberedDiscordUserFields(user) }),
			},
		},
	},
	user: {
		// Use the app's existing `users` collection — do NOT create a separate `user` one.
		modelName: "users",
		additionalFields: {
			discordId: { type: "string", required: false, input: false },
			discordUsername: { type: "string", required: false, input: false },
			discordAvatar: { type: "string", required: false, input: false },
			vtcStudentId: { type: "string", required: false, input: false },
			locale: { type: "string", required: false, input: false },
		},
	},
	// `nextCookies` has to stay last: it writes the cookies the plugins above set.
	plugins: [
		passkey({ rpID: passkeyRpID, rpName: "VTC Timetable", origin: passkeyOrigin }),
		nextCookies(),
	],
});
