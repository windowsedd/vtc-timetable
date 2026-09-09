import type { MultiLangString, VtcResponse } from "./common";

/**
 * Responses from the e-card terms endpoints:
 * - GET https://ecard-api.vtc.edu.hk/v1/tnc/{role} (no auth)
 * - POST https://ecard-api.vtc.edu.hk/v1/tnc/accept (Authorization = VTC mobile token)
 */
export type ecardTnc = VtcResponse<EcardTncPayload | null>;

export interface EcardTncPayload {
	/** Terms text per language; the accept response echoes the accepted text. */
	en: string;
	tc: string;
	sc: string;
	localizedMessage?: MultiLangString;
}
