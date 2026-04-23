import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "VTC Calendar | Class Schedule",
  description:
    "View your VTC class schedule on a beautiful calendar and export it to your favorite calendar app.",
  icons: {
    icon: [{ url: "/vtctimetable.svg", type: "image/svg+xml", sizes: "any" }],
  },
};

// Root layout — owns <html> and <body> as required by Next.js 16.
// Uses getLocale() from next-intl/server to set the correct lang attribute.
// [locale]/layout.tsx provides NextIntlClientProvider and Providers (no html/body).
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
