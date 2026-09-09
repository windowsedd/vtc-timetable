/**
 * Response shapes for the VtcClient operations of the VTC@HK mobile API.
 *
 * Transcribed from the static APK inventory of VTC@HK 4.0.16 (Retrofit generic
 * signatures and Gson models), so these are client-declared shapes: a field the app
 * declares can still be absent or null at runtime, and `unknown` marks a payload the
 * APK itself left untyped.
 */
import type { MultiLangString } from "./common";

export type { MultiLangString, VtcResponse } from "./common";

/** Incremental add/update/delete set used by the sync-style payloads. */
export interface Data<T> {
	add: T[];
	update: T[];
	delete: T[];
}

export interface DataSyncPayload<T> {
	add: T[];
	update: T[];
	delete: unknown[];
	currentTimestamp: number;
	lastUpdatedTimestamp: number;
}

export interface ActiveDevice {
	created_at: number;
	deviceID: string;
	deviceModel: string;
	deviceName: string;
	lastAccessTime: number;
	osVersion: string;
	userID: string;
}

export interface Activity {
	accepted: boolean;
	activityHour: number;
	activityType: ActivityString;
	attachment: Attachment[];
	attribute: string[];
	awards: ActivityString[];
	campus: ActivityString;
	code: string;
	deposit: number;
	description: DisplayName;
	discipline: DisplayName;
	enrolRemark: string;
	enrolled: string;
	enrollmentFrom: number;
	enrollmentTo: number;
	executionFrom: number;
	executionTo: number;
	fee: number;
	instructor: Instructor;
	isHost: boolean;
	isOpen: boolean;
	isSWPDProgrmme: boolean;
	module: string[];
	responsible: Instructor[];
	successEnrolmentAlertMessage: DisplayName;
	timeslots: Timeslot[];
	title: DisplayName;
	venueRemark: string;
}

export interface ActivitySearchOption {
	lastUpdatedTimestamp: number;
	list: SearchOptionList;
}

export interface ActivityString {
	displayName: MultiLangString;
	id: string;
}

export interface AlumniEvent {
	alumniEventsOption: string;
	dateTime: MultiLangString;
	deadline: MultiLangString;
	detail: MultiLangString;
	eventType: MultiLangString;
	expiryDate: number;
	id: string;
	imageID: string;
	location: MultiLangString;
	organiser: MultiLangString;
	title: MultiLangString;
	url: string;
}

export interface AppDownloadReminder {
	button: MultiLangString;
	downloadUrl: string;
	message: MultiLangString;
	scheme: string;
}

export interface Attachment {
	fileSysName: string;
	fileUploadName: string;
}

export interface BookmarkDoctor {
	created_at: string;
	created_by: string;
	deleted_at: string;
	deleted_by: string;
	favKey: string;
	id: number;
	orderNum: string;
	updated_at: string;
	updated_by: string;
	userID: string;
}

export interface Contacts {
	deptCode: string;
	email: string;
	favKey: string;
	faxNum: string;
	id: string;
	metaTag: string[];
	name: MultiLangString;
	orderNum: number;
	phoneExt: string;
	phoneNum: string;
	postOrderString: string;
	searchKey: string[];
	siteCode: string;
	teamCode: string;
	title: MultiLangString;
	unitCode: string;
}

export interface Department {
	deptCode: string;
	favKey: string;
	id: string;
	name: MultiLangString;
	orderNum: number;
	searchKey: string[];
	siteCode: string;
}

export interface Discipline {
	id: string;
	logo: string;
	name_en: string;
	name_sc: string;
	name_tc: string;
	order_no: number;
	programmes: Programme[];
	themeColor: string;
}

export interface DisciplineName {
	code: string[];
	en: string[];
	sc: string[];
	tc: string[];
}

export interface DisplayName {
	displayName: MultiLangString;
}

