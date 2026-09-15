"use client";

import { Menu, X } from "lucide-react";

interface TopNavbarProps {
	onSidebarToggle: () => void;
	sidebarOpen: boolean;

}

// Compact chrome: drawer toggle and brand. Account actions live in the sidebar.
export default function TopNavbar({ onSidebarToggle, sidebarOpen }: TopNavbarProps) {
	return (
		<nav className="top-navbar" aria-label="Application navigation">
			<div className="top-navbar-start">
				<button type="button" className="top-navbar-hamburger" onClick={onSidebarToggle} aria-label="Toggle sidebar">
					{sidebarOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
				</button>

				<div className="top-navbar-brand">
					<img src="/vtc-timetable.svg" alt="" width={34} height={34} className="top-navbar-logo" fetchPriority="high" />
					<div className="min-w-0">
						<span className="top-navbar-title hidden sm:block">VTC Timetable</span>
						<span className="top-navbar-title sm:hidden">Timetable</span>
						<span className="top-navbar-subtitle hidden md:block">Vocational Training Council</span>
					</div>
				</div>
			</div>

		</nav>
	);
}
