import { NextResponse, type NextRequest } from "next/server";

/**
 * Sets `X-Robots-Tag: noindex, nofollow` on every authenticated route.
 *
 * Why: routes like /dashboard, /study/*, /onboarding, /paths/[id], and
 * /mock-exam are gated behind auth at the app layer — but Google can
 * still discover them via internal links and bot-bypass paths. If they
 * get indexed (even with thin content because the bot sees a login
 * redirect), they dilute the site's authority signal across dozens of
 * URLs that should never compete for SEO attention.
 *
 * The header is the cleanest tool here: it's response-level (fires on
 * every render including JSON/RSC payloads), respected by every major
 * crawler, and doesn't require touching every individual page's
 * metadata. Marketing pages (homepage, /exams, /pricing, /blog) are
 * untouched and stay fully indexable.
 *
 * Path matching uses prefix patterns — see `config.matcher` below.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/study/:path*",
    "/onboarding/:path*",
    "/mock-exam/:path*",
    "/profile/:path*",
    "/progress/:path*",
    "/admin/:path*",
    // /paths/[id] is auth-gated but the listing /paths should remain
    // indexable once it's exposed publicly. Today /paths is also
    // auth-gated; revisit when that changes.
    "/paths/:path*",
  ],
};
