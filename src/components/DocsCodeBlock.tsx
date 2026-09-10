/** Captioned code sample shared by the pages under /docs. */
export default function DocsCodeBlock({ label, code }: { label: string; code: string }) {
	return (
		<figure className="api-docs-code">
			<figcaption>{label}</figcaption>
			<pre><code>{code}</code></pre>
		</figure>
	);
}
