import { createCipheriv } from "node:crypto";

// The Android app uses local campus time for its 2000-01-01 epoch.
const EPOCH_MS = Date.parse("2000-01-01T00:00:00+08:00");

export function generateStudentCardQr(key: string, cardId: string, currentTime: string): string {
	if (!/^(?:[0-9a-f]{32}|[0-9a-f]{48}|[0-9a-f]{64})$/i.test(key) || !/^[0-9a-f]{1,14}$/i.test(cardId)) {
		throw new Error("Invalid e-card material");
	}
	const milliseconds = Date.parse(currentTime);
	const seconds = Math.floor((milliseconds - EPOCH_MS) / 1000);
	if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(currentTime) || !Number.isFinite(seconds) || seconds < 10 || seconds > 0x7fffffff - 70) {
		throw new Error("Invalid e-card time");
	}
	// VTC@HK 4.0.16: S + seven card bytes + two big-endian seconds, with 10s tolerance.
	const block = Buffer.alloc(16);
	block[0] = 0x53;
	Buffer.from(cardId.padStart(14, "0"), "hex").copy(block, 1);
	block.writeUInt32BE(seconds - 10, 8);
	block.writeUInt32BE(seconds + 70, 12);
	const keyBytes = Buffer.from(key, "hex");
	const cipher = createCipheriv(`aes-${keyBytes.length * 8}-ecb`, keyBytes, null);
	cipher.setAutoPadding(false);
	return Buffer.concat([cipher.update(block), cipher.final()]).toString("hex");
}
