/**
 * Lightweight wrapper around the gtag.js global so call sites don't
 * have to deal with `window.gtag` typing or check for undefined.
 *
 * The script tags themselves live in components/analytics/site-
 * analytics.tsx — this module just provides typed access to the
 * already-loaded gtag function.
 */

// gtag.js is loaded by next/script with strategy="afterInteractive"
// so it may not exist on initial render. Every helper here checks.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// ── Google Ads (AW-) ──────────────────────────────────────────────

/**
 * The single Google Ads conversion ID + label for tracking purchases.
 * Hardcoded because the conversion label comes from the Google Ads
 * console — there's no reason this would change per environment.
 *
 * If we add separate conversion actions later (lead/signup,
 * trial-start, etc.), each gets its own constant here.
 */
const GOOGLE_ADS_PURCHASE_SEND_TO = "AW-18051550621/APNcCJHMt5IcEJ2b059D";

/** USD prices per plan, matching Gumroad checkout. */
const PLAN_VALUE_USD: Record<string, number> = {
  single: 9.99,
  pro_monthly: 19.99,
  pro_annual: 149.99,
};

/**
 * Fire a Google Ads "Purchase" conversion event.
 *
 * Idempotent per session — sessionStorage flag prevents the same
 * (user, plan, day) tuple from firing twice if the user refreshes
 * the post-purchase page. Google Ads dedupes by transaction_id too
 * (we pass a stable one), so even cross-session refreshes within
 * Google's window won't double-count.
 *
 * Safe to call before gtag.js has loaded — exits cleanly.
 *
 * @param plan internal plan id ("single" | "pro_monthly" | "pro_annual")
 * @param userId stable identifier for the buyer (used in transaction_id)
 */
export function trackPurchaseConversion(
  plan: string,
  userId: string | undefined,
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  const value = PLAN_VALUE_USD[plan];
  if (!value) return; // unknown plan — skip rather than fire $0

  // Dedupe key: per-user, per-plan, per-day. A buyer who upgrades the
  // same plan twice on the same day (e.g., refund then re-buy) would
  // dedupe — fine, that's the correct behavior since Google Ads
  // counts both as the same conversion attempt anyway.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dedupeKey = `sparkupcloud_conv_purchase_${plan}_${userId ?? "anon"}_${today}`;
  try {
    if (sessionStorage.getItem(dedupeKey) === "1") return;
    sessionStorage.setItem(dedupeKey, "1");
  } catch {
    // sessionStorage unavailable (Safari private mode, etc.) — fire
    // anyway. Google Ads' transaction_id dedupe will catch us.
  }

  // transaction_id should be unique per actual purchase. We don't have
  // Gumroad's sale_id on the frontend, so build a stable one from the
  // dedupe key. Same buyer + same plan + same day = same id.
  const transactionId = `spk_${plan}_${userId ?? "anon"}_${today}`;

  window.gtag("event", "conversion", {
    send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
    value,
    currency: "USD",
    transaction_id: transactionId,
  });
}
