import { expect, test } from "bun:test";
import { code39Bars } from "./barcode39";

test("Code 39 encodes start, data, stop and narrow inter-character gaps", () => {
	const graphic = code39Bars("0");
	// ZXing: asterisk 0x094, zero 0x034; wide elements are twice narrow ones.
	const bits = "10010110110101010011011010100101101101";
	const reconstructed = Array.from({ length: graphic.moduleCount }, (_, x) =>
		graphic.bars.some((bar) => x >= bar.x && x < bar.x + bar.width) ? "1" : "0",
	).join("");
	expect(reconstructed).toBe(bits);
});

test("Code 39 rejects empty and unsupported values instead of altering library data", () => {
	for (const value of ["", "abc", "12*34", "學生證"]) {
		expect(() => code39Bars(value)).toThrow();
	}
});
