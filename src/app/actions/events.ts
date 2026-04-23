"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
import { CalendarEvent } from "@/types/timetable";
import { revalidatePath } from "next/cache";

/**
 * Get stored events from MongoDB for the authenticated user
 */
export async function getStoredEvents(): Promise<{
	success: boolean;
	data?: CalendarEvent[];
	error?: string;
}> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: true, data: [] }; // Not logged in, return empty
		}

		await connectDB();

		// Fetch user to get vtcStudentId
		const user = await User.findOne({ discordId: session.user.discordId }).lean();
		if (!user?.vtcStudentId) {
			return { success: true, data: [] }; // No vtcStudentId yet, return empty
		}
		const vtcStudentId = user.vtcStudentId;

		const events = await Event.find({ vtcStudentId }).sort({ startTime: 1 }).lean();

		const calendarEvents: CalendarEvent[] = events.map((event: any) => ({
			title: `${event.courseTitle}`,
			start: new Date(event.startTime),
			end: new Date(event.endTime),
			resource: {
				courseCode: event.courseCode,
				courseTitle: event.courseTitle,
				location: event.location,
				lessonType: event.lessonType,
				lecturer: event.lecturerName,
				colorIndex: event.colorIndex,
				semester: event.semester,
				status: event.status,
				vtc_id: event.vtc_id,
			},
		}));

		return { success: true, data: calendarEvents };
	} catch (error) {
		console.error("Error fetching stored events:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to fetch events",
		};
	}
}

/**
 * Get unique courses from stored events for the authenticated user
 */
export async function getUniqueCourses(): Promise<{
	success: boolean;
	data?: Array<{ courseCode: string; courseTitle: string; colorIndex: number; semester: string; status: string }>;
	error?: string;
}> {
	try {
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: true, data: [] }; // Not logged in, return empty
		}

		await connectDB();

		// Fetch user to get vtcStudentId
		const user = await User.findOne({ discordId: session.user.discordId }).lean();
		if (!user?.vtcStudentId) {
			return { success: true, data: [] }; // No vtcStudentId yet, return empty
		}
		const vtcStudentId = user.vtcStudentId;

		const courses = await Event.aggregate([
			{ $match: { vtcStudentId } },
			{
				$group: {
					_id: { courseCode: "$courseCode", semester: "$semester" },
					courseTitle: { $first: "$courseTitle" },
					colorIndex: { $first: "$colorIndex" },
					status: { $first: "$status" },
				},
			},
			{
				$project: {
					_id: 0,
					courseCode: "$_id.courseCode",
					semester: "$_id.semester",
					courseTitle: 1,
					colorIndex: 1,
					status: 1,
				},
			},
			{ $sort: { semester: -1, courseCode: 1 } },
		]);

		return { success: true, data: courses };
	} catch (error) {
		console.error("Error fetching unique courses:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to fetch courses",
		};
	}
}

/**
 * Update start/end time of a specific event
 */
export async function updateEventDetails(eventId: string, newStart: Date, newEnd: Date) {
	try {
		const session = await auth();
		if (!session?.user?.discordId) return { success: false, error: "Unauthorized" };

		await connectDB();
		await Event.findOneAndUpdate({ vtc_id: eventId, discordId: session.user.discordId }, { startTime: newStart, endTime: newEnd }, { new: true });

		revalidatePath("/");
		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed to update event" };
	}
}

/**
 * Update status of a specific event (NORMAL, CANCELED, RESCHEDULED, FINISHED)
 */
export async function setEventStatus(eventId: string, status: string) {
	try {
		const session = await auth();
		if (!session?.user?.discordId) return { success: false, error: "Unauthorized" };

		await connectDB();

		// Get vtcStudentId from User model
		const user = await User.findOne({ discordId: session.user.discordId }).lean();
		if (!user?.vtcStudentId) {
			return { success: false, error: "No VTC student ID found." };
		}

		await Event.findOneAndUpdate({ vtc_id: eventId, vtcStudentId: user.vtcStudentId }, { status }, { new: true });

		revalidatePath("/");
		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed to set status" };
	}
}

/**
 * Mark all future events of a course as FINISHED
 */
export async function finishCourseEarly(courseCode: string, semester: string) {
	try {
		const session = await auth();
		if (!session?.user?.discordId) return { success: false, error: "Unauthorized" };

		await connectDB();
		const now = new Date();

		await Event.updateMany(
			{
				courseCode,
				discordId: session.user.discordId,
				semester,
				startTime: { $gt: now },
			},
			{ status: "FINISHED" },
		);

		revalidatePath("/");
		return { success: true };
	} catch (error) {
		return { success: false, error: error instanceof Error ? error.message : "Failed to finish course" };
	}
}
