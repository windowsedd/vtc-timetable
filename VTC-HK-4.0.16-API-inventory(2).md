# VTC@HK 4.0.16 — static API inventory

Source APK: `VTC@HK_4.0.16_APKPure(1).apk`  
Package: `hk.edu.vtc.mobile` · version `4.0.16` (`554`)  
SHA-256: `ba2dcae7dab5103ff1635b0c01d3314454e8e7aa3f3147778b05df54b0dae936`

> Static reverse-engineering result. These are undocumented implementation details, not a supported public API. Endpoints, fields, and login behavior may change. Use only your own account and follow VTC policy. Never log or commit returned tokens.

## Login and `vtcToken`

The app does **not** derive the mobile token from MyPortal's `JSESSIONID` or `LtpaToken2`. It performs an ADFS OAuth authorization-code flow, then exchanges the code with the mobile backend. The credential used by most mobile API calls is `payload.token` from `loginMobileADFS`; `payload.idToken` is separate and is used as an ADFS logout hint.

1. Call `GET https://mobile.vtc.edu.hk/api?cmd=generateNewDeviceID`; retain `payload.deviceID`.
2. Generate a 43-character URL-safe random verifier. APK 4.0.16 sends that same value as `code_challenge` and later as `codeVerifier` (PKCE plain behavior; the authorize URL does not set `code_challenge_method`).
3. Open the relevant ADFS authorize URL and let the user sign in. Intercept the navigation to `vtchk://oauth?code=...` and read `code`.
4. Form-POST to `https://mobile.vtc.edu.hk/api?cmd=loginMobileADFS` with `deviceID`, `userType`, `authorizationCode`, and `codeVerifier`.
5. On `isSuccess: true`, use `payload.token` as the `token` query/form field on mobile calls. Store it in OS-backed secure storage.

### OAuth constants embedded in the APK

| Audience | Authorize URL | Client ID | userType |
| --- | --- | --- | ---: |
| Staff | `https://login.vtc.edu.hk/adfs/oauth2/authorize` | `709d8f81-5d6c-42d0-94b7-5432df78be87` | 2 |
| Full-time student | `https://fs.vtc.edu.hk/adfs/oauth2/authorize` | `58c891ad-36e4-4459-a323-0f65a87d0127` | 3 |
| Part-time student | `https://fs.vtc.edu.hk/adfs/oauth2/authorize` | `58c891ad-36e4-4459-a323-0f65a87d0127` | 4 |

Common authorize parameters: `response_type=code`, `redirect_uri=vtchk://oauth`, `scope=openid`, `response_mode=query`, and `code_challenge=<verifier>`. OAuth client IDs are public identifiers, not client secrets, but reusing the official app registration in a third-party client may be unsupported.

The login response wrapper is `VtcResponse` (`isSuccess`, `errorCode`, `errorMsg`, `payload`). The parsed user payload includes `id`, `name`, `email`, `vtcID`, `userImageID`, `userType`, `LanguagePreference`, `LastAccessTime`, `RegistrationDate`, `token`, `msg`, `idToken`, and `site`.

### Minimal TypeScript exchange

```ts
type VtcResponse<T> = { isSuccess: boolean; errorCode?: string; errorMsg?: string; payload?: T };
type LoginPayload = { token: string; idToken?: string; name?: string; email?: string; vtcID?: string };

export async function exchangeVtcCode(input: {
  deviceID: string; userType: 2 | 3 | 4; authorizationCode: string; codeVerifier: string;
}): Promise<LoginPayload> {
  const body = new URLSearchParams({
    deviceID: input.deviceID,
    userType: String(input.userType),
    authorizationCode: input.authorizationCode,
    codeVerifier: input.codeVerifier,
  });
  const response = await fetch('https://mobile.vtc.edu.hk/api?cmd=loginMobileADFS', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json() as VtcResponse<LoginPayload>;
  if (!result.isSuccess || !result.payload?.token) {
    throw new Error(result.errorMsg ?? result.errorCode ?? 'VTC login failed');
  }
  return result.payload; // Do not print or persist this in plaintext.
}
```

A normal external browser cannot return `vtchk://oauth` to arbitrary web code. A mobile client needs an app/deep-link handler or an in-app browser callback that detects the redirect. Do not automate credential entry or copy session cookies.

## Base URLs

| Retrofit client | Base URL |
| --- | --- |
| `VtcClient` | `https://mobile.vtc.edu.hk/` |
| `BeaconVTCClient` | `https://mobile.vtc.edu.hk/cas/` |
| `BeaconClient` | `https://vtc-cas-keystone5-prod-mobilecas.inter-apps.vtc.edu.hk/api/v1/` |
| `ECardVtcClient` | `https://ecard-api.vtc.edu.hk/v1/` |
| `ECardClient` | `https://ecard-api.vtc.edu.hk/v1/` |
| `DialogflowClient` | `https://dialogflow.googleapis.com/` |

## Complete Retrofit inventory (135 operations)

`field` means URL-encoded form data; `query` means URL query; `header Authorization` is an explicit header; `body` is JSON/request-body data. Types are the decompiled JVM parameter types.

### VtcClient (116)

| Method | HTTP | Relative route | Parameters | Encoding |
| --- | --- | --- | --- | --- |
| `applyWorkspaceActivity` | POST | `api?cmd=applyWorkspaceActivity` | field `token` (String); field `cna` (String); field `activityId` (String); field `choiceId` (String) | form |
| `approveIBooking` | GET | `api?cmd=approveBooking` | header `Authorization` (String); query `bookingId` (String); query `isApprove` (int); query `remarks` (String); query-map (Map) | — |
| `batchUpdatePass` | POST | `api?cmd=batchUpdatePass` | field `token` (String); field `code` (String); field `deviceId` (String); field `cnaArray` (String); field `timestamp` (String) | form |
| `bookmarkDoctor` | PUT | `api?cmd=bookmarkDoctor` | query `token` (String); query `scheme` (String); query `favKey` (String) | — |
| `cancelEnrollment` | POST | `api?cmd=cancelEnrollment` | field `token` (String); field `code` (String) | form |
| `cancelHoldIBooking` | GET | `api?cmd=cancelHoldBooking` | header `Authorization` (String) | — |
| `cancelIBooking` | POST | `api?cmd=cancelBooking` | header `Authorization` (String); body (CancelBookingRequest) | — |
| `changePassword` | POST | `api?cmd=changePassword` | field `token` (String); field `vtcID` (String); field `original_password` (String); field `new_password` (String) | form |
| `checkAccessToken` | GET | `api?cmd=checkAccessToken` | query `token` (String) | — |
| `checkAndroidVersion` | GET | `api?cmd=checkAndroidVersion` | — | — |
| `checkInIBooking` | GET | `api?cmd=checkInBooking` | header `Authorization` (String); query `bookingTSID` (String) | — |
| `checkOutIBooking` | GET | `api?cmd=checkOutBooking` | header `Authorization` (String); query `bookingTSID` (String) | — |
| `checkStudentPhotoUploadStatus` | GET | `api?cmd=checkStudPhotoAllowUpload` | query `token` (String) | — |
| `createAlumni` | POST | `api?cmd=createAlumni` | field `email` (String); field `graduation` (String); field `discipline` (String); field `userID` (String); field `token` (String); field `deviceID` (String) | form |
| `createGuest` | POST | `api?cmd=createGuest` | — | — |
| `createIBooking` | POST | `api?cmd=createBooking` | header `Authorization` (String); body (CreateBookingRequest) | — |
| `deleteNotification` | DELETE | `api?cmd=deleteNotification` | query `token` (String); body (z) | — |
| `deletePersonalEvent` | POST | `api?cmd=deletePersonalEvent` | field `token` (String); field `eventID` (String) | form |
| `editFavourtieContactsOrdering` | POST | `api?cmd=editFavouriteContactsOrdering` | field `token` (String); field `favList` (String) | form |
| `enrollActivity` | POST | `api?cmd=enrollActivity` | field `token` (String); field `timestamp` (String); field `code` (String); field `email` (String); field `phone` (String); field `award` (String) | form |
| `exchangeKeyInfo` | POST | `api?cmd=exchangeKeyInfo` | field `token` (String); field `key` (String) | form |
| `fetchEvents` | GET | `api?cmd=fetchEvents` | query `token` (String); query `webID` (String) | — |
| `getAboutVTC` | GET | `api?cmd=getAboutVTC` | query `token` (String); query `timestamp` (int) | — |
| `getActiveDevice` | GET | `api?cmd=getActiveDevice` | query `token` (String) | — |
| `getActivitySearchOption` | POST | `api?cmd=getActivitySearchOption` | field `token` (String) | form |
| `getAdvocateBannerImage` | GET | `api?cmd=getAdvocateBannerImage` | query `token` (String); query `isTablet` (int) | — |
| `getAlumniEventList` | GET | `api?cmd=getAlumniEventList` | query `token` (String) | — |
| `getAlumniEventsFilterOptions` | GET | `api?cmd=getAlumniEventsFilterOptions` | query `token` (String) | — |
| `getAlumniNewsFilterOptions` | GET | `api?cmd=getAlumniNewsFilterOptions` | query `token` (String) | — |
| `getClassAttendanceDetail` | GET | `api?cmd=getClassAttendanceDetail` | query `token` (String); query `courseCode` (String) | — |
| `getClassAttendanceList` | GET | `api?cmd=getClassAttendanceList` | query `token` (String) | — |
| `getConfiguration` | GET | `api?cmd=getConfiguration` | query `token` (String); query `platform` (int); query `versionNumber` (String) | — |
| `getContactsList` | GET | `api?cmd=getContactsList` | query `token` (String); query `timestamp` (int) | — |
| `getDeviceID` | GET | `api?cmd=generateNewDeviceID` | — | — |
| `getDiscipline` | GET | `api?cmd=getDiscipline` | — | — |
| `getDisciplineAndProgramme` | GET | `api?cmd=getDisciplineAndProgramme` | query `token` (String) | — |
| `getDlaOneTimeToken` | GET | `api?cmd=requestOneTimeToken` | query `token` (String) | — |
| `getDoctorBookmarkList` | GET | `api?cmd=getDoctorBookmarkList` | query `token` (String) | — |
| `getDoctorDetail` | GET | `api?cmd=getDoctorDetail` | query `token` (String); query `id` (int); query `scheme` (String) | — |
| `getDoctorDetailByWebId` | GET | `api?cmd=getDoctorDetail` | query `token` (String); query `webID` (String) | — |
| `getDoctorList` | GET | `api?cmd=getDoctorList` | query `token` (String); query `timestamp` (int); query `scheme` (String) | — |
| `getDoctorListFilterOptions` | GET | `api?cmd=getDoctorListFilterOptions` | query `token` (String) | — |
| `getDoctorScheme` | GET | `api?cmd=getDoctorScheme` | query `token` (String) | — |
| `getDocumentDownloadFile` | GET | `api?cmd=getDocDownloadFile` | query `token` (String); query `fileName` (String); query `category` (String); query `downloadToken` (String) | — |
| `getDocumentDownloadList` | GET | `api?cmd=getDocDownloadList` | query `token` (String) | — |
| `getDocumentDownloadNotice` | GET | `api?cmd=getDocDownloadNotice` | query `token` (String); query `timestamp` (int) | — |
| `getEnrollmentList` | GET | `api?cmd=getEnrollmentList` | query `token` (String); query `code` (String) | — |
| `getEventReminderList` | GET | `api?cmd=getEventReminderList` | query `token` (String) | — |
| `getFavouriteContactList` | GET | `api?cmd=getFavouriteContactList` | query `token` (String) | — |
| `getFeaturedNewsList` | GET | `api?cmd=getFeaturedNewsList` | query `token` (String) | — |
| `getIBookingApprovalList` | GET | `api?cmd=getApprovalBookingList` | header `Authorization` (String); query `page` (int); query `pageSize` (int); query `asc` (int) | — |
| `getIBookingCampuses` | GET | `api?cmd=getAvailableCampus` | header `Authorization` (String) | — |
| `getIBookingDetail` | GET | `api?cmd=getBookingDetails` | header `Authorization` (String); query `bookingId` (String); query `service` (String); query `facilityId` (Integer); query `startDate` (String); query `endDate` (String) | — |
| `getIBookingList` | GET | `api?cmd=listBooking` | header `Authorization` (String); query `page` (int); query `pageSize` (int); query `asc` (int); query `type` (String) | — |
| `getIBookingRooms` | GET | `api?cmd=getAvailableRoom` | header `Authorization` (String); query `regionId` (String); query `ibServiceId` (String) | — |
| `getIBookingTimeslots` | GET | `api?cmd=searchTimeslots` | header `Authorization` (String); query `roomId` (String); query `date` (String); query `regionId` (String); query `ibServiceId` (String); query `startTime` (String); query `endTime` (String) | — |
| `getImage` | GET | `api?cmd=getImage` | query `token` (String); query `imageID` (String); query `mode` (int); query `height` (int); query `width` (int); query `imageType` (int) | — |
| `getLatestActivity` | GET | `api?cmd=getLatestActivity` | query `token` (String); query `codes` (String); query `timestamp` (int) | — |
| `getMoodleTimeTable` | GET | `api?cmd=getMoodleTimetable&isPlural=1` | query `token` (String); query `year` (int); query `month` (int) | — |
| `getNameCard` | GET | `api?cmd=getNameCard` | query `token` (String); query `timestamp` (int) | — |
| `getNewsList` | GET | `api?cmd=getNewsList` | query `token` (String); query `timestamp` (int) | — |
| `getNotificationFilterOptions` | GET | `api?cmd=getNotificationFilterOptions` | query `token` (String) | — |
| `getNotificationList` | GET | `api?cmd=getNotificationList` | query `token` (String); query `timestamp` (int) | — |
| `getNotificationTypes` | GET | `api?cmd=getNotificationTypes` | query `token` (String) | — |
| `getPrintQuota` | GET | `api?cmd=getPrintQuota` | query `token` (String) | — |
| `getPublicNewsList` | GET | `api?cmd=getNewsListForPublic` | — | — |
| `getRoomSearchActivity` | GET | `api?cmd=getRoomSearchActivity` | query `token` (String) | — |
| `getRoomSearchCampusList` | GET | `api?cmd=getRoomSearchCampusList` | query `token` (String) | — |
| `getRoomSearchDepartment` | GET | `api?cmd=getRoomSearchDepartment` | query `token` (String); query `campusId` (String) | — |
| `getRssList` | GET | `api?cmd=getRssList&type=json` | query `token` (String); query `timestamp` (int) | — |
| `getSiteMap` | GET | `api?cmd=getSiteMap` | query `token` (String) | — |
| `getStaffTimeTable` | GET | `api?cmd=getStaffTimeTable` | query `token` (String); query `year` (int); query `month` (int) | — |
| `getStudyPaceList` | GET | `api?cmd=getStudyPaceList` | query `token` (String) | — |
| `getTimeTableAndReminderList` | GET | `api?cmd=getTimeTableAndReminderList` | query `token` (String); query `year` (int); query `month` (int); query `timestamp` (long) | — |
| `getUserInfo` | GET | `api?cmd=getUserInfo` | query `token` (String) | — |
| `getUserSetting` | GET | `api?cmd=getUserSetting` | query `token` (String) | — |
| `getVtcAppList` | GET | `api?cmd=getAppList&platform=2` | query `token` (String); query `timestamp` (int) | — |
| `getWebsiteList` | GET | `api?cmd=getWebsiteList` | query `token` (String); query `timestamp` (int) | — |
| `getWorkspaceActivityDetail` | GET | `api?cmd=getWorkspaceActivityDetail` | query `token` (String); query `id` (String) | — |
| `getWorkspaceActivityList` | GET | `api?cmd=getWorkspaceActivityList` | query `token` (String); query `startDate` (String); query `endDate` (String); query `ou` (String); query `category` (String); query `subCategory` (String); query `level` (String); query `cpdFrom` (String); query `cpdTo` (String); query `enrolled` (String) | — |
| `getWorkspaceActivitySearchOption` | GET | `api?cmd=getSearchOption` | query `token` (String) | — |
| `getYearOfGraduation` | GET | `api?cmd=getYearOfGraduation` | — | — |
| `holdIBooking` | GET | `api?cmd=holdBooking` | header `Authorization` (String); query `serviceId` (String); query `resourceId` (String); query `bookingDate` (String); query `startTime` (String); query `endTime` (String) | — |
| `loginMobileADFS` | POST | `api?cmd=loginMobileADFS` | field `deviceID` (String); field `userType` (String); field `authorizationCode` (String); field `codeVerifier` (String) | form |
| `loginMobileDevice` | POST | `api?cmd=loginMobileDevice` | field `vtcID` (String); field `password` (String); field `isReLogin` (int); field `deviceID` (String); field `userType` (String) | form |
| `logoutMobile` | POST | `api?cmd=logoutMobile` | field `token` (String); field `deviceID` (String) | form |
| `maintenanceMode` | GET | `api?cmd=maintenanceMode` | — | — |
| `postEventReminder` | POST | `api?cmd=postEventReminder` | field `token` (String); field `enable` (int); field `eventID` (String); field `eventType` (int); field `reminderOption` (int) | form |
| `postPersonalEvent` | POST | `api?cmd=postPersonalEvent` | field `token` (String); field `name` (String); field `detail` (String); field `startTime` (long); field `endTime` (long); field `enableReminder` (int); field `reminderTimeOption` (int); field `eventID` (String) | form |
| `readNews` | POST | `api?cmd=readNews` | field `token` (String); field `newsIDs` (String) | form |
| `registerDevice` | POST | `api?cmd=registerDevice` | field `token` (String); field `deviceToken` (String); field `platform` (int) | form |
| `remoteSignout` | POST | `api?cmd=remoteSignOut` | field `token` (String); field `password` (String); field `deviceID` (String) | form |
| `removeBookmarkedDoctor` | DELETE | `api?cmd=removeBookmarkedDoctor` | query `token` (String); query `scheme` (String); query `favKey` (String) | — |
| `removeFavouriteContacts` | POST | `api?cmd=removeFavouriteContacts` | field `token` (String); field `favList` (String) | form |
| `requestResetPasswordCode` | POST | `api?cmd=requestResetPasswordCode` | field `vtcID` (String); field `hkid` (String); field `date_of_birth` (String); field `receive_method` (String) | form |
| `requestResetPasswordMethod` | POST | `api?cmd=requestResetPasswordMethod` | field `vtcID` (String); field `hkid` (String); field `date_of_birth` (String) | form |
| `resetPasswordCode` | POST | `api?cmd=resetPassword` | field `vtcID` (String); field `hkid` (String); field `date_of_birth` (String); field `password` (String); field `method` (String); field `code` (String) | form |
| `resetPasswordmfaSession` | POST | `api?cmd=resetPassword` | field `vtcID` (String); field `hkid` (String); field `date_of_birth` (String); field `password` (String); field `method` (String); field `mfaSession` (String) | form |
| `searchRoom` | GET | `api?cmd=searchRoom` | query `token` (String); query `campusId` (String); query `departmentId` (String); query `capacity` (String); query `startTime` (String); query `endTime` (String) | — |
| `searchRoomByActivityTimeSlot` | GET | `api?cmd=searchRoomByActivityTimeSlot` | query `token` (String); query `activityId` (String); query `campusId` (String); query `capacity` (String); query `duration` (String); query `timeSlotStart` (String); query `timeSlotEnd` (String) | — |
| `searchTimeSlot` | GET | `api?cmd=searchTimeSlot` | query `token` (String); query `activityId` (String); query `capacity` (String); query `duration` (String); query `startDate` (String); query `endDate` (String) | — |
| `shareDoctor` | GET | `api?cmd=shareDoctor` | query `token` (String); query `scheme` (String); query `doctorID` (int) | — |
| `shareEvents` | POST | `api?cmd=shareEvents` | field `token` (String); field `eventID` (String) | form |
| `studentPhotoUploadCheckAI` | POST | `api?cmd=uploadStudPhoto` | field `token` (String); field `studPhoto` (String) | form |
| `studentPhotoUploadConfirm` | POST | `api?cmd=uploadStudPhoto` | field `token` (String); field `uploadSPS` (String); field `studPhoto` (String) | form |
| `submitEnquiry` | POST | `api?cmd=submitEnquiry` | field `token` (String); field `email` (String); field `enquiry` (String); field `imageID` (String); field `appVersion` (String) | form |
| `updateAlumni` | POST | `api?cmd=updateAlumni` | field `email` (String); field `graduation` (String); field `discipline` (String); field `token` (String) | form |
| `updateBookmarkDoctor` | POST | `api?cmd=updateBookmarkDoctor` | field `token` (String); field `bookmarkList` (String) | form |
| `updateDoctorRating` | POST | `api?cmd=updateDoctorRating` | field `token` (String); field `code` (String); field `deviceId` (String); field `cnaArray` (String); field `timestamp` (String) | form |
| `updateFavouriteContacts` | POST | `api?cmd=favouriteContacts` | field `token` (String); field `favList` (String) | form |
| `updateIBooking` | POST | `api?cmd=updateBooking` | header `Authorization` (String); body (UpdateBookingRequest) | — |
| `updateLastAccessTime` | POST | `api?cmd=updateLastAccessTime` | field `token` (String); field `deviceID` (String); field `osVersion` (String); field `deviceName` (String); field `deviceModel` (String) | form |
| `updatePass` | POST | `api?cmd=updatePass` | field `token` (String); field `code` (String); field `deviceId` (String); field `cna` (String); field `timestamp` (String) | form |
| `updateUserImage` | POST | `api?cmd=updateUserImage` | field `token` (String); field `photoID` (String) | form |
| `updateUserSetting` | POST | `api?cmd=updateUserSetting` | field `token` (String); field `languagePreference` (String) | form |
| `uploadImage` | POST | `api?cmd=uploadImage` | part (v$b); query `token` (String) | multipart |