export interface Doctor {
	address_ch: string;
	address_en: string;
	address_sc: string;
	area_ch: string;
	area_en: string;
	area_id: number;
	area_sc: string;
	clinicName_ch: string;
	clinicName_en: string;
	clinicName_sc: string;
	day_string_1: string;
	day_string_2: string;
	day_string_3: string;
	day_string_4: string;
	day_time_1: string;
	day_time_2: string;
	day_time_3: string;
	day_time_4: string;
	district_ch: string;
	district_en: string;
	district_id: number;
	district_sc: string;
	drName_ch: string;
	drName_en: string;
	drName_sc: string;
	dr_id: number;
	favKey: string;
	fax: string;
	lat: string;
	long: string;
	remark: string;
	scheme: string;
	sourceName_en: string;
	sourceName_sc: string;
	sourceName_tc: string;
	specially_ch: string;
	specially_en: string;
	specially_sc: string;
	specialty_id: number;
	telephone: string;
	updated_at: string;
}

export interface DoctorListFilterOptionsArea {
	area_ch: string;
	area_en: string;
	area_sc: string;
	id: number;
	orderNum: number;
}

export interface DoctorListFilterOptionsDistrict {
	areaID: number;
	district_ch: string;
	district_en: string;
	district_sc: string;
	id: number;
	orderNum: number;
}

export interface DoctorListFilterOptionsSpecialtyNrp {
	id: number;
	orderNum: number;
	specialty_ch: string;
	specialty_en: string;
	specialty_sc: string;
}

export interface DoctorListFilterOptionsSpecialtyOrp {
	id: number;
	orderNum: number;
	specialty_ch: string;
	specialty_en: string;
	specialty_sc: string;
}

export interface DoctorScheme {
	scheme: string;
}

export interface DocumentDownload {
	cat_id: string;
	detail: DocumentDownloadDetail[];
	isBlocked: boolean;
	isPreReleasePeriod: boolean;
	isWithInShowPeriod: boolean;
	remarks_en: string;
	remarks_sc: string;
	remarks_tc: string;
	title_en: string;
	title_sc: string;
	title_tc: string;
	userReadTimestamp: number;
}

export interface DocumentDownloadDetail {
	lastModifiedTimestamp: number;
	name_en: string;
	name_sc: string;
	name_tc: string;
}

export interface DocumentDownloadNotice {
	lastModifiedTimestamp: number;
	wording_en: string;
	wording_sc: string;
	wording_tc: string;
}

export interface DrawerConfig {
	home: DrawerList;
	id: number;
	menu: DrawerList;
}

export interface DrawerItem {
	external: boolean;
	isSSO: boolean;
	key: string;
	title: MultiLangString;
	url: MultiLangString;
}

export interface DrawerList {
	featured: DrawerItem[];
	other: DrawerItem[];
}

export interface FavouriteContact {
	contactType: number;
	favKey: string;
	orderNum: string;
}

export interface IBookingAddon {
	descEN: string;
	descSC: string;
	descTC: string;
	id: string;
	nameEN: string;
	nameSC: string;
	nameTC: string;
}

export interface IBookingAddonService {
	addon: IBookingAddon[];
	descEn: string;
	descSc: string;
	descTc: string;
	id: string;
	nameEn: string;
	nameSc: string;
	nameTc: string;
}

export interface IBookingApprovalAddon {
	nameEn: string;
	nameSc: string;
	nameTc: string;
	qty: number;
	resourceId: number;
	serviceId: number;
	serviceNameEN: string;
	serviceNameSC: string;
	serviceNameTC: string;
}

export interface IBookingApprovalItem {
	bookingId: string;
	bookingTimeSlot: IBookingApprovalTimeSlot[];
}

export interface IBookingApprovalOrganizer {
	email: string;
	recipient: string;
	userCNA: string;
}

