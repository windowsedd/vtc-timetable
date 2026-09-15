import { bearerToken, isValidApiToken } from "@/lib/api-token";
import { connectDB } from "@/lib/db";
import { createStudentCardQrImage } from "@/lib/student-card-qr-image";
import User from "@/models/User";

function errorResponse(status: number, error: string) {
	return Response.json({ error }, {
		status,
		headers: {
			"Cache-Control": "private, no-store",
			...(status === 401 ? { "WWW-Authenticate": 'Bearer realm="vtc-timetable"' } : {}),
		},
	});
}

export async function GET(request: Request) {
	// Card access credentials belong in headers, never image URLs or query strings.
	const token = bearerToken(request.headers.get("authorization"));
	if (!token || !isValidApiToken(token)) return errorResponse(401, "unauthenticated");

	try {
		await connectDB();
		const user = await User.findOne({ apiToken: token }).select("vtcToken apiTokenStudentCardAccess").lean();
		if (!user) return errorResponse(401, "unauthenticated");
		if (user.apiTokenStudentCardAccess !== true) return errorResponse(403, "regenerate_token");
		if (!user.vtcToken) return errorResponse(409, "no_token");

		const result = await createStudentCardQrImage(user.vtcToken);
		if (!result.success) return errorResponse(502, result.reason);
		return new Response(new Uint8Array(result.image), {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
				"X-QR-Remaining-Ms": String(result.remainingMs),
			},
		});
	} catch {
		// Database and upstream exceptions can contain credentials or card material.
		return errorResponse(500, "unavailable");
	}
}