### BeaconVTCClient (4)

| Method | HTTP | Relative route | Parameters | Encoding |
| --- | --- | --- | --- | --- |
| `getBeaconAvailableClassList` | GET | `api?cmd=getBeaconAvailableClassList` | query `token` (String) | — |
| `getClassAttendanceLogList` | GET | `api?cmd=getClassAttendanceLogList` | query `roomCode` (String); query `startTime` (long); query `endTime` (long); query `courseCode` (String); query `token` (String) | — |
| `getMyAttendanceLogList` | GET | `api?cmd=getMyAttendanceLogList` | query `token` (String) | — |
| `takeAttendance` | POST | `api?cmd=takeAttendance` | field `token` (String); field `courseCode` (String); field `startTime` (Long); field `endTime` (Long); field `roomNum` (String); field `campusCode` (String); field `deviceId` (String) | form |

### BeaconClient (4)

| Method | HTTP | Relative route | Parameters | Encoding |
| --- | --- | --- | --- | --- |
| `getAvailableBeaconInfo` | GET | `getBeaconsInfo` | — | — |
| `getBeaconClassroomInfo` | GET | `getClassroomInfo` | query `uuid` (String); query `major` (String); query `minor` (String); query `includeNotification` (boolean) | — |
| `getBeaconNotificationInfo` | GET | `notification/{id}` | path `id` (String) | — |
| `updateBeaconBattery` | POST | `updateBattery` | query `identifier` (String); query `batteryLevel` (int) | — |

### ECardVtcClient (3)

| Method | HTTP | Relative route | Parameters | Encoding |
| --- | --- | --- | --- | --- |
| `acceptTnc` | POST | `tnc/accept` | header `Authorization` (String) | — |
| `getRegister` | GET | `register` | header `Authorization` (String); query `deviceID` (String) | — |
| `postRegister` | POST | `register` | header `Authorization` (String); body (k) | — |

### ECardClient (7)

| Method | HTTP | Relative route | Parameters | Encoding |
| --- | --- | --- | --- | --- |
| `acceptTncWithECardToken` | POST | `tnc/accept/ecard` | header `Authorization` (String) | — |
| `deleteRegister` | DELETE | `register` | header `Authorization` (String) | — |
| `getConfig` | GET | `configuration` | — | — |
| `getECard` | GET | `ecard` | header `Authorization` (String) | — |
| `getTime` | GET | `time` | — | — |
| `getTNC` | GET | `tnc/{role}` | path `role` (String) | — |
| `refreshToken` | POST | `token/refresh` | body (k) | — |

### DialogflowClient (1)

| Method | HTTP | Relative route | Parameters | Encoding |
| --- | --- | --- | --- | --- |
| `detectIntent` | POST | `/v2/projects/{projectId}/agent/sessions/{sessionId}:detectIntent` | header `Authorization` (String); path `projectId` (String); path `sessionId` (String); body (z) | — |

## Timetable calls

The combined calendar/timetable request used by the app is:

```text
GET https://mobile.vtc.edu.hk/api?cmd=getTimeTableAndReminderList
    &token=<payload.token>&year=<year>&month=<month>&timestamp=<unix-like value>
```

Other timetable endpoints in this build are `getMoodleTimetable&isPlural=1` (`token`, `year`, `month`) and `getStaffTimeTable` (`token`, `year`, `month`).

## Security notes

- Treat `payload.token`, `idToken`, authorization codes, passwords, `JSESSIONID`, and `LtpaToken2` as secrets.
- Do not attempt to mint a token locally: it is issued server-side after successful identity authentication and backend validation.
- Do not reuse another device's/session's cookies or token. Call `checkAccessToken` to test your own returned mobile token.
- The legacy `loginMobileDevice` username/password operation is present in the interface, but the current UI path uses ADFS OAuth. Prefer OAuth so your client never handles the VTC password directly.
- This inventory is static. It does not prove that every operation is still enabled or that every user role is authorized for it.

## Decompiled response bodies

> Added from the APK's Retrofit generic signatures and model classes. This describes client-declared shapes, not guaranteed live examples. Fields may be absent/null at runtime even when Kotlin/JVM metadata does not expose nullability. `JsonElement` means the APK deliberately left that payload untyped.

### Common wrapper

Most mobile endpoints use:

```ts
interface VtcResponse<T> {
  errorCode: number;
  errorMsg: string;
  isSuccess: boolean;
  payload: T;
}
```

### Endpoint response map (135 operations)

#### VtcClient

