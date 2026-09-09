import { getClassAttendanceDetail } from "../types/getClassAttendanceDetail";
import { getClassAttendanceList } from "../types/getClassAttendanceList";
import { getTimeTableAndReminderList } from "../types/getTimeTableAndReminderList";
import { getMoodleTimetable } from '../types/getMoodleTimetable';
import { getPrintQuota } from "../types/getPrintQuota";
import { ecardRegister } from "../types/ecardRegister";
import { ecard, ecardTokenRefresh } from "../types/ecard";
import { ecardTnc } from "../types/ecardTnc";
import { userResponse } from '../types/user';
import type { MultiLangString, VtcResponse } from "../types/common";
import type {
    AboutVTCPayload,
    ActiveDevicePayload,
    ActivityListPayload,
    ActivitySearchOption,
    AlumniEventPayload,
    AlumniPayload,
    CheckStudPhotoAiResultPayload,
    CheckStudPhotoAllowUploadResultPayload,
    ContactListPayload,
    DataSyncPayload,
    DeviceIDPayload,
    DisciplineAndProgrammePayload,
    DisciplinePayload,
    DlaOneTimeTokenPayload,
    Doctor,
    DoctorBookMarkListPayload,
    DoctorListFilterOptionsPayload,
    DoctorListPayload,
    DoctorScheme,
    DocumentDownloadListPayload,
    DocumentDownloadNotice,
    DrawerConfig,
    EnrollmentListPayload,
    EventReminderListPayload,
    ExchangeKeyInfoPayload,
    FavouriteContactPayload,
    FeaturedNewsPayload,
    FilterOptionPayload,
    GuestPayload,
    IBookingApprovalListPayload,
    IBookingCampusPayload,
    IBookingDetailPayload,
    IBookingListItem,
    IBookingResultPayload,
    IBookingRoom,
    IBookingTimeslot,
    ImagePayload,
    NameCardPayload,
    News,
    Notification,
    NotificationDeletePayload,
    NotificationTypePayload,
    PersonalEventPayload,
    ResetPasswordCodePayload,
    ResetPasswordMethodPayload,
    RssListPayload,
    SearchRoomActivityPayload,
    SearchRoomCampusPayload,
    SearchRoomDepartmentPayload,
    SearchRoomPayload,
    SearchRoomTimeslotPayload,
    ShareDoctorPayload,
    ShareEventPayload,
    SiteMapPayload,
    StaffTimetablePayload,
    StudyPaceResponse,
    UserInfoPayload,
    UserPayload,
    VersionPayload,
    VtcApp,
    Website,
    WorkspaceActivityDetail,
    WorkspaceActivityEnrollResultPayload,
    WorkspaceActivityListPayload,
    WorkspaceActivitySearchOptionPayload,
    YearOfGraduationPayload,
} from "../types/vtcClient";

/** Retrofit VtcClient base in the VTC@HK app; every operation is a `cmd` on this one route. */
const MOBILE_API = "https://mobile.vtc.edu.hk/api";
/** Retrofit ECardClient / ECardVtcClient base. */
const ECARD_API = "https://ecard-api.vtc.edu.hk/v1";

/** Uppercase UUID for ecard deviceID query param (matches VTC app style). */
export function randomEcardDeviceId(): string {
    return crypto.randomUUID().toUpperCase();
}

/**
 * Upstream answers non-2xx with HTML error and maintenance pages, so parsing those as JSON
 * throws a syntax error that hides the real status. The label never includes the token.
 */
