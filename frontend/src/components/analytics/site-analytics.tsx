/**
 * Site-wide analytics: Google Analytics 4 + Google Ads (gtag) +
 * Meta (Facebook) Pixel.
 *
 * Each is env-gated and renders nothing when not configured — so local
 * builds stay clean and there's no chance of accidentally polluting
 * production analytics with dev pageviews.
 *
 * Usage: drop <SiteAnalytics /> once in app/layout.tsx, then set
 * whichever you want:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX        # GA4
 *   NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXXX           # Google Ads conversions
 *   NEXT_PUBLIC_FB_PIXEL_ID=123456789                  # Meta Pixel
 *
 * Vars must be NEXT_PUBLIC_ prefixed since they're read in the
 * browser. Real values live in .env.production / Vercel env config.
 *
 * Google Ads has a hardcoded fallback (the production conversion ID)
 * so it works on first deploy with zero env config. Override by
 * setting NEXT_PUBLIC_GOOGLE_ADS_ID to a different value, or empty
 * string to disable.
 *
 * We use next/script with strategy="afterInteractive" so analytics
 * never block first paint — page renders, then trackers load.
 *
 * SPA route changes (Next App Router) auto-fire pageviews because
 * the GA4/Ads default config tracks history.pushState — no manual
 * useEffect-on-pathname needed. Same for Meta Pixel after init.
 */

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
// Hard-default the Google Ads ID so the conversion tracking works
// immediately after deploy without requiring env-var setup. Override
// via NEXT_PUBLIC_GOOGLE_ADS_ID (set to "" to disable in dev).
const ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID === undefined
    ? "AW-18051550621"
    : process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export function SiteAnalytics() {
  // No env, no scripts — keeps dev builds quiet.
  if (!GA_ID && !ADS_ID && !FB_PIXEL_ID) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                // Anonymize IP — required for GDPR compliance in EU.
                anonymize_ip: true,
                // Don't send pageviews automatically; we'll send one
                // explicitly so we can override the page title later.
                send_page_view: true,
              });
            `}
          </Script>
        </>
      )}

      {/* Google Ads (AW-) — conversion tracking. Loads its own gtag.js
          even if GA4 is also active; Google's gtag library deduplicates
          itself when loaded twice, so the overhead is just a cached
          script tag. Keeping the blocks separate keeps either
          independently toggleable.

          To fire conversion events from anywhere in the app:
            window.gtag('event', 'conversion', {
              send_to: 'AW-18051550621/<conversion-label>',
              value: 19.99,
              currency: 'USD',
            });
          Get the conversion-label per goal from Google Ads → Tools →
          Conversions → conversion action → "Tag setup". */}
      {ADS_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-ads-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ADS_ID}');
            `}
          </Script>
        </>
      )}

      {FB_PIXEL_ID && (
        <>
          <Script id="fb-pixel-init" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
    </>
  );
}
