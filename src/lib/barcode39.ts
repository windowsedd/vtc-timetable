const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
// Code 39 wide-element masks, in alphabet order (ZXing Code39Reader).
const PATTERNS = [
	52, 289, 97, 352, 49, 304, 112, 37, 292, 100, 265, 73, 328, 25, 280,
	88, 13, 268, 76, 28, 259, 67, 322, 19, 274, 82, 7, 262, 70, 22,
	385, 193, 448, 145, 400, 208, 133, 388, 196, 168, 162, 138, 42,
];

export function code39Bars(text: string): { bars: { x: number; width: number }[]; moduleCount: number } {
	if (!text || text.length > 80 || [...text].some((character) => !ALPHABET.includes(character))) {
		throw new Error("Invalid Code 39 value");
	}
	const patterns = [148, ...[...text].map((character) => PATTERNS[ALPHABET.indexOf(character)]), 148];
	const bars: { x: number; width: number }[] = [];
	let x = 0;
	for (const [index, pattern] of patterns.entries()) {
		if (index > 0) x += 1;
		for (let element = 0; element < 9; element += 1) {
			const width = (pattern & (1 << (8 - element))) ? 2 : 1;
			if (element % 2 === 0) bars.push({ x, width });
			x += width;
		}
	}
	return { bars, moduleCount: x };
}