export interface IBookingApprovalTimeSlot {
	addon: IBookingApprovalAddon[];
	attendees: IBookingAttendee[];
	bookingDate: string;
	bookingTSID: string;
	endTime: string;
	organizer: IBookingApprovalOrganizer;
	parentBookingId: string;
	remarks: string;
	resourceId: number;
	resourceNameEn: string;
	resourceNameSc: string;
	resourceNameTc: string;
	service: string;
	startTime: string;
	status: string;
	statusLabelEn: string;
	statusLabelSc: string;
	statusLabelTc: string;
	thumbnail: string;
	title: string;
}

export interface IBookingAttendee {
	userCNA: string;
	email: string;
	recipient: string;
}

export interface IBookingCampus {
	id: string;
	nameEN: string;
	nameSC: string;
	nameTC: string;
	services: IBookingService[];
}

export interface IBookingDetail {
	addon: IBookingDetailAddon[];
	attendees: IBookingAttendee[];
	bookingDate: string;
	bookingId: string;
	bookingNumber: string;
	bookingTSID: string;
	campusName: string;
	campusNameSc: string;
	campusNameTc: string;
	checkInDateTime: string;
	description: string;
	endTime: string;
	location: string;
	organizer: IBookingOrganizer;
	phone: string;
	price: string;
	regionId: string;
	rejectReason: string;
	remark: string;
	resourceId: string;
	roomName: string;
	roomNameSc: string;
	roomNameTc: string;
	service: string;
	serviceId: string;
	startTime: string;
	status: string;
	statusLabelEn: string;
	statusLabelSc: string;
	statusLabelTc: string;
	thumbnail: string;
	title: string;
}

export interface IBookingDetailAddon {
	quantity: number;
	resourceId: string;
	nameEn: string;
	nameSc: string;
	nameTc: string;
	serviceId: string;
	serviceName: string;
	serviceNameSc: string;
	serviceNameTc: string;
}

export interface IBookingListAddon {
	nameEn: string;
	nameSc: string;
	nameTc: string;
	qty: number;
	resourceId: string;
	serviceId: string;
	serviceNameEN: string;
	serviceNameSC: string;
	serviceNameTC: string;
}

export interface IBookingListAttendee {
	email: string;
	recipient: string;
	userCNA: string;
}

export interface IBookingListItem {
	addon: IBookingListAddon[];
	attendees: IBookingListAttendee[];
	bookingDate: string;
	bookingId: string;
	checkInDateTime: string;
	endTime: string;
	facilityId: string;
	location: string;
	organizer: IBookingListOrganizer;
	phone: string;
	regionId: string;
	rejectReason: string;
	remarks: string;
	resourceId: string;
	resourceNameEn: string;
	resourceNameSc: string;
	resourceNameTc: string;
	service: string;
	serviceId: string;
	serviceNameEn: string;
	serviceNameSc: string;
	serviceNameTc: string;
	startTime: string;
	status: string;
	statusLabelEn: string;
	statusLabelSc: string;
	statusLabelTc: string;
	thumbnail: string;
	title: string;
}

export interface IBookingListOrganizer {
	email: string;
	recipient: string;
	userCNA: string;
}

export interface IBookingOrganizer {
	userCNA: string;
	email: string;
	recipient: string;
	phone: string;
}

export interface IBookingRoom {
	addonService: IBookingAddonService[];
	duration: number;
	durationUnit: string;
	fee: number;
	id: string;
	infotag: string[];
	locNameEn: string;
	locNameSc: string;
	locNameTc: string;
	maxBookingDuration: number;
	maximumAttendees: number;
	minBookingDuration: number;
	minimumAttendees: number;
	nameEn: string;
	nameSc: string;
	nameTc: string;
	needApproval: boolean;
	needCheckin: boolean;
	photoUrl: string;
}

export interface IBookingService {
	id: string;
	nameEn: string;
	nameSc: string;
	nameTc: string;
}

export interface IBookingTimeslot {
	available: boolean;
	bookingId: string;
	endTime: string;
	eventName: string;
	organizerName: string;
	startTime: string;
}

export interface Instructor {
	cna: string;
	name: string;
}

export interface MultiLangStringWithImage {
	en: string;
	imageID: string;
	sc: string;
	tc: string;
}

