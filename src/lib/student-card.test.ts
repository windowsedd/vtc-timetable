import { describe, expect, test } from "bun:test";
import {
	buildStudentCardView,
	campusBrandFrom,
	formatDeliveryMode,
	formatEnglishCardName,
	libraryBarcodeCaption,
	photoDataUrl,
	studentCardBackground,
} from "./student-card";

describe("student card formatting", () => {
	test("English name is SURNAME then given names", () => {
		expect(formatEnglishCardName("Chow", "Kin Fung")).toBe("CHOW Kin Fung");
	});

	test("delivery mode expands FT/PT", () => {
		expect(formatDeliveryMode("FT")).toBe("Full Time");
		expect(formatDeliveryMode("full-time")).toBe("Full Time");
		expect(formatDeliveryMode("PT")).toBe("Part Time");
	});

	test("explicit campus branding takes priority over programme guesses", () => {
		expect(campusBrandFrom("HKIIT-KT")).toBe("hkiit");
		expect(campusBrandFrom("IVE-CW", "IT114105")).toBe("ive");
		expect(campusBrandFrom("YC-KC", "IT114105")).toBe("yc");
		expect(campusBrandFrom("", "IT114105")).toBe("hkiit");
		expect(campusBrandFrom("unrecognized")).toBe("vtc");
		expect(campusBrandFrom("2001.5")).toBe("vtc");
	});

	test("numeric campus codes select the APK's YC and YCI templates", () => {
		for (const campus of ["2001", "2002", "2003", "2005", "2006", "2007", "2008", "2009", "2011"]) {
			expect(campusBrandFrom(campus, "IT114105")).toBe("yc");
		}
		expect(campusBrandFrom("2012")).toBe("yci");
		expect(campusBrandFrom("YCI")).toBe("yci");
		expect(campusBrandFrom("2004")).toBe("pa");
		expect(studentCardBackground(campusBrandFrom("2001"))).toBe("/campus/student-cards/yc.webp");
		expect(studentCardBackground(campusBrandFrom("2012"))).toBe("/campus/student-cards/yci.webp");
		expect(studentCardBackground(campusBrandFrom("unknown"))).toBeNull();
	});

	test("other campus codes select the matching bundled backgrounds", () => {
		for (const [campus, brand] of [["1001", "ive"], ["1009", "ive"], ["3001", "hkdi"], ["6001", "hkiit"], ["5001", "thei"], ["4001", "cci"], ["4201", "cci_ici"], ["4023", "ici"], ["4006", "msti"], ["99999", "sbi"]]) {
			expect(campusBrandFrom(campus)).toBe(brand);
		}
	});

	test("photo becomes a JPEG data URL", () => {
		expect(photoDataUrl("abc")).toBe("data:image/jpeg;base64,abc");
		expect(photoDataUrl("data:image/png;base64,xx")).toBe("data:image/png;base64,xx");
		expect(photoDataUrl("")).toBeNull();
	});

	test("barcode caption splits whatever prefix the e-card library number uses", () => {
		expect(libraryBarcodeCaption("21882600833491", "260083349", "IT114105")).toBe(
			"2188  260083349  1  IT114105",
		);
		expect(libraryBarcodeCaption("99992500832355", "250083235", "IT114105")).toBe(
			"9999  250083235  5  IT114105",
		);
	});

	test("barcode caption follows raw e-card values when studNo is not inside libraryNumber", () => {
		expect(libraryBarcodeCaption("ABC123", "250083235", "IT114105")).toBe("ABC123  IT114105");
	});

	test("buildStudentCardView maps e-card fields onto the plastic card", () => {
		const view = buildStudentCardView({
			surname: "Chow",
			otherName: "Kin Fung",
			cName: "周健鋒",
			progStructCode: "IT114105",
			progStructCodeDesc: "Higher Diploma in Software Engineering",
			deliveryMode: "FT",
			expiryDate: "08.2028",
			libraryNumber: "21882600833491",
			studNo: "260083349",
			operatingCampus: "HKIIT-KT",
			photoStr: "PHOTO",
		});
		expect(view.englishName).toBe("CHOW Kin Fung");
		expect(view.chineseName).toBe("周健鋒");
		expect(view.deliveryMode).toBe("Full Time");
		expect(view.barcodeValue).toBe("21882600833491");
		expect(view.barcodeCaption).toBe("2188  260083349  1");
		expect(view.programmeCode).toBe("IT114105");
		expect(view.studentNumber).toBe("260083349");
		expect(view.brand).toBe("hkiit");
		expect(view.photoSrc).toBe("data:image/jpeg;base64,PHOTO");
	});
});
