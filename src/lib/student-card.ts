import type { EcardUserInfo } from "../../vtc-api/src/types/ecardRegister";

const STUDENT_CARD_BACKGROUNDS = {
	apl: "apl.webp", cci: "cci.webp", cci_ici: "cci_ici.webp", hkdi: "hkdi.webp",
	hkiit: "hkiit.png", hti: "hti.webp", ici: "ici.png", ive: "ive.webp",
	msti: "msti.webp", pa: "pa.webp", peak: "peak.webp", sbi: "sbi.webp",
	thei: "thei.png", wmg: "wmg.webp", yc: "yc.webp", yci: "yci.webp",
} as const;

export type StudentCardBrand = keyof typeof STUDENT_CARD_BACKGROUNDS | "vtc";

export function studentCardBackground(brand: StudentCardBrand): string | null {
	return brand === "vtc" ? null : `/campus/student-cards/${STUDENT_CARD_BACKGROUNDS[brand]}`;
}

export type StudentCardView = {
	englishName: string;
	chineseName: string;
	programme: string;
	programmeCode: string;
	studentNumber: string;
	expiryDate: string;
	deliveryMode: string;
	photoSrc: string | null;
	barcodeValue: string;
	barcodeCaption: string;
	brand: StudentCardBrand;
};

type StudentCardFields = Pick<
	EcardUserInfo,
	| "surname"
	| "otherName"
	| "cName"
	| "progStructCode"
	| "progStructCodeDesc"
	| "deliveryMode"
	| "expiryDate"
	| "libraryNumber"
	| "studNo"
	| "operatingCampus"
> & {
	photoStr?: string;
};

export function formatEnglishCardName(surname: string, otherName: string): string {
	const last = surname.trim().toUpperCase();
	const rest = otherName.trim();
	return [last, rest].filter(Boolean).join(" ");
}

export function formatDeliveryMode(mode: string): string {
	const normalized = mode.trim().toLowerCase().replace(/[_-]+/g, " ");
	if (normalized === "ft" || normalized === "full time") return "Full Time";
	if (normalized === "pt" || normalized === "part time") return "Part Time";
	return mode.trim();
}

export function campusBrandFrom(
	operatingCampus: string,
	programmeCode = "",
	programmeName = "",
): StudentCardBrand {
	const campus = operatingCampus.trim().toLowerCase();
	const code = /^\d+$/.test(campus) ? Number(campus) : NaN;
	// Campus-to-drawable mapping from VTC@HK 4.0.16 ECardPagerAdapter.
	if (code >= 1001 && code <= 1009) return "ive";
	if ((code >= 2001 && code <= 2003) || (code >= 2005 && code <= 2009) || code === 2011) return "yc";
	if (code === 2012) return "yci";
	if (code === 2004 || (code >= 4002 && code <= 4004) || code === 4007 || (code >= 4011 && code <= 4017)) return "pa";
	if (code === 3001) return "hkdi";
	if (code === 4001) return "cci";
	if ([4005, 4021, 4022, 4027].includes(code)) return "hti";
	if (code === 4006) return "msti";
	if ([4008, 4009, 4018, 4019, 4020, 99001, 99002].includes(code)) return "apl";
	if (code === 4201) return "cci_ici";
	if (code >= 4023 && code <= 4026) return "ici";
	if (code === 5001) return "thei";
	if ([6001, 6003, 6004, 6006, 6007, 6009].includes(code)) return "hkiit";
	if (code === 99999) return "sbi";
	for (const brand of Object.keys(STUDENT_CARD_BACKGROUNDS)) {
		if (campus === brand || campus.startsWith(`${brand}-`)) {
			if (brand in STUDENT_CARD_BACKGROUNDS) return brand as keyof typeof STUDENT_CARD_BACKGROUNDS;
		}
	}
	if (/hkiit/i.test(`${operatingCampus} ${programmeName}`)) return "hkiit";
	if (!campus && /^IT\d/i.test(programmeCode.trim())) return "hkiit";
	return "vtc";
}

export function photoDataUrl(photoStr?: string): string | null {
	const value = photoStr?.trim();
	if (!value) return null;
	if (value.startsWith("data:")) return value;
	return `data:image/jpeg;base64,${value}`;
}

export function libraryBarcodeValue(libraryNumber: string): string {
	return libraryNumber.replace(/\s+/g, "");
}

/**
 * Human-readable barcode line from e-card fields only.
 * When `libraryNumber` wraps `studNo`, split prefix / student / trailing check, then programme code.
 */
export function libraryBarcodeCaption(
	libraryNumber: string,
	studNo: string,
	progStructCode = "",
): string {
	const library = libraryBarcodeValue(libraryNumber);
	const student = studNo.replace(/\s+/g, "");
	const programme = progStructCode.trim();
	if (student && library.includes(student)) {
		const index = library.indexOf(student);
		const prefix = library.slice(0, index);
		const trailer = library.slice(index + student.length);
		return [prefix, student, trailer, programme].filter(Boolean).join("  ");
	}
	return [library, programme].filter(Boolean).join("  ");
}

export function buildStudentCardView(
	userInfo: Pick<StudentCardFields, keyof StudentCardFields>,
): StudentCardView {
	return {
		englishName: formatEnglishCardName(userInfo.surname, userInfo.otherName),
		chineseName: userInfo.cName.trim(),
		programme: userInfo.progStructCodeDesc.trim(),
		programmeCode: userInfo.progStructCode.trim(),
		studentNumber: userInfo.studNo.trim(),
		expiryDate: userInfo.expiryDate.trim(),
		deliveryMode: formatDeliveryMode(userInfo.deliveryMode),
		photoSrc: photoDataUrl(userInfo.photoStr),
		barcodeValue: libraryBarcodeValue(userInfo.libraryNumber),
		barcodeCaption: libraryBarcodeCaption(
			userInfo.libraryNumber,
			userInfo.studNo,
		),
		brand: campusBrandFrom(
			userInfo.operatingCampus,
			userInfo.progStructCode,
			userInfo.progStructCodeDesc,
		),
	};
}