| Method | Route | Declared response body | Static-analysis note |
| --- | --- | --- | --- |
| `applyWorkspaceActivity` | `api?cmd=applyWorkspaceActivity` | `VtcResponse<WorkspaceActivityEnrollResultPayload>` | — |
| `approveIBooking` | `api?cmd=approveBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `batchUpdatePass` | `api?cmd=batchUpdatePass` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `bookmarkDoctor` | `api?cmd=bookmarkDoctor` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `cancelEnrollment` | `api?cmd=cancelEnrollment` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `cancelHoldIBooking` | `api?cmd=cancelHoldBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `cancelIBooking` | `api?cmd=cancelBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `changePassword` | `api?cmd=changePassword` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `checkAccessToken` | `api?cmd=checkAccessToken` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `checkAndroidVersion` | `api?cmd=checkAndroidVersion` | `VtcResponse<VersionPayload>` | — |
| `checkInIBooking` | `api?cmd=checkInBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `checkOutIBooking` | `api?cmd=checkOutBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `checkStudentPhotoUploadStatus` | `api?cmd=checkStudPhotoAllowUpload` | `VtcResponse<CheckStudPhotoAllowUploadResultPayload>` | — |
| `createAlumni` | `api?cmd=createAlumni` | `VtcResponse<AlumniPayload>` | — |
| `createGuest` | `api?cmd=createGuest` | `VtcResponse<GuestPayload>` | — |
| `createIBooking` | `api?cmd=createBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `deleteNotification` | `api?cmd=deleteNotification` | `VtcResponse<NotificationDeletePayload>` | — |
| `deletePersonalEvent` | `api?cmd=deletePersonalEvent` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `editFavourtieContactsOrdering` | `api?cmd=editFavouriteContactsOrdering` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `enrollActivity` | `api?cmd=enrollActivity` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `exchangeKeyInfo` | `api?cmd=exchangeKeyInfo` | `VtcResponse<ExchangeKeyInfoPayload>` | — |
| `fetchEvents` | `api?cmd=fetchEvents` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `getAboutVTC` | `api?cmd=getAboutVTC` | `VtcResponse<AboutVTCPayload>` | — |
| `getActiveDevice` | `api?cmd=getActiveDevice` | `VtcResponse<ActiveDevicePayload>` | — |
| `getActivitySearchOption` | `api?cmd=getActivitySearchOption` | `VtcResponse<ActivitySearchOption>` | — |
| `getAdvocateBannerImage` | `api?cmd=getAdvocateBannerImage` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `getAlumniEventList` | `api?cmd=getAlumniEventList` | `VtcResponse<AlumniEventPayload>` | — |
| `getAlumniEventsFilterOptions` | `api?cmd=getAlumniEventsFilterOptions` | `VtcResponse<FilterOptionPayload>` | — |
| `getAlumniNewsFilterOptions` | `api?cmd=getAlumniNewsFilterOptions` | `VtcResponse<FilterOptionPayload>` | — |
| `getClassAttendanceDetail` | `api?cmd=getClassAttendanceDetail` | `VtcResponse<ClassAttendanceDetailPayload>` | — |
| `getClassAttendanceList` | `api?cmd=getClassAttendanceList` | `VtcResponse<ClassAttendanceListPayload>` | — |
| `getConfiguration` | `api?cmd=getConfiguration` | `VtcResponse<DrawerConfig>` | — |
| `getContactsList` | `api?cmd=getContactsList` | `VtcResponse<ContactListPayload>` | — |
| `getDeviceID` | `api?cmd=generateNewDeviceID` | `VtcResponse<DeviceIDPayload>` | — |
| `getDiscipline` | `api?cmd=getDiscipline` | `VtcResponse<DisciplinePayload>` | — |
| `getDisciplineAndProgramme` | `api?cmd=getDisciplineAndProgramme` | `VtcResponse<DisciplineAndProgrammePayload>` | — |
| `getDlaOneTimeToken` | `api?cmd=requestOneTimeToken` | `VtcResponse<DlaOneTimeTokenPayload>` | — |
| `getDoctorBookmarkList` | `api?cmd=getDoctorBookmarkList` | `VtcResponse<DoctorBookMarkListPayload>` | — |
| `getDoctorDetail` | `api?cmd=getDoctorDetail` | `VtcResponse<Doctor>` | — |
| `getDoctorDetailByWebId` | `api?cmd=getDoctorDetail` | `VtcResponse<Doctor>` | — |
| `getDoctorList` | `api?cmd=getDoctorList` | `VtcResponse<DoctorListPayload>` | — |
| `getDoctorListFilterOptions` | `api?cmd=getDoctorListFilterOptions` | `VtcResponse<DoctorListFilterOptionsPayload>` | — |
| `getDoctorScheme` | `api?cmd=getDoctorScheme` | `VtcResponse<DoctorScheme>` | — |
| `getDocumentDownloadFile` | `api?cmd=getDocDownloadFile` | `ResponseBody` | Raw/binary response body rather than JSON. |
| `getDocumentDownloadList` | `api?cmd=getDocDownloadList` | `VtcResponse<DocumentDownloadListPayload>` | — |
| `getDocumentDownloadNotice` | `api?cmd=getDocDownloadNotice` | `VtcResponse<DocumentDownloadNotice>` | — |
| `getEnrollmentList` | `api?cmd=getEnrollmentList` | `VtcResponse<EnrollmentListPayload>` | — |
| `getEventReminderList` | `api?cmd=getEventReminderList` | `VtcResponse<EventReminderListPayload>` | — |
| `getFavouriteContactList` | `api?cmd=getFavouriteContactList` | `VtcResponse<FavouriteContactPayload>` | — |
| `getFeaturedNewsList` | `api?cmd=getFeaturedNewsList` | `VtcResponse<FeaturedNewsPayload>` | — |
| `getIBookingApprovalList` | `api?cmd=getApprovalBookingList` | `VtcResponse<IBookingApprovalListPayload>` | — |
| `getIBookingCampuses` | `api?cmd=getAvailableCampus` | `VtcResponse<IBookingCampusPayload>` | — |
| `getIBookingDetail` | `api?cmd=getBookingDetails` | `VtcResponse<IBookingDetailPayload>` | — |
| `getIBookingList` | `api?cmd=listBooking` | `VtcResponse<IBookingListItem[]>` | — |
| `getIBookingRooms` | `api?cmd=getAvailableRoom` | `VtcResponse<IBookingRoom[]>` | — |
| `getIBookingTimeslots` | `api?cmd=searchTimeslots` | `VtcResponse<IBookingTimeslot[]>` | — |
| `getImage` | `api?cmd=getImage` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `getLatestActivity` | `api?cmd=getLatestActivity` | `VtcResponse<ActivityListPayload>` | — |
| `getMoodleTimeTable` | `api?cmd=getMoodleTimetable&isPlural=1` | `MoodleTimeTableResponse` | — |
| `getNameCard` | `api?cmd=getNameCard` | `VtcResponse<NameCardPayload>` | — |
| `getNewsList` | `api?cmd=getNewsList` | `VtcResponse<DataSyncPayload<News>>` | — |
| `getNotificationFilterOptions` | `api?cmd=getNotificationFilterOptions` | `VtcResponse<FilterOptionPayload>` | — |
| `getNotificationList` | `api?cmd=getNotificationList` | `VtcResponse<DataSyncPayload<Notification>>` | — |
| `getNotificationTypes` | `api?cmd=getNotificationTypes` | `VtcResponse<NotificationTypePayload>` | — |
| `getPrintQuota` | `api?cmd=getPrintQuota` | `VtcResponse<PrintQuotaPayload>` | — |
| `getPublicNewsList` | `api?cmd=getNewsListForPublic` | `VtcResponse<FeaturedNewsPayload>` | — |
| `getRoomSearchActivity` | `api?cmd=getRoomSearchActivity` | `VtcResponse<SearchRoomActivityPayload>` | — |
| `getRoomSearchCampusList` | `api?cmd=getRoomSearchCampusList` | `VtcResponse<SearchRoomCampusPayload>` | — |
| `getRoomSearchDepartment` | `api?cmd=getRoomSearchDepartment` | `VtcResponse<SearchRoomDepartmentPayload>` | — |
| `getRssList` | `api?cmd=getRssList&type=json` | `VtcResponse<RssListPayload>` | — |
| `getSiteMap` | `api?cmd=getSiteMap` | `VtcResponse<SiteMapPayload>` | — |
| `getStaffTimeTable` | `api?cmd=getStaffTimeTable` | `VtcResponse<StaffTimetablePayload>` | — |
| `getStudyPaceList` | `api?cmd=getStudyPaceList` | `VtcResponse<StudyPaceResponse>` | — |
| `getTimeTableAndReminderList` | `api?cmd=getTimeTableAndReminderList` | `VtcResponse<TimeTableListPayload>` | — |
| `getUserInfo` | `api?cmd=getUserInfo` | `VtcResponse<UserInfoPayload>` | — |
| `getUserSetting` | `api?cmd=getUserSetting` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `getVtcAppList` | `api?cmd=getAppList&platform=2` | `VtcResponse<DataSyncPayload<VtcApp>>` | — |
| `getWebsiteList` | `api?cmd=getWebsiteList` | `VtcResponse<DataSyncPayload<Website>>` | — |
| `getWorkspaceActivityDetail` | `api?cmd=getWorkspaceActivityDetail` | `VtcResponse<WorkspaceActivityDetail>` | — |
| `getWorkspaceActivityList` | `api?cmd=getWorkspaceActivityList` | `VtcResponse<WorkspaceActivityListPayload>` | — |
| `getWorkspaceActivitySearchOption` | `api?cmd=getSearchOption` | `VtcResponse<WorkspaceActivitySearchOptionPayload>` | — |
| `getYearOfGraduation` | `api?cmd=getYearOfGraduation` | `VtcResponse<YearOfGraduationPayload>` | — |
| `holdIBooking` | `api?cmd=holdBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `loginMobileADFS` | `api?cmd=loginMobileADFS` | `VtcResponse<JsonElement>` | Declared as JsonElement; app parses payload into UserPayload at runtime. |
| `loginMobileDevice` | `api?cmd=loginMobileDevice` | `VtcResponse<JsonElement>` | Declared as JsonElement; app parses payload into UserPayload at runtime. |
| `logoutMobile` | `api?cmd=logoutMobile` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `maintenanceMode` | `api?cmd=maintenanceMode` | `VtcResponse<MultiLangString>` | — |
| `postEventReminder` | `api?cmd=postEventReminder` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `postPersonalEvent` | `api?cmd=postPersonalEvent` | `VtcResponse<PersonalEventPayload>` | — |
| `readNews` | `api?cmd=readNews` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `registerDevice` | `api?cmd=registerDevice` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `remoteSignout` | `api?cmd=remoteSignOut` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `removeBookmarkedDoctor` | `api?cmd=removeBookmarkedDoctor` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `removeFavouriteContacts` | `api?cmd=removeFavouriteContacts` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `requestResetPasswordCode` | `api?cmd=requestResetPasswordCode` | `VtcResponse<ResetPasswordCodePayload>` | — |
| `requestResetPasswordMethod` | `api?cmd=requestResetPasswordMethod` | `VtcResponse<ResetPasswordMethodPayload>` | — |
| `resetPasswordCode` | `api?cmd=resetPassword` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `resetPasswordmfaSession` | `api?cmd=resetPassword` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `searchRoom` | `api?cmd=searchRoom` | `VtcResponse<SearchRoomPayload>` | — |
| `searchRoomByActivityTimeSlot` | `api?cmd=searchRoomByActivityTimeSlot` | `VtcResponse<SearchRoomPayload>` | — |
| `searchTimeSlot` | `api?cmd=searchTimeSlot` | `VtcResponse<SearchRoomTimeslotPayload>` | — |
| `shareDoctor` | `api?cmd=shareDoctor` | `VtcResponse<ShareDoctorPayload>` | — |
| `shareEvents` | `api?cmd=shareEvents` | `VtcResponse<ShareEventPayload>` | — |
| `studentPhotoUploadCheckAI` | `api?cmd=uploadStudPhoto` | `VtcResponse<CheckStudPhotoAiResultPayload>` | — |
| `studentPhotoUploadConfirm` | `api?cmd=uploadStudPhoto` | `VtcResponse<CheckStudPhotoAiResultPayload>` | — |
| `submitEnquiry` | `api?cmd=submitEnquiry` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updateAlumni` | `api?cmd=updateAlumni` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updateBookmarkDoctor` | `api?cmd=updateBookmarkDoctor` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updateDoctorRating` | `api?cmd=updateDoctorRating` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updateFavouriteContacts` | `api?cmd=favouriteContacts` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updateIBooking` | `api?cmd=updateBooking` | `VtcResponse<IBookingResultPayload>` | — |
| `updateLastAccessTime` | `api?cmd=updateLastAccessTime` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updatePass` | `api?cmd=updatePass` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updateUserImage` | `api?cmd=updateUserImage` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `updateUserSetting` | `api?cmd=updateUserSetting` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `uploadImage` | `api?cmd=uploadImage` | `VtcResponse<ImagePayload>` | — |

#### BeaconVTCClient

| Method | Route | Declared response body | Static-analysis note |
| --- | --- | --- | --- |
| `getBeaconAvailableClassList` | `api?cmd=getBeaconAvailableClassList` | `VtcResponse<BeaconAvailableClassListPayload>` | — |
| `getClassAttendanceLogList` | `api?cmd=getClassAttendanceLogList` | `VtcResponse<ClassAttendanceLogListPayload>` | — |
| `getMyAttendanceLogList` | `api?cmd=getMyAttendanceLogList` | `VtcResponse<MyAttendanceLogListPayload>` | — |
| `takeAttendance` | `api?cmd=takeAttendance` | `VtcResponse<BeaconTakeAttendanceResultPayload>` | — |

#### BeaconClient

| Method | Route | Declared response body | Static-analysis note |
| --- | --- | --- | --- |
| `getAvailableBeaconInfo` | `getBeaconsInfo` | `BeaconAvailablePayload` | — |
| `getBeaconClassroomInfo` | `getClassroomInfo` | `BeaconClassroomPayload` | — |
| `getBeaconNotificationInfo` | `notification/{id}` | `BeaconNotification` | — |
| `updateBeaconBattery` | `updateBattery` | `BeaconUpdateBatteryPayload` | — |

#### ECardVtcClient

| Method | Route | Declared response body | Static-analysis note |
| --- | --- | --- | --- |
| `acceptTnc` | `tnc/accept` | `VtcResponse<TNCPayload>` | — |
| `getRegister` | `register` | `VtcResponse<RegisterPayload>` | — |
| `postRegister` | `register` | `VtcResponse<RegisterPayload>` | — |

#### ECardClient

| Method | Route | Declared response body | Static-analysis note |
| --- | --- | --- | --- |
| `acceptTncWithECardToken` | `tnc/accept/ecard` | `VtcResponse<TNCPayload>` | — |
| `deleteRegister` | `register` | `VtcResponse<RegisterPayload>` | — |
| `getConfig` | `configuration` | `VtcResponse<ConfigurationsPayload>` | — |
| `getECard` | `ecard` | `VtcResponse<ECardPayload>` | — |
| `getTime` | `time` | `VtcResponse<JsonElement>` | Payload is untyped JsonElement in the APK; exact fields are not declared. |
| `getTNC` | `tnc/{role}` | `VtcResponse<TNCPayload>` | — |
| `refreshToken` | `token/refresh` | `VtcResponse<TokenRefreshPayload>` | — |

#### DialogflowClient

| Method | Route | Declared response body | Static-analysis note |
| --- | --- | --- | --- |
| `detectIntent` | `/v2/projects/{projectId}/agent/sessions/{sessionId}:detectIntent` | `DFDetectIntentResponse` | — |

### Response model catalog (183 classes)

JSON property names come from Gson `@SerializedName` where present; otherwise the JVM field name is shown.

#### ActiveDevice

APK class: `hk.edu.vtc.mobile.model.ActiveDevice`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `created_at` | `int` | `created_at` |
| `deviceID` | `string` | `deviceID` |
| `deviceModel` | `string` | `deviceModel` |
| `deviceName` | `string` | `deviceName` |
| `lastAccessTime` | `int` | `lastAccessTime` |
| `osVersion` | `string` | `osVersion` |
| `userID` | `string` | `userID` |

#### Activity

APK class: `hk.edu.vtc.mobile.model.Activity`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `accepted` | `boolean` | `accepted` |
| `activityHour` | `number` | `activityHour` |
| `activityType` | `ActivityString` | `activityType` |
| `attachment` | `RealmList<Attachment>` | `attachment` |
| `attribute` | `RealmList<string>` | `attribute` |
| `awards` | `RealmList<ActivityString>` | `awards` |
| `campus` | `ActivityString` | `campus` |
| `code` | `string` | `code` |
| `deposit` | `number` | `deposit` |
| `description` | `DisplayName` | `description` |
| `discipline` | `DisplayName` | `discipline` |
| `enrolRemark` | `string` | `enrolRemark` |
| `enrolled` | `string` | `enrolled` |
| `enrollmentFrom` | `long` | `enrollmentFrom` |
| `enrollmentTo` | `long` | `enrollmentTo` |
| `executionFrom` | `long` | `executionFrom` |
| `executionTo` | `long` | `executionTo` |
| `fee` | `number` | `fee` |
| `instructor` | `Instructor` | `instructor` |
| `isHost` | `boolean` | `isHost` |
| `isOpen` | `boolean` | `isOpen` |
| `isSWPDProgrmme` | `boolean` | `isSWPDProgrmme` |
| `module` | `RealmList<string>` | `module` |
| `responsible` | `RealmList<Instructor>` | `responsible` |
| `successEnrolmentAlertMessage` | `DisplayName` | `successEnrolmentAlertMessage` |
| `timeslots` | `RealmList<Timeslot>` | `timeslots` |
| `title` | `DisplayName` | `title` |
| `venueRemark` | `string` | `venueRemark` |

#### ActivitySearchOption

APK class: `hk.edu.vtc.mobile.model.ActivitySearchOption`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |
| `list` | `SearchOptionList` | `list` |

