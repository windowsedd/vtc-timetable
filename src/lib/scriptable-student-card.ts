type ScriptableQrCopy = {
	title: string;
	tokenPrompt: string;
	save: string;
	cancel: string;
	done: string;
	expired: string;
	seconds: string;
	appOnly: string;
	failed: string;
	invalidToken: string;
	tokenRejected: string;
	qrAccessRequired: string;
	requestBlocked: string;
	vtcTokenMissing: string;
	changeToken: string;
	openSettings: string;
};

export function scriptableStudentCardExample(copy: ScriptableQrCopy): string {
	return `// Run inside the Scriptable app.
const endpoint = "https://vtc.windowsed.me/api/student-card/qr";
const keychainKey = "vtc-timetable-qr-api-token";
const text = ${JSON.stringify(copy, null, 2)};
const errors = {
  appOnly: text.appOnly,
  invalidToken: text.invalidToken,
  unauthenticated: text.tokenRejected,
  regenerate_token: text.qrAccessRequired,
  no_token: text.vtcTokenMissing,
  blocked: text.requestBlocked,
  failed: text.failed,
};

async function main(replaceToken = false) {
  if (!config.runsInApp) throw new Error("appOnly");
  if (replaceToken || !Keychain.contains(keychainKey)) {
    const prompt = new Alert();
    prompt.title = text.title;
    prompt.message = text.tokenPrompt;
    prompt.addSecureTextField("vtct_…");
    prompt.addAction(text.save);
    prompt.addCancelAction(text.cancel);
    if (await prompt.presentAlert() === -1) return;
    const token = prompt.textFieldValue(0).trim();
    if (!/^vtct_[A-Za-z0-9_-]{32}$/.test(token)) {
      throw new Error("invalidToken");
    }
    Keychain.set(keychainKey, token);
  }

  const request = new Request(endpoint);
  request.headers = { Authorization: "Bearer " + Keychain.get(keychainKey) };
  request.timeoutInterval = 20;
  request.onRedirect = () => null;
  const started = Date.now();
  const data = await request.load();
  const response = request.response;
  if (response.statusCode !== 200) {
    let code;
    try {
      code = JSON.parse(data.toRawString())?.error;
    } catch {
      // A proxy can return HTML instead of an API error. Keep the saved token.
    }
    if (response.statusCode === 401 && code === "unauthenticated") {
      Keychain.remove(keychainKey);
      throw new Error("unauthenticated");
    }
    if (response.statusCode === 403) {
      throw new Error(code === "regenerate_token" ? "regenerate_token" : "blocked");
    }
    if (response.statusCode === 409 && code === "no_token") throw new Error("no_token");
    throw new Error("failed");
  }
  const headers = Object.fromEntries(
    Object.entries(response.headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  const lifetime = Number(headers["x-qr-remaining-ms"]);
  const elapsed = Date.now() - started;
  if (headers["content-type"] !== "image/png" ||
      !Number.isFinite(lifetime) || lifetime <= 0 || lifetime > 60000 ||
      elapsed < 0 || elapsed >= lifetime) {
    throw new Error("failed");
  }

  const view = new WebView();
  await view.loadHTML(\`<!doctype html>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 24px; text-align: center; font: 18px system-ui; background: white; color: black; }
  img { width: min(100%, 320px); height: auto; }
</style>
<img id="qr" hidden alt="QR">
<p id="status" role="status"></p>
<script>
  const qr = document.getElementById("qr");
  const status = document.getElementById("status");
  const deadline = \${started + lifetime};
  const monotonicDeadline = performance.now() + Math.max(0, deadline - Date.now());
  const expired = \${JSON.stringify(text.expired)};
  const seconds = \${JSON.stringify(text.seconds)};
  let shown = false;
  function hide() {
    qr.hidden = true;
    qr.removeAttribute("src");
    status.textContent = expired;
    clearInterval(timer);
  }
  function tick() {
    const left = Math.min(deadline - Date.now(), monotonicDeadline - performance.now());
    if (left <= 0 || (shown && document.hidden)) return hide();
    if (document.hidden) return;
    qr.hidden = false;
    shown = true;
    status.textContent = Math.ceil(left / 1000) + " " + seconds;
  }
  const timer = setInterval(tick, 250);
  document.addEventListener("visibilitychange", () => shown ? hide() : tick());
  qr.src = "data:image/png;base64,\${data.toBase64String()}";
  tick();
</script>\`);
  await view.present();
}

let replaceToken = false;
while (true) {
  try {
    await main(replaceToken);
    break;
  } catch (error) {
    const alert = new Alert();
    alert.title = text.title;
    const code = error?.message;
    alert.message = Object.keys(errors).includes(code) ? errors[code] : text.failed;
    alert.addAction(text.done);
    const canReplace = ["invalidToken", "unauthenticated", "regenerate_token"].includes(code);
    if (canReplace) {
      alert.addAction(text.openSettings);
      alert.addAction(text.changeToken);
    }
    const choice = await alert.presentAlert();
    if (!canReplace || (choice !== 1 && choice !== 2)) break;
    if (choice === 1) await Safari.openInApp("https://vtc.windowsed.me/settings#api", false);
    replaceToken = true;
  }
}
Script.complete();`;
}
