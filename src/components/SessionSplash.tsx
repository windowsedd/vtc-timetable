"use client";

import { splashProgress } from "@/lib/splash-loading";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface SessionSplashProps {
	/** What this route is waiting for, when it knows better than the stages. */
	label?: string;
}

// Full-screen placeholder shown while the auth session resolves, and while a
// route's own data loads. Rendered identically on the server and first client
// paint, so neither the landing page nor the app shell flashes for the "wrong"
// audience.
export default function SessionSplash({ label }: SessionSplashProps) {
	const t = useTranslations("common");
	const [elapsedMs, setElapsedMs] = useState(0);

	useEffect(() => {
		const startedAt = Date.now();
		const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
		return () => clearInterval(timer);
	}, []);

	const progress = splashProgress(elapsedMs);
	const seconds = Math.floor(elapsedMs / 1_000);

	return (
		<div className="h-screen flex items-center justify-center bg-[var(--background)]">
			<div className="session-splash">
				<div className="session-splash-mark">
					<span className="session-splash-ring" aria-hidden="true" />
					{/* A plain <img>: next/image throws while server-rendering this,
					    and the splash is the only thing SSR renders on every route
					    that waits for a session. The mark is an SVG, so there is
					    nothing for the optimiser to do anyway. */}
					<img
						src="/vtc-timetable.svg"
						alt=""
						width={80}
						height={80}
						fetchPriority="high"
						className="session-splash-logo"
					/>
				</div>

				<p className="session-splash-title">VTC Timetable</p>
				{/* Only the stage line is live; the seconds tick too fast to announce. */}
				<output className="session-splash-status">{label ?? t(`splashStage.${progress.stage}`)}</output>

				<div
					className="session-splash-progress"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progress.percent}
					aria-label={label ?? t("loading")}
				>
					<span style={{ width: `${progress.percent}%` }} />
				</div>

				<p className="session-splash-elapsed" aria-hidden="true">
					{t("loadingElapsed", { seconds })}
				</p>
			</div>
		</div>
	);
}