#### ActivityString

APK class: `hk.edu.vtc.mobile.model.ActivityString`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `displayName` | `MultiLangString` | `displayName` |
| `id` | `string` | `id` |

#### AlumniEvent

APK class: `hk.edu.vtc.mobile.model.AlumniEvent`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `alumniEventsOption` | `string` | `alumniEventsOption` |
| `dateTime` | `MultiLangString` | `dateTime` |
| `deadline` | `MultiLangString` | `deadline` |
| `detail` | `MultiLangString` | `detail` |
| `eventType` | `MultiLangString` | `eventType` |
| `expiryDate` | `long` | `expiryDate` |
| `id` | `string` | `id` |
| `imageID` | `string` | `imageID` |
| `location` | `MultiLangString` | `location` |
| `organiser` | `MultiLangString` | `organiser` |
| `title` | `MultiLangString` | `title` |
| `url` | `string` | `url` |

#### AppDownloadReminder

APK class: `hk.edu.vtc.mobile.model.AppDownloadReminder`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `button` | `MultiLangString` | `button` |
| `downloadUrl` | `string` | `downloadUrl` |
| `message` | `MultiLangString` | `message` |
| `scheme` | `string` | `scheme` |

#### Attachment

APK class: `hk.edu.vtc.mobile.model.Attachment`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `fileSysName` | `string` | `fileSysName` |
| `fileUploadName` | `string` | `fileUploadName` |

#### BeaconAvailableClass

APK class: `hk.edu.vtc.mobile.model.BeaconAvailableClass`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `courseCode` | `string` | `courseCode` |
| `id` | `string` | `id` |
| `name` | `string` | `name` |
| `nameMultiLangString` | `MultiLangString` | `nameMultiLangString` |
| `orderNum` | `int` | `orderNum` |
| `roomCode` | `string` | `roomCode` |
| `startTime` | `long` | `startTime` |
| `stopTime` | `long` | `stopTime` |

#### BeaconClassAttendanceLog

APK class: `hk.edu.vtc.mobile.model.BeaconClassAttendanceLog`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `attendTime` | `long` | `attendTime` |
| `gender` | `string` | `gender` |
| `id` | `string` | `id` |
| `name` | `string` | `name` |
| `nameMultiLangString` | `MultiLangString` | `nameMultiLangString` |
| `userImageId` | `string` | `userImageId` |

#### BeaconMyAttendanceLog

APK class: `hk.edu.vtc.mobile.model.BeaconMyAttendanceLog`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `attendTime` | `long` | `attendTime` |
| `id` | `string` | `id` |
| `roomNum` | `string` | `roomNum` |

#### BeaconNotification

APK class: `hk.edu.vtc.mobile.model.BeaconNotification`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `content` | `string` | `content` |
| `endTime` | `string` | `endTime` |
| `id` | `string` | `id` |
| `startTime` | `string` | `startTime` |
| `title` | `string` | `title` |
| `updatedAt` | `string` | `updatedAt` |

#### BookmarkDoctor

APK class: `hk.edu.vtc.mobile.model.BookmarkDoctor`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `created_at` | `string` | `created_at` |
| `created_by` | `string` | `created_by` |
| `deleted_at` | `string` | `deleted_at` |
| `deleted_by` | `string` | `deleted_by` |
| `favKey` | `string` | `favKey` |
| `id` | `int` | `id` |
| `orderNum` | `string` | `orderNum` |
| `updated_at` | `string` | `updated_at` |
| `updated_by` | `string` | `updated_by` |
| `userID` | `string` | `userID` |

#### Class

APK class: `hk.edu.vtc.mobile.model.Class`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `campusCode` | `string` | `campusCode` |
| `courseCode` | `string` | `courseCode` |
| `courseTitle` | `string` | `courseTitle` |
| `endTime` | `long` | `endTime` |
| `id` | `string` | `id` |
| `lecturerName` | `string` | `lecturerName` |
| `lessonType` | `string` | `lessonType` |
| `roomNum` | `string` | `roomNum` |
| `startTime` | `long` | `startTime` |
| `weekNum` | `string` | `weekNum` |

#### Classes

APK class: `hk.edu.vtc.mobile.model.Classes`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `attendTime` | `string` | `attendTime` |
| `date` | `string` | `date` |
| `id` | `string` | `id` |
| `lessonTime` | `string` | `lessonTime` |
| `orderNum` | `int` | `orderNum` |
| `roomName` | `string` | `roomName` |
| `status` | `int` | `status` |

#### Contacts

APK class: `hk.edu.vtc.mobile.model.Contacts`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `deptCode` | `string` | `deptCode` |
| `email` | `string` | `email` |
| `favKey` | `string` | `favKey` |
| `faxNum` | `string` | `faxNum` |
| `id` | `string` | `id` |
| `metaTag` | `RealmList<string>` | `metaTag` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `number` | `orderNum` |
| `phoneExt` | `string` | `phoneExt` |
| `phoneNum` | `string` | `phoneNum` |
| `postOrderString` | `string` | `postOrderString` |
| `searchKey` | `RealmList<string>` | `searchKey` |
| `siteCode` | `string` | `siteCode` |
| `teamCode` | `string` | `teamCode` |
| `title` | `MultiLangString` | `title` |
| `unitCode` | `string` | `unitCode` |

#### Course

APK class: `hk.edu.vtc.mobile.model.Course`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `attendRate` | `int` | `attendRate` |
| `courseCode` | `string` | `courseCode` |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `int` | `orderNum` |
| `passRate` | `int` | `passRate` |

#### Data<T>

APK class: `hk.edu.vtc.mobile.model.Data`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `add` | `T[]` | `add` |
| `delete` | `T[]` | `delete` |
| `update` | `T[]` | `update` |

#### Department

APK class: `hk.edu.vtc.mobile.model.Department`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `deptCode` | `string` | `deptCode` |
| `favKey` | `string` | `favKey` |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `number` | `orderNum` |
| `searchKey` | `RealmList<string>` | `searchKey` |
| `siteCode` | `string` | `siteCode` |

#### Discipline

APK class: `hk.edu.vtc.mobile.model.Discipline`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `logo` | `string` | `logo` |
| `name_en` | `string` | `name_en` |
| `name_sc` | `string` | `name_sc` |
| `name_tc` | `string` | `name_tc` |
| `order_no` | `int` | `order_no` |
| `programmes` | `RealmList<Programme>` | `programmes` |
| `themeColor` | `string` | `themeColor` |

#### DisciplineName

APK class: `hk.edu.vtc.mobile.model.DisciplineName`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `code` | `string[]` | `_code` |
| `en` | `string[]` | `_en` |
| `sc` | `string[]` | `_sc` |
| `tc` | `string[]` | `_tc` |

#### DisplayName

APK class: `hk.edu.vtc.mobile.model.DisplayName`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `displayName` | `MultiLangString` | `displayName` |

#### Doctor

APK class: `hk.edu.vtc.mobile.model.Doctor`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `address_ch` | `string` | `address_ch` |
| `address_en` | `string` | `address_en` |
| `address_sc` | `string` | `address_sc` |
| `area_ch` | `string` | `area_ch` |
| `area_en` | `string` | `area_en` |
| `area_id` | `int` | `area_id` |
| `area_sc` | `string` | `area_sc` |
| `clinicName_ch` | `string` | `clinicName_ch` |
| `clinicName_en` | `string` | `clinicName_en` |
| `clinicName_sc` | `string` | `clinicName_sc` |
| `day_string_1` | `string` | `day_string_1` |
| `day_string_2` | `string` | `day_string_2` |
| `day_string_3` | `string` | `day_string_3` |
| `day_string_4` | `string` | `day_string_4` |
| `day_time_1` | `string` | `day_time_1` |
| `day_time_2` | `string` | `day_time_2` |
| `day_time_3` | `string` | `day_time_3` |
| `day_time_4` | `string` | `day_time_4` |
| `district_ch` | `string` | `district_ch` |
| `district_en` | `string` | `district_en` |
| `district_id` | `int` | `district_id` |
| `district_sc` | `string` | `district_sc` |
| `drName_ch` | `string` | `drName_ch` |
| `drName_en` | `string` | `drName_en` |
| `drName_sc` | `string` | `drName_sc` |
| `dr_id` | `int` | `dr_id` |
| `favKey` | `string` | `favKey` |
| `fax` | `string` | `fax` |
| `lat` | `string` | `lat` |
| `long` | `string` | `lng` |
| `remark` | `string` | `remark` |
| `scheme` | `string` | `scheme` |
| `sourceName_en` | `string` | `sourceName_en` |
| `sourceName_sc` | `string` | `sourceName_sc` |
| `sourceName_tc` | `string` | `sourceName_tc` |
| `specially_ch` | `string` | `specially_ch` |
| `specially_en` | `string` | `specially_en` |
| `specially_sc` | `string` | `specially_sc` |
| `specialty_id` | `int` | `specialty_id` |
| `telephone` | `string` | `telephone` |
| `updated_at` | `string` | `updated_at` |

#### DoctorListFilterOptionsArea

APK class: `hk.edu.vtc.mobile.model.DoctorListFilterOptionsArea`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `area_ch` | `string` | `area_ch` |
| `area_en` | `string` | `area_en` |
| `area_sc` | `string` | `area_sc` |
| `id` | `int` | `id` |
| `orderNum` | `int` | `orderNum` |

#### DoctorListFilterOptionsDistrict

APK class: `hk.edu.vtc.mobile.model.DoctorListFilterOptionsDistrict`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `areaID` | `int` | `areaID` |
| `district_ch` | `string` | `district_ch` |
| `district_en` | `string` | `district_en` |
| `district_sc` | `string` | `district_sc` |
| `id` | `int` | `id` |
| `orderNum` | `int` | `orderNum` |

#### DoctorListFilterOptionsSpecialtyNrp

APK class: `hk.edu.vtc.mobile.model.DoctorListFilterOptionsSpecialtyNrp`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `int` | `id` |
| `orderNum` | `int` | `orderNum` |
| `specialty_ch` | `string` | `specialty_ch` |
| `specialty_en` | `string` | `specialty_en` |
| `specialty_sc` | `string` | `specialty_sc` |

#### DoctorListFilterOptionsSpecialtyOrp

APK class: `hk.edu.vtc.mobile.model.DoctorListFilterOptionsSpecialtyOrp`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `int` | `id` |
| `orderNum` | `int` | `orderNum` |
| `specialty_ch` | `string` | `specialty_ch` |
| `specialty_en` | `string` | `specialty_en` |
| `specialty_sc` | `string` | `specialty_sc` |

#### DoctorScheme

APK class: `hk.edu.vtc.mobile.model.DoctorScheme`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `scheme` | `string` | `scheme` |

#### DocumentDownload

APK class: `hk.edu.vtc.mobile.model.DocumentDownload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `cat_id` | `string` | `cat_id` |
| `detail` | `RealmList<DocumentDownloadDetail>` | `detail` |
| `isBlocked` | `boolean` | `isBlocked` |
| `isPreReleasePeriod` | `boolean` | `isPreReleasePeriod` |
| `isWithInShowPeriod` | `boolean` | `isWithInShowPeriod` |
| `remarks_en` | `string` | `remarks_en` |
| `remarks_sc` | `string` | `remarks_sc` |
| `remarks_tc` | `string` | `remarks_tc` |
| `title_en` | `string` | `title_en` |
| `title_sc` | `string` | `title_sc` |
| `title_tc` | `string` | `title_tc` |
| `userReadTimestamp` | `long` | `userReadTimestamp` |

#### DocumentDownloadDetail

APK class: `hk.edu.vtc.mobile.model.DocumentDownloadDetail`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `lastModifiedTimestamp` | `long` | `lastModifiedTimestamp` |
| `name_en` | `string` | `name_en` |
| `name_sc` | `string` | `name_sc` |
| `name_tc` | `string` | `name_tc` |

#### DocumentDownloadNotice

APK class: `hk.edu.vtc.mobile.model.DocumentDownloadNotice`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `lastModifiedTimestamp` | `int` | `lastModifiedTimestamp` |
| `wording_en` | `string` | `wording_en` |
| `wording_sc` | `string` | `wording_sc` |
| `wording_tc` | `string` | `wording_tc` |

#### DrawerConfig

APK class: `hk.edu.vtc.mobile.model.DrawerConfig`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `home` | `DrawerList` | `home` |
| `id` | `int` | `id` |
| `menu` | `DrawerList` | `menu` |

#### DrawerItem

APK class: `hk.edu.vtc.mobile.model.DrawerItem`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `external` | `boolean` | `external` |
| `isSSO` | `boolean` | `isSSO` |
| `key` | `string` | `key` |
| `title` | `MultiLangString` | `title` |
| `url` | `MultiLangString` | `url` |

#### DrawerList

APK class: `hk.edu.vtc.mobile.model.DrawerList`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `featured` | `RealmList<DrawerItem>` | `featured` |
| `other` | `RealmList<DrawerItem>` | `other` |

#### ECardConfigItem

APK class: `hk.edu.vtc.mobile.model.eCard.ECardConfigItem`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `key` | `string` | `key` |
| `value` | `string` | `value` |

#### Exam

APK class: `hk.edu.vtc.mobile.model.Exam`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `endTime` | `long` | `endTime` |
| `generalRemarks` | `MultiLangString` | `generalRemarks` |
| `id` | `string` | `id` |
| `moduleCode` | `string` | `moduleCode` |
| `moduleName` | `MultiLangString` | `moduleName` |
| `moduleRemarks` | `MultiLangString` | `moduleRemarks` |
| `roomNum` | `string` | `roomNum` |
| `semester` | `int` | `semester` |
| `startTime` | `long` | `startTime` |
| `type` | `int` | `type` |

#### FavouriteContact

APK class: `hk.edu.vtc.mobile.model.FavouriteContact`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `contactType` | `int` | `contactType` |
| `favKey` | `string` | `favKey` |
| `orderNum` | `string` | `orderNum` |

#### Holiday

APK class: `hk.edu.vtc.mobile.model.Holiday`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `endDate` | `long` | `endDate` |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |
| `startDate` | `long` | `startDate` |
| `type` | `int` | `type` |

#### IBookingAddon

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingAddon`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `descEN` | `string` | `descEn` |
| `descSC` | `string` | `descSc` |
| `descTC` | `string` | `descTc` |
| `id` | `string` | `id` |
| `nameEN` | `string` | `name` |
| `nameSC` | `string` | `nameSc` |
| `nameTC` | `string` | `nameTc` |

