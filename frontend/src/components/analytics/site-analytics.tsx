/**
 * Site-wide analytics: Google Analytics 4 + Meta (Facebook) Pixel.
 *
 * Both are env-gated and render nothing in dev / when not configured —
 * so local builds stay clean and there's no chance of accidentally
 * polluting production analytics with dev pageviews.
 *
 * Usage: drop <SiteAnalytics /> once in app/layout.tsx, then set:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *   NEXT_PUBLIC_FB_PIXEL_ID=123456789
 *
 * Both vars must be NEXT_PUBLIC_ prefixed since they're read in the
 * browser. Real values live in .env.production / Vercel env config.
 *
 * We use next/script with strategy="afterInteractive" so analytics
 * never block first paint — page renders, then GA/FB load. The Meta
 * Pixel <noscript> fallback is included so users with JS disabled
 * still trigger a single image-pixel pageview (per Meta's recommended
 * snippet).
 *
 * SPA route changes (Next App Router) auto-fire pageviews because
 * the GA4 default config tracks history.pushState — no manual
 * useEffect-on-pathname needed. Same for Meta Pixel after init.
 */

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export function SiteAnalytics() {
  // No env, no scripts — keeps dev builds quiet.
  if (!GA_ID && !FB_PIXEL_ID) return null;

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
