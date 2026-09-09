import { bearerToken, isValidApiToken } from "@/lib/api-token";
import { buildClassesPayload, MAX_RANGE_DAYS, resolveClassRange, type ClassRangeError } from "@/lib/classes-api";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Read-only classes feed for the iOS widget.
 *
 *   GET /api/classes?from=2026-09-09&to=2026-09-16
 *   Authorization: Bearer vtct_...
 *
 * The token is minted in Settings and maps to exactly one account; there is no
 * cookie path here because a widget extension cannot carry a browser session.
 * Responses are personal data, so they are never cached by a shared proxy.
 */

const CLASS_PROJECTION = {
	courseCode: 1,
	courseTitle: 1,
	lessonType: 1,
	location: 1,
	lecturerName: 1,
	startTime: 1,
	endTime: 1,
	status: 1,
	semester: 1,
	colorIndex: 1,
} as const;

const RANGE_ERRORS: Record<ClassRangeError, string> = {
	invalidDate: "`from` and `to` must be calendar dates in YYYY-MM-DD form.",
	invalidOrder: "`to` must not fall before `from`.",
	rangeTooLong: `The range must cover at most ${MAX_RANGE_DAYS} days.`,
};

function unauthorized(message: string) {
	return NextResponse.json(
		{ error: message },
		{ status: 401, headers: { "WWW-Authenticate": 'Bearer realm="vtc-timetable"', "Cache-Control": "no-store" } },
	);
}

export async function GET(request: NextRequest) {
	const token = bearerToken(request.headers.get("authorization"));
	if (!token) return unauthorized("Send your API token as `Authorization: Bearer <token>`.");
	if (!isValidApiToken(token)) return unauthorized("That API token is not valid.");

	const { searchParams } = new URL(request.url);
	const now = new Date();
	const resolved = resolveClassRange(searchParams.get("from"), searchParams.get("to"), now);
	if ("error" in resolved) {
		return NextResponse.json(
			{ error: RANGE_ERRORS[resolved.error] },
			{ status: 400, headers: { "Cache-Control": "no-store" } },
		);
	}

	try {
		await connectDB();

		// The token is the whole credential, so the lookup is the authentication.
		const user = await User.findOne({ apiToken: token }).select("vtcStudentId").lean();
		if (!user) return unauthorized("That API token has been revoked.");
		if (!user.vtcStudentId) {
			return NextResponse.json(
				{ error: "This account has no synced timetable yet." },
				{ status: 409, headers: { "Cache-Control": "no-store" } },
			);
		}

		const events = await Event.find({
			vtcStudentId: user.vtcStudentId,
			endTime: { $gte: resolved.range.from },
			startTime: { $lt: resolved.range.to },
		})
			.select(CLASS_PROJECTION)
			.sort({ startTime: 1 })
			.lean();

		return NextResponse.json(buildClassesPayload(events, resolved.range, now), {
			headers: { "Cache-Control": "private, no-store" },
		});
	} catch {
		return NextResponse.json(
			{ error: "Could not load classes." },
			{ status: 500, headers: { "Cache-Control": "no-store" } },
		);
	}
}
