import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
	plugins: [inferAdditionalFields<typeof auth>(), passkeyClient()],
});

export const { signIn, signOut, useSession } = authClient;