#### IBookingAddonService

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingAddonService`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `addon` | `IBookingAddon[]` | `addon` |
| `descEn` | `string` | `descEn` |
| `descSc` | `string` | `descSc` |
| `descTc` | `string` | `descTc` |
| `id` | `string` | `id` |
| `nameEn` | `string` | `nameEn` |
| `nameSc` | `string` | `nameSc` |
| `nameTc` | `string` | `nameTc` |

#### IBookingApprovalAddon

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingApprovalAddon`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `nameEn` | `string` | `nameEn` |
| `nameSc` | `string` | `nameSc` |
| `nameTc` | `string` | `nameTc` |
| `qty` | `int` | `qty` |
| `resourceId` | `int` | `resourceId` |
| `serviceId` | `int` | `serviceId` |
| `serviceNameEN` | `string` | `serviceNameEN` |
| `serviceNameSC` | `string` | `serviceNameSC` |
| `serviceNameTC` | `string` | `serviceNameTC` |

#### IBookingApprovalItem

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingApprovalItem`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `bookingId` | `string` | `bookingId` |
| `bookingTimeSlot` | `IBookingApprovalTimeSlot[]` | `bookingTimeSlot` |

#### IBookingApprovalOrganizer

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingApprovalOrganizer`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `email` | `string` | `email` |
| `recipient` | `string` | `recipient` |
| `userCNA` | `string` | `userCNA` |

#### IBookingApprovalTimeSlot

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingApprovalTimeSlot`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `addon` | `IBookingApprovalAddon[]` | `addon` |
| `attendees` | `IBookingAttendee[]` | `attendees` |
| `bookingDate` | `string` | `bookingDate` |
| `bookingTSID` | `string` | `bookingTSID` |
| `endTime` | `string` | `endTime` |
| `organizer` | `IBookingApprovalOrganizer` | `organizer` |
| `parentBookingId` | `string` | `parentBookingId` |
| `remarks` | `string` | `remarks` |
| `resourceId` | `int` | `resourceId` |
| `resourceNameEn` | `string` | `resourceNameEn` |
| `resourceNameSc` | `string` | `resourceNameSc` |
| `resourceNameTc` | `string` | `resourceNameTc` |
| `service` | `string` | `service` |
| `startTime` | `string` | `startTime` |
| `status` | `string` | `status` |
| `statusLabelEn` | `string` | `statusLabelEn` |
| `statusLabelSc` | `string` | `statusLabelSc` |
| `statusLabelTc` | `string` | `statusLabelTc` |
| `thumbnail` | `string` | `thumbnail` |
| `title` | `string` | `title` |

#### IBookingAttendee

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingAttendee`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `userCNA` | `string` | `cna` |
| `email` | `string` | `email` |
| `recipient` | `string` | `name` |

#### IBookingCampus

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingCampus`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `nameEN` | `string` | `nameEn` |
| `nameSC` | `string` | `nameSc` |
| `nameTC` | `string` | `nameTc` |
| `services` | `IBookingService[]` | `services` |

#### IBookingDetail

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingDetail`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `addon` | `IBookingDetailAddon[]` | `addon` |
| `attendees` | `IBookingAttendee[]` | `attendees` |
| `bookingDate` | `string` | `bookingDate` |
| `bookingId` | `string` | `bookingId` |
| `bookingNumber` | `string` | `bookingNumber` |
| `bookingTSID` | `string` | `bookingTSID` |
| `campusName` | `string` | `campusName` |
| `campusNameSc` | `string` | `campusNameSc` |
| `campusNameTc` | `string` | `campusNameTc` |
| `checkInDateTime` | `string` | `checkInDateTime` |
| `description` | `string` | `description` |
| `endTime` | `string` | `endTime` |
| `location` | `string` | `location` |
| `organizer` | `IBookingOrganizer` | `organizer` |
| `phone` | `string` | `phone` |
| `price` | `string` | `price` |
| `regionId` | `string` | `regionId` |
| `rejectReason` | `string` | `rejectReason` |
| `remark` | `string` | `remark` |
| `resourceId` | `string` | `resourceId` |
| `roomName` | `string` | `roomName` |
| `roomNameSc` | `string` | `roomNameSc` |
| `roomNameTc` | `string` | `roomNameTc` |
| `service` | `string` | `service` |
| `serviceId` | `string` | `serviceId` |
| `startTime` | `string` | `startTime` |
| `status` | `string` | `status` |
| `statusLabelEn` | `string` | `statusLabelEn` |
| `statusLabelSc` | `string` | `statusLabelSc` |
| `statusLabelTc` | `string` | `statusLabelTc` |
| `thumbnail` | `string` | `thumbnail` |
| `title` | `string` | `title` |

#### IBookingDetailAddon

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingDetailAddon`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `quantity` | `int` | `quantity` |
| `resourceId` | `string` | `resourceId` |
| `nameEn` | `string` | `resourceName` |
| `nameSc` | `string` | `resourceNameSc` |
| `nameTc` | `string` | `resourceNameTc` |
| `serviceId` | `string` | `serviceId` |
| `serviceName` | `string` | `serviceName` |
| `serviceNameSc` | `string` | `serviceNameSc` |
| `serviceNameTc` | `string` | `serviceNameTc` |

#### IBookingListAddon

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingListAddon`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `nameEn` | `string` | `nameEn` |
| `nameSc` | `string` | `nameSc` |
| `nameTc` | `string` | `nameTc` |
| `qty` | `int` | `qty` |
| `resourceId` | `string` | `resourceId` |
| `serviceId` | `string` | `serviceId` |
| `serviceNameEN` | `string` | `serviceNameEN` |
| `serviceNameSC` | `string` | `serviceNameSC` |
| `serviceNameTC` | `string` | `serviceNameTC` |

#### IBookingListAttendee

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingListAttendee`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `email` | `string` | `email` |
| `recipient` | `string` | `recipient` |
| `userCNA` | `string` | `userCNA` |

#### IBookingListItem

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingListItem`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `addon` | `IBookingListAddon[]` | `addon` |
| `attendees` | `IBookingListAttendee[]` | `attendees` |
| `bookingDate` | `string` | `bookingDate` |
| `bookingId` | `string` | `bookingId` |
| `checkInDateTime` | `string` | `checkInDateTime` |
| `endTime` | `string` | `endTime` |
| `facilityId` | `string` | `facilityId` |
| `location` | `string` | `location` |
| `organizer` | `IBookingListOrganizer` | `organizer` |
| `phone` | `string` | `phone` |
| `regionId` | `string` | `regionId` |
| `rejectReason` | `string` | `rejectReason` |
| `remarks` | `string` | `remarks` |
| `resourceId` | `string` | `resourceId` |
| `resourceNameEn` | `string` | `resourceNameEn` |
| `resourceNameSc` | `string` | `resourceNameSc` |
| `resourceNameTc` | `string` | `resourceNameTc` |
| `service` | `string` | `service` |
| `serviceId` | `string` | `serviceId` |
| `serviceNameEn` | `string` | `serviceNameEn` |
| `serviceNameSc` | `string` | `serviceNameSc` |
| `serviceNameTc` | `string` | `serviceNameTc` |
| `startTime` | `string` | `startTime` |
| `status` | `string` | `status` |
| `statusLabelEn` | `string` | `statusLabelEn` |
| `statusLabelSc` | `string` | `statusLabelSc` |
| `statusLabelTc` | `string` | `statusLabelTc` |
| `thumbnail` | `string` | `thumbnail` |
| `title` | `string` | `title` |

#### IBookingListOrganizer

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingListOrganizer`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `email` | `string` | `email` |
| `recipient` | `string` | `recipient` |
| `userCNA` | `string` | `userCNA` |

#### IBookingOrganizer

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingOrganizer`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `userCNA` | `string` | `cna` |
| `email` | `string` | `email` |
| `recipient` | `string` | `name` |
| `phone` | `string` | `phone` |

#### IBookingRoom

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingRoom`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `addonService` | `IBookingAddonService[]` | `addonService` |
| `duration` | `int` | `duration` |
| `durationUnit` | `string` | `durationUnit` |
| `fee` | `int` | `fee` |
| `id` | `string` | `id` |
| `infotag` | `string[]` | `infotag` |
| `locNameEn` | `string` | `locNameEn` |
| `locNameSc` | `string` | `locNameSc` |
| `locNameTc` | `string` | `locNameTc` |
| `maxBookingDuration` | `int` | `maxBookingDuration` |
| `maximumAttendees` | `int` | `maximumAttendees` |
| `minBookingDuration` | `int` | `minBookingDuration` |
| `minimumAttendees` | `int` | `minimumAttendees` |
| `nameEn` | `string` | `nameEn` |
| `nameSc` | `string` | `nameSc` |
| `nameTc` | `string` | `nameTc` |
| `needApproval` | `boolean` | `needApproval` |
| `needCheckin` | `boolean` | `needCheckin` |
| `photoUrl` | `string` | `photoUrl` |

#### IBookingService

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingService`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `nameEn` | `string` | `nameEn` |
| `nameSc` | `string` | `nameSc` |
| `nameTc` | `string` | `nameTc` |

#### IBookingTimeslot

APK class: `hk.edu.vtc.mobile.model.ibooking.IBookingTimeslot`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `available` | `boolean` | `available` |
| `bookingId` | `string` | `bookingId` |
| `endTime` | `string` | `endTime` |
| `eventName` | `string` | `eventName` |
| `organizerName` | `string` | `organizerName` |
| `startTime` | `string` | `startTime` |

#### Instructor

APK class: `hk.edu.vtc.mobile.model.Instructor`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `cna` | `string` | `cna` |
| `name` | `string` | `name` |

#### MoodleTimetable

APK class: `hk.edu.vtc.mobile.model.MoodleTimetable`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `actionName` | `string` | `actionName` |
| `actionUrl` | `string` | `actionUrl` |
| `courseFullName` | `string` | `courseFullName` |
| `courseShortName` | `string` | `courseShortName` |
| `courseUrl` | `string` | `courseUrl` |
| `id` | `string` | `id` |
| `month` | `int` | `month` |
| `name` | `string` | `name` |
| `timeDuration` | `long` | `timeDuration` |
| `timeEnd` | `long` | `timeEnd` |
| `timeStart` | `long` | `timeStart` |
| `year` | `int` | `year` |

#### MultiLangString

APK class: `hk.edu.vtc.mobile.model.MultiLangString`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `en` | `string` | `en` |
| `order` | `string` | `order` |
| `sc` | `string` | `sc` |
| `tc` | `string` | `tc` |

#### MultiLangStringWithImage

APK class: `hk.edu.vtc.mobile.model.MultiLangStringWithImage`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `en` | `string` | `en` |
| `imageID` | `string` | `imageID` |
| `sc` | `string` | `sc` |
| `tc` | `string` | `tc` |

#### News

APK class: `hk.edu.vtc.mobile.model.News`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `accessBy` | `RealmList<int>` | `accessBy` |
| `alumniNewsOption` | `RealmList<string>` | `alumniNewsOption` |
| `content` | `MultiLangString` | `content` |
| `expiryDate` | `int` | `expiryDate` |
| `facebookVideoID` | `string` | `facebookVideoID` |
| `iconID` | `string` | `iconID` |
| `id` | `string` | `id` |
| `imageID` | `string` | `imageID` |
| `isAlumniNews` | `boolean` | `isAlumniNews` |
| `isCritical` | `boolean` | `isCritical` |
| `isFeaturedNews` | `boolean` | `isFeaturedNews` |
| `isNew` | `boolean` | `isNew` |
| `isRead` | `boolean` | `isRead` |
| `lastUpdateDate` | `long` | `lastUpdateDate` |
| `panoptoVideoUrl` | `string` | `panoptoVideoUrl` |
| `postDate` | `int` | `postDate` |
| `title` | `MultiLangString` | `title` |
| `youtubeVideoID` | `string` | `youtubeVideoID` |

#### Notification

APK class: `hk.edu.vtc.mobile.model.Notification`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `extraData` | `NotificationExtraData` | `extraData` |
| `id` | `string` | `id` |
| `isRead` | `boolean` | `isRead` |
| `itemID` | `string` | `itemID` |
| `msg` | `string` | `msg` |
| `notificationOption` | `RealmList<string>` | `notificationOption` |
| `sendTime` | `long` | `sendTime` |
| `sender` | `string` | `sender` |
| `type` | `int` | `type` |

#### NotificationExtraData

APK class: `hk.edu.vtc.mobile.model.NotificationExtraData`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `url` | `string` | `url` |

#### NotificationType

APK class: `hk.edu.vtc.mobile.model.NotificationType`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `displayNameEn` | `string` | `displayNameEn` |
| `displayNameSc` | `string` | `displayNameSc` |
| `displayNameTc` | `string` | `displayNameTc` |
| `id` | `string` | `id` |

#### Participant

APK class: `hk.edu.vtc.mobile.model.Participant`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `campus` | `string` | `campus` |
| `cna` | `string` | `cna` |
| `code` | `string` | `code` |
| `department` | `string` | `department` |
| `enrollStatus` | `string` | `enrollStatus` |
| `enrollmentSeq` | `int` | `enrollmentSeq` |
| `name` | `string` | `name` |
| `pass` | `boolean` | `pass` |
| `phone` | `int` | `phone` |
| `programme` | `string` | `programme` |
| `role` | `string` | `role` |

#### PersonalEvent

APK class: `hk.edu.vtc.mobile.model.PersonalEvent`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `detail` | `string` | `detail` |
| `endDate` | `long` | `endDate` |
| `id` | `string` | `id` |
| `name` | `string` | `name` |
| `startDate` | `long` | `startDate` |
| `webID` | `string` | `webID` |

#### Programme

APK class: `hk.edu.vtc.mobile.model.Programme`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `enrollmentDeadline` | `int` | `enrollmentDeadline` |
| `id` | `string` | `id` |
| `name_en` | `string` | `name_en` |
| `name_sc` | `string` | `name_sc` |
| `name_tc` | `string` | `name_tc` |
| `order_no` | `string` | `order_no` |
| `url` | `string` | `url` |

#### Reminder

APK class: `hk.edu.vtc.mobile.model.Reminder`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `eventID` | `string` | `eventID` |
| `eventType` | `int` | `eventType` |
| `reminderID` | `string` | `reminderID` |
| `reminderOption` | `int` | `reminderOption` |

#### SearchOptionList

APK class: `hk.edu.vtc.mobile.model.SearchOptionList`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `attribute` | `RealmList<ActivityString>` | `attribute` |
| `campus` | `RealmList<ActivityString>` | `campus` |
| `type` | `RealmList<ActivityString>` | `type` |

#### SearchRoom

APK class: `hk.edu.vtc.mobile.model.SearchRoom`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `capacity` | `string` | `capacity` |
| `name` | `string` | `name` |

#### SearchRoomActivity

APK class: `hk.edu.vtc.mobile.model.SearchRoomActivity`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `name` | `string` | `name` |

#### SearchRoomCampus

APK class: `hk.edu.vtc.mobile.model.SearchRoomCampus`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |

#### SearchRoomDepartment

