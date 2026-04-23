import { redirect } from "next/navigation";

// Fallback: if proxy.ts doesn't intercept `/`, this page immediately
// redirects to the default locale. Harmless double-redirect otherwise.
export default function RootPage() {
    redirect("/en");
}
