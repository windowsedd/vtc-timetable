"use client";

import { getApiTokenState, regenerateApiToken, revokeApiToken, type ApiTokenState } from "@/app/actions/api-token";
import { maskApiToken } from "@/lib/api-token";
import { clearVtcData, getUserSettings, resetGracePeriodThreshold, updateEmailPassword, updateGracePeriodThreshold } from "@/app/actions/settings";
import { checkStoredToken, getPrintQuota, getProgrammeInfo, saveUserLocale } from "@/app/actions/user";
import {
	DEFAULT_GRACE_PERIOD_THRESHOLD,
	MAX_GRACE_PERIOD_THRESHOLD,
	MIN_GRACE_PERIOD_THRESHOLD,
} from "@/lib/grace-period";
import SessionSplash from "@/components/SessionSplash";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import type { Passkey } from "@better-auth/passkey";
import { ArrowLeft, Database, Fingerprint, HardDrive, KeyRound, Languages, LockKeyhole, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { authClient, useSession } from "@/lib/auth-client";
import { Link, useRouter } from "@/lib/navigation";
import { writeLocaleCookie } from "@/lib/locale-cookie";
import { useCallback, useEffect, useRef, useState } from "react";

type PrintQuotaInfo = {
	campus: string;
	balance: number;
	status: number;
	lastUpdatedTime: string;
};

type ProgrammeInfo = {
	progStructCode: string;
	progStructCodeDesc: string;
	year: string;
	class: string;
};

// Framer Motion animation variants
const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.08 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 12 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
	},
};

// Language names stay in their own language, the usual convention for a
// language picker — they are not translated per locale.
const LOCALE_OPTIONS = [
	{ value: "zh-HK", label: "繁體中文" },
	{ value: "en", label: "English" },
] as const;

// Keeps a jumped-to section clear of the sticky section nav; matches the
// `scroll-mt-24` the sections carry for the browser's own fragment jump.
const SECTION_SCROLL_OFFSET = 96;