APK class: `hk.edu.vtc.mobile.model.SearchRoomDepartment`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |

#### SearchRoomTimeslot

APK class: `hk.edu.vtc.mobile.model.SearchRoomTimeslot`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `endTime` | `long` | `endTime` |
| `startTime` | `long` | `startTime` |

#### Site

APK class: `hk.edu.vtc.mobile.model.Site`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `favKey` | `string` | `favKey` |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `number` | `orderNum` |
| `searchKey` | `RealmList<string>` | `searchKey` |
| `siteCode` | `string` | `siteCode` |

#### SiteMap

APK class: `hk.edu.vtc.mobile.model.SiteMap`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `address` | `MultiLangString` | `address` |
| `campus` | `MultiLangString` | `campus` |
| `display_url` | `string` | `display_url` |
| `email` | `string` | `email` |
| `fax` | `string` | `fax` |
| `id` | `string` | `id` |
| `image_key` | `string` | `image_key` |
| `institute` | `MultiLangString` | `institute` |
| `institute_code` | `string` | `institute_code` |
| `lat` | `string` | `lat` |
| `lng` | `string` | `lng` |
| `site_order` | `string` | `site_order` |
| `tel` | `string` | `tel` |
| `url` | `string` | `url` |

#### StaffTimetable

APK class: `hk.edu.vtc.mobile.model.StaffTimetable`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `activityType` | `MultiLangString` | `activityType` |
| `campus` | `string` | `campus` |
| `endTime` | `long` | `endTime` |
| `enrollmentFrom` | `long` | `enrollmentFrom` |
| `enrollmentTo` | `long` | `enrollmentTo` |
| `id` | `string` | `id` |
| `isWorkspaceActivity` | `boolean` | `isWorkspaceActivity` |
| `lat` | `string` | `lat` |
| `lng` | `string` | `lng` |
| `location` | `string` | `location` |
| `modDesc` | `MultiLangString` | `modDesc` |
| `startTime` | `long` | `startTime` |
| `studentSet` | `MultiLangString` | `studentSet` |
| `title` | `MultiLangString` | `title` |
| `uniqueId` | `string` | `uniqueId` |
| `workActivityId` | `string` | `workActivityId` |
| `workActivityIsEnrol` | `boolean` | `workActivityIsEnrol` |
| `workActivityIsOpen` | `boolean` | `workActivityIsOpen` |
| `workActivityOUName_en` | `string` | `workActivityOUName_en` |
| `workActivityOUName_sc` | `string` | `workActivityOUName_sc` |
| `workActivityOUName_tc` | `string` | `workActivityOUName_tc` |
| `workActivityTitle_en` | `string` | `workActivityTitle_en` |
| `workActivityTitle_sc` | `string` | `workActivityTitle_sc` |
| `workActivityTitle_tc` | `string` | `workActivityTitle_tc` |

#### StudentSet

APK class: `hk.edu.vtc.mobile.model.StudentSet`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |

#### Team

APK class: `hk.edu.vtc.mobile.model.Team`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `deptCode` | `string` | `deptCode` |
| `favKey` | `string` | `favKey` |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `number` | `orderNum` |
| `siteCode` | `string` | `siteCode` |
| `teamCode` | `string` | `teamCode` |
| `unitCode` | `string` | `unitCode` |

#### Timeslot

APK class: `hk.edu.vtc.mobile.model.Timeslot`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `duration` | `number` | `duration` |
| `enddate` | `long` | `enddate` |
| `startdate` | `long` | `startdate` |

#### Unit

APK class: `hk.edu.vtc.mobile.model.Unit`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `deptCode` | `string` | `deptCode` |
| `favKey` | `string` | `favKey` |
| `id` | `string` | `id` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `number` | `orderNum` |
| `siteCode` | `string` | `siteCode` |
| `unitCode` | `string` | `unitCode` |

#### VtcApp

APK class: `hk.edu.vtc.mobile.model.VtcApp`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `androidLink` | `string` | `androidLink` |
| `description` | `MultiLangString` | `description` |
| `id` | `string` | `id` |
| `identifier` | `string` | `identifier` |
| `imageID` | `string` | `imageID` |
| `isEnable` | `boolean` | `isEnable` |
| `isNative` | `boolean` | `isNative` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `int` | `orderNum` |
| `webAppLink` | `MultiLangString` | `webAppLink` |

#### VTCBeacon

APK class: `hk.edu.vtc.mobile.model.VTCBeacon`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `identifier` | `string` | `identifier` |
| `major` | `long` | `major` |
| `minor` | `long` | `minor` |
| `uuid` | `string` | `uuid` |

#### Website

APK class: `hk.edu.vtc.mobile.model.Website`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `imageID` | `string` | `imageID` |
| `isEnable` | `boolean` | `isEnable` |
| `link` | `MultiLangString` | `link` |
| `name` | `MultiLangString` | `name` |
| `orderNum` | `int` | `orderNum` |
| `type` | `int` | `type` |

#### WorkspaceActivity

APK class: `hk.edu.vtc.mobile.model.WorkspaceActivity`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `activityFrom` | `long` | `activityFrom` |
| `activityTo` | `long` | `activityTo` |
| `enrollmentFrom` | `long` | `enrollmentFrom` |
| `enrollmentTo` | `long` | `enrollmentTo` |
| `id` | `string` | `id` |
| `isEnrol` | `boolean` | `isEnrol` |
| `isOpen` | `boolean` | `isOpen` |
| `ou` | `WorkspaceActivityOU` | `ou` |
| `title_en` | `string` | `title_en` |
| `title_sc` | `string` | `title_sc` |
| `title_tc` | `string` | `title_tc` |

#### WorkspaceActivityChoiceDay

APK class: `hk.edu.vtc.mobile.model.WorkspaceActivityChoiceDay`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `end` | `long` | `end` |
| `location_en` | `string` | `location_en` |
| `location_sc` | `string` | `location_sc` |
| `location_tc` | `string` | `location_tc` |
| `start` | `long` | `start` |

#### WorkspaceActivityChoiceDetail

APK class: `hk.edu.vtc.mobile.model.WorkspaceActivityChoiceDetail`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `choice_id` | `string` | `choice_id` |
| `content_en` | `string` | `content_en` |
| `content_sc` | `string` | `content_sc` |
| `content_tc` | `string` | `content_tc` |
| `cpd` | `double` | `cpd` |
| `days` | `RealmList<WorkspaceActivityChoiceDay>` | `days` |
| `facilitator_en` | `string` | `facilitator_en` |
| `facilitator_sc` | `string` | `facilitator_sc` |
| `facilitator_tc` | `string` | `facilitator_tc` |
| `isEnrol` | `boolean` | `isEnrol` |
| `isOpen` | `boolean` | `isOpen` |
| `targetAudience_en` | `string` | `targetAudience_en` |
| `targetAudience_sc` | `string` | `targetAudience_sc` |
| `targetAudience_tc` | `string` | `targetAudience_tc` |
| `title_en` | `string` | `title_en` |
| `title_sc` | `string` | `title_sc` |
| `title_tc` | `string` | `title_tc` |

#### WorkspaceActivityDetail

APK class: `hk.edu.vtc.mobile.model.WorkspaceActivityDetail`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `banner_en` | `string` | `banner_en` |
| `banner_sc` | `string` | `banner_sc` |
| `banner_tc` | `string` | `banner_tc` |
| `category_en` | `string` | `category_en` |
| `category_sc` | `string` | `category_sc` |
| `category_tc` | `string` | `category_tc` |
| `choices` | `RealmList<WorkspaceActivityChoiceDetail>` | `choices` |
| `choose_one` | `boolean` | `choose_one` |
| `concurrent` | `boolean` | `concurrent` |
| `directApplicationPage_en` | `string` | `directApplicationPage_en` |
| `directApplicationPage_sc` | `string` | `directApplicationPage_sc` |
| `directApplicationPage_tc` | `string` | `directApplicationPage_tc` |
| `enrollmentFrom` | `long` | `enrollmentFrom` |
| `enrollmentTo` | `long` | `enrollmentTo` |
| `id` | `string` | `id` |
| `image_url_en` | `string` | `image_url_en` |
| `image_url_sc` | `string` | `image_url_sc` |
| `image_url_tc` | `string` | `image_url_tc` |
| `level_en` | `string` | `level_en` |
| `level_sc` | `string` | `level_sc` |
| `level_tc` | `string` | `level_tc` |
| `mediumOfInstruction_en` | `string` | `mediumOfInstruction_en` |
| `mediumOfInstruction_sc` | `string` | `mediumOfInstruction_sc` |
| `mediumOfInstruction_tc` | `string` | `mediumOfInstruction_tc` |
| `ou_en` | `string` | `ou_en` |
| `ou_sc` | `string` | `ou_sc` |
| `ou_tc` | `string` | `ou_tc` |
| `remarks_en` | `string` | `remarks_en` |
| `remarks_sc` | `string` | `remarks_sc` |
| `remarks_tc` | `string` | `remarks_tc` |
| `subcategory_en` | `string` | `subcategory_en` |
| `subcategory_sc` | `string` | `subcategory_sc` |
| `subcategory_tc` | `string` | `subcategory_tc` |
| `trainingType_en` | `string` | `trainingType_en` |
| `trainingType_sc` | `string` | `trainingType_sc` |
| `trainingType_tc` | `string` | `trainingType_tc` |

#### WorkspaceActivityOU

APK class: `hk.edu.vtc.mobile.model.WorkspaceActivityOU`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `name_en` | `string` | `name_en` |
| `name_sc` | `string` | `name_sc` |
| `name_tc` | `string` | `name_tc` |

#### WorkspaceActivitySearchOption

APK class: `hk.edu.vtc.mobile.model.WorkspaceActivitySearchOption`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `name_en` | `string` | `name_en` |
| `name_sc` | `string` | `name_sc` |
| `name_tc` | `string` | `name_tc` |

#### MoodleTimeTableResponse

APK class: `hk.edu.vtc.mobile.network.MoodleTimeTableResponse`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `errorCode` | `int` | `errorCode` |
| `errorMsg` | `string` | `errorMsg` |
| `isSuccess` | `boolean` | `isSuccess` |
| `payload` | `MoodleTimetable[]` | `payload` |

#### AboutVTCPayload

APK class: `hk.edu.vtc.mobile.network.payload.AboutVTCPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `coreValues` | `MultiLangString` | `coreValues` |
| `currentTimestamp` | `int` | `currentTimestamp` |
| `lastUpdatedTimestamp` | `int` | `lastUpdatedTimestamp` |
| `mission` | `MultiLangString` | `mission` |
| `opportunities` | `MultiLangString` | `opportunities` |
| `url` | `MultiLangString` | `url` |
| `vision` | `MultiLangString` | `vision` |

#### ActiveDevicePayload

APK class: `hk.edu.vtc.mobile.network.payload.ActiveDevicePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `device` | `ActiveDevice[]` | `_device` |
| `deviceCount` | `int` | `deviceCount` |

#### ActivityListPayload

APK class: `hk.edu.vtc.mobile.network.payload.ActivityListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `list` | `Data<Activity>` | `_list` |
| `currentTimestamp` | `int` | `currentTimestamp` |
| `lastUpdatedTimestamp` | `int` | `lastUpdatedTimestamp` |
| `vtcID` | `string` | `vtcID` |

#### AlumniEventPayload

APK class: `hk.edu.vtc.mobile.network.payload.AlumniEventPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `alumniEvents` | `AlumniEvent[]` | `_alumniEvents` |

#### AlumniPayload

APK class: `hk.edu.vtc.mobile.network.payload.AlumniPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `msg` | `string` | `msg` |
| `token` | `string` | `token` |
| `userID` | `string` | `userID` |

#### BeaconAvailableClassListPayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.BeaconAvailableClassListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `courses` | `BeaconAvailableClass[]` | `mCourses` |

#### BeaconAvailablePayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.BeaconAvailablePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `beacons` | `VTCBeacon[]` | `mBeacons` |
| `lastUpdated` | `long` | `mLastUpdated` |

#### BeaconClassroomNotificationPayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.BeaconClassroomNotificationPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `mId` |
| `title` | `string` | `mTitle` |

#### BeaconClassroomPayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.BeaconClassroomPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `classroomCampus` | `string` | `mClassroomCampus` |
| `classroomID` | `string` | `mClassroomID` |
| `classroomName` | `string` | `mClassroomName` |
| `notifications` | `BeaconClassroomNotificationPayload[]` | `mNotifications` |

#### BeaconTakeAttendanceResultPayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.BeaconTakeAttendanceResultPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `result` | `boolean` | `result` |

#### BeaconUpdateBatteryPayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.BeaconUpdateBatteryPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `result` | `string` | `result` |

#### ClassAttendanceLogListPayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.ClassAttendanceLogListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `auditLogs` | `BeaconClassAttendanceLog[]` | `_auditLogs` |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |

#### MyAttendanceLogListPayload

APK class: `hk.edu.vtc.mobile.network.payload.beaconPayload.MyAttendanceLogListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `auditLogs` | `BeaconMyAttendanceLog[]` | `_auditLogs` |
| `lastUpdatedTimestamp` | `long` | `_lastUpdatedTimestamp` |

#### CheckStudPhotoAiResultPayload

APK class: `hk.edu.vtc.mobile.network.payload.CheckStudPhotoAiResultPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `chkBackground` | `string` | `chkBackground` |
| `chkBlur` | `string` | `chkBlur` |
| `chkCentred` | `string` | `chkCentred` |
| `chkFrontal` | `string` | `chkFrontal` |
| `chkLightness` | `string` | `chkLightness` |
| `chkRedEye` | `string` | `chkRedEye` |
| `overallResult` | `string` | `overallResult` |
| `uploadSuccess` | `string` | `uploadSuccess` |

#### CheckStudPhotoAllowUploadPayload

APK class: `hk.edu.vtc.mobile.network.payload.CheckStudPhotoAllowUploadPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `allowUpload` | `string` | `allowUpload` |
| `lastUploadedDate` | `string` | `lastUploadedDate` |
| `status` | `string` | `status` |
| `statusDescEn` | `string` | `statusDescEn` |
| `statusDescSc` | `string` | `statusDescSc` |
| `statusDescTc` | `string` | `statusDescTc` |
| `validStud` | `string` | `validStud` |

#### CheckStudPhotoAllowUploadResultPayload

APK class: `hk.edu.vtc.mobile.network.payload.CheckStudPhotoAllowUploadResultPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `result` | `CheckStudPhotoAllowUploadPayload[]` | `_result` |

#### ClassAttendanceDetailPayload

APK class: `hk.edu.vtc.mobile.network.payload.ClassAttendanceDetailPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `classes` | `Classes[]` | `_classes` |
| `course` | `Course` | `course` |
| `emptyMsg` | `MultiLangString` | `emptyMsg` |
| `isShowAttendanceRate` | `boolean` | `isShowAttendanceRate` |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |
| `totalNumOfClass` | `int` | `totalNumOfClass` |

