/**
 * What the full-page splash says while the app boots. There is nothing to
 * measure — the session check and the route chunk report no progress — so the
 * stages are read off elapsed time, and the bar never reaches 100: it is
 * dismissed by the page it covers, not by counting to the end.
 *
 * Same shape as `studentCardLoadingProgress`, which drives the e-card wait.
 */
export type SplashStage = "session" | "workspace" | "slow";

export interface SplashProgress {
	stage: SplashStage;
	percent: number;
}

export function splashProgress(elapsedMs: number): SplashProgress {
	const elapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;

	if (elapsed < 800) {
		return { stage: "session", percent: Math.min(28, 10 + Math.floor(elapsed / 40)) };
	}

	if (elapsed < 5_000) {
		return { stage: "workspace", percent: Math.min(70, 30 + Math.floor((elapsed - 800) / 70)) };
	}

	return { stage: "slow", percent: Math.min(92, 72 + Math.floor((elapsed - 5_000) / 600)) };
}
