"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** Captioned code sample shared by the pages under /docs. */
export default function DocsCodeBlock({ label, code }: { label: string; code: string }) {
	const t = useTranslations("apiDocs");
	const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

	useEffect(() => {
		if (status !== "copied") return;
		const timer = setTimeout(() => setStatus("idle"), 2000);
		return () => clearTimeout(timer);
	}, [status]);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			setStatus("copied");
		} catch {
			setStatus("error");
		}
	}

	return (
		<figure className="api-docs-code">
			<figcaption className="flex items-center justify-between gap-3">
				<span>{label}</span>
				<button
					type="button"
					onClick={copy}
					className="btn-secondary text-xs"
					aria-label={t("copyLabel", { label })}
				>
					{status === "copied" ? t("copied") : t("copy")}
				</button>
			</figcaption>
			<output className="sr-only">{status === "copied" ? t("copied") : ""}</output>
			{status === "error" && <p role="alert" className="px-4 py-2 text-sm text-[var(--error)]">{t("copyFailed")}</p>}
			<pre><code>{code}</code></pre>
		</figure>
	);
}
