import DocsCodeBlock from "@/components/DocsCodeBlock";
import { MAX_RANGE_DAYS } from "@/lib/classes-api";
import { Link } from "@/lib/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/**
 * Public reference for `/api/classes`. Nothing here is account-specific, so it
 * stays readable signed out — someone writing the widget may not be the person
 * whose timetable it shows.
 */

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("apiDocs");
	return { title: `${t("title")} | VTC Timetable`, description: t("subtitle") };
}

const REQUEST_SAMPLE = `GET /api/classes?from=2026-09-09&to=2026-09-16 HTTP/1.1
Host: vtc.windowsed.me
Authorization: Bearer vtct_your_token_here
Accept: application/json`;

const RESPONSE_SAMPLE = `{
  "timezone": "Asia/Hong_Kong",
  "generatedAt": "2026-09-09T02:30:00.000Z",
  "range": { "from": "2026-09-09", "to": "2026-09-16" },
  "current": {
    "courseCode": "ITP4501",
    "courseTitle": "Web Application Development",
    "lessonType": "Lecture",
    "location": "DL-IT-B217",
    "lecturer": "Chan",
    "startsAt": "2026-09-09T01:30:00.000Z",
    "endsAt": "2026-09-09T03:30:00.000Z",
    "minutes": 120,
    "status": "UPCOMING",
    "semester": 1,
    "colorIndex": 2
  },
  "next": { "courseCode": "ITE3102", "startsAt": "2026-09-09T03:30:00.000Z", "...": "..." },
  "classes": [ { "courseCode": "ITP4501", "...": "..." } ]
}`;

const URL_SAMPLE = `https://vtc.windowsed.me/api/classes?token=vtct_your_token_here&from=2026-09-09`;

const CURL_SAMPLE = `curl -H "Authorization: Bearer $VTC_TOKEN" \\
  "https://vtc.windowsed.me/api/classes?from=2026-09-09&to=2026-09-16"`;

const SWIFT_SAMPLE = `struct ClassesResponse: Decodable {
    let timezone: String
    let current: VtcClass?
    let next: VtcClass?
    let classes: [VtcClass]
}

struct VtcClass: Decodable, Identifiable {
    var id: String { courseCode + startsAt }
    let courseCode, courseTitle, lessonType, location, status: String
    let startsAt, endsAt: String
    let minutes: Int
}

func loadClasses(token: String) async throws -> ClassesResponse {
    var request = URLRequest(url: URL(string: "https://vtc.windowsed.me/api/classes")!)
    request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")
    request.cachePolicy = .reloadIgnoringLocalCacheData

    let (data, response) = try await URLSession.shared.data(for: request)
    guard (response as? HTTPURLResponse)?.statusCode == 200 else {
        throw URLError(.userAuthenticationRequired)
    }
    return try JSONDecoder().decode(ClassesResponse.self, from: data)
}`;

export default async function ClassesApiDocsPage() {
	const t = await getTranslations("apiDocs");

	const params = [
		{ name: "from", description: t("params.from"), fallback: t("params.fromDefault") },
		{ name: "to", description: t("params.to"), fallback: t("params.toDefault") },
	];

	const errors = [
		{ status: "400", meaning: t("errors.badRequest") },
		{ status: "401", meaning: t("errors.unauthorized") },
		{ status: "409", meaning: t("errors.noTimetable") },
		{ status: "500", meaning: t("errors.server") },
	];

	const notes = ["utc", "inclusive", "cancelled", "cache"] as const;

	return (
		<main className="api-docs-page">
			<article className="api-docs-shell">
				<header className="api-docs-header">
					<p>{t("eyebrow")}</p>
					<h1>{t("title")}</h1>
					<p className="api-docs-lede">{t("subtitle")}</p>
					<code className="api-docs-endpoint">GET /api/classes</code>
				</header>

				<section className="api-docs-section">
					<h2>{t("authTitle")}</h2>
					<p>{t("authBody")}</p>
					<DocsCodeBlock label={t("requestLabel")} code={REQUEST_SAMPLE} />
					<p className="api-docs-note">{t("authQuery")}</p>
					<DocsCodeBlock label={t("urlLabel")} code={URL_SAMPLE} />
					<Link href="/settings#api" className="api-docs-link">{t("tokenLink")}</Link>
				</section>

				<section className="api-docs-section">
					<h2>{t("requestTitle")}</h2>
					<div className="api-docs-table-scroll">
						<table className="api-docs-table">
							<thead>
								<tr>
									<th>{t("table.parameter")}</th>
									<th>{t("table.description")}</th>
									<th>{t("table.fallback")}</th>
								</tr>
							</thead>
							<tbody>
								{params.map((param) => (
									<tr key={param.name}>
										<td><code>{param.name}</code></td>
										<td>{param.description}</td>
										<td>{param.fallback}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p className="api-docs-note">{t("rangeLimit", { days: MAX_RANGE_DAYS })}</p>
				</section>

				<section className="api-docs-section">
					<h2>{t("responseTitle")}</h2>
					<DocsCodeBlock label={t("responseLabel")} code={RESPONSE_SAMPLE} />
					<ul className="api-docs-notes">
						{notes.map((note) => <li key={note}>{t(`notes.${note}`)}</li>)}
					</ul>
				</section>

				<section className="api-docs-section">
					<h2>{t("errorsTitle")}</h2>
					<div className="api-docs-table-scroll">
						<table className="api-docs-table">
							<thead>
								<tr>
									<th>{t("table.status")}</th>
									<th>{t("table.meaning")}</th>
								</tr>
							</thead>
							<tbody>
								{errors.map((error) => (
									<tr key={error.status}>
										<td><code>{error.status}</code></td>
										<td>{error.meaning}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<section className="api-docs-section">
					<h2>{t("examplesTitle")}</h2>
					<DocsCodeBlock label="curl" code={CURL_SAMPLE} />
					<DocsCodeBlock label={t("swiftLabel")} code={SWIFT_SAMPLE} />
					<p className="api-docs-note">{t("widgetNote")}</p>
				</section>

				<footer className="api-docs-footer">
					<Link href="/">{t("backHome")}</Link>
					<Link href="/settings#api">{t("manageToken")}</Link>
				</footer>
			</article>
		</main>
	);
}