export interface News {
	accessBy: number[];
	alumniNewsOption: string[];
	content: MultiLangString;
	expiryDate: number;
	facebookVideoID: string;
	iconID: string;
	id: string;
	imageID: string;
	isAlumniNews: boolean;
	isCritical: boolean;
	isFeaturedNews: boolean;
	isNew: boolean;
	isRead: boolean;
	lastUpdateDate: number;
	panoptoVideoUrl: string;
	postDate: number;
	title: MultiLangString;
	youtubeVideoID: string;
}

export interface Notification {
	extraData: NotificationExtraData;
	id: string;
	isRead: boolean;
	itemID: string;
	msg: string;
	notificationOption: string[];
	sendTime: number;
	sender: string;
	type: number;
}

export interface NotificationExtraData {
	url: string;
}

export interface NotificationType {
	displayNameEn: string;
	displayNameSc: string;
	displayNameTc: string;
	id: string;
}

export interface Participant {
	campus: string;
	cna: string;
	code: string;
	department: string;
	enrollStatus: string;
	enrollmentSeq: number;
	name: string;
	pass: boolean;
	phone: number;
	programme: string;
	role: string;
}

export interface PersonalEvent {
	detail: string;
	endDate: number;
	id: string;
	name: string;
	startDate: number;
	webID: string;
}

export interface Programme {
	enrollmentDeadline: number;
	id: string;
	name_en: string;
	name_sc: string;
	name_tc: string;
	order_no: string;
	url: string;
}

export interface Reminder {
	eventID: string;
	eventType: number;
	reminderID: string;
	reminderOption: number;
}

export interface SearchOptionList {
	attribute: ActivityString[];
	campus: ActivityString[];
	type: ActivityString[];
}

export interface SearchRoom {
	capacity: string;
	name: string;
}

export interface SearchRoomActivity {
	id: string;
	name: string;
}

export interface SearchRoomCampus {
	id: string;
	name: MultiLangString;
}

export interface SearchRoomDepartment {
	id: string;
	name: MultiLangString;
}

export interface SearchRoomTimeslot {
	endTime: number;
	startTime: number;
}

export interface Site {
	favKey: string;
	id: string;
	name: MultiLangString;
	orderNum: number;
	searchKey: string[];
	siteCode: string;
}

export interface SiteMap {
	address: MultiLangString;
	campus: MultiLangString;
	display_url: string;
	email: string;
	fax: string;
	id: string;
	image_key: string;
	institute: MultiLangString;
	institute_code: string;
	lat: string;
	lng: string;
	site_order: string;
	tel: string;
	url: string;
}

export interface StaffTimetable {
	activityType: MultiLangString;
	campus: string;
	endTime: number;
	enrollmentFrom: number;
	enrollmentTo: number;
	id: string;
	isWorkspaceActivity: boolean;
	lat: string;
	lng: string;
	location: string;
	modDesc: MultiLangString;
	startTime: number;
	studentSet: MultiLangString;
	title: MultiLangString;
	uniqueId: string;
	workActivityId: string;
	workActivityIsEnrol: boolean;
	workActivityIsOpen: boolean;
	workActivityOUName_en: string;
	workActivityOUName_sc: string;
	workActivityOUName_tc: string;
	workActivityTitle_en: string;
	workActivityTitle_sc: string;
	workActivityTitle_tc: string;
}

export interface StudentSet {
	id: string;
}

export interface Team {
	deptCode: string;
	favKey: string;
	id: string;
	name: MultiLangString;
	orderNum: number;
	siteCode: string;
	teamCode: string;
	unitCode: string;
}

export interface Timeslot {
	duration: number;
	enddate: number;
	startdate: number;
}

export interface Unit {
	deptCode: string;
	favKey: string;
	id: string;
	name: MultiLangString;
	orderNum: number;
	siteCode: string;
	unitCode: string;
}

