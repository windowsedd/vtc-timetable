export interface TimetableEvent {
  id: string;
  courseCode: string;
  courseTitle: string;
  lessonType: string;
  campusCode: string;
  roomNum: string;
  weekNum: string;
  lecturerName: string;
  startTime: number;
  endTime: number;
}

export type SemesterType = "SEM 1" | "SEM 2" | "SEM 3";
export type EventStatusType = "UPCOMING" | "FINISHED" | "CANCELED" | "RESCHEDULED" | "ABSENT";

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource?: {
    courseCode: string;
    courseTitle: string;
    location?: string;
    lessonType?: string;
    lecturer?: string;
    colorIndex?: number;
    semester?: SemesterType;
    status?: EventStatusType;
    vtc_id?: string;
    actualDuration?: number;
    scheduledDuration?: number;
    isAdjusted?: boolean;
    attendanceStatusCode?: number | null;
    eventType?: "class" | "deadline";
    actionUrl?: string;
    courseUrl?: string;
  };
}
