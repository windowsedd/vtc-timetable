"use client";

import { getStudentCard } from "@/app/actions/user";
import StudentCardQr from "@/components/StudentCardQr";
import { code39Bars } from "@/lib/barcode39";
import { studentCardBackground, type StudentCardView } from "@/lib/student-card";
import {
	studentCardLoadingProgress,
	type StudentCardLoadingStage,
} from "@/lib/student-card-loading";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const LOADING_STAGES: StudentCardLoadingStage[] = ["account", "ecard", "details"];

function LibraryBarcode({ value, unavailableLabel }: { value: string; unavailableLabel: string }) {
	const graphic = useMemo(() => {
		try {
			return code39Bars(value);
		} catch {
			return null;
		}
	}, [value]);

	if (!graphic) return <span className="student-card-barcode-error">{unavailableLabel}</span>;

	const quiet = 10;
	const width = graphic.moduleCount + quiet * 2;
	return (
		<svg
			className="student-card-barcode-svg"
			viewBox={`0 0 ${width} 48`}
			preserveAspectRatio="none"
			aria-hidden
		>
			{graphic.bars.map((bar) => (
				<rect
					key={bar.x}
					x={quiet + bar.x}
					y={0}
					width={bar.width}
					height={48}
					fill="#111111"
				/>
			))}
		</svg>
	);
}

export function StudentCardFace({
	card,
	validThroughLabel,
	photoAlt,
	showCardLabel,
	hideCardLabel,
	barcodeUnavailableLabel,
	studentNumberLabel,
	conceal = false,
}: {
	card: StudentCardView;
	validThroughLabel: string;
	photoAlt: string;
	showCardLabel: string;
	hideCardLabel: string;
	barcodeUnavailableLabel: string;
	studentNumberLabel: string;
	conceal?: boolean;
}) {
	const [revealed, setRevealed] = useState(false);
	const background = studentCardBackground(card.brand);
	const showPersonalDetails = revealed && !conceal;

	useEffect(() => {
		if (conceal) setRevealed(false);
	}, [conceal]);

	return (
		<>
		<div className="student-card-spoiler student-card-personal-details">
			<div className={`student-card student-card--${card.brand}`}>
				{background ? <img className="student-card-background" src={background} alt="" /> : <span className="student-card-generic-brand">VTC</span>}
				<div className="student-card-photo-frame">
					{showPersonalDetails && card.photoSrc && <img src={card.photoSrc} alt={photoAlt} />}
				</div>
				{showPersonalDetails && <p className="student-card-name-en">{card.englishName}</p>}
				{showPersonalDetails && card.chineseName && <p className="student-card-name-zh">{card.chineseName}</p>}
				{card.programme && <p className="student-card-programme">{card.programme}</p>}
				{card.brand === "thei" ? (
					<p className="student-card-number">{studentNumberLabel} {card.studentNumber}</p>
				) : (
					<>
						<p className="student-card-valid">
							<span>{validThroughLabel}</span>
							<strong>{card.expiryDate}{card.deliveryMode ? ` ${card.deliveryMode}` : ""}</strong>
						</p>
						{card.barcodeValue && (
							<div className="student-card-barcode">
								<p><span>{card.barcodeCaption}</span><span>{card.programmeCode}</span></p>
								<LibraryBarcode value={card.barcodeValue} unavailableLabel={barcodeUnavailableLabel} />
							</div>
						)}
					</>
				)}
			</div>
		</div>
		<button
			type="button"
			className="student-card-qr-toggle student-card-personal-toggle"
			onClick={() => setRevealed((open) => !open)}
			aria-pressed={showPersonalDetails}
			disabled={conceal}
		>
			{showPersonalDetails ? hideCardLabel : showCardLabel}
		</button>
		</>
	);
}

export default function StudentCardPanel({
	enabled,
	conceal = false,
}: {
	enabled: boolean;
	conceal?: boolean;
}) {
	const t = useTranslations("settings");
	const [card, setCard] = useState<StudentCardView | null>(null);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);
	const [elapsedMs, setElapsedMs] = useState(0);
	const progress = studentCardLoadingProgress(elapsedMs);

	useEffect(() => {
		if (!enabled) {
			setLoading(false);
			setCard(null);
			setError(null);
			setElapsedMs(0);
			return;
		}

		let cancelled = false;
		const startedAt = Date.now();
		setLoading(true);
		setError(null);
		setElapsedMs(0);
		const timer = window.setInterval(() => {
			setElapsedMs(Date.now() - startedAt);
		}, 100);

		void getStudentCard()
			.then((result) => {
				if (cancelled) return;
				window.clearInterval(timer);
				if (result.success && result.data) {
					setCard(result.data);
					setError(null);
				} else {
					setCard(null);
					setError(
						result.reason === "no_token"
							? t("studentCardNeedSync")
							: result.error || t("studentCardUnavailable"),
					);
				}
				setLoading(false);
			})
			.catch(() => {
				if (cancelled) return;
				window.clearInterval(timer);
				setCard(null);
				setError(t("studentCardUnavailable"));
				setLoading(false);
			});

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [enabled, t]);

	if (!enabled) {
		return <p className="student-card-status">{t("studentCardNeedSync")}</p>;
	}

	if (loading) {
		const activeStageIndex = LOADING_STAGES.indexOf(progress.stage);
		const elapsedSeconds = Math.floor(elapsedMs / 1_000);

		return (
			<div className="student-card-loading" aria-busy="true">
				<div className="student-card student-card-skeleton" aria-hidden />
				<div className="student-card-loading-details">
					<div className="student-card-loading-heading" aria-live="polite">
						<div>
							<p>{t("studentCardLoading")}</p>
							<strong>{t(`studentCardLoadingStage.${progress.stage}`)}</strong>
						</div>
						<span>{t("studentCardLoadingElapsed", { seconds: elapsedSeconds })}</span>
					</div>
					<div
						className="student-card-loading-progress"
						role="progressbar"
						aria-label={t("studentCardLoading")}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={progress.percent}
					>
						<span style={{ width: `${progress.percent}%` }} />
					</div>
					<ol className="student-card-loading-steps">
						{LOADING_STAGES.map((stage, index) => (
							<li
								key={stage}
								className={index === activeStageIndex ? "is-active" : index < activeStageIndex ? "is-past" : ""}
								aria-current={index === activeStageIndex ? "step" : undefined}
							>
								<span>{index + 1}</span>
								{t(`studentCardLoadingStep.${stage}`)}
							</li>
						))}
					</ol>
					<p className="student-card-loading-note">{t("studentCardLoadingEstimate")}</p>
				</div>
			</div>
		);
	}

	if (error || !card) {
		return <p className="student-card-status student-card-status-error">{error || t("studentCardUnavailable")}</p>;
	}

	return (
		<>
			<StudentCardFace
				card={card}
				validThroughLabel={t("studentCardValidThrough")}
				photoAlt={t("studentCardPhotoAlt")}
				showCardLabel={t("studentCardShow")}
				hideCardLabel={t("studentCardHide")}
				barcodeUnavailableLabel={t("studentCardBarcodeUnavailable")}
				studentNumberLabel={t("studentCardNumber")}
				conceal={conceal}
			/>
			{!conceal && <StudentCardQr />}
		</>
	);
}
