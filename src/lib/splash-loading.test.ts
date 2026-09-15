import { describe, expect, test } from "bun:test";
import { splashProgress } from "./splash-loading";

describe("splash loading progress", () => {
	test("moves through the session, workspace and slow stages without reaching 100", () => {
		expect(splashProgress(0)).toEqual({ stage: "session", percent: 10 });
		expect(splashProgress(1_000).stage).toBe("workspace");
		expect(splashProgress(3_000).stage).toBe("workspace");
		expect(splashProgress(6_000).stage).toBe("slow");
		expect(splashProgress(60_000).percent).toBe(92);
	});

	test("clamps invalid elapsed times to the initial state", () => {
		expect(splashProgress(-1)).toEqual({ stage: "session", percent: 10 });
		expect(splashProgress(Number.NaN)).toEqual({ stage: "session", percent: 10 });
	});
});