#### ClassAttendanceListPayload

APK class: `hk.edu.vtc.mobile.network.payload.ClassAttendanceListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `courses` | `Course[]` | `_courses` |
| `emptyMsg` | `MultiLangString` | `emptyMsg` |
| `isShowAttendanceRate` | `boolean` | `isShowAttendanceRate` |
| `totalNumOfCourse` | `int` | `totalNumOfCourse` |

#### ContactListPayload

APK class: `hk.edu.vtc.mobile.network.payload.ContactListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `contacts` | `Data<Contacts>` | `_contacts` |
| `department` | `Data<Department>` | `_department` |
| `site` | `Data<Site>` | `_site` |
| `team` | `Data<Team>` | `_team` |
| `unit` | `Data<Unit>` | `_unit` |
| `currentTimestamp` | `int` | `currentTimestamp` |
| `isDropDB` | `boolean` | `isDropDB` |
| `lastUpdatedTimestamp` | `int` | `lastUpdatedTimestamp` |

#### DataSyncPayload<Data>

APK class: `hk.edu.vtc.mobile.network.payload.DataSyncPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `add` | `Data[]` | `_add` |
| `delete` | `JsonObject[]` | `_delete` |
| `update` | `Data[]` | `_update` |
| `currentTimestamp` | `int` | `currentTimestamp` |
| `lastUpdatedTimestamp` | `int` | `lastUpdatedTimestamp` |

#### DeviceIDPayload

APK class: `hk.edu.vtc.mobile.network.payload.DeviceIDPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `deviceID` | `string` | `deviceID` |
| `msg` | `string` | `msg` |

#### AppAction

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.AppAction`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `message` | `string` | `message` |
| `type` | `string` | `type` |
| `unavailable_message` | `string` | `unavailable_message` |

#### ClickAction

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.ClickAction`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `action_key` | `string` | `action_key` |
| `button_title` | `string` | `button_title` |
| `type` | `string` | `type` |

#### ClickActionInfo

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.ClickActionInfo`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `click_action` | `ClickAction[]` | `click_action` |
| `click_action_hide_text` | `string` | `click_action_hide_text` |

#### DFDetectIntentFulfillmentMessage

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.DFDetectIntentFulfillmentMessage`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `payload` | `DFDetectIntentVTCPayload` | `payload` |

#### DFDetectIntentQueryResult

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.DFDetectIntentQueryResult`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `action` | `string` | `action` |
| `allRequiredParamsPresent` | `boolean` | `allRequiredParamsPresent` |
| `fulfillmentMessages` | `DFDetectIntentFulfillmentMessage[]` | `fulfillmentMessages` |
| `fulfillmentText` | `string` | `fulfillmentText` |
| `intent` | `DFDetectIntentQueryResultIntent` | `intent` |
| `parameters` | `JsonElement` | `parameters` |
| `queryText` | `string` | `queryText` |

#### DFDetectIntentQueryResultIntent

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.DFDetectIntentQueryResultIntent`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `displayName` | `string` | `displayName` |
| `isFallback` | `boolean` | `isFallback` |
| `name` | `string` | `name` |

#### DFDetectIntentResponse

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.DFDetectIntentResponse`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `error` | `DFDetectIntentResponseError` | `error` |
| `queryResult` | `DFDetectIntentQueryResult` | `queryResult` |
| `responseId` | `string` | `responseId` |

#### DFDetectIntentResponseError

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.DFDetectIntentResponseError`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `code` | `int` | `code` |
| `message` | `string` | `message` |
| `status` | `string` | `status` |

#### DFDetectIntentVTCPayload

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.DFDetectIntentVTCPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `app_action` | `AppAction` | `app_action` |
| `click_action_info` | `ClickActionInfo` | `click_action_info` |
| `text_suggestions` | `TextSuggestion[]` | `text_suggestions` |

#### TextSuggestion

APK class: `hk.edu.vtc.mobile.network.payload.DialogflowPayload.TextSuggestion`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `display_text` | `string` | `display_text` |
| `submit_value` | `string` | `submit_value` |

#### DisciplineAndProgrammePayload

APK class: `hk.edu.vtc.mobile.network.payload.DisciplineAndProgrammePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `disciplineList` | `Discipline[]` | `_disciplineList` |

#### DisciplinePayload

APK class: `hk.edu.vtc.mobile.network.payload.DisciplinePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `discipline` | `DisciplineName` | `_discipline` |

#### DlaOneTimeTokenPayload

APK class: `hk.edu.vtc.mobile.network.payload.DlaOneTimeTokenPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `oneTimeToken` | `string` | `oneTimeToken` |

#### DoctorBookMarkListPayload

APK class: `hk.edu.vtc.mobile.network.payload.DoctorBookMarkListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `bookmarkList` | `BookmarkDoctor[]` | `_bookmarkList` |

#### DoctorListFilterOptionsPayload

APK class: `hk.edu.vtc.mobile.network.payload.DoctorListFilterOptionsPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `area` | `DoctorListFilterOptionsArea[]` | `_area` |
| `district` | `DoctorListFilterOptionsDistrict[]` | `_district` |
| `specialtyNrp` | `DoctorListFilterOptionsSpecialtyNrp[]` | `_specialtyNrp` |
| `specialtyOrp` | `DoctorListFilterOptionsSpecialtyOrp[]` | `_specialtyOrp` |

#### DoctorListPayload

APK class: `hk.edu.vtc.mobile.network.payload.DoctorListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `doctors` | `Doctor[]` | `_doctors` |
| `drListAppDownloadReminder` | `AppDownloadReminder` | `drListAppDownloadReminder` |
| `lastUpdateTime` | `int` | `lastUpdateTime` |

#### DocumentDownloadListPayload

APK class: `hk.edu.vtc.mobile.network.payload.DocumentDownloadListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `downloadToken` | `string` | `_downloadToken` |
| `list` | `DocumentDownload[]` | `_list` |

#### ConfigurationsPayload

APK class: `hk.edu.vtc.mobile.network.payload.eCardPayload.ConfigurationsPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `configurations` | `ECardConfigItem[]` | `configurations` |
| `localizedMessage` | `MultiLangString` | `localizedMessage` |

#### ECardPayload

APK class: `hk.edu.vtc.mobile.network.payload.eCardPayload.ECardPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `userInfo` | `JsonObject` | `_userInfo` |
| `currentTime` | `string` | `currentTime` |
| `doorAccessKey` | `string` | `doorAccessKey` |
| `expiryDate` | `string` | `expiryDate` |
| `localizedMessage` | `MultiLangString` | `localizedMessage` |

#### RegisterPayload

APK class: `hk.edu.vtc.mobile.network.payload.eCardPayload.RegisterPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `accessToken` | `string` | `accessToken` |
| `isAcceptTnC` | `boolean` | `isAcceptTnC` |
| `isRegistered` | `boolean` | `isRegistered` |
| `localizedMessage` | `MultiLangString` | `localizedMessage` |
| `refreshToken` | `string` | `refreshToken` |

#### TNCPayload

APK class: `hk.edu.vtc.mobile.network.payload.eCardPayload.TNCPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `en` | `string` | `en` |
| `localizedMessage` | `MultiLangString` | `localizedMessage` |
| `sc` | `string` | `sc` |
| `tc` | `string` | `tc` |

#### TokenRefreshPayload

APK class: `hk.edu.vtc.mobile.network.payload.eCardPayload.TokenRefreshPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `accessToken` | `string` | `accessToken` |
| `localizedMessage` | `MultiLangString` | `localizedMessage` |
| `refreshToken` | `string` | `refreshToken` |

#### EnrollmentListPayload

APK class: `hk.edu.vtc.mobile.network.payload.EnrollmentListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `enrollments` | `Participant[]` | `_enrollments` |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |

#### EventReminderListPayload

APK class: `hk.edu.vtc.mobile.network.payload.EventReminderListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `reminder` | `Reminder[]` | `_reminder` |

#### ExchangeKeyInfoPayload

APK class: `hk.edu.vtc.mobile.network.payload.ExchangeKeyInfoPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `key` | `string` | `key` |

#### FavouriteContactPayload

APK class: `hk.edu.vtc.mobile.network.payload.FavouriteContactPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `favList` | `FavouriteContact[]` | `_favList` |

#### FeaturedNewsPayload

APK class: `hk.edu.vtc.mobile.network.payload.FeaturedNewsPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `featuredNews` | `News[]` | `_featuredNews` |

#### FilterOptionPayload

APK class: `hk.edu.vtc.mobile.network.payload.FilterOptionPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `options` | `OptionPayload[]` | `_options` |

#### GuestPayload

APK class: `hk.edu.vtc.mobile.network.payload.GuestPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `msg` | `string` | `msg` |
| `token` | `string` | `token` |
| `userID` | `string` | `userID` |

#### IBookingApprovalListPayload

APK class: `hk.edu.vtc.mobile.network.payload.ibookingPayload.IBookingApprovalListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `booking` | `IBookingApprovalItem[]` | `booking` |
| `msg` | `MultiLangString` | `msg` |
| `result` | `boolean` | `result` |

#### IBookingCampusPayload

APK class: `hk.edu.vtc.mobile.network.payload.ibookingPayload.IBookingCampusPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `bookingApproval` | `boolean` | `bookingApproval` |
| `msg` | `Record<string, string>` | `msg` |
| `paymentApproval` | `boolean` | `paymentApproval` |
| `region` | `IBookingCampus[]` | `region` |
| `result` | `boolean` | `result` |

#### IBookingDetailPayload

APK class: `hk.edu.vtc.mobile.network.payload.ibookingPayload.IBookingDetailPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `booking` | `IBookingDetail` | `booking` |
| `msg` | `MultiLangString` | `msg` |
| `result` | `boolean` | `result` |

#### IBookingResultPayload

APK class: `hk.edu.vtc.mobile.network.payload.ibookingPayload.IBookingResultPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `bookingId` | `string` | `bookingId` |
| `error_code` | `int` | `errorCode` |
| `msg` | `MultiLangString` | `msg` |
| `result` | `boolean` | `result` |

#### ImagePayload

APK class: `hk.edu.vtc.mobile.network.payload.ImagePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `imageID` | `string` | `imageID` |
| `url` | `string` | `url` |

#### NameCardPayload

APK class: `hk.edu.vtc.mobile.network.payload.NameCardPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `nameCardList` | `JsonObject[]` | `_nameCardList` |
| `lastUpdatedTimestamp` | `int` | `lastUpdatedTimestamp` |

#### NotificationDeletePayload

APK class: `hk.edu.vtc.mobile.network.payload.NotificationDeletePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `result` | `string` | `result` |

#### NotificationTypePayload

APK class: `hk.edu.vtc.mobile.network.payload.NotificationTypePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `types` | `NotificationType[]` | `_types` |

#### OptionPayload

APK class: `hk.edu.vtc.mobile.network.payload.OptionPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `id` | `string` | `id` |
| `name_en` | `string` | `name_en` |
| `name_sc` | `string` | `name_sc` |
| `name_tc` | `string` | `name_tc` |
| `order_no` | `string` | `order_no` |

#### PersonalEventPayload

APK class: `hk.edu.vtc.mobile.network.payload.PersonalEventPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `event` | `PersonalEvent` | `event` |
| `reminder` | `Reminder` | `reminder` |

#### PrintQuotaPayload

APK class: `hk.edu.vtc.mobile.network.payload.PrintQuotaPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `balance` | `string` | `balance` |
| `campus` | `string` | `campus` |
| `lastUpdatedTime` | `string` | `lastUpdatedTime` |

#### ResetPasswordCodePayload

APK class: `hk.edu.vtc.mobile.network.payload.ResetPasswordCodePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `method` | `string` | `method` |
| `mfaSession` | `string` | `mfaSession` |
| `mfaStatus` | `string` | `mfaStatus` |

#### ResetPasswordMethodPayload

APK class: `hk.edu.vtc.mobile.network.payload.ResetPasswordMethodPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `method` | `string` | `method` |
| `mfaMode` | `string` | `mfaMode` |

#### RssListPayload

APK class: `hk.edu.vtc.mobile.network.payload.RssListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `currentTimestamp` | `int` | `currentTimestamp` |
| `events` | `MultiLangStringWithImage` | `events` |
| `highlight` | `MultiLangStringWithImage` | `highlight` |
| `lastUpdatedTimestamp` | `int` | `lastUpdatedTimestamp` |

#### SearchRoomActivityPayload

APK class: `hk.edu.vtc.mobile.network.payload.SearchRoomActivityPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `timetable` | `SearchRoomActivity[]` | `_timetable` |

#### SearchRoomCampusPayload

APK class: `hk.edu.vtc.mobile.network.payload.SearchRoomCampusPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `campus` | `SearchRoomCampus[]` | `_campus` |

#### SearchRoomDepartmentPayload

APK class: `hk.edu.vtc.mobile.network.payload.SearchRoomDepartmentPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `department` | `SearchRoomDepartment[]` | `_department` |

#### SearchRoomPayload

APK class: `hk.edu.vtc.mobile.network.payload.SearchRoomPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `room` | `SearchRoom[]` | `_room` |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |

#### SearchRoomTimeslotPayload

APK class: `hk.edu.vtc.mobile.network.payload.SearchRoomTimeslotPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `studentSet` | `StudentSet[]` | `_studentSet` |
| `timeSlot` | `SearchRoomTimeslot[]` | `_timeSlot` |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |

#### ShareDoctorPayload

APK class: `hk.edu.vtc.mobile.network.payload.ShareDoctorPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `link` | `string` | `link` |
| `webID` | `string` | `webID` |

#### ShareEventPayload

APK class: `hk.edu.vtc.mobile.network.payload.ShareEventPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `link` | `string` | `link` |
| `webID` | `string` | `webID` |

#### SiteMapPayload

APK class: `hk.edu.vtc.mobile.network.payload.SiteMapPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `campus` | `SiteMap[]` | `_campus` |

#### StaffTimetablePayload

APK class: `hk.edu.vtc.mobile.network.payload.StaffTimetablePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `timetable` | `StaffTimetable[]` | `_timetable` |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |

#### StudyPaceModule

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceModule`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `acadYear` | `int` | `acadYear` |
| `credits` | `int` | `credits` |
| `moduleCode` | `string` | `moduleCode` |
| `moduleTitle` | `string` | `moduleTitle` |
| `moduleTitleSc` | `string` | `moduleTitleSc` |
| `moduleTitleTc` | `string` | `moduleTitleTc` |
| `moduleType` | `string` | `moduleType` |
| `qfLevel` | `string` | `qfLevel` |
| `semester` | `string` | `semester` |
| `statusMap` | `StudyPaceStatusMap` | `statusMap` |
| `studNo` | `string` | `studNo` |

#### StudyPaceNoStudyPaceListMsg

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceNoStudyPaceListMsg`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `noStudyPaceListMsg_en` | `string` | `noStudyPaceListMsg_en` |
| `noStudyPaceListMsg_sc` | `string` | `noStudyPaceListMsg_sc` |
| `noStudyPaceListMsg_tc` | `string` | `noStudyPaceListMsg_tc` |

