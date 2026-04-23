import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// In Next.js 16, this file is named proxy.ts instead of middleware.ts
export default createMiddleware(routing);

export const config = {
    // Match all paths except Next.js internals, API routes, and static files
    matcher: ["/((?!api|_next|.*\\..*).*)"],
};
