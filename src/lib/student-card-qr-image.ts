import { toBuffer } from "qrcode";
import { generateStudentCardQr } from "@/lib/student-card-qr";
import { API } from "../../vtc-api/src/core/api";

export type StudentCardQrImageResult =
	| { success: true; image: Buffer; remainingMs: number }
	| { success: false; reason: "unavailable" };

export async function createStudentCardQrImage(vtcToken: string): Promise<StudentCardQrImageResult> {
	try {
		const api = new API({ token: vtcToken });
		const registration = await api.registerEcard();
		if (!registration.isSuccess || !registration.payload?.accessToken) {
			return { success: false, reason: "unavailable" };
		}
		const card = await api.getEcard(registration.payload.accessToken);
		if (!card.isSuccess || !card.payload) return { success: false, reason: "unavailable" };
		const startedAt = performance.now();
		const time = await api.getEcardTime();
		if (!time.isSuccess || !time.payload?.currentTime) return { success: false, reason: "unavailable" };
		const issuedAt = Date.parse(time.payload.currentTime);
		const cardExpiry = Date.parse(card.payload.expiryDate);
		if (!Number.isFinite(cardExpiry) || cardExpiry <= issuedAt) return { success: false, reason: "unavailable" };
		const value = generateStudentCardQr(card.payload.doorAccessKey, card.payload.userInfo.smartcardId, time.payload.currentTime);
		const image = await toBuffer(value, { errorCorrectionLevel: "M", margin: 4, width: 320 });
		const remainingMs = Math.floor(Math.min(60_000, cardExpiry - issuedAt) - (performance.now() - startedAt));
		if (remainingMs <= 0) return { success: false, reason: "unavailable" };
		return { success: true, image, remainingMs };
	} catch {
		// Upstream errors can contain card data or tokens; return only a fixed failure code.
		return { success: false, reason: "unavailable" };
	}
}
