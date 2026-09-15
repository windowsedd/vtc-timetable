import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import en from "../../messages/en.json";
import zh from "../../messages/zh-HK.json";
import { scriptableStudentCardExample } from "./scriptable-student-card";

async function runSample(copy = en.apiDocs.scriptable, status = 200, lifetime = "60000", elapsed = 1000,
	options: { body?: string; firstRun?: boolean; promptValue?: string; changeToken?: boolean; openSettings?: boolean; recover?: boolean; cancelPrompt?: boolean } = {}) {
	let now = 1_000_000;
	let savedToken = options.firstRun ? "" : `vtct_${"a".repeat(32)}`;
	let html = "";
	let alert = "";
	let prompts = 0;
	let requests = 0;
	let errorsShown = 0;
	const openedUrls: string[] = [];
	const clock = class extends Date { static now() { return now; } };
	await runInNewContext(`(async () => { ${scriptableStudentCardExample(copy)} })()`, {
		Date: clock,
		config: { runsInApp: true },
		Keychain: {
			contains: () => Boolean(savedToken),
			get: () => savedToken,
			set: (_key: string, value: string) => { savedToken = value; },
			remove: () => { savedToken = ""; },
		},
		Request: class {
			headers?: { Authorization: string };
			response = { statusCode: status, headers: { "Content-Type": "image/png", "X-QR-Remaining-Ms": lifetime } };
			constructor(url: string) { assert.equal(url, "https://vtc.windowsed.me/api/student-card/qr"); }
			async load() {
				assert.equal(this.headers?.Authorization, `Bearer ${savedToken}`);
				requests++;
				if (options.recover && requests > 1) this.response.statusCode = 200;
				now += elapsed;
				return {
					toBase64String: () => "c3ludGhldGlj",
					toRawString: () => options.body ?? JSON.stringify({
						error: status === 401 ? "unauthenticated" : status === 403 ? "regenerate_token" : status === 409 ? "no_token" : "unavailable",
					}),
				};
			}
		},
		Safari: { openInApp: async (url: string) => { openedUrls.push(url); } },
		WebView: class {
			async loadHTML(value: string) { html = value; }
			async present() {}
		},
		Alert: class {
			message = "";
			isPrompt = false;
			actions: string[] = [];
			addAction(label: string) { this.actions.push(label); }
			addCancelAction() {}
			addSecureTextField() { this.isPrompt = true; }
			textFieldValue() { return options.promptValue ?? `vtct_${"b".repeat(32)}`; }
			async presentAlert() {
				if (this.isPrompt) {
					prompts++;
					return options.cancelPrompt ? -1 : 0;
				}
				alert = this.message;
				errorsShown++;
				if (errorsShown === 1 && options.openSettings) return this.actions.indexOf(copy.openSettings);
				if (errorsShown === 1 && options.changeToken) return this.actions.indexOf(copy.changeToken);
				return 0;
			}
		},
		Script: { complete() {} },
	});
	return { html, alert, savedToken, now, prompts, requests, openedUrls };
}

test("both localized Scriptable samples fetch with bearer auth and keep the token out of the preview", async () => {
	for (const copy of [en.apiDocs.scriptable, zh.apiDocs.scriptable]) {
		const result = await runSample(copy);
		assert.equal(result.alert, "");
		assert.ok(result.html.includes("data:image/png;base64,c3ludGhldGlj"));
		assert.ok(!result.html.includes(result.savedToken));
	}
});

test("Scriptable rejects errors and expired or invalid lifetimes before showing an image", async () => {
	for (const status of [401, 403, 409, 500, 502]) {
		const result = await runSample(en.apiDocs.scriptable, status);
		assert.equal(result.html, "");
		assert.ok(result.alert);
		assert.equal(result.savedToken === "", status === 401);
	}
	for (const lifetime of ["", "NaN", "0", "1000", "60001"]) {
		assert.equal((await runSample(en.apiDocs.scriptable, 200, lifetime)).html, "");
	}
	assert.equal((await runSample(en.apiDocs.scriptable, 200, "60000", -1000)).html, "");
});

test("a blocked request preserves the entered token instead of sending the user back to the token prompt", async () => {
	for (const body of ["<html>Cloudflare access denied</html>", '{"title":"Access denied","status":403}']) {
		const result = await runSample(en.apiDocs.scriptable, 403, "60000", 1000, { body, firstRun: true });
		assert.equal(result.prompts, 1);
		assert.equal(result.requests, 1);
		assert.equal(result.savedToken, `vtct_${"b".repeat(32)}`);
		assert.equal(result.html, "");
		assert.equal(result.alert, en.apiDocs.scriptable.requestBlocked);
	}
});