export default function SettingsPage() {
	const router = useRouter();
	const locale = useLocale();
	const { data: session } = useSession();
	const t = useTranslations("settings");
	const tNav = useTranslations("nav");
	const [loading, setLoading] = useState(true);
	const [settings, setSettings] = useState<{
		email?: string;
		hasPassword: boolean;
		authProviders: string[];
		discordUsername?: string;
		vtcStudentId?: string;
		gracePeriodThreshold: number;
		gracePeriodThresholdOverride: number | null;
		gracePeriodDefault: number;
		gracePeriodMin: number;
		gracePeriodMax: number;
	} | null>(null);

	// Live VTC info (site, print quota, programme from e-card)
	const [vtcSite, setVtcSite] = useState<string | null>(null);
	const [printQuota, setPrintQuota] = useState<PrintQuotaInfo | null>(null);
	const [programme, setProgramme] = useState<ProgrammeInfo | null>(null);
	const [vtcLiveLoading, setVtcLiveLoading] = useState(false);
	const [vtcLiveError, setVtcLiveError] = useState<string | null>(null);

	// Email/Password form state
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [emailPasswordLoading, setEmailPasswordLoading] = useState(false);
	const [emailPasswordMessage, setEmailPasswordMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	// Student ID visibility state
	const [isStudentIdVisible, setIsStudentIdVisible] = useState(false);

	// Below 768px the rail is an off-canvas drawer, so it needs the same toggle
	// the other routes get from AppShell — without it this page has no nav at all.
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// Passkeys registered on this account.
	const [passkeys, setPasskeys] = useState<Passkey[]>([]);
	const [passkeyName, setPasskeyName] = useState("");
	const [passkeyBusy, setPasskeyBusy] = useState(false);
	const [passkeyMessage, setPasskeyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	// Clear VTC data (danger zone) state — two-step confirm
	const [clearConfirm, setClearConfirm] = useState(false);
	const [clearing, setClearing] = useState(false);
	const [clearMessage, setClearMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const [gracePeriodInput, setGracePeriodInput] = useState(String(DEFAULT_GRACE_PERIOD_THRESHOLD));
	const [gracePeriodSaving, setGracePeriodSaving] = useState(false);
	const [gracePeriodResetting, setGracePeriodResetting] = useState(false);
	const [gracePeriodMessage, setGracePeriodMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const handleClearVtcData = async () => {
		if (!clearConfirm) {
			setClearConfirm(true);
			setClearMessage(null);
			return;
		}
		setClearing(true);
		const result = await clearVtcData();
		setClearing(false);
		setClearConfirm(false);
		if (result.success) {
			setClearMessage({
				type: "success",
				text: `Cleared ${result.deletedEvents ?? 0} events and ${result.deletedAttendance ?? 0} attendance records.`,
			});
		} else {
			setClearMessage({ type: "error", text: result.error || "Failed to clear VTC data." });
		}
	};

	const handleSaveGracePeriod = async (event: React.FormEvent) => {
		event.preventDefault();
		setGracePeriodMessage(null);
		setGracePeriodSaving(true);
		const result = await updateGracePeriodThreshold(gracePeriodInput);
		setGracePeriodSaving(false);
		if (result.success && result.data) {
			setGracePeriodInput(String(result.data.gracePeriodThreshold));
			setSettings((current) => current
				? {
					...current,
					gracePeriodThreshold: result.data!.gracePeriodThreshold,
					gracePeriodThresholdOverride: result.data!.gracePeriodThreshold,
				}
				: current);
			setGracePeriodMessage({ type: "success", text: t("gracePeriodSaved") });
		} else {
			setGracePeriodMessage({ type: "error", text: result.error || t("gracePeriodInvalid") });
		}
	};

	const handleResetGracePeriod = async () => {
		setGracePeriodMessage(null);
		setGracePeriodResetting(true);
		const result = await resetGracePeriodThreshold();
		setGracePeriodResetting(false);
		if (result.success && result.data) {
			setGracePeriodInput(String(result.data.gracePeriodThreshold));
			setSettings((current) => current
				? {
					...current,
					gracePeriodThreshold: result.data!.gracePeriodThreshold,
					gracePeriodThresholdOverride: null,
				}
				: current);
			setGracePeriodMessage({ type: "success", text: t("gracePeriodReset") });
		} else {
			setGracePeriodMessage({ type: "error", text: result.error || t("gracePeriodInvalid") });
		}
	};

	useEffect(() => {
		// eslint-disable-next-line react-hooks/immutability
		loadSettings();
		// Settings are intentionally loaded once on mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const loadVtcLiveInfo = async () => {
		setVtcLiveLoading(true);
		setVtcLiveError(null);
		try {
			const [tokenResult, quotaResult, programmeResult] = await Promise.all([
				checkStoredToken(),
				getPrintQuota(),
				getProgrammeInfo(),
			]);

			if (tokenResult.valid && tokenResult.site) {
				setVtcSite(tokenResult.site);
			} else if (!tokenResult.valid) {
				setVtcSite(null);
				if (tokenResult.reason === "expired") {
					setVtcLiveError("VTC token expired. Please re-sync.");
				} else if (tokenResult.reason === "no_token") {
					setVtcLiveError(null);
				}
			}

			if (quotaResult.success && quotaResult.data) {
				setPrintQuota(quotaResult.data);
			} else {
				setPrintQuota(null);
				// Prefer token errors; otherwise surface quota error when we have a token
				if (tokenResult.valid && quotaResult.error) {
					setVtcLiveError(quotaResult.error);
				}
			}

			if (programmeResult.success && programmeResult.data) {
				setProgramme(programmeResult.data);
			} else {
				setProgramme(null);
				if (tokenResult.valid && !quotaResult.error && programmeResult.error) {
					setVtcLiveError(programmeResult.error);
				}
			}
		} catch {
			setVtcLiveError("Failed to load VTC account info.");
		} finally {
			setVtcLiveLoading(false);
		}
	};

	const loadSettings = async () => {
		setLoading(true);
		const result = await getUserSettings();
		if (result.success && result.data) {
			setSettings(result.data);
			setEmail(result.data.email || "");
			setGracePeriodInput(String(result.data.gracePeriodThreshold));
			// Live VTC fields only when student has synced
			if (result.data.vtcStudentId) {
				void loadVtcLiveInfo();
			}
		}
		setLoading(false);
	};

	const loadPasskeys = useCallback(async () => {
		const { data } = await authClient.passkey.listUserPasskeys();
		setPasskeys(data ?? []);
	}, []);

	useEffect(() => {
		if (!session) return;
		void loadPasskeys();
	}, [session, loadPasskeys]);

	const handleAddPasskey = async () => {
		setPasskeyBusy(true);
		setPasskeyMessage(null);
		const result = await authClient.passkey.addPasskey({ name: passkeyName.trim() || undefined });
		setPasskeyBusy(false);
		// A cancelled or dismissed browser prompt fails the same way as a real
		// error, so the message stays neutral instead of blaming the device.
		if (result?.error) {
			setPasskeyMessage({ type: "error", text: t("passkeyAddFailed") });
			return;
		}
		setPasskeyName("");
		setPasskeyMessage({ type: "success", text: t("passkeyAdded") });
		await loadPasskeys();
	};

	const handleDeletePasskey = async (id: string) => {
		setPasskeyBusy(true);
		setPasskeyMessage(null);
		const { error } = await authClient.passkey.deletePasskey({ id });
		setPasskeyBusy(false);
		if (error) {
			setPasskeyMessage({ type: "error", text: t("passkeyDeleteFailed") });
			return;
		}
		setPasskeyMessage({ type: "success", text: t("passkeyDeleted") });
		await loadPasskeys();
	};

	const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setEmailPasswordMessage(null);

		if (!email || !password) {
			setEmailPasswordMessage({ type: "error", text: "Email and password are required." });
			return;
		}

		if (password !== confirmPassword) {
			setEmailPasswordMessage({ type: "error", text: "Passwords do not match." });
			return;
		}

		setEmailPasswordLoading(true);
		const result = await updateEmailPassword(email, password);
		setEmailPasswordLoading(false);

		if (result.success) {
			setEmailPasswordMessage({ type: "success", text: "Email and password updated successfully!" });
			setPassword("");
			setConfirmPassword("");
			loadSettings();
		} else {
			setEmailPasswordMessage({ type: "error", text: result.error || "Failed to update." });
		}
	};

	const [apiToken, setApiToken] = useState<ApiTokenState | null>(null);
	const [apiTokenBusy, setApiTokenBusy] = useState(false);
	const [apiTokenVisible, setApiTokenVisible] = useState(false);
	const [apiTokenCopied, setApiTokenCopied] = useState(false);
	const [apiTokenError, setApiTokenError] = useState<string | null>(null);

	useEffect(() => {
		getApiTokenState().then(setApiToken).catch(() => setApiToken(null));
	}, []);

	const runApiTokenAction = async (action: () => Promise<ApiTokenState>) => {
		setApiTokenBusy(true);
		setApiTokenError(null);
		const result = await action();
		setApiTokenBusy(false);
		if (!result.success) {
			setApiTokenError(result.error ?? null);
			return;
		}
		// A freshly minted token is worth reading; a revoked one has nothing to show.
		setApiTokenVisible(Boolean(result.token));
		setApiTokenCopied(false);
		setApiToken(result);
	};

	const copyApiToken = async () => {
		if (!apiToken?.token) return;
		try {
			await navigator.clipboard.writeText(apiToken.token);
			setApiTokenCopied(true);
			window.setTimeout(() => setApiTokenCopied(false), 3_000);
		} catch {
			setApiTokenError(t("apiTokenCopyFailed"));
		}
	};

	const shellRef = useRef<HTMLDivElement>(null);

	// A fragment link scrolls every scrollable ancestor of its target, and the
	// last sections sit past the end of the shell's own scroll range, so the
	// browser makes up the difference on the clipped boxes above it and drags the
	// top bar and the rail out of view. Scroll the shell on its own instead.
	const scrollToSection = useCallback((id: string) => {
		const shell = shellRef.current;
		const target = document.getElementById(id);
		if (!shell || !target || !shell.contains(target)) return;
		const top = shell.scrollTop + target.getBoundingClientRect().top - shell.getBoundingClientRect().top;
		shell.scrollTo({ top: Math.max(top - SECTION_SCROLL_OFFSET, 0), behavior: "smooth" });
	}, []);

	const jumpToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
		event.preventDefault();
		window.history.replaceState(null, "", `#${id}`);
		scrollToSection(id);
	};

	// The sections only mount once the settings have loaded; the browser ran its
	// own jump for a `#…` URL much earlier, against the loading splash.
	useEffect(() => {
		if (loading) return;
		const id = window.location.hash.slice(1);
		if (id) scrollToSection(id);
	}, [loading, scrollToSection]);

	if (loading) return <SessionSplash label={t("loadingSettings")} />;

	// Locale is a cookie, so switching keeps the current path and just
	// re-renders it on the server.
	const handleLocaleSwitch = (next: (typeof LOCALE_OPTIONS)[number]["value"]) => {
		if (next === locale) return;
		saveUserLocale(next).catch(console.error);
		writeLocaleCookie(next);
		router.refresh();
	};

	return (
		<div className="settings-page flex flex-col h-screen overflow-clip bg-[var(--background)]">
			<TopNavbar
				onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
				sidebarOpen={sidebarOpen}
				user={session?.user}
			/>

			<div className="flex-1 flex min-h-0 overflow-clip">
			<button
				type="button"
				className={`sidebar-overlay ${sidebarOpen ? "active" : ""}`}
				aria-label={tNav("closeNavigation")}
				onClick={() => setSidebarOpen(false)}
			/>

			{/* Same rail as every other route, as in the reference settings page. */}
			<Sidebar
				onSyncClick={() => router.push("/?sync=1")}
				isSyncing={false}
				vtcUrl=""
				user={session?.user}
				sidebarOpen={sidebarOpen}
			/>

			<div ref={shellRef} className="settings-shell min-w-0 flex-1 overflow-y-auto">
			{/* Back arrow beside the title, matching the reference header. */}
			<header className="settings-heading">
				<Link href="/" className="settings-back" aria-label={t("backToCalendar")}>
					<ArrowLeft className="size-5" aria-hidden="true" />
				</Link>
				<div className="min-w-0">
					<p className="settings-heading-eyebrow">VTC Timetable</p>
					<h1>{t("title")}</h1>
				</div>
			</header>

			{/* Content */}
			<div className="settings-layout">
				<aside className="settings-nav" aria-label={t("title")}>
					<p className="settings-nav-label">{t("title")}</p>
					<a href="#account" onClick={(event) => jumpToSection(event, "account")}>
						{t("account")}
					</a>
					<a href="#language" onClick={(event) => jumpToSection(event, "language")}>
						{t("language")}
					</a>
					<a href="#connection" onClick={(event) => jumpToSection(event, "connection")}>
						{t("vtcConnection")}
					</a>
					<Link href="/api">{t("apiPlayground")}</Link>
					<a href="#attendance" onClick={(event) => jumpToSection(event, "attendance")}>
						{t("gracePeriodTitle")}
					</a>
					<a href="#security" onClick={(event) => jumpToSection(event, "security")}>
						{t("loginSecurity")}
					</a>
					<a href="#passkeys" onClick={(event) => jumpToSection(event, "passkeys")}>
						{t("passkeys")}
					</a>
					<a href="#api" onClick={(event) => jumpToSection(event, "api")}>
						{t("apiAccess")}
					</a>
					<a href="#data" onClick={(event) => jumpToSection(event, "data")}>
						{t("storedData")}
					</a>
				</aside>
			<motion.main
				className="settings-content space-y-6"
				variants={containerVariants}
				initial="hidden"
				animate="visible"
			>
				{/* ── Account Information ────────────────── */}
				<motion.div id="account" className="settings-section scroll-mt-24" variants={itemVariants}>
					<div className="settings-section-header">
						<span className="settings-section-icon" aria-hidden="true"><UserRound /></span>
						<div className="min-w-0">
							<h2>{t("account")}</h2>
							<p>{t("accountDescription")}</p>
						</div>
					</div>
					<div className="settings-section-body">
						<div className="settings-row">
							<span className="settings-row-label">Discord</span>
							<span className="settings-row-value flex items-center gap-2">
								<svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
								</svg>
								{settings?.discordUsername || "N/A"}
							</span>
						</div>
					</div>
				</motion.div>

				{/* ── Language ───────────────────────────── */}
				<motion.div id="language" className="settings-section scroll-mt-24" variants={itemVariants}>
					<div className="settings-section-header">
						<span className="settings-section-icon" aria-hidden="true"><Languages /></span>
						<div className="min-w-0">
							<h2>{t("language")}</h2>
							<p>{t("languageDescription")}</p>
						</div>
					</div>
					<div className="settings-section-body">
						<div className="settings-row">
							<span className="settings-row-label">{t("language")}</span>
							<div className="flex gap-2">
								{LOCALE_OPTIONS.map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => handleLocaleSwitch(option.value)}
										aria-pressed={locale === option.value}
										className={locale === option.value ? "btn-primary text-xs" : "btn-secondary text-xs"}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>
					</div>
				</motion.div>

				{/* ── VTC Connection ─────────────────────── */}
				<motion.div id="connection" className="settings-section scroll-mt-24" variants={itemVariants}>
					<div className="settings-section-header">
						<span className="settings-section-icon" aria-hidden="true"><Database /></span>
						<div className="min-w-0">
							<h2>{t("vtcConnection")}</h2>
							<p>{t("vtcConnectionDescription")}</p>
						</div>
					</div>
					<div className="settings-section-body">

						<div className="settings-row">
							<span className="settings-row-label">VTC Student ID</span>
							<div className="flex items-center gap-2">
								<span className="settings-row-value font-mono text-xs tracking-wide">
									{settings?.vtcStudentId
										? (isStudentIdVisible ? settings.vtcStudentId : "•".repeat(settings.vtcStudentId.length))
										: <span className="text-[var(--text-tertiary)]">Not synced</span>
									}
								</span>
								{settings?.vtcStudentId && (
									<button
										type="button"
										onClick={() => setIsStudentIdVisible(!isStudentIdVisible)}
										className="btn-icon"
										aria-label={isStudentIdVisible ? "Hide Student ID" : "Show Student ID"}
									>
										{isStudentIdVisible ? (
											<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
												<path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
											</svg>
										) : (
											<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
												<path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
												<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
											</svg>
										)}
									</button>
								)}
							</div>
						</div>

						<div className="settings-row">
							<span className="settings-row-label">{t("apiPlayground")}</span>
							<Link href="/api" className="btn-secondary text-xs">
								{t("openApiPlayground")}
							</Link>
						</div>

						<div className="settings-row">
							<span className="settings-row-label">{t("vtcUrlGuide")}</span>
							<Link href="/docs/token" className="btn-secondary text-xs">
								{t("openVtcUrlGuide")}
							</Link>
						</div>

						{/* Site from checkAccessToken */}
						<div className="settings-row">
							<span className="settings-row-label">Site</span>
							<span className="settings-row-value font-mono text-xs tracking-wide">
								{vtcLiveLoading ? (
									<span className="text-[var(--text-tertiary)]">Loading…</span>
								) : vtcSite ? (
									vtcSite
								) : (
									<span className="text-[var(--text-tertiary)]">
										{settings?.vtcStudentId ? "Unavailable" : "Not synced"}
									</span>
								)}
							</span>
						</div>

						{/* Programme from e-card register */}
						<div className="settings-row">
							<span className="settings-row-label">Programme</span>
							<div className="text-right max-w-[70%]">
								{vtcLiveLoading ? (
									<span className="settings-row-value text-[var(--text-tertiary)]">Loading…</span>
								) : programme ? (
									<div className="flex flex-col items-end gap-0.5">
										{programme.progStructCode ? (
											<span className="settings-row-value font-mono text-xs tracking-wide">
												{programme.progStructCode}
											</span>
										) : null}
										{programme.progStructCodeDesc ? (
											<span className="text-xs text-[var(--text-secondary)] leading-snug text-right">
												{programme.progStructCodeDesc}
											</span>
										) : null}
									</div>
								) : (
									<span className="settings-row-value text-[var(--text-tertiary)]">
										{settings?.vtcStudentId ? "Unavailable" : "Not synced"}
									</span>
								)}
							</div>
						</div>

						<div className="settings-row">
							<span className="settings-row-label">{t("programmeYear")}</span>
							<span className="settings-row-value font-mono text-xs tracking-wide">
								{vtcLiveLoading ? (
									<span className="text-[var(--text-tertiary)]">Loading…</span>
								) : programme?.year ? (
									programme.year
								) : (
									<span className="text-[var(--text-tertiary)]">
										{settings?.vtcStudentId ? "Unavailable" : "Not synced"}
									</span>
								)}
							</span>
						</div>

						<div className="settings-row">
							<span className="settings-row-label">{t("programmeClass")}</span>
							<span className="settings-row-value font-mono text-xs tracking-wide">
								{vtcLiveLoading ? (
									<span className="text-[var(--text-tertiary)]">Loading…</span>
								) : programme?.class ? (
									programme.class
								) : (
									<span className="text-[var(--text-tertiary)]">
										{settings?.vtcStudentId ? "Unavailable" : "Not synced"}
									</span>
								)}
							</span>
						</div>

						{/* Print quota from getPrintQuota */}
						<div className="settings-row">
							<span className="settings-row-label">Print Quota</span>
							<div className="text-right">
								{vtcLiveLoading ? (
									<span className="settings-row-value text-[var(--text-tertiary)]">Loading…</span>
								) : printQuota ? (
									<div className="flex flex-col items-end gap-0.5">
										<span className="settings-row-value font-mono text-xs tracking-wide">
											{printQuota.balance}
											{printQuota.campus ? (
												<span className="text-[var(--text-tertiary)] font-sans normal-case tracking-normal ml-1.5">
													· {printQuota.campus}
												</span>
											) : null}
										</span>
										{printQuota.lastUpdatedTime ? (
											<span className="text-[10px] text-[var(--text-tertiary)]">
												Updated {printQuota.lastUpdatedTime}
											</span>
										) : null}
									</div>
								) : (
									<span className="settings-row-value text-[var(--text-tertiary)]">
										{settings?.vtcStudentId ? "Unavailable" : "Not synced"}
									</span>
								)}
							</div>
						</div>

						{vtcLiveError && (
							<p className="text-xs text-[var(--error)] px-1 -mt-1">{vtcLiveError}</p>
						)}

						<div className="settings-row">
							<span className="settings-row-label">Login Methods</span>
							<div className="flex items-center gap-2">
								{settings?.authProviders && settings.authProviders.length > 0 ? (
									settings.authProviders.map((provider) => (
										<span key={provider} className="badge badge-blue">
											{provider === "discord" && (
												<svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
													<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
												</svg>
											)}
											{provider === "credentials" && (
												<svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
												</svg>
											)}
											{provider === "credentials" ? "Email" : provider}
										</span>
									))
								) : (
									<span className="text-[var(--text-tertiary)] text-xs">None</span>
								)}
							</div>
						</div>
					</div>
				</motion.div>

				<motion.div id="attendance" className="settings-section scroll-mt-24" variants={itemVariants}>
					<div className="settings-section-header">
						<span className="settings-section-icon" aria-hidden="true"><ShieldCheck /></span>
						<div className="min-w-0">
							<h2>{t("gracePeriodTitle")}</h2>
							<p>{t("gracePeriodDescription")}</p>
						</div>
					</div>
					<div className="settings-section-body space-y-4">
						<div className="settings-row">
							<span className="settings-row-label">{t("gracePeriodCurrent")}</span>
							<span className="settings-row-value font-mono">
								{settings?.gracePeriodThreshold ?? DEFAULT_GRACE_PERIOD_THRESHOLD}{t("gracePeriodUnit")}
							</span>
						</div>
						<div className="settings-row">
							<span className="settings-row-label">{t("gracePeriodDefaultLabel")}</span>
							<span className="settings-row-value font-mono">
								{settings?.gracePeriodDefault ?? DEFAULT_GRACE_PERIOD_THRESHOLD}{t("gracePeriodUnit")}
							</span>
						</div>
						{/* Reference slider. Bound to the same field the form saves, so the
						    value is still committed explicitly rather than on drag. */}
						<div className="settings-slider">
							<div className="settings-slider-head">
								<span>{t("gracePeriodInputLabel")}</span>
								<strong>{gracePeriodInput || DEFAULT_GRACE_PERIOD_THRESHOLD}{t("gracePeriodUnit")}</strong>
							</div>
							<input
								type="range"
								aria-label={t("gracePeriodInputLabel")}
								min={settings?.gracePeriodMin ?? MIN_GRACE_PERIOD_THRESHOLD}
								max={settings?.gracePeriodMax ?? MAX_GRACE_PERIOD_THRESHOLD}
								step="1"
								value={Number(gracePeriodInput) || DEFAULT_GRACE_PERIOD_THRESHOLD}
								onChange={(event) => setGracePeriodInput(event.target.value)}
								className="accent-primary w-full cursor-pointer"
							/>
							<div className="settings-slider-scale">
								<span>{settings?.gracePeriodMin ?? MIN_GRACE_PERIOD_THRESHOLD}{t("gracePeriodUnit")}</span>
								<span>{settings?.gracePeriodMax ?? MAX_GRACE_PERIOD_THRESHOLD}{t("gracePeriodUnit")}</span>
							</div>
						</div>

						<p className="text-sm text-[var(--text-secondary)]">
							{t("gracePeriodRange", {
								min: settings?.gracePeriodMin ?? MIN_GRACE_PERIOD_THRESHOLD,
								max: settings?.gracePeriodMax ?? MAX_GRACE_PERIOD_THRESHOLD,
							})}
						</p>
						<form onSubmit={handleSaveGracePeriod} className="space-y-3">
							<label className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
								{t("gracePeriodInputLabel")}
							</label>
							<input
								type="number"
								inputMode="decimal"
								min={settings?.gracePeriodMin ?? MIN_GRACE_PERIOD_THRESHOLD}
								max={settings?.gracePeriodMax ?? MAX_GRACE_PERIOD_THRESHOLD}
								step="0.1"
								value={gracePeriodInput}
								onChange={(event) => setGracePeriodInput(event.target.value)}
								className="input-field"
								required
							/>
							{gracePeriodMessage && (
								<div className={`px-4 py-3 rounded-lg text-sm font-medium ${gracePeriodMessage.type === "success"
									? "bg-[var(--success-bg)] text-[var(--success)] border border-[rgba(62,207,142,0.15)]"
									: "bg-[var(--error-bg)] text-[var(--error)] border border-[rgba(245,83,83,0.15)]"
								}`}>
									{gracePeriodMessage.text}
								</div>
							)}
							<div className="flex flex-col sm:flex-row gap-2">
								<button type="submit" disabled={gracePeriodSaving || gracePeriodResetting} className="btn-primary flex-1">
									{gracePeriodSaving ? t("gracePeriodSaving") : t("gracePeriodSave")}
								</button>
								<button
									type="button"
									disabled={gracePeriodSaving || gracePeriodResetting || settings?.gracePeriodThresholdOverride === null}
									onClick={() => void handleResetGracePeriod()}
									className="btn-secondary flex-1"
								>
									{gracePeriodResetting ? t("gracePeriodSaving") : t("gracePeriodResetAction")}
								</button>
							</div>
						</form>
					</div>
				</motion.div>

				{/* ── Security ────────────────────────────── */}
				<motion.div id="security" className="settings-section scroll-mt-24" variants={itemVariants}>
					<div className="settings-section-header">
						<span className="settings-section-icon" aria-hidden="true"><LockKeyhole /></span>
						<div className="min-w-0">
						<h2>{t("loginSecurity")}</h2>
						<p>
							{settings?.hasPassword
								? "Update your email and password for credential-based login."
								: "Set an email and password to enable an alternative login method alongside Discord."}
						</p>
						</div>
					</div>
					<div className="settings-section-body">
						<form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
							<div>
								<label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
									Email
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="input-field"
									placeholder="your.email@example.com"
									required
								/>
							</div>

							<div>
								<label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
									{settings?.hasPassword ? "New Password" : "Password"}
								</label>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="input-field"
									placeholder="At least 8 characters"
									minLength={8}
									required
								/>
							</div>

							<div>
								<label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
									Confirm Password
								</label>
								<input
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="input-field"
									placeholder="Re-enter password"
									required
								/>
							</div>

							{emailPasswordMessage && (
								<div className={`px-4 py-3 rounded-lg text-sm font-medium ${emailPasswordMessage.type === "success"
									? "bg-[var(--success-bg)] text-[var(--success)] border border-[rgba(62,207,142,0.15)]"
									: "bg-[var(--error-bg)] text-[var(--error)] border border-[rgba(245,83,83,0.15)]"
								}`}>
									{emailPasswordMessage.text}
								</div>
							)}

							<button
								type="submit"
								disabled={emailPasswordLoading}
								className="btn-primary w-full"
							>
								{emailPasswordLoading
									? (
										<span className="flex items-center justify-center gap-2">
											<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
											</svg>
											Saving…
										</span>
									)
									: settings?.hasPassword ? "Update Password" : "Set Password"
								}
							</button>
						</form>
					</div>
				</motion.div>

				{/* ── Passkeys ────────────────────────────── */}
				<motion.div id="passkeys" className="settings-section scroll-mt-24" variants={itemVariants}>
					<div className="settings-section-header">
						<span className="settings-section-icon" aria-hidden="true"><Fingerprint /></span>
						<div className="min-w-0">
							<h2>{t("passkeys")}</h2>
							<p>{t("passkeysDescription")}</p>
						</div>
					</div>
					<div className="settings-section-body">
						{passkeys.length === 0 ? (
							<p className="settings-passkey-empty">{t("passkeysEmpty")}</p>
						) : (
							<ul className="settings-passkey-list">
								{passkeys.map((key) => (
									<li key={key.id}>
										<div className="min-w-0">
											<p className="settings-passkey-name">{key.name || t("passkeyUnnamed")}</p>
											<p className="settings-passkey-meta">
												{t("passkeyAddedOn", { date: new Date(key.createdAt).toLocaleDateString(locale) })}
											</p>
										</div>
										<button
											type="button"
											onClick={() => handleDeletePasskey(key.id)}
											disabled={passkeyBusy}
											className="btn-icon"
											aria-label={t("passkeyRemove")}
										>
											<Trash2 className="w-4 h-4" aria-hidden="true" />
										</button>
									</li>
								))}
							</ul>
						)}

						<div className="settings-passkey-add">
							<input
								type="text"
								value={passkeyName}
								onChange={(e) => setPasskeyName(e.target.value)}
								className="input-field"
								placeholder={t("passkeyNamePlaceholder")}
								maxLength={60}
							/>
							<button
								type="button"
								onClick={handleAddPasskey}
								disabled={passkeyBusy}
								className="btn-primary"
							>
								{passkeyBusy ? t("passkeyWorking") : t("passkeyAdd")}
							</button>
						</div>

						{passkeyMessage && (
							<div className={`px-4 py-3 rounded-lg text-sm font-medium ${passkeyMessage.type === "success"
								? "bg-[var(--success-bg)] text-[var(--success)] border border-[rgba(62,207,142,0.15)]"
								: "bg-[var(--error-bg)] text-[var(--error)] border border-[rgba(245,83,83,0.15)]"
							}`}>
								{passkeyMessage.text}
							</div>
						)}

						<p className="settings-api-token-hint">{t("passkeysHint")}</p>
					</div>
				</motion.div>

				{/* ── API access (iOS widget) ─────────────── */}
				<motion.div id="api" className="settings-section scroll-mt-24" variants={itemVariants}>
					<div className="settings-section-header">
						<span className="settings-section-icon" aria-hidden="true"><KeyRound /></span>
						<div className="min-w-0">
							<h2>{t("apiAccess")}</h2>
							<p>{t("apiAccessDescription")}</p>
						</div>
					</div>
					<div className="settings-section-body">
						<div className="settings-row">
							<span className="settings-row-label">{t("apiToken")}</span>
							<div className="settings-api-token">
								<code>
									{apiToken?.token
										? (apiTokenVisible ? apiToken.token : maskApiToken(apiToken.token))
										: <span className="text-[var(--text-tertiary)]">{t("apiTokenNone")}</span>}
								</code>
								{apiToken?.token ? (
									<>
										<button
											type="button"
											className="btn-secondary text-xs"
											onClick={() => setApiTokenVisible((visible) => !visible)}
										>
											{apiTokenVisible ? t("apiTokenHide") : t("apiTokenReveal")}
										</button>
										<button type="button" className="btn-secondary text-xs" onClick={copyApiToken}>
											{apiTokenCopied ? t("apiTokenCopied") : t("apiTokenCopy")}
										</button>
									</>
								) : null}
							</div>
						</div>

						<div className="settings-row">
							<span className="settings-row-label">{t("apiTokenWarning")}</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									className="btn-primary text-xs disabled:opacity-50"
									disabled={apiTokenBusy}
									onClick={() => runApiTokenAction(regenerateApiToken)}
								>
									{apiToken?.enabled ? t("apiTokenRegenerate") : t("apiTokenCreate")}
								</button>
								{apiToken?.enabled ? (
									<button
										type="button"
										className="btn-danger text-xs disabled:opacity-50"
										disabled={apiTokenBusy}
										onClick={() => runApiTokenAction(revokeApiToken)}
									>
										{t("apiTokenRevoke")}
									</button>
								) : null}
							</div>
						</div>

						<p className="settings-api-token-hint">{t("apiTokenHint", { endpoint: "/api/classes" })}</p>
						<Link href="/docs/api" className="settings-api-token-link">{t("apiTokenDocs")}</Link>
						{apiTokenError ? <p className="text-xs text-[var(--error)]">{apiTokenError}</p> : null}
					</div>
				</motion.div>

				{/* ── Danger Zone ─────────────────────────── */}
				<motion.div
					id="data"
					className="settings-section scroll-mt-24"
					style={{ borderColor: "rgba(245, 83, 83, 0.18)" }}
					variants={itemVariants}
				>
					<div className="settings-section-header" style={{ borderBottomColor: "rgba(245, 83, 83, 0.10)" }}>
						<span className="settings-section-icon" aria-hidden="true"><HardDrive /></span>
						<div className="min-w-0">
							<h2 className="text-[var(--error)]">{t("storedData")}</h2>
							<p>{t("storedDataDescription")}</p>
						</div>
					</div>
					<div className="settings-section-body">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-medium">Clear VTC Data</p>
								<p className="text-xs text-[var(--text-tertiary)] mt-0.5">
									Remove all synced timetable and attendance data from your account.
								</p>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{clearConfirm && (
									<button
										onClick={() => setClearConfirm(false)}
										disabled={clearing}
										className="btn-secondary text-xs disabled:opacity-50"
									>
										Cancel
									</button>
								)}
								<button
									onClick={handleClearVtcData}
									disabled={clearing}
									className="btn-danger text-xs disabled:opacity-50"
								>
									{clearing ? "Clearing…" : clearConfirm ? "Confirm — Clear" : "Clear Data"}
								</button>
							</div>
						</div>
						{clearMessage && (
							<p className={`text-xs mt-2 ${clearMessage.type === "success" ? "text-success" : "text-[var(--error)]"}`}>
								{clearMessage.text}
							</p>
						)}
					</div>
				</motion.div>
			</motion.main>
			</div>
			</div>
			</div>
		</div>
	);
}
