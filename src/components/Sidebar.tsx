"use client";

import { Link, usePathname } from "@/lib/navigation";
import { BookOpen, BookOpenText, CalendarClock, CalendarCog, CalendarDays, ClipboardCheck, CreditCard, HelpCircle, LayoutGrid, Loader2, RefreshCw, Settings, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";

// Persistent sidebar navigation. lucide-react, one family, size-5 in the rail.
const NAV_ITEMS = [
	{ href: "/", key: "home", Icon: LayoutGrid },
	{ href: "/timetable", key: "timetable", Icon: CalendarDays },
	{ href: "/attendance", key: "attendance", Icon: ClipboardCheck },
	{ href: "/attendance-grid", key: "attendanceGrid", Icon: Table2 },
	{ href: "/dashboard#moodle", key: "moodle", Icon: BookOpen },
	{ href: "/events", key: "events", Icon: CalendarCog },
	{ href: "/tools", key: "tools", Icon: CalendarClock },
	{ href: "/student-card", key: "studentCard", Icon: CreditCard },
	{ href: "/docs/api", key: "docs", Icon: BookOpenText },
] as const;

const SETTINGS_ITEM = { href: "/settings", key: "settings", Icon: Settings } as const;

interface SidebarProps {
	onSyncClick: () => void;
	isSyncing: boolean;
	vtcUrl: string;
	user?: {
		name?: string | null;
		image?: string | null;
	} | null;
	sidebarOpen?: boolean;
	onStartTour?: () => void;
}

export default function Sidebar({ onSyncClick, isSyncing, user, sidebarOpen, onStartTour }: SidebarProps) {
	const t = useTranslations("calendar");
	const tTour = useTranslations("tour");
	const tSync = useTranslations("sync");
	const tNav = useTranslations("nav");
	const pathname = usePathname();




	// One nav row: icon and localized label.
	const renderNavLink = (item: { href: string; key: string; Icon: typeof LayoutGrid }) => {
		const isActive = pathname === item.href;
		const label = tNav(item.key);
		const { Icon } = item;
		return (
			<Link
				key={item.href}
				href={item.href}
				className={`sidebar-nav-link ${isActive ? "is-active" : ""}`}
				aria-current={isActive ? "page" : undefined}
			>
				<Icon aria-hidden="true" />
				<span className="sidebar-nav-label">
					{label}
				</span>
			</Link>
		);
	};


	return (
		<>
			<aside className={`glass dashboard-sidebar h-full flex flex-col overflow-hidden ${sidebarOpen ? "sidebar-open" : ""}`}>
				{/* Brand — the desktop shell's only logo lockup. */}
				<div className="sidebar-heading">
					<Link href="/" className="sidebar-brand">
						<img src="/vtc-timetable.svg" alt="" width={44} height={44} aria-hidden="true" />
						<span className="min-w-0">
							<span className="sidebar-brand-title">VTC Timetable</span>
							<span className="sidebar-brand-subtitle">{t("calendarHeader")}</span>
						</span>
					</Link>
				</div>

				{/* Primary navigation — persistent across every route. */}
				<nav className="sidebar-nav" aria-label={tNav("label")}>
					{NAV_ITEMS.map((item) => renderNavLink(item))}
				</nav>


				{/* Footer Actions */}
				<div className="sidebar-footer border-t border-[var(--sidebar-border)] space-y-2">
					{/* Settings sits at the foot of the rail, as in the campus reference. */}
					{renderNavLink(SETTINGS_ITEM)}

					{/* Sync button — only available once signed in */}
					{user && (
						<button data-tour="sync-button" onClick={onSyncClick} disabled={isSyncing} className={`btn-primary w-full flex items-center justify-center gap-2 ${isSyncing ? "btn-syncing" : ""}`}>
							{isSyncing ? (
								<>
									<Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
									{tSync("syncing")}
								</>
							) : (
								<>
									<RefreshCw className="w-4 h-4" aria-hidden="true" />
									{tSync("syncSchedule")}
								</>
							)}
						</button>
					)}

					{/* Help / replay the product tour */}
					{onStartTour && (
						<button
							onClick={onStartTour}
							className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-overlay hover:text-[var(--foreground)] transition-colors"
						>
							<HelpCircle className="w-4 h-4" aria-hidden="true" />
							{tTour("helpButton")}
						</button>
					)}
				</div>
			</aside>


			{/* Course Details Modal */}
		</>
	);
}
