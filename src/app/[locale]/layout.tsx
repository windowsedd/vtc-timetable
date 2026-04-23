import Providers from "@/components/Providers";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import "../globals.css";

const locales = ["en", "zh-HK"] as const;

// [locale] layout — wraps pages with i18n and theme providers.
// Does NOT include <html> or <body> — those are in app/layout.tsx.
export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // Validate locale
    if (!locales.includes(locale as (typeof locales)[number])) {
        notFound();
    }

    // Dynamically import the correct message file based on locale
    const messages = (await import(`../../../messages/${locale}.json`)).default;

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>{children}</Providers>
        </NextIntlClientProvider>
    );
}