export interface VtcApp {
	androidLink: string;
	description: MultiLangString;
	id: string;
	identifier: string;
	imageID: string;
	isEnable: boolean;
	isNative: boolean;
	name: MultiLangString;
	orderNum: number;
	webAppLink: MultiLangString;
}

export interface Website {
	id: string;
	imageID: string;
	isEnable: boolean;
	link: MultiLangString;
	name: MultiLangString;
	orderNum: number;
	type: number;
}

export interface WorkspaceActivity {
	activityFrom: number;
	activityTo: number;
	enrollmentFrom: number;
	enrollmentTo: number;
	id: string;
	isEnrol: boolean;
	isOpen: boolean;
	ou: WorkspaceActivityOU;
	title_en: string;
	title_sc: string;
	title_tc: string;
}

export interface WorkspaceActivityChoiceDay {
	end: number;
	location_en: string;
	location_sc: string;
	location_tc: string;
	start: number;
}

export interface WorkspaceActivityChoiceDetail {
	choice_id: string;
	content_en: string;
	content_sc: string;
	content_tc: string;
	cpd: number;
	days: WorkspaceActivityChoiceDay[];
	facilitator_en: string;
	facilitator_sc: string;
	facilitator_tc: string;
	isEnrol: boolean;
	isOpen: boolean;
	targetAudience_en: string;
	targetAudience_sc: string;
	targetAudience_tc: string;
	title_en: string;
	title_sc: string;
	title_tc: string;
}

export interface WorkspaceActivityDetail {
	banner_en: string;
	banner_sc: string;
	banner_tc: string;
	category_en: string;
	category_sc: string;
	category_tc: string;
	choices: WorkspaceActivityChoiceDetail[];
	choose_one: boolean;
	concurrent: boolean;
	directApplicationPage_en: string;
	directApplicationPage_sc: string;
	directApplicationPage_tc: string;
	enrollmentFrom: number;
	enrollmentTo: number;
	id: string;
	image_url_en: string;
	image_url_sc: string;
	image_url_tc: string;
	level_en: string;
	level_sc: string;
	level_tc: string;
	mediumOfInstruction_en: string;
	mediumOfInstruction_sc: string;
	mediumOfInstruction_tc: string;
	ou_en: string;
	ou_sc: string;
	ou_tc: string;
	remarks_en: string;
	remarks_sc: string;
	remarks_tc: string;
	subcategory_en: string;
	subcategory_sc: string;
	subcategory_tc: string;
	trainingType_en: string;
	trainingType_sc: string;
	trainingType_tc: string;
}

export interface WorkspaceActivityOU {
	name_en: string;
	name_sc: string;
	name_tc: string;
}

export interface WorkspaceActivitySearchOption {
	id: string;
	name_en: string;
	name_sc: string;
	name_tc: string;
}

export interface AboutVTCPayload {
	coreValues: MultiLangString;
	currentTimestamp: number;
	lastUpdatedTimestamp: number;
	mission: MultiLangString;
	opportunities: MultiLangString;
	url: MultiLangString;
	vision: MultiLangString;
}

export interface ActiveDevicePayload {
	device: ActiveDevice[];
	deviceCount: number;
}

export interface ActivityListPayload {
	list: Data<Activity>;
	currentTimestamp: number;
	lastUpdatedTimestamp: number;
	vtcID: string;
}

export interface AlumniEventPayload {
	alumniEvents: AlumniEvent[];
}

export interface AlumniPayload {
	msg: string;
	token: string;
	userID: string;
}

export interface CheckStudPhotoAiResultPayload {
	chkBackground: string;
	chkBlur: string;
	chkCentred: string;
	chkFrontal: string;
	chkLightness: string;
	chkRedEye: string;
	overallResult: string;
	uploadSuccess: string;
}

export interface CheckStudPhotoAllowUploadPayload {
	allowUpload: string;
	lastUploadedDate: string;
	status: string;
	statusDescEn: string;
	statusDescSc: string;
	statusDescTc: string;
	validStud: string;
}

