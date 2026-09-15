import DocsCodeBlock from "@/components/DocsCodeBlock";
import { Link } from "@/lib/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * How to read the VTC@HK app's `token=` off your own device. The site cannot run
 * the sign-in itself: VTC completes ADFS on a `vtchk://oauth` deep link that only
 * the app can receive, so the token has to be copied out of a real app request.
 */

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("tokenDocs");
	return { title: `${t("title")} | VTC Timetable`, description: t("subtitle") };
}

const URL_SAMPLE = `https://mobile.vtc.edu.hk/api?cmd=getTimeTableAndReminderList&token=YOUR_TOKEN&year=2026&month=9`;

const APPS = [
	{ name: "Stream", key: "stream", pick: true },
	{ name: "Proxyman", key: "proxyman", pick: false },
	{ name: "Charles Proxy", key: "charles", pick: false },
	{ name: "HTTP Toolkit", key: "httptoolkit", pick: true },
	{ name: "PCAPdroid", key: "pcapdroid", pick: false },
	{ name: "mitmproxy", key: "mitmproxy", pick: false },
] as const;

const IOS_STEPS = ["install", "vpn", "cert", "trust", "capture", "copy", "stop"] as const;
const ANDROID_STEPS = ["adb", "connect", "ondevice", "capture", "copy"] as const;
const DESKTOP_STEPS = ["network", "proxy", "cert", "ssl", "copy", "undo"] as const;
const TROUBLE = ["encrypted", "nothing", "invalid", "othercmd"] as const;
const SAFETY = ["own", "secret", "expiry", "off"] as const;

export default async function VtcTokenDocsPage() {
	const t = await getTranslations("tokenDocs");

	return (
		<main className="api-docs-page">
			<article className="api-docs-shell">
				<header className="api-docs-header">
					<p>{t("eyebrow")}</p>
					<h1>{t("title")}</h1>
					<p className="api-docs-lede">{t("subtitle")}</p>
					<code className="api-docs-endpoint">mobile.vtc.edu.hk/api?…&amp;token=…</code>
				</header>

				<section className="api-docs-section">
					<h2>{t("safetyTitle")}</h2>
					<ul className="api-docs-notes">
						{SAFETY.map((note) => <li key={note}>{t(`safety.${note}`)}</li>)}
					</ul>
				</section>

				<section className="api-docs-section">
					<h2>{t("whyTitle")}</h2>
					<p>{t("whyBody")}</p>
					<p className="api-docs-note">{t("whyNote")}</p>
				</section>

				<section className="api-docs-section">
					<h2>{t("lookForTitle")}</h2>
					<p>{t("lookForBody")}</p>
					<DocsCodeBlock label={t("urlLabel")} code={URL_SAMPLE} />
					<p className="api-docs-note">{t("lookForNote")}</p>
				</section>

				<section className="api-docs-section">
					<h2>{t("appsTitle")}</h2>
					<p>{t("appsBody")}</p>
					<div className="api-docs-table-scroll">
						<table className="api-docs-table">
							<thead>
								<tr>
									<th>{t("table.app")}</th>
									<th>{t("table.platform")}</th>
									<th>{t("table.notes")}</th>
								</tr>
							</thead>
							<tbody>
								{APPS.map((app) => (
									<tr key={app.key}>
										<td>
											{app.name}
											{app.pick ? <span className="api-docs-pick">{t("pick")}</span> : null}
										</td>
										<td>{t(`apps.${app.key}.platform`)}</td>
										<td>{t(`apps.${app.key}.note`)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<section className="api-docs-section">
					<h2>{t("iosTitle")}</h2>
					<p>{t("iosPick")}</p>
					<ol className="api-docs-steps">
						{IOS_STEPS.map((step) => <li key={step}>{t(`ios.${step}`)}</li>)}
					</ol>
				</section>

				<section className="api-docs-section">
					<h2>{t("androidTitle")}</h2>
					<ol className="api-docs-steps">
						{ANDROID_STEPS.map((step) => <li key={step}>{t(`android.${step}`)}</li>)}
					</ol>
					<p className="api-docs-note">{t("android.root")}</p>
				</section>

				<section className="api-docs-section">
					<h2>{t("desktopTitle")}</h2>
					<ol className="api-docs-steps">
						{DESKTOP_STEPS.map((step) => <li key={step}>{t(`desktop.${step}`)}</li>)}
					</ol>
				</section>

				<section className="api-docs-section">
					<h2>{t("troubleTitle")}</h2>
					<div className="api-docs-table-scroll">
						<table className="api-docs-table">
							<thead>
								<tr>
									<th>{t("table.symptom")}</th>
									<th>{t("table.fix")}</th>
								</tr>
							</thead>
							<tbody>
								{TROUBLE.map((row) => (
									<tr key={row}>
										<td>{t(`trouble.${row}.symptom`)}</td>
										<td>{t(`trouble.${row}.fix`)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<footer className="api-docs-footer">
					<Link href="/">{t("syncLink")}</Link>
					<Link href="/docs/api">{t("apiDocsLink")}</Link>
				</footer>
			</article>
		</main>
	);
}