async function readJson<T>(response: Response, label: string): Promise<T> {
    if (!response.ok) {
        throw new Error(`VTC ${label} failed: HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
}

type QueryParams = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    query?: QueryParams;
    /** Sent as application/x-www-form-urlencoded, the encoding the app uses for writes. */
    form?: QueryParams;
    json?: unknown;
    multipart?: FormData;
    authorization?: string;
}

function toParams(values: QueryParams): URLSearchParams {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
        if (value !== undefined) {
            params.set(key, String(value));
        }
    }
    return params;
}

/** `cmd` leads the query string, the way the app orders it. */
function buildQuery(cmd: string, query: QueryParams = {}): string {
    return toParams({ cmd, ...query }).toString();
}

export class API {
    private token;
    constructor({ token }: { token: string }) {
        this.token = token
    }

    /**
     * Every VtcClient operation is one `cmd` on `${MOBILE_API}`, so they share this path:
     * values are URL-encoded, `undefined` entries are dropped rather than sent as "undefined",
     * and non-2xx replies throw instead of being parsed as JSON.
     */
    private static async call<T>(cmd: string, options: RequestOptions = {}): Promise<T> {
        const headers: Record<string, string> = {};
        if (options.authorization) {
            headers.Authorization = options.authorization;
        }

        let body: BodyInit | undefined;
        if (options.form) {
            body = toParams(options.form);
        } else if (options.multipart) {
            body = options.multipart;
        } else if (options.json !== undefined) {
            body = JSON.stringify(options.json);
            headers["Content-Type"] = "application/json";
        }

        const response = await fetch(`${MOBILE_API}?${buildQuery(cmd, options.query)}`, {
            method: options.method ?? "GET",
            headers,
            body,
        });
        return readJson<T>(response, cmd);
    }

    /** Document downloads answer with the file itself, not a VtcResponse envelope. */
    private static async download(cmd: string, query: QueryParams): Promise<Response> {
        const response = await fetch(`${MOBILE_API}?${buildQuery(cmd, query)}`, { method: "GET" });
        if (!response.ok) {
            throw new Error(`VTC ${cmd} failed: HTTP ${response.status}`);
        }
        return response;
    }

    /** Token-carrying GET, the shape most read operations take. */
    private async mobileGet<T>(cmd: string, params: QueryParams = {}): Promise<T> {
        return API.call<T>(cmd, { query: { token: this.token, ...params } });
    }

    /**
    * Retrieves the class attendance detail from the VTC mobile API.
     */
    async getClassAttendanceDetail(courseCode: string): Promise<getClassAttendanceDetail> {
        return this.mobileGet("getClassAttendanceDetail", { courseCode });
    }

    /**
     * Retrieves the class attendance list from the VTC mobile API.
     */
    async getClassAttendanceList(): Promise<getClassAttendanceList> {
        return this.mobileGet("getClassAttendanceList");
    }
    /**
     * Retrieves the timetable and reminder list for a specified month and year.
     * 
     * @param month - The month number (1-12) for which to retrieve the timetable
     * @param year - The year for which to retrieve the timetable
     * @returns A promise that resolves to the parsed JSON response containing the timetable and reminder list
     * @throws If the request fails or upstream answers with a non-2xx status
     */
    async getTimeTableAndReminderList(month: number = 1, year: number = 2026): Promise<getTimeTableAndReminderList> {
        return this.mobileGet("getTimeTableAndReminderList", { month, year });
    }

    /**
     * Retrieves the Moodle timetable for a specified period.
     * 
     * @param isPlural - Indicates whether to retrieve plural timetable data (default: 1)
     * @param month - The month for which to retrieve the timetable (default: 1)
     * @param year - The year for which to retrieve the timetable (default: 2026)
     * @returns A promise that resolves to a getMoodleTimetable object containing the timetable data
     * @throws If the request fails or upstream answers with a non-2xx status
     */
    async getMoodleTimetable(isPlural: number = 1, month: number = 1, year: number = 2026): Promise<getMoodleTimetable> {
        return this.mobileGet("getMoodleTimetable", { isPlural, month, year });
    }

    /**
     * Retrieves the campus print quota for the authenticated student.
     * Payload includes campus, remaining balance, status, and lastUpdatedTime.
     */
    async getPrintQuota(): Promise<getPrintQuota> {
        return this.mobileGet("getPrintQuota");
    }

    /**
     * Registers / opens an ecard session against ecard-api.vtc.edu.hk.
     * Uses the mobile VTC token as the Authorization header.
     * Generates a random deviceID unless one is provided.
     *
     * @returns API body plus the deviceId that was sent (needed for later ecard calls).
     */
    async registerEcard(deviceId?: string): Promise<ecardRegister & { deviceId: string }> {
        const id = (deviceId ?? randomEcardDeviceId()).toUpperCase();
        const response = await fetch(
            `${ECARD_API}/register?deviceID=${encodeURIComponent(id)}`,
            {
                method: "GET",
                headers: {
                    Authorization: this.token,
                },
            },
        );
        const body = await readJson<ecardRegister>(response, "ecard register");
        return { ...body, deviceId: id };
    }

    /**
     * Fetches the digital e-card (door access key + user info).
     * Requires a short-lived ecard JWT from registerEcard / refreshEcardToken —
     * not the mobile VTC token.
     *
     * GET /v1/ecard
     * Authorization: Bearer <ecardAccessToken>
     */
    async getEcard(ecardAccessToken: string): Promise<ecard> {
        const response = await fetch(`${ECARD_API}/ecard`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${ecardAccessToken}`,
            },
        });
        return readJson<ecard>(response, "ecard");
    }

    /**
     * Rotates ecard access/refresh tokens.
     * POST /v1/token/refresh
     * Authorization: Bearer <refreshToken>
     * Body: { refreshToken }
     */
    async refreshEcardToken(refreshToken: string): Promise<ecardTokenRefresh> {
        const response = await fetch(`${ECARD_API}/token/refresh`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${refreshToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
        });
        return readJson<ecardTokenRefresh>(response, "ecard token refresh");
    }

    /**
     * Reads the e-card terms for a role, e.g. "student". Unauthenticated.
     * GET /v1/tnc/{role}
     */
    async getEcardTnc(role: string): Promise<ecardTnc> {
        const response = await fetch(`${ECARD_API}/tnc/${encodeURIComponent(role)}`, {
            method: "GET",
        });
        return readJson<ecardTnc>(response, "ecard tnc");
    }

    /**
     * Accepts the e-card terms with the mobile VTC token.
     * registerEcard keeps reporting isAcceptTnC: false until this succeeds.
     * POST /v1/tnc/accept
     */
    async acceptEcardTnc(): Promise<ecardTnc> {
        const response = await fetch(`${ECARD_API}/tnc/accept`, {
            method: "POST",
            headers: {
                Authorization: this.token,
            },
        });
        return readJson<ecardTnc>(response, "ecard tnc accept");
    }

    async checkAccessToken(): Promise<userResponse> {
        return this.mobileGet("checkAccessToken");
    }

    // --- VtcClient operations transcribed from the VTC@HK 4.0.16 APK inventory ---
    // Routes, parameter names, HTTP methods and encodings come from the Retrofit interface.
    // Optional fields are omitted from the request rather than sent empty, and static methods
    // are the operations the app calls without a token.

    /**
     * POST api?cmd=applyWorkspaceActivity
     */
    async applyWorkspaceActivity(params: {
        cna?: string;
        activityId?: string;
        choiceId?: string;
    } = {}): Promise<VtcResponse<WorkspaceActivityEnrollResultPayload | null>> {
        return API.call("applyWorkspaceActivity", { method: "POST", form: { token: this.token, cna: params.cna, activityId: params.activityId, choiceId: params.choiceId } });
    }

    /**
     * GET api?cmd=approveBooking
     */
    async approveIBooking(params: {
        bookingId?: string;
        isApprove?: number;
        remarks?: string;
        /** Extra query parameters the app passes through as a map. */
        extraQuery?: Record<string, string>;
    } = {}): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("approveBooking", { query: { bookingId: params.bookingId, isApprove: params.isApprove, remarks: params.remarks, ...params.extraQuery }, authorization: this.token });
    }

    /**
     * POST api?cmd=batchUpdatePass
     */
    async batchUpdatePass(params: {
        code?: string;
        deviceId?: string;
        cnaArray?: string;
        timestamp?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("batchUpdatePass", { method: "POST", form: { token: this.token, code: params.code, deviceId: params.deviceId, cnaArray: params.cnaArray, timestamp: params.timestamp } });
    }

    /**
     * PUT api?cmd=bookmarkDoctor
     */
    async bookmarkDoctor(params: {
        scheme?: string;
        favKey?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("bookmarkDoctor", { method: "PUT", query: { token: this.token, scheme: params.scheme, favKey: params.favKey } });
    }

    /**
     * POST api?cmd=cancelEnrollment
     */
    async cancelEnrollment(params: {
        code?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("cancelEnrollment", { method: "POST", form: { token: this.token, code: params.code } });
    }

    /**
     * GET api?cmd=cancelHoldBooking
     */
    async cancelHoldIBooking(): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("cancelHoldBooking", { authorization: this.token });
    }

    /**
     * POST api?cmd=cancelBooking
     */
    async cancelIBooking(params: {
        body: unknown;
    }): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("cancelBooking", { method: "POST", json: params.body, authorization: this.token });
    }

    /**
     * POST api?cmd=changePassword
     * Carries a VTC password: never log or persist the arguments.
     */
    async changePassword(params: {
        vtcID?: string;
        original_password?: string;
        new_password?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("changePassword", { method: "POST", form: { token: this.token, vtcID: params.vtcID, original_password: params.original_password, new_password: params.new_password } });
    }

    /**
     * GET api?cmd=checkAndroidVersion
     */
    static async checkAndroidVersion(): Promise<VtcResponse<VersionPayload | null>> {
        return API.call("checkAndroidVersion");
    }

    /**
     * GET api?cmd=checkInBooking
     */
    async checkInIBooking(params: {
        bookingTSID?: string;
    } = {}): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("checkInBooking", { query: { bookingTSID: params.bookingTSID }, authorization: this.token });
    }

    /**
     * GET api?cmd=checkOutBooking
     */
    async checkOutIBooking(params: {
        bookingTSID?: string;
    } = {}): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("checkOutBooking", { query: { bookingTSID: params.bookingTSID }, authorization: this.token });
    }

    /**
     * GET api?cmd=checkStudPhotoAllowUpload
     */
    async checkStudentPhotoUploadStatus(): Promise<VtcResponse<CheckStudPhotoAllowUploadResultPayload | null>> {
        return API.call("checkStudPhotoAllowUpload", { query: { token: this.token } });
    }

    /**
     * POST api?cmd=createAlumni
     */
    async createAlumni(params: {
        email?: string;
        graduation?: string;
        discipline?: string;
        userID?: string;
        deviceID?: string;
    } = {}): Promise<VtcResponse<AlumniPayload | null>> {
        return API.call("createAlumni", { method: "POST", form: { email: params.email, graduation: params.graduation, discipline: params.discipline, userID: params.userID, token: this.token, deviceID: params.deviceID } });
    }

    /**
     * POST api?cmd=createGuest
     */
    static async createGuest(): Promise<VtcResponse<GuestPayload | null>> {
        return API.call("createGuest", { method: "POST" });
    }

    /**
     * POST api?cmd=createBooking
     */
    async createIBooking(params: {
        body: unknown;
    }): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("createBooking", { method: "POST", json: params.body, authorization: this.token });
    }

    /**
     * DELETE api?cmd=deleteNotification
     */
    async deleteNotification(params: {
        body: unknown;
    }): Promise<VtcResponse<NotificationDeletePayload | null>> {
        return API.call("deleteNotification", { method: "DELETE", query: { token: this.token }, json: params.body });
    }

    /**
     * POST api?cmd=deletePersonalEvent
     */
    async deletePersonalEvent(params: {
        eventID?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("deletePersonalEvent", { method: "POST", form: { token: this.token, eventID: params.eventID } });
    }

    /**
     * POST api?cmd=editFavouriteContactsOrdering
     */
    async editFavourtieContactsOrdering(params: {
        favList?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("editFavouriteContactsOrdering", { method: "POST", form: { token: this.token, favList: params.favList } });
    }

    /**
     * POST api?cmd=enrollActivity
     */
    async enrollActivity(params: {
        timestamp?: string;
        code?: string;
        email?: string;
        phone?: string;
        award?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("enrollActivity", { method: "POST", form: { token: this.token, timestamp: params.timestamp, code: params.code, email: params.email, phone: params.phone, award: params.award } });
    }

    /**
     * POST api?cmd=exchangeKeyInfo
     */
    async exchangeKeyInfo(params: {
        key?: string;
    } = {}): Promise<VtcResponse<ExchangeKeyInfoPayload | null>> {
        return API.call("exchangeKeyInfo", { method: "POST", form: { token: this.token, key: params.key } });
    }

    /**
     * GET api?cmd=fetchEvents
     */
    async fetchEvents(params: {
        webID?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("fetchEvents", { query: { token: this.token, webID: params.webID } });
    }

    /**
     * GET api?cmd=getAboutVTC
     */
    async getAboutVTC(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<AboutVTCPayload | null>> {
        return API.call("getAboutVTC", { query: { token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getActiveDevice
     */
    async getActiveDevice(): Promise<VtcResponse<ActiveDevicePayload | null>> {
        return API.call("getActiveDevice", { query: { token: this.token } });
    }

    /**
     * POST api?cmd=getActivitySearchOption
     */
    async getActivitySearchOption(): Promise<VtcResponse<ActivitySearchOption | null>> {
        return API.call("getActivitySearchOption", { method: "POST", form: { token: this.token } });
    }

    /**
     * GET api?cmd=getAdvocateBannerImage
     */
    async getAdvocateBannerImage(params: {
        isTablet?: number;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("getAdvocateBannerImage", { query: { token: this.token, isTablet: params.isTablet } });
    }

    /**
     * GET api?cmd=getAlumniEventList
     */
    async getAlumniEventList(): Promise<VtcResponse<AlumniEventPayload | null>> {
        return API.call("getAlumniEventList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getAlumniEventsFilterOptions
     */
    async getAlumniEventsFilterOptions(): Promise<VtcResponse<FilterOptionPayload | null>> {
        return API.call("getAlumniEventsFilterOptions", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getAlumniNewsFilterOptions
     */
    async getAlumniNewsFilterOptions(): Promise<VtcResponse<FilterOptionPayload | null>> {
        return API.call("getAlumniNewsFilterOptions", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getConfiguration
     */
    async getConfiguration(params: {
        platform?: number;
        versionNumber?: string;
    } = {}): Promise<VtcResponse<DrawerConfig | null>> {
        return API.call("getConfiguration", { query: { token: this.token, platform: params.platform, versionNumber: params.versionNumber } });
    }

    /**
     * GET api?cmd=getContactsList
     */
    async getContactsList(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<ContactListPayload | null>> {
        return API.call("getContactsList", { query: { token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=generateNewDeviceID
     */
    static async getDeviceID(): Promise<VtcResponse<DeviceIDPayload | null>> {
        return API.call("generateNewDeviceID");
    }

    /**
     * GET api?cmd=getDiscipline
     */
    static async getDiscipline(): Promise<VtcResponse<DisciplinePayload | null>> {
        return API.call("getDiscipline");
    }

    /**
     * GET api?cmd=getDisciplineAndProgramme
     */
    async getDisciplineAndProgramme(): Promise<VtcResponse<DisciplineAndProgrammePayload | null>> {
        return API.call("getDisciplineAndProgramme", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=requestOneTimeToken
     */
    async getDlaOneTimeToken(): Promise<VtcResponse<DlaOneTimeTokenPayload | null>> {
        return API.call("requestOneTimeToken", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getDoctorBookmarkList
     */
    async getDoctorBookmarkList(): Promise<VtcResponse<DoctorBookMarkListPayload | null>> {
        return API.call("getDoctorBookmarkList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getDoctorDetail
     */
    async getDoctorDetail(params: {
        id?: number;
        scheme?: string;
    } = {}): Promise<VtcResponse<Doctor | null>> {
        return API.call("getDoctorDetail", { query: { token: this.token, id: params.id, scheme: params.scheme } });
    }

    /**
     * GET api?cmd=getDoctorDetail
     */
    async getDoctorDetailByWebId(params: {
        webID?: string;
    } = {}): Promise<VtcResponse<Doctor | null>> {
        return API.call("getDoctorDetail", { query: { token: this.token, webID: params.webID } });
    }

    /**
     * GET api?cmd=getDoctorList
     */
    async getDoctorList(params: {
        timestamp?: number;
        scheme?: string;
    } = {}): Promise<VtcResponse<DoctorListPayload | null>> {
        return API.call("getDoctorList", { query: { token: this.token, timestamp: params.timestamp, scheme: params.scheme } });
    }

    /**
     * GET api?cmd=getDoctorListFilterOptions
     */
    async getDoctorListFilterOptions(): Promise<VtcResponse<DoctorListFilterOptionsPayload | null>> {
        return API.call("getDoctorListFilterOptions", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getDoctorScheme
     */
    async getDoctorScheme(): Promise<VtcResponse<DoctorScheme | null>> {
        return API.call("getDoctorScheme", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getDocDownloadFile
     */
    async getDocumentDownloadFile(params: {
        fileName?: string;
        category?: string;
        downloadToken?: string;
    } = {}): Promise<Response> {
        return API.download("getDocDownloadFile", { token: this.token, fileName: params.fileName, category: params.category, downloadToken: params.downloadToken });
    }

    /**
     * GET api?cmd=getDocDownloadList
     */
    async getDocumentDownloadList(): Promise<VtcResponse<DocumentDownloadListPayload | null>> {
        return API.call("getDocDownloadList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getDocDownloadNotice
     */
    async getDocumentDownloadNotice(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<DocumentDownloadNotice | null>> {
        return API.call("getDocDownloadNotice", { query: { token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getEnrollmentList
     */
    async getEnrollmentList(params: {
        code?: string;
    } = {}): Promise<VtcResponse<EnrollmentListPayload | null>> {
        return API.call("getEnrollmentList", { query: { token: this.token, code: params.code } });
    }

    /**
     * GET api?cmd=getEventReminderList
     */
    async getEventReminderList(): Promise<VtcResponse<EventReminderListPayload | null>> {
        return API.call("getEventReminderList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getFavouriteContactList
     */
    async getFavouriteContactList(): Promise<VtcResponse<FavouriteContactPayload | null>> {
        return API.call("getFavouriteContactList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getFeaturedNewsList
     */
    async getFeaturedNewsList(): Promise<VtcResponse<FeaturedNewsPayload | null>> {
        return API.call("getFeaturedNewsList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getApprovalBookingList
     */
    async getIBookingApprovalList(params: {
        page?: number;
        pageSize?: number;
        asc?: number;
    } = {}): Promise<VtcResponse<IBookingApprovalListPayload | null>> {
        return API.call("getApprovalBookingList", { query: { page: params.page, pageSize: params.pageSize, asc: params.asc }, authorization: this.token });
    }

    /**
     * GET api?cmd=getAvailableCampus
     */
    async getIBookingCampuses(): Promise<VtcResponse<IBookingCampusPayload | null>> {
        return API.call("getAvailableCampus", { authorization: this.token });
    }

    /**
     * GET api?cmd=getBookingDetails
     */
    async getIBookingDetail(params: {
        bookingId?: string;
        service?: string;
        facilityId?: number;
        startDate?: string;
        endDate?: string;
    } = {}): Promise<VtcResponse<IBookingDetailPayload | null>> {
        return API.call("getBookingDetails", { query: { bookingId: params.bookingId, service: params.service, facilityId: params.facilityId, startDate: params.startDate, endDate: params.endDate }, authorization: this.token });
    }

    /**
     * GET api?cmd=listBooking
     */
    async getIBookingList(params: {
        page?: number;
        pageSize?: number;
        asc?: number;
        type?: string;
    } = {}): Promise<VtcResponse<IBookingListItem[] | null>> {
        return API.call("listBooking", { query: { page: params.page, pageSize: params.pageSize, asc: params.asc, type: params.type }, authorization: this.token });
    }

    /**
     * GET api?cmd=getAvailableRoom
     */
    async getIBookingRooms(params: {
        regionId?: string;
        ibServiceId?: string;
    } = {}): Promise<VtcResponse<IBookingRoom[] | null>> {
        return API.call("getAvailableRoom", { query: { regionId: params.regionId, ibServiceId: params.ibServiceId }, authorization: this.token });
    }

    /**
     * GET api?cmd=searchTimeslots
     */
    async getIBookingTimeslots(params: {
        roomId?: string;
        date?: string;
        regionId?: string;
        ibServiceId?: string;
        startTime?: string;
        endTime?: string;
    } = {}): Promise<VtcResponse<IBookingTimeslot[] | null>> {
        return API.call("searchTimeslots", { query: { roomId: params.roomId, date: params.date, regionId: params.regionId, ibServiceId: params.ibServiceId, startTime: params.startTime, endTime: params.endTime }, authorization: this.token });
    }

    /**
     * GET api?cmd=getImage
     */
    async getImage(params: {
        imageID?: string;
        mode?: number;
        height?: number;
        width?: number;
        imageType?: number;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("getImage", { query: { token: this.token, imageID: params.imageID, mode: params.mode, height: params.height, width: params.width, imageType: params.imageType } });
    }

    /**
     * GET api?cmd=getLatestActivity
     */
    async getLatestActivity(params: {
        codes?: string;
        timestamp?: number;
    } = {}): Promise<VtcResponse<ActivityListPayload | null>> {
        return API.call("getLatestActivity", { query: { token: this.token, codes: params.codes, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getNameCard
     */
    async getNameCard(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<NameCardPayload | null>> {
        return API.call("getNameCard", { query: { token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getNewsList
     */
    async getNewsList(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<DataSyncPayload<News> | null>> {
        return API.call("getNewsList", { query: { token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getNotificationFilterOptions
     */
    async getNotificationFilterOptions(): Promise<VtcResponse<FilterOptionPayload | null>> {
        return API.call("getNotificationFilterOptions", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getNotificationList
     */
    async getNotificationList(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<DataSyncPayload<Notification> | null>> {
        return API.call("getNotificationList", { query: { token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getNotificationTypes
     */
    async getNotificationTypes(): Promise<VtcResponse<NotificationTypePayload | null>> {
        return API.call("getNotificationTypes", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getNewsListForPublic
     */
    static async getPublicNewsList(): Promise<VtcResponse<FeaturedNewsPayload | null>> {
        return API.call("getNewsListForPublic");
    }

    /**
     * GET api?cmd=getRoomSearchActivity
     */
    async getRoomSearchActivity(): Promise<VtcResponse<SearchRoomActivityPayload | null>> {
        return API.call("getRoomSearchActivity", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getRoomSearchCampusList
     */
    async getRoomSearchCampusList(): Promise<VtcResponse<SearchRoomCampusPayload | null>> {
        return API.call("getRoomSearchCampusList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getRoomSearchDepartment
     */
    async getRoomSearchDepartment(params: {
        campusId?: string;
    } = {}): Promise<VtcResponse<SearchRoomDepartmentPayload | null>> {
        return API.call("getRoomSearchDepartment", { query: { token: this.token, campusId: params.campusId } });
    }

    /**
     * GET api?cmd=getRssList&type=json
     */
    async getRssList(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<RssListPayload | null>> {
        return API.call("getRssList", { query: { type: "json", token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getSiteMap
     */
    async getSiteMap(): Promise<VtcResponse<SiteMapPayload | null>> {
        return API.call("getSiteMap", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getStaffTimeTable
     */
    async getStaffTimeTable(params: {
        year?: number;
        month?: number;
    } = {}): Promise<VtcResponse<StaffTimetablePayload | null>> {
        return API.call("getStaffTimeTable", { query: { token: this.token, year: params.year, month: params.month } });
    }

    /**
     * GET api?cmd=getStudyPaceList
     */
    async getStudyPaceList(): Promise<VtcResponse<StudyPaceResponse | null>> {
        return API.call("getStudyPaceList", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getUserInfo
     */
    async getUserInfo(): Promise<VtcResponse<UserInfoPayload | null>> {
        return API.call("getUserInfo", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getUserSetting
     */
    async getUserSetting(): Promise<VtcResponse<unknown>> {
        return API.call("getUserSetting", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getAppList&platform=2
     */
    async getVtcAppList(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<DataSyncPayload<VtcApp> | null>> {
        return API.call("getAppList", { query: { platform: "2", token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getWebsiteList
     */
    async getWebsiteList(params: {
        timestamp?: number;
    } = {}): Promise<VtcResponse<DataSyncPayload<Website> | null>> {
        return API.call("getWebsiteList", { query: { token: this.token, timestamp: params.timestamp } });
    }

    /**
     * GET api?cmd=getWorkspaceActivityDetail
     */
    async getWorkspaceActivityDetail(params: {
        id?: string;
    } = {}): Promise<VtcResponse<WorkspaceActivityDetail | null>> {
        return API.call("getWorkspaceActivityDetail", { query: { token: this.token, id: params.id } });
    }

    /**
     * GET api?cmd=getWorkspaceActivityList
     */
    async getWorkspaceActivityList(params: {
        startDate?: string;
        endDate?: string;
        ou?: string;
        category?: string;
        subCategory?: string;
        level?: string;
        cpdFrom?: string;
        cpdTo?: string;
        enrolled?: string;
    } = {}): Promise<VtcResponse<WorkspaceActivityListPayload | null>> {
        return API.call("getWorkspaceActivityList", { query: { token: this.token, startDate: params.startDate, endDate: params.endDate, ou: params.ou, category: params.category, subCategory: params.subCategory, level: params.level, cpdFrom: params.cpdFrom, cpdTo: params.cpdTo, enrolled: params.enrolled } });
    }

    /**
     * GET api?cmd=getSearchOption
     */
    async getWorkspaceActivitySearchOption(): Promise<VtcResponse<WorkspaceActivitySearchOptionPayload | null>> {
        return API.call("getSearchOption", { query: { token: this.token } });
    }

    /**
     * GET api?cmd=getYearOfGraduation
     */
    static async getYearOfGraduation(): Promise<VtcResponse<YearOfGraduationPayload | null>> {
        return API.call("getYearOfGraduation");
    }

    /**
     * GET api?cmd=holdBooking
     */
    async holdIBooking(params: {
        serviceId?: string;
        resourceId?: string;
        bookingDate?: string;
        startTime?: string;
        endTime?: string;
    } = {}): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("holdBooking", { query: { serviceId: params.serviceId, resourceId: params.resourceId, bookingDate: params.bookingDate, startTime: params.startTime, endTime: params.endTime }, authorization: this.token });
    }

    /**
     * POST api?cmd=loginMobileADFS
     */
    static async loginMobileADFS(params: {
        deviceID?: string;
        userType?: string;
        authorizationCode?: string;
        codeVerifier?: string;
    } = {}): Promise<VtcResponse<UserPayload | null>> {
        return API.call("loginMobileADFS", { method: "POST", form: { deviceID: params.deviceID, userType: params.userType, authorizationCode: params.authorizationCode, codeVerifier: params.codeVerifier } });
    }

    /**
     * POST api?cmd=loginMobileDevice
     * Carries a VTC password: never log or persist the arguments.
     */
    static async loginMobileDevice(params: {
        vtcID?: string;
        password?: string;
        isReLogin?: number;
        deviceID?: string;
        userType?: string;
    } = {}): Promise<VtcResponse<UserPayload | null>> {
        return API.call("loginMobileDevice", { method: "POST", form: { vtcID: params.vtcID, password: params.password, isReLogin: params.isReLogin, deviceID: params.deviceID, userType: params.userType } });
    }

    /**
     * POST api?cmd=logoutMobile
     */
    async logoutMobile(params: {
        deviceID?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("logoutMobile", { method: "POST", form: { token: this.token, deviceID: params.deviceID } });
    }

    /**
     * GET api?cmd=maintenanceMode
     */
    static async maintenanceMode(): Promise<VtcResponse<MultiLangString | null>> {
        return API.call("maintenanceMode");
    }

    /**
     * POST api?cmd=postEventReminder
     */
    async postEventReminder(params: {
        enable?: number;
        eventID?: string;
        eventType?: number;
        reminderOption?: number;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("postEventReminder", { method: "POST", form: { token: this.token, enable: params.enable, eventID: params.eventID, eventType: params.eventType, reminderOption: params.reminderOption } });
    }

    /**
     * POST api?cmd=postPersonalEvent
     */
    async postPersonalEvent(params: {
        name?: string;
        detail?: string;
        startTime?: number;
        endTime?: number;
        enableReminder?: number;
        reminderTimeOption?: number;
        eventID?: string;
    } = {}): Promise<VtcResponse<PersonalEventPayload | null>> {
        return API.call("postPersonalEvent", { method: "POST", form: { token: this.token, name: params.name, detail: params.detail, startTime: params.startTime, endTime: params.endTime, enableReminder: params.enableReminder, reminderTimeOption: params.reminderTimeOption, eventID: params.eventID } });
    }

    /**
     * POST api?cmd=readNews
     */
    async readNews(params: {
        newsIDs?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("readNews", { method: "POST", form: { token: this.token, newsIDs: params.newsIDs } });
    }

    /**
     * POST api?cmd=registerDevice
     */
    async registerDevice(params: {
        deviceToken?: string;
        platform?: number;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("registerDevice", { method: "POST", form: { token: this.token, deviceToken: params.deviceToken, platform: params.platform } });
    }

    /**
     * POST api?cmd=remoteSignOut
     * Carries a VTC password: never log or persist the arguments.
     */
    async remoteSignout(params: {
        password?: string;
        deviceID?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("remoteSignOut", { method: "POST", form: { token: this.token, password: params.password, deviceID: params.deviceID } });
    }

    /**
     * DELETE api?cmd=removeBookmarkedDoctor
     */
    async removeBookmarkedDoctor(params: {
        scheme?: string;
        favKey?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("removeBookmarkedDoctor", { method: "DELETE", query: { token: this.token, scheme: params.scheme, favKey: params.favKey } });
    }

    /**
     * POST api?cmd=removeFavouriteContacts
     */
    async removeFavouriteContacts(params: {
        favList?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("removeFavouriteContacts", { method: "POST", form: { token: this.token, favList: params.favList } });
    }

    /**
     * POST api?cmd=requestResetPasswordCode
     */
    static async requestResetPasswordCode(params: {
        vtcID?: string;
        hkid?: string;
        date_of_birth?: string;
        receive_method?: string;
    } = {}): Promise<VtcResponse<ResetPasswordCodePayload | null>> {
        return API.call("requestResetPasswordCode", { method: "POST", form: { vtcID: params.vtcID, hkid: params.hkid, date_of_birth: params.date_of_birth, receive_method: params.receive_method } });
    }

    /**
     * POST api?cmd=requestResetPasswordMethod
     */
    static async requestResetPasswordMethod(params: {
        vtcID?: string;
        hkid?: string;
        date_of_birth?: string;
    } = {}): Promise<VtcResponse<ResetPasswordMethodPayload | null>> {
        return API.call("requestResetPasswordMethod", { method: "POST", form: { vtcID: params.vtcID, hkid: params.hkid, date_of_birth: params.date_of_birth } });
    }

    /**
     * POST api?cmd=resetPassword
     * Carries a VTC password: never log or persist the arguments.
     */
    static async resetPasswordCode(params: {
        vtcID?: string;
        hkid?: string;
        date_of_birth?: string;
        password?: string;
        method?: string;
        code?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("resetPassword", { method: "POST", form: { vtcID: params.vtcID, hkid: params.hkid, date_of_birth: params.date_of_birth, password: params.password, method: params.method, code: params.code } });
    }

    /**
     * POST api?cmd=resetPassword
     * Carries a VTC password: never log or persist the arguments.
     */
    static async resetPasswordmfaSession(params: {
        vtcID?: string;
        hkid?: string;
        date_of_birth?: string;
        password?: string;
        method?: string;
        mfaSession?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("resetPassword", { method: "POST", form: { vtcID: params.vtcID, hkid: params.hkid, date_of_birth: params.date_of_birth, password: params.password, method: params.method, mfaSession: params.mfaSession } });
    }

    /**
     * GET api?cmd=searchRoom
     */
    async searchRoom(params: {
        campusId?: string;
        departmentId?: string;
        capacity?: string;
        startTime?: string;
        endTime?: string;
    } = {}): Promise<VtcResponse<SearchRoomPayload | null>> {
        return API.call("searchRoom", { query: { token: this.token, campusId: params.campusId, departmentId: params.departmentId, capacity: params.capacity, startTime: params.startTime, endTime: params.endTime } });
    }

    /**
     * GET api?cmd=searchRoomByActivityTimeSlot
     */
    async searchRoomByActivityTimeSlot(params: {
        activityId?: string;
        campusId?: string;
        capacity?: string;
        duration?: string;
        timeSlotStart?: string;
        timeSlotEnd?: string;
    } = {}): Promise<VtcResponse<SearchRoomPayload | null>> {
        return API.call("searchRoomByActivityTimeSlot", { query: { token: this.token, activityId: params.activityId, campusId: params.campusId, capacity: params.capacity, duration: params.duration, timeSlotStart: params.timeSlotStart, timeSlotEnd: params.timeSlotEnd } });
    }

    /**
     * GET api?cmd=searchTimeSlot
     */
    async searchTimeSlot(params: {
        activityId?: string;
        capacity?: string;
        duration?: string;
        startDate?: string;
        endDate?: string;
    } = {}): Promise<VtcResponse<SearchRoomTimeslotPayload | null>> {
        return API.call("searchTimeSlot", { query: { token: this.token, activityId: params.activityId, capacity: params.capacity, duration: params.duration, startDate: params.startDate, endDate: params.endDate } });
    }

    /**
     * GET api?cmd=shareDoctor
     */
    async shareDoctor(params: {
        scheme?: string;
        doctorID?: number;
    } = {}): Promise<VtcResponse<ShareDoctorPayload | null>> {
        return API.call("shareDoctor", { query: { token: this.token, scheme: params.scheme, doctorID: params.doctorID } });
    }

    /**
     * POST api?cmd=shareEvents
     */
    async shareEvents(params: {
        eventID?: string;
    } = {}): Promise<VtcResponse<ShareEventPayload | null>> {
        return API.call("shareEvents", { method: "POST", form: { token: this.token, eventID: params.eventID } });
    }

    /**
     * POST api?cmd=uploadStudPhoto
     */
    async studentPhotoUploadCheckAI(params: {
        studPhoto?: string;
    } = {}): Promise<VtcResponse<CheckStudPhotoAiResultPayload | null>> {
        return API.call("uploadStudPhoto", { method: "POST", form: { token: this.token, studPhoto: params.studPhoto } });
    }

    /**
     * POST api?cmd=uploadStudPhoto
     */
    async studentPhotoUploadConfirm(params: {
        uploadSPS?: string;
        studPhoto?: string;
    } = {}): Promise<VtcResponse<CheckStudPhotoAiResultPayload | null>> {
        return API.call("uploadStudPhoto", { method: "POST", form: { token: this.token, uploadSPS: params.uploadSPS, studPhoto: params.studPhoto } });
    }

    /**
     * POST api?cmd=submitEnquiry
     */
    async submitEnquiry(params: {
        email?: string;
        enquiry?: string;
        imageID?: string;
        appVersion?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("submitEnquiry", { method: "POST", form: { token: this.token, email: params.email, enquiry: params.enquiry, imageID: params.imageID, appVersion: params.appVersion } });
    }

    /**
     * POST api?cmd=updateAlumni
     */
    async updateAlumni(params: {
        email?: string;
        graduation?: string;
        discipline?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("updateAlumni", { method: "POST", form: { email: params.email, graduation: params.graduation, discipline: params.discipline, token: this.token } });
    }

    /**
     * POST api?cmd=updateBookmarkDoctor
     */
    async updateBookmarkDoctor(params: {
        bookmarkList?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("updateBookmarkDoctor", { method: "POST", form: { token: this.token, bookmarkList: params.bookmarkList } });
    }

    /**
     * POST api?cmd=updateDoctorRating
     */
    async updateDoctorRating(params: {
        code?: string;
        deviceId?: string;
        cnaArray?: string;
        timestamp?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("updateDoctorRating", { method: "POST", form: { token: this.token, code: params.code, deviceId: params.deviceId, cnaArray: params.cnaArray, timestamp: params.timestamp } });
    }

    /**
     * POST api?cmd=favouriteContacts
     */
    async updateFavouriteContacts(params: {
        favList?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("favouriteContacts", { method: "POST", form: { token: this.token, favList: params.favList } });
    }

    /**
     * POST api?cmd=updateBooking
     */
    async updateIBooking(params: {
        body: unknown;
    }): Promise<VtcResponse<IBookingResultPayload | null>> {
        return API.call("updateBooking", { method: "POST", json: params.body, authorization: this.token });
    }

    /**
     * POST api?cmd=updateLastAccessTime
     */
    async updateLastAccessTime(params: {
        deviceID?: string;
        osVersion?: string;
        deviceName?: string;
        deviceModel?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("updateLastAccessTime", { method: "POST", form: { token: this.token, deviceID: params.deviceID, osVersion: params.osVersion, deviceName: params.deviceName, deviceModel: params.deviceModel } });
    }

    /**
     * POST api?cmd=updatePass
     */
    async updatePass(params: {
        code?: string;
        deviceId?: string;
        cna?: string;
        timestamp?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("updatePass", { method: "POST", form: { token: this.token, code: params.code, deviceId: params.deviceId, cna: params.cna, timestamp: params.timestamp } });
    }

    /**
     * POST api?cmd=updateUserImage
     */
    async updateUserImage(params: {
        photoID?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("updateUserImage", { method: "POST", form: { token: this.token, photoID: params.photoID } });
    }

    /**
     * POST api?cmd=updateUserSetting
     */
    async updateUserSetting(params: {
        languagePreference?: string;
    } = {}): Promise<VtcResponse<unknown>> {
        return API.call("updateUserSetting", { method: "POST", form: { token: this.token, languagePreference: params.languagePreference } });
    }

    /**
     * POST api?cmd=uploadImage
     */
    async uploadImage(params: {
        /** Multipart body; the APK part name is obfuscated, so set the field name yourself. */
        body: FormData;
    }): Promise<VtcResponse<ImagePayload | null>> {
        return API.call("uploadImage", { method: "POST", query: { token: this.token }, multipart: params.body });
    }
}
