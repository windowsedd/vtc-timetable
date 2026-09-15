"use server";

import { getAuthenticatedUser } from "@/lib/authenticated-user";
import { createStudentCardQrImage } from "@/lib/student-card-qr-image";

export type StudentCardQrResult =
	| { success: true; image: string; remainingMs: number }
	| { success: false; reason: "unauthenticated" | "no_token" | "unavailable" };

export async function getStudentCardQr(): Promise<StudentCardQrResult> {
	try {
		const user = await getAuthenticatedUser();
		if (!user) return { success: false, reason: "unauthenticated" };
		if (!user.vtcToken) return { success: false, reason: "no_token" };
		const result = await createStudentCardQrImage(user.vtcToken);
		if (!result.success) return result;
		return { ...result, image: `data:image/png;base64,${result.image.toString("base64")}` };
	} catch {
		return { success: false, reason: "unavailable" };
	}
}