export interface CheckStudPhotoAllowUploadResultPayload {
	result: CheckStudPhotoAllowUploadPayload[];
}

export interface ContactListPayload {
	contacts: Data<Contacts>;
	department: Data<Department>;
	site: Data<Site>;
	team: Data<Team>;
	unit: Data<Unit>;
	currentTimestamp: number;
	isDropDB: boolean;
	lastUpdatedTimestamp: number;
}

export interface DeviceIDPayload {
	deviceID: string;
	msg: string;
}

export interface DisciplineAndProgrammePayload {
	disciplineList: Discipline[];
}

export interface DisciplinePayload {
	discipline: DisciplineName;
}

export interface DlaOneTimeTokenPayload {
	oneTimeToken: string;
}

export interface DoctorBookMarkListPayload {
	bookmarkList: BookmarkDoctor[];
}

export interface DoctorListFilterOptionsPayload {
	area: DoctorListFilterOptionsArea[];
	district: DoctorListFilterOptionsDistrict[];
	specialtyNrp: DoctorListFilterOptionsSpecialtyNrp[];
	specialtyOrp: DoctorListFilterOptionsSpecialtyOrp[];
}

export interface DoctorListPayload {
	doctors: Doctor[];
	drListAppDownloadReminder: AppDownloadReminder;
	lastUpdateTime: number;
}

export interface DocumentDownloadListPayload {
	downloadToken: string;
	list: DocumentDownload[];
}

export interface EnrollmentListPayload {
	enrollments: Participant[];
	lastUpdatedTimestamp: number;
}

export interface EventReminderListPayload {
	reminder: Reminder[];
}

export interface ExchangeKeyInfoPayload {
	key: string;
}

export interface FavouriteContactPayload {
	favList: FavouriteContact[];
}

export interface FeaturedNewsPayload {
	featuredNews: News[];
}

export interface FilterOptionPayload {
	options: OptionPayload[];
}

export interface GuestPayload {
	msg: string;
	token: string;
	userID: string;
}

export interface IBookingApprovalListPayload {
	booking: IBookingApprovalItem[];
	msg: MultiLangString;
	result: boolean;
}

export interface IBookingCampusPayload {
	bookingApproval: boolean;
	msg: Record<string, string>;
	paymentApproval: boolean;
	region: IBookingCampus[];
	result: boolean;
}

export interface IBookingDetailPayload {
	booking: IBookingDetail;
	msg: MultiLangString;
	result: boolean;
}

export interface IBookingResultPayload {
	bookingId: string;
	error_code: number;
	msg: MultiLangString;
	result: boolean;
}

export interface ImagePayload {
	imageID: string;
	url: string;
}

export interface NameCardPayload {
	nameCardList: unknown[];
	lastUpdatedTimestamp: number;
}

export interface NotificationDeletePayload {
	result: string;
}

export interface NotificationTypePayload {
	types: NotificationType[];
}

export interface OptionPayload {
	id: string;
	name_en: string;
	name_sc: string;
	name_tc: string;
	order_no: string;
}

export interface PersonalEventPayload {
	event: PersonalEvent;
	reminder: Reminder;
}

export interface ResetPasswordCodePayload {
	method: string;
	mfaSession: string;
	mfaStatus: string;
}

export interface ResetPasswordMethodPayload {
	method: string;
	mfaMode: string;
}

export interface RssListPayload {
	currentTimestamp: number;
	events: MultiLangStringWithImage;
	highlight: MultiLangStringWithImage;
	lastUpdatedTimestamp: number;
}

export interface SearchRoomActivityPayload {
	timetable: SearchRoomActivity[];
}

export interface SearchRoomCampusPayload {
	campus: SearchRoomCampus[];
}

export interface SearchRoomDepartmentPayload {
	department: SearchRoomDepartment[];
}

export interface SearchRoomPayload {
	room: SearchRoom[];
	lastUpdatedTimestamp: number;
}

export interface SearchRoomTimeslotPayload {
	studentSet: StudentSet[];
	timeSlot: SearchRoomTimeslot[];
	lastUpdatedTimestamp: number;
}

