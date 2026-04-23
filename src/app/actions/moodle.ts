"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { CalendarEvent } from "@/types/timetable";
import { API } from "../../../vtc-api/src/core/api";

/**
 * Fetch Moodle deadlines from VTC API using stored token.
 * Returns CalendarEvent[] with eventType "deadline" and actionUrl for redirect.
 * Non-fatal — returns empty array on any failure so it doesn't break the calendar.
 */
export async function getMoodleDeadlines(): Promise<{
	success: boolean;
	data?: CalendarEvent[];
	error?: string;
}> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) return { success: true, data: [] };

		await connectDB();
		const user = await User.findOne({ discordId: session.user.discordId }).lean();
		if (!user?.vtcToken) return { success: true, data: [] };

		const api = new API({ token: user.vtcToken });
		const now = new Date();
		const month = now.getMonth() + 1;
		const year = now.getFullYear();
		const nextMonth = month === 12 ? 1 : month + 1;
		const nextYear = month === 12 ? year + 1 : year;

		// Fetch current and next month in parallel
		const [res1, res2] = await Promise.all([
			api.getMoodleTimetable(1, month, year),
			api.getMoodleTimetable(1, nextMonth, nextYear),
		]);

		// Merge and deduplicate by id
		const seen = new Set<number>();
		const allItems = [
			...(res1.isSuccess ? res1.payload ?? [] : []),
			...(res2.isSuccess ? res2.payload ?? [] : []),
		].filter((item) => {
			if (seen.has(item.id)) return false;
			seen.add(item.id);
			return true;
		});

		const calendarEvents: CalendarEvent[] = allItems.map((item) => {
			const start = new Date(item.timeStart * 1000);
			// If duration is 0 or timeEnd equals timeStart, show as 1-hour block
			const end = item.timeEnd && item.timeEnd > item.timeStart
				? new Date(item.timeEnd * 1000)
				: new Date(start.getTime() + 60 * 60 * 1000);

			return {
				title: item.name,
				start,
				end,
				resource: {
					courseCode: item.courseShortName,
					courseTitle: item.courseFullName,
					eventType: "deadline" as const,
					actionUrl: item.actionUrl,
					courseUrl: item.courseUrl,
				},
			};
		});

		return { success: true, data: calendarEvents };
	} catch (error) {
		console.error("Error fetching Moodle deadlines:", error);
		return { success: true, data: [] }; // Non-fatal
	}
}
