import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    locales: ["en", "zh-HK"],
    defaultLocale: "en",
    localePrefix: "always", // / → /en, /zh-HK stays as /zh-HK
});

export type Locale = (typeof routing.locales)[number];