export interface ShareDoctorPayload {
	link: string;
	webID: string;
}

export interface ShareEventPayload {
	link: string;
	webID: string;
}

export interface SiteMapPayload {
	campus: SiteMap[];
}

export interface StaffTimetablePayload {
	timetable: StaffTimetable[];
	lastUpdatedTimestamp: number;
}

export interface StudyPaceModule {
	acadYear: number;
	credits: number;
	moduleCode: string;
	moduleTitle: string;
	moduleTitleSc: string;
	moduleTitleTc: string;
	moduleType: string;
	qfLevel: string;
	semester: string;
	statusMap: StudyPaceStatusMap;
	studNo: string;
}

export interface StudyPaceNoStudyPaceListMsg {
	noStudyPaceListMsg_en: string;
	noStudyPaceListMsg_sc: string;
	noStudyPaceListMsg_tc: string;
}

export interface StudyPaceNotOnRollMsg {
	notOnRoll_en: string;
	notOnRoll_sc: string;
	notOnRoll_tc: string;
}

export interface StudyPacePayload {
	awardReqList: StudyPaceReq[];
	bridgingModuleList: StudyPaceModule[];
	bridgingReqList: StudyPaceReq[];
	completeModuleList: StudyPaceModule[];
	coreReqList: StudyPaceReq[];
	elecSetCompletedPercent: number;
	elecSetModuleList: StudyPaceModule[];
	elecSetReqList: StudyPaceReq[];
	electiveCompletedPercent: number;
	electiveModuleList: StudyPaceModule[];
	electiveReqList: StudyPaceReq[];
	enrichmentCompletedPercent: number;
	enrichmentCompletedPercentForB: number;
	enrichmentModuleCompletedModule: number;
	enrichmentModuleCompletedModuleForB: number;
	enrichmentModuleList: StudyPaceModule[];
	enrichmentModuleListForB: StudyPaceModule[];
	enrichmentModuleMinModuleReq: number;
	enrichmentModuleMinModuleReqForB: number;
	enrichmentModuleReqList: StudyPaceReq[];
	enrichmentModuleReqListForB: StudyPaceReq[];
	hasDebt: boolean;
	hasNoConfirmProgLvl: boolean;
	hasNoMajorAward: boolean;
	hasViewRightOnPaceList: boolean;
	iaModuleModuleList: StudyPaceModule[];
	iaModuleReqList: StudyPaceReq[];
	incompleteModuleList: StudyPaceModule[];
	industAttachCompletedPercent: number;
	isMinorAward: boolean;
	isTHEIStudent: boolean;
	noStudyPaceListMsg: StudyPaceNoStudyPaceListMsg;
	notOnRollMsg: StudyPaceNotOnRollMsg;
	overallCompletedPercent: number;
	programInfo: StudyPaceProgramInfo;
	remarks: StudyPaceRemarks;
	resultNotAnnounceMsg: StudyPaceResultNotAnnounceMsg;
	studentHasDebtMsg: StudyPaceStudentHasDebtMsg;
	studentRegisteredModules: StudyPaceModule[];
	studyPaseListReleaseDate: number;
	targetAward: string;
}

export interface StudyPaceProgramInfo {
	dveProgramme: boolean;
	exitCourseTitle: string;
	exitCourseTitleEn: string;
	exitCourseTitleTc: string;
	fulltimeProgramme: boolean;
	programmeTitleEn: string;
	programmeTitleSc: string;
	programmeTitleTc: string;
}

export interface StudyPaceRemarks {
	remark_en: string;
	remark_sc: string;
	remark_tc: string;
}

export interface StudyPaceReq {
	acadYear: number;
	completedPercent: number;
	creditCompleted: number;
	deliveryMode: string;
	elecSetGroup: string;
	elecSetGroupDesc: string;
	garType: string;
	joinSemester: string;
	joinYear: number;
	launchVersion: string;
	launchYear: number;
	majorAward: string;
	majorAwardVersion: string;
	minCreditReq: number;
	moduleType: string;
	moduleTypeDesc: string;
	progStructCode: string;
	qfLevel: string;
	qfLevelDesc: string;
	reqType: string;
	semester: string;
	studNo: string;
}

