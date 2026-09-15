"use client";

import { getStudentCardQr } from "@/app/actions/student-card-qr";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function StudentCardQr() {
	const t = useTranslations("settings");
	const [open, setOpen] = useState(false);
	const [attempt, setAttempt] = useState(0);
	return (
		<section className="student-card-qr">
			<button type="button" className="student-card-qr-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
				{open ? t("studentCardQrHide") : t("studentCardQrShow")}
			</button>
			{open && <StudentCardQrContent key={attempt} onRetry={() => setAttempt((value) => value + 1)} />}
		</section>
	);
}

function StudentCardQrContent({ onRetry }: { onRetry: () => void }) {
	const t = useTranslations("settings");
	const [image, setImage] = useState<string | null>(null);
	const [seconds, setSeconds] = useState(0);
	const [error, setError] = useState(false);

	useEffect(() => {
		let generation = 0;
		let timer: ReturnType<typeof setInterval> | undefined;
		let disposed = false;

		function clear() {
			generation += 1;
			clearInterval(timer);
			setImage(null);
			setSeconds(0);
		}

		async function refresh() {
			clear();
			if (disposed || document.hidden) return;
			const request = generation;
			setError(false);
			const startedAt = performance.now();
			try {
				const result = await getStudentCardQr();
				if (disposed || request !== generation || document.hidden) return;
				if (!result.success) {
					setError(true);
					return;
				}
				// Subtract the whole request duration conservatively, including transit time.
				const remaining = result.remainingMs - (performance.now() - startedAt);
				if (remaining <= 0) {
					setError(true);
					return;
				}
				const deadline = Date.now() + remaining;
				const monotonicDeadline = performance.now() + remaining;
				setImage(result.image);
				setSeconds(Math.ceil(remaining / 1000));
				timer = setInterval(() => {
					const left = Math.min(deadline - Date.now(), monotonicDeadline - performance.now());
					if (left <= 0) void refresh();
					else setSeconds(Math.ceil(left / 1000));
				}, 250);
			} catch {
				if (!disposed && request === generation) setError(true);
			}
		}

		function visibilityChanged() {
			if (document.hidden) clear();
			else void refresh();
		}
		void Promise.resolve().then(refresh);
		document.addEventListener("visibilitychange", visibilityChanged);
		return () => {
			disposed = true;
			generation += 1;
			clearInterval(timer);
			document.removeEventListener("visibilitychange", visibilityChanged);
		};
	}, []);

	return (
		<div className="student-card-qr-content">
			{image && <img src={image} width={320} height={320} alt={t("studentCardQrAlt")} />}
			{error ? (
				<div role="alert">
					<p>{t("studentCardQrUnavailable")}</p>
					<button type="button" className="student-card-qr-toggle" onClick={onRetry}>{t("studentCardQrRetry")}</button>
				</div>
			) : (
				<p>{image ? t("studentCardQrCountdown", { seconds }) : t("studentCardQrLoading")}</p>
			)}
		</div>
	);
}
