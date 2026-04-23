"use client";

import { getDefaultSemester, getSemesterDisplayLabel } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface SyncModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSync: (url: string, semester: number) => Promise<void>;
	initialUrl?: string;
}

export default function SyncModal({
	isOpen,
	onClose,
	onSync,
	initialUrl = "",
}: SyncModalProps) {
	const t = useTranslations("sync");
	const [url, setUrl] = useState(initialUrl);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isClosing, setIsClosing] = useState(false);

	// Auto-detect semester — no user input needed
	const detectedSemester = getDefaultSemester();
	const semesterLabel = getSemesterDisplayLabel(detectedSemester);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsClosing(true);
		setTimeout(() => {
			setIsClosing(false);
			onClose();
		}, 180);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!url.trim()) {
			setError(t("enterUrlError"));
			return;
		}

		setLoading(true);
		setError(null);

		try {
			// Pass auto-detected semester directly — no user selection
			await onSync(url, detectedSemester);
			handleClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to sync");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={`modal-overlay ${isClosing ? "modal-closing" : ""}`} onClick={handleClose}>
			<div className={`modal-content ${isClosing ? "modal-closing" : ""}`} onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-semibold">{t("syncSchedule")}</h2>
					<button onClick={handleClose} className="btn-icon">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* URL Input */}
					<div>
						<label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
							{t("vtcApiUrl")}
						</label>
						<input
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder={t("vtcUrlPlaceholder")}
							className="input-apple"
							autoFocus
						/>
						<p className="text-xs text-[var(--text-tertiary)] mt-2">
							{t("vtcUrlHint")}
						</p>
					</div>

					{/* Auto-detected Semester Info */}
					<div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[#222]">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[var(--accent-blue)] shrink-0">
							<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
						</svg>
						<span className="text-sm text-[var(--text-secondary)]">
							Auto-detected: <span className="font-medium text-[var(--foreground)]">{semesterLabel}</span>
						</span>
					</div>

					{/* Error */}
					{error && (
						<div className="p-3 bg-[var(--error-bg)] border border-[rgba(245,83,83,0.15)] rounded-lg">
							<p className="text-sm text-[var(--error)]">{error}</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-3 pt-2">
						<button type="button" onClick={handleClose} className="btn-secondary flex-1">
							{t("cancel")}
						</button>
						<button type="submit" disabled={loading} className="btn-primary flex-1">
							{loading ? (
								<span className="flex items-center justify-center gap-2">
									<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									{t("syncing")}
								</span>
							) : (
								t("syncNow")
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