export interface StudyPaceResponse {
	award: StudyPacePayload[];
	awardReqList: StudyPaceReq[];
	bridgingModuleList: StudyPaceModule[];
	bridgingReqList: StudyPaceReq[];
	completeModuleList: StudyPaceModule[];
	coreReqList: StudyPaceReq[];
	elecSetCompletedPercent: number;
	elecSetModuleList: StudyPaceModule[];
	elecSetReqList: StudyPaceReq[];
	electiveCompletedPercent: number;
	electiveModuleList: StudyPaceModule[];
	electiveReqList: StudyPaceReq[];
	enrichmentCompletedPercent: number;
	enrichmentCompletedPercentForB: number;
	enrichmentModuleCompletedModule: number;
	enrichmentModuleCompletedModuleForB: number;
	enrichmentModuleList: StudyPaceModule[];
	enrichmentModuleListForB: StudyPaceModule[];
	enrichmentModuleMinModuleReq: number;
	enrichmentModuleMinModuleReqForB: number;
	enrichmentModuleReqList: StudyPaceReq[];
	enrichmentModuleReqListForB: StudyPaceReq[];
	hasDebt: boolean;
	hasNoConfirmProgLvl: boolean;
	hasNoMajorAward: boolean;
	hasViewRightOnPaceList: boolean;
	iaModuleModuleList: StudyPaceModule[];
	iaModuleReqList: StudyPaceReq[];
	incompleteModuleList: StudyPaceModule[];
	industAttachCompletedPercent: number;
	isTHEIStudent: boolean;
	noStudyPaceListMsg: StudyPaceNoStudyPaceListMsg;
	notOnRollMsg: StudyPaceNotOnRollMsg;
	overallCompletedPercent: number;
	programInfo: StudyPaceProgramInfo;
	remarks: StudyPaceRemarks;
	resultNotAnnounceMsg: StudyPaceResultNotAnnounceMsg;
	studentHasDebtMsg: StudyPaceStudentHasDebtMsg;
	studentRegisteredModules: StudyPaceModule[];
	studyPaseListReleaseDate: number;
	targetAward: string;
}

export interface StudyPaceResultNotAnnounceMsg {
	resultNotAnnounce_en: string;
	resultNotAnnounce_sc: string;
	resultNotAnnounce_tc: string;
}

export interface StudyPaceStatusMap {
	status_en: string;
	status_sc: string;
	status_tc: string;
}

export interface StudyPaceStudentHasDebtMsg {
	studentHasDebtMsg_en: string;
	studentHasDebtMsg_sc: string;
	studentHasDebtMsg_tc: string;
}

export interface UserInfoPayload {
	email: string;
	name: string;
	site: string;
	userImageID: string;
	userType: number;
	vtcID: string;
}

export interface UserPayload {
	LanguagePreference: string;
	LastAccessTime: number;
	RegistrationDate: number;
	email: string;
	id: string;
	idToken: string;
	msg: string;
	name: string;
	site: string;
	token: string;
	userImageID: string;
	userType: number;
	vtcID: string;
}

export interface VersionPayload {
	updateurl: string;
	version: number;
	versionForUpdateReminder: number;
}

export interface WorkspaceActivityEnrollResultPayload {
	result: boolean;
}

export interface WorkspaceActivityListPayload {
	activities: WorkspaceActivity[];
}

export interface WorkspaceActivitySearchOptionPayload {
	category: WorkspaceActivitySearchOption[];
	level: WorkspaceActivitySearchOption[];
	ou: WorkspaceActivitySearchOption[];
	subCategory: WorkspaceActivitySearchOption[];
}

export interface YearOfGraduationPayload {
	years: string[];
}