#### StudyPaceNotOnRollMsg

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceNotOnRollMsg`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `notOnRoll_en` | `string` | `notOnRoll_en` |
| `notOnRoll_sc` | `string` | `notOnRoll_sc` |
| `notOnRoll_tc` | `string` | `notOnRoll_tc` |

#### StudyPacePayload

APK class: `hk.edu.vtc.mobile.network.payload.StudyPacePayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `awardReqList` | `RealmList<StudyPaceReq>` | `awardReqList` |
| `bridgingModuleList` | `RealmList<StudyPaceModule>` | `bridgingModuleList` |
| `bridgingReqList` | `RealmList<StudyPaceReq>` | `bridgingReqList` |
| `completeModuleList` | `RealmList<StudyPaceModule>` | `completeModuleList` |
| `coreReqList` | `RealmList<StudyPaceReq>` | `coreReqList` |
| `elecSetCompletedPercent` | `int` | `elecSetCompletedPercent` |
| `elecSetModuleList` | `RealmList<StudyPaceModule>` | `elecSetModuleList` |
| `elecSetReqList` | `RealmList<StudyPaceReq>` | `elecSetReqList` |
| `electiveCompletedPercent` | `int` | `electiveCompletedPercent` |
| `electiveModuleList` | `RealmList<StudyPaceModule>` | `electiveModuleList` |
| `electiveReqList` | `RealmList<StudyPaceReq>` | `electiveReqList` |
| `enrichmentCompletedPercent` | `int` | `enrichmentCompletedPercent` |
| `enrichmentCompletedPercentForB` | `int` | `enrichmentCompletedPercentForB` |
| `enrichmentModuleCompletedModule` | `int` | `enrichmentModuleCompletedModule` |
| `enrichmentModuleCompletedModuleForB` | `int` | `enrichmentModuleCompletedModuleForB` |
| `enrichmentModuleList` | `RealmList<StudyPaceModule>` | `enrichmentModuleList` |
| `enrichmentModuleListForB` | `RealmList<StudyPaceModule>` | `enrichmentModuleListForB` |
| `enrichmentModuleMinModuleReq` | `int` | `enrichmentModuleMinModuleReq` |
| `enrichmentModuleMinModuleReqForB` | `int` | `enrichmentModuleMinModuleReqForB` |
| `enrichmentModuleReqList` | `RealmList<StudyPaceReq>` | `enrichmentModuleReqList` |
| `enrichmentModuleReqListForB` | `RealmList<StudyPaceReq>` | `enrichmentModuleReqListForB` |
| `hasDebt` | `boolean` | `hasDebt` |
| `hasNoConfirmProgLvl` | `boolean` | `hasNoConfirmProgLvl` |
| `hasNoMajorAward` | `boolean` | `hasNoMajorAward` |
| `hasViewRightOnPaceList` | `boolean` | `hasViewRightOnPaceList` |
| `iaModuleModuleList` | `RealmList<StudyPaceModule>` | `iaModuleModuleList` |
| `iaModuleReqList` | `RealmList<StudyPaceReq>` | `iaModuleReqList` |
| `incompleteModuleList` | `RealmList<StudyPaceModule>` | `incompleteModuleList` |
| `industAttachCompletedPercent` | `int` | `industAttachCompletedPercent` |
| `isMinorAward` | `boolean` | `isMinorAward` |
| `isTHEIStudent` | `boolean` | `isTHEIStudent` |
| `noStudyPaceListMsg` | `StudyPaceNoStudyPaceListMsg` | `noStudyPaceListMsg` |
| `notOnRollMsg` | `StudyPaceNotOnRollMsg` | `notOnRollMsg` |
| `overallCompletedPercent` | `int` | `overallCompletedPercent` |
| `programInfo` | `StudyPaceProgramInfo` | `programInfo` |
| `remarks` | `StudyPaceRemarks` | `remarks` |
| `resultNotAnnounceMsg` | `StudyPaceResultNotAnnounceMsg` | `resultNotAnnounceMsg` |
| `studentHasDebtMsg` | `StudyPaceStudentHasDebtMsg` | `studentHasDebtMsg` |
| `studentRegisteredModules` | `RealmList<StudyPaceModule>` | `studentRegisteredModules` |
| `studyPaseListReleaseDate` | `long` | `studyPaseListReleaseDate` |
| `targetAward` | `string` | `targetAward` |

#### StudyPaceProgramInfo

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceProgramInfo`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `dveProgramme` | `boolean` | `dveProgramme` |
| `exitCourseTitle` | `string` | `exitCourseTitle` |
| `exitCourseTitleEn` | `string` | `exitCourseTitleEn` |
| `exitCourseTitleTc` | `string` | `exitCourseTitleTc` |
| `fulltimeProgramme` | `boolean` | `fulltimeProgramme` |
| `programmeTitleEn` | `string` | `programmeTitleEn` |
| `programmeTitleSc` | `string` | `programmeTitleSc` |
| `programmeTitleTc` | `string` | `programmeTitleTc` |

#### StudyPaceRemarks

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceRemarks`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `remark_en` | `string` | `remark_en` |
| `remark_sc` | `string` | `remark_sc` |
| `remark_tc` | `string` | `remark_tc` |

#### StudyPaceReq

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceReq`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `acadYear` | `int` | `acadYear` |
| `completedPercent` | `int` | `completedPercent` |
| `creditCompleted` | `int` | `creditCompleted` |
| `deliveryMode` | `string` | `deliveryMode` |
| `elecSetGroup` | `string` | `elecSetGroup` |
| `elecSetGroupDesc` | `string` | `elecSetGroupDesc` |
| `garType` | `string` | `garType` |
| `joinSemester` | `string` | `joinSemester` |
| `joinYear` | `int` | `joinYear` |
| `launchVersion` | `string` | `launchVersion` |
| `launchYear` | `int` | `launchYear` |
| `majorAward` | `string` | `majorAward` |
| `majorAwardVersion` | `string` | `majorAwardVersion` |
| `minCreditReq` | `int` | `minCreditReq` |
| `moduleType` | `string` | `moduleType` |
| `moduleTypeDesc` | `string` | `moduleTypeDesc` |
| `progStructCode` | `string` | `progStructCode` |
| `qfLevel` | `string` | `qfLevel` |
| `qfLevelDesc` | `string` | `qfLevelDesc` |
| `reqType` | `string` | `reqType` |
| `semester` | `string` | `semester` |
| `studNo` | `string` | `studNo` |

#### StudyPaceResponse

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceResponse`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `award` | `StudyPacePayload[]` | `award` |
| `awardReqList` | `RealmList<StudyPaceReq>` | `awardReqList` |
| `bridgingModuleList` | `RealmList<StudyPaceModule>` | `bridgingModuleList` |
| `bridgingReqList` | `RealmList<StudyPaceReq>` | `bridgingReqList` |
| `completeModuleList` | `RealmList<StudyPaceModule>` | `completeModuleList` |
| `coreReqList` | `RealmList<StudyPaceReq>` | `coreReqList` |
| `elecSetCompletedPercent` | `int` | `elecSetCompletedPercent` |
| `elecSetModuleList` | `RealmList<StudyPaceModule>` | `elecSetModuleList` |
| `elecSetReqList` | `RealmList<StudyPaceReq>` | `elecSetReqList` |
| `electiveCompletedPercent` | `int` | `electiveCompletedPercent` |
| `electiveModuleList` | `RealmList<StudyPaceModule>` | `electiveModuleList` |
| `electiveReqList` | `RealmList<StudyPaceReq>` | `electiveReqList` |
| `enrichmentCompletedPercent` | `int` | `enrichmentCompletedPercent` |
| `enrichmentCompletedPercentForB` | `int` | `enrichmentCompletedPercentForB` |
| `enrichmentModuleCompletedModule` | `int` | `enrichmentModuleCompletedModule` |
| `enrichmentModuleCompletedModuleForB` | `int` | `enrichmentModuleCompletedModuleForB` |
| `enrichmentModuleList` | `RealmList<StudyPaceModule>` | `enrichmentModuleList` |
| `enrichmentModuleListForB` | `RealmList<StudyPaceModule>` | `enrichmentModuleListForB` |
| `enrichmentModuleMinModuleReq` | `int` | `enrichmentModuleMinModuleReq` |
| `enrichmentModuleMinModuleReqForB` | `int` | `enrichmentModuleMinModuleReqForB` |
| `enrichmentModuleReqList` | `RealmList<StudyPaceReq>` | `enrichmentModuleReqList` |
| `enrichmentModuleReqListForB` | `RealmList<StudyPaceReq>` | `enrichmentModuleReqListForB` |
| `hasDebt` | `boolean` | `hasDebt` |
| `hasNoConfirmProgLvl` | `boolean` | `hasNoConfirmProgLvl` |
| `hasNoMajorAward` | `boolean` | `hasNoMajorAward` |
| `hasViewRightOnPaceList` | `boolean` | `hasViewRightOnPaceList` |
| `iaModuleModuleList` | `RealmList<StudyPaceModule>` | `iaModuleModuleList` |
| `iaModuleReqList` | `RealmList<StudyPaceReq>` | `iaModuleReqList` |
| `incompleteModuleList` | `RealmList<StudyPaceModule>` | `incompleteModuleList` |
| `industAttachCompletedPercent` | `int` | `industAttachCompletedPercent` |
| `isTHEIStudent` | `boolean` | `isTHEIStudent` |
| `noStudyPaceListMsg` | `StudyPaceNoStudyPaceListMsg` | `noStudyPaceListMsg` |
| `notOnRollMsg` | `StudyPaceNotOnRollMsg` | `notOnRollMsg` |
| `overallCompletedPercent` | `int` | `overallCompletedPercent` |
| `programInfo` | `StudyPaceProgramInfo` | `programInfo` |
| `remarks` | `StudyPaceRemarks` | `remarks` |
| `resultNotAnnounceMsg` | `StudyPaceResultNotAnnounceMsg` | `resultNotAnnounceMsg` |
| `studentHasDebtMsg` | `StudyPaceStudentHasDebtMsg` | `studentHasDebtMsg` |
| `studentRegisteredModules` | `RealmList<StudyPaceModule>` | `studentRegisteredModules` |
| `studyPaseListReleaseDate` | `long` | `studyPaseListReleaseDate` |
| `targetAward` | `string` | `targetAward` |

#### StudyPaceResultNotAnnounceMsg

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceResultNotAnnounceMsg`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `resultNotAnnounce_en` | `string` | `resultNotAnnounce_en` |
| `resultNotAnnounce_sc` | `string` | `resultNotAnnounce_sc` |
| `resultNotAnnounce_tc` | `string` | `resultNotAnnounce_tc` |

#### StudyPaceStatusMap

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceStatusMap`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `status_en` | `string` | `status_en` |
| `status_sc` | `string` | `status_sc` |
| `status_tc` | `string` | `status_tc` |

#### StudyPaceStudentHasDebtMsg

APK class: `hk.edu.vtc.mobile.network.payload.StudyPaceStudentHasDebtMsg`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `studentHasDebtMsg_en` | `string` | `studentHasDebtMsg_en` |
| `studentHasDebtMsg_sc` | `string` | `studentHasDebtMsg_sc` |
| `studentHasDebtMsg_tc` | `string` | `studentHasDebtMsg_tc` |

#### TimeTableListPayload

APK class: `hk.edu.vtc.mobile.network.payload.TimeTableListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `exam` | `Data<Exam>` | `_exam` |
| `holiday` | `Data<Holiday>` | `_holiday` |
| `personal` | `Data<PersonalEvent>` | `_personal` |
| `timetable` | `Data<Class>` | `_timetable` |
| `currentTimestamp` | `int` | `currentTimestamp` |
| `isDropDB` | `boolean` | `isDropDB` |
| `lastUpdatedTimestamp` | `long` | `lastUpdatedTimestamp` |

#### UserInfoPayload

APK class: `hk.edu.vtc.mobile.network.payload.UserInfoPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `email` | `string` | `email` |
| `name` | `string` | `name` |
| `site` | `string` | `site` |
| `userImageID` | `string` | `userImageID` |
| `userType` | `int` | `userType` |
| `vtcID` | `string` | `vtcID` |

#### UserPayload

APK class: `hk.edu.vtc.mobile.network.payload.UserPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `LanguagePreference` | `string` | `LanguagePreference` |
| `LastAccessTime` | `int` | `LastAccessTime` |
| `RegistrationDate` | `int` | `RegistrationDate` |
| `email` | `string` | `email` |
| `id` | `string` | `id` |
| `idToken` | `string` | `idToken` |
| `msg` | `string` | `msg` |
| `name` | `string` | `name` |
| `site` | `string` | `site` |
| `token` | `string` | `token` |
| `userImageID` | `string` | `userImageID` |
| `userType` | `int` | `userType` |
| `vtcID` | `string` | `vtcID` |

#### VersionPayload

APK class: `hk.edu.vtc.mobile.network.payload.VersionPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `updateurl` | `string` | `updateurl` |
| `version` | `int` | `version` |
| `versionForUpdateReminder` | `int` | `versionForUpdateReminder` |

#### WorkspaceActivityEnrollResultPayload

APK class: `hk.edu.vtc.mobile.network.payload.WorkspaceActivityEnrollResultPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `result` | `boolean` | `result` |

#### WorkspaceActivityListPayload

APK class: `hk.edu.vtc.mobile.network.payload.WorkspaceActivityListPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `activities` | `WorkspaceActivity[]` | `_activities` |

#### WorkspaceActivitySearchOptionPayload

APK class: `hk.edu.vtc.mobile.network.payload.WorkspaceActivitySearchOptionPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `category` | `WorkspaceActivitySearchOption[]` | `_category` |
| `level` | `WorkspaceActivitySearchOption[]` | `_level` |
| `ou` | `WorkspaceActivitySearchOption[]` | `_ou` |
| `subCategory` | `WorkspaceActivitySearchOption[]` | `_subCategory` |

#### YearOfGraduationPayload

APK class: `hk.edu.vtc.mobile.network.payload.YearOfGraduationPayload`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `years` | `string[]` | `_years` |

#### VtcResponse<T>

APK class: `hk.edu.vtc.mobile.network.VtcResponse`

| JSON property | Declared type | JVM field |
| --- | --- | --- |
| `errorCode` | `int` | `errorCode` |
| `errorMsg` | `string` | `errorMsg` |
| `isSuccess` | `boolean` | `isSuccess` |
| `payload` | `T` | `payload` |