test("distinguishes a rejected token from missing QR permission and missing VTC credentials", async () => {
	for (const copy of [en.apiDocs.scriptable, zh.apiDocs.scriptable]) {
		assert.equal((await runSample(copy, 401)).alert, copy.tokenRejected);
		assert.equal((await runSample(copy, 403)).alert, copy.qrAccessRequired);
		assert.equal((await runSample(copy, 409)).alert, copy.vtcTokenMissing);
		const invalid = await runSample(copy, 200, "60000", 1000, { firstRun: true, promptValue: "vtct_abcd…wxyz" });
		assert.equal(invalid.alert, copy.invalidToken);
		assert.equal(invalid.requests, 0);
	}
});

test("only an API token rejection clears a saved key; replacing it stores the new key", async () => {
	const rejectedByProxy = await runSample(en.apiDocs.scriptable, 401, "60000", 1000, { body: "<html>unauthorized</html>" });
	assert.ok(rejectedByProxy.savedToken);
	const changed = await runSample(en.apiDocs.scriptable, 403, "60000", 1000, { changeToken: true });
	assert.equal(changed.savedToken, `vtct_${"b".repeat(32)}`);
	assert.equal(changed.alert, en.apiDocs.scriptable.qrAccessRequired);
	const unknown = await runSample(en.apiDocs.scriptable, 500, "60000", 1000, { body: '{"error":"sensitive upstream details"}' });
	assert.equal(unknown.alert, en.apiDocs.scriptable.failed);
});

test("the QR permission alert opens Settings and then accepts a replacement token in the same run", async () => {
	for (const copy of [en.apiDocs.scriptable, zh.apiDocs.scriptable]) {
		const result = await runSample(copy, 403, "60000", 1000, { openSettings: true, recover: true });
		assert.deepEqual(result.openedUrls, ["https://vtc.windowsed.me/settings#api"]);
		assert.equal(result.prompts, 1);
		assert.equal(result.requests, 2);
		assert.ok(result.html);
	}
});

test("cancelling a token replacement preserves the existing token", async () => {
	const result = await runSample(en.apiDocs.scriptable, 403, "60000", 1000, { changeToken: true, cancelPrompt: true });
	assert.equal(result.savedToken, `vtct_${"a".repeat(32)}`);
	assert.equal(result.prompts, 1);
	assert.equal(result.requests, 1);
});

test("first-run Save stores the full token and proceeds to the QR preview", async () => {
	const result = await runSample(en.apiDocs.scriptable, 200, "60000", 1000, {
		firstRun: true, promptValue: `  vtct_${"b".repeat(32)}  `,
	});
	assert.equal(result.prompts, 1);
	assert.equal(result.requests, 1);
	assert.equal(result.savedToken, `vtct_${"b".repeat(32)}`);
	assert.ok(result.html);
	assert.equal(result.alert, "");
});

test("preview hides expired and backgrounded images and waits until visible before first display", async () => {
	const result = await runSample();
	const code = /<script>([\s\S]*?)<\/script>/.exec(result.html)?.[1];
	assert.ok(code);
	for (const scenario of ["expired", "background", "initiallyHidden", "clockBackwards"]) {
		let now = result.now;
		let monotonic = 0;
		let interval: (() => void) | undefined;
		let visibility: (() => void) | undefined;
		const image = { hidden: true, src: "", removeAttribute() { this.src = ""; } };
		const status = { textContent: "" };
		const document = {
			hidden: scenario === "initiallyHidden",
			getElementById: (id: string) => id === "qr" ? image : status,
			addEventListener: (_name: string, listener: () => void) => { visibility = listener; },
		};
		runInNewContext(code, {
			document,
			Date: class extends Date { static now() { return now; } },
			performance: { now: () => monotonic },
			setInterval: (callback: () => void) => { interval = callback; return 1; },
			clearInterval: () => { interval = undefined; },
		});
		if (scenario === "initiallyHidden") {
			assert.equal(image.hidden, true);
			document.hidden = false;
			visibility?.();
			assert.equal(image.hidden, false);
			continue;
		}
		assert.equal(image.hidden, false);
		assert.equal(status.textContent, "59 seconds remaining");
		if (scenario === "background") {
			document.hidden = true;
			visibility?.();
			document.hidden = false;
			visibility?.();
		} else {
			now += scenario === "clockBackwards" ? -60_000 : 59_000;
			monotonic += 59_000;
			interval?.();
		}
		assert.equal(image.hidden, true);
		assert.equal(image.src, "");
		assert.equal(status.textContent, en.apiDocs.scriptable.expired);
		assert.equal(interval, undefined);
	}
});
