/** Wrapper used by every mobile and e-card endpoint (VtcResponse in the app). */
export interface VtcResponse<T> {
	isSuccess: boolean;
	errorCode?: number;
	errorMsg?: string | null;
	payload: T;
}

/** Localized string bundle returned alongside most user-facing messages. */
export interface MultiLangString {
	en: string;
	tc: string;
	sc: string;
}
