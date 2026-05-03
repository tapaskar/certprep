/**
 * Lightweight wrapper around the gtag.js global.
 *
 * Three conversion events wired:
 *   1. Purchase     → fires on /dashboard?upgraded= (active)
 *   2. Lead         → fires on /register success (needs label)
 *   3. Engagement   → fires on first /try-questions answer (needs label)
 *
 * All include Enhanced Conversions data — hashed email passed as
 * `user_data.sha256_email_address`, which Google uses to match
 * conversions to ad clicks even when third-party cookies are blocked.
 * Enhanced Conversions has to be turned ON for each conversion
 * action in the Google Ads UI: Tools → Conversions → action →
 * "Enhanced conversions" toggle. Without that, the user_data is
 * accepted but ignored.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// ── Conversion send_to values ─────────────────────────────────────
//
// Each conversion ACTION in Google Ads has its own label appended to
// the conversion ID. Get them at: Google Ads → Tools → Conversions →
// the action you created → "Tag setup" → look for "AW-XXXXX/LABEL".
//
// Lead and Engagement are scaffolded with empty strings until you
// create the actions in Google Ads and paste their labels here. The
// helper functions no-op when the label is empty, so the call sites
// in /register and /try-questions are safe to ship unactivated.

const GOOGLE_ADS_PURCHASE_SEND_TO = "AW-18051550621/APNcCJHMt5IcEJ2b059D";
const GOOGLE_ADS_LEAD_SEND_TO = ""; // TODO: paste signup conversion label
const GOOGLE_ADS_ENGAGEMENT_SEND_TO = ""; // TODO: paste engagement conversion label

const PLAN_VALUE_USD: Record<string, number> = {
  single: 9.99,
  pro_monthly: 19.99,
  pro_annual: 149.99,
};

// ── Enhanced Conversions: SHA-256 hash of normalized email ────────

/**
 * Google's Enhanced Conversions spec: lowercase, trim, then hash
 * with SHA-256, then hex-encode. Used as user_data.sha256_email_address
 * in the conversion event. Lets Google match the conversion to the
 * ad click on the same hashed identity even without third-party cookies.
 *
 * Returns null if Web Crypto isn't available (very old browser) — the
 * conversion still fires, just without enhanced matching.
 */
async function hashEmailForEnhancedConversions(
  email: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!window.crypto?.subtle) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const buf = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(normalized),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

// ── Internal: dedupe + emit ───────────────────────────────────────

type ConversionPayload = {
  send_to: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
};

async function emitConversion(
  payload: ConversionPayload,
  email: string | undefined,
  dedupeKey: string | null,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  if (!payload.send_to) return; // un-configured action — bail silently

  // Client-side dedupe (Google's transaction_id dedupe is the
  // server-side backstop). Bail if we've already fired this key
  // in the current session.
  if (dedupeKey) {
    try {
      if (sessionStorage.getItem(dedupeKey) === "1") return;
      sessionStorage.setItem(dedupeKey, "1");
    } catch {
      /* sessionStorage unavailable — continue, gtag dedupe is enough */
    }
  }

  // Enhanced Conversions: pass hashed email if available. We use the
  // `set` form rather than per-event `user_data` so Google can also
  // attribute future events on the same page from this user.
  if (email) {
    const sha256 = await hashEmailForEnhancedConversions(email);
    if (sha256) {
      window.gtag("set", "user_data", {
        sha256_email_address: sha256,
      });
    }
  }

  window.gtag("event", "conversion", payload);
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Fire a Google Ads "Purchase" conversion event.
 *
 * Called from /dashboard when ?upgraded=<plan> is present in the URL.
 * Value is derived from the plan; currency is USD (Google Ads handles
 * cross-currency display for INR-account viewers).
 */
export function trackPurchaseConversion(
  plan: string,
  userId: string | undefined,
  email: string | undefined,
): void {
  const value = PLAN_VALUE_USD[plan];
  if (!value) return; // unknown plan — skip rather than fire $0

  const today = new Date().toISOString().slice(0, 10);
  const dedupeKey = `sparkupcloud_conv_purchase_${plan}_${userId ?? "anon"}_${today}`;
  const transactionId = `spk_${plan}_${userId ?? "anon"}_${today}`;

  void emitConversion(
    {
      send_to: GOOGLE_ADS_PURCHASE_SEND_TO,
      value,
      currency: "USD",
      transaction_id: transactionId,
    },
    email,
    dedupeKey,
  );
}

/**
 * Fire a Google Ads "Lead" conversion when a user completes signup.
 *
 * No monetary value (sign-up isn't a sale) — Google Ads will count
 * it as a unit conversion. Per-user dedupe so re-rendering /register
 * after refresh doesn't double-count.
 *
 * NO-OP until GOOGLE_ADS_LEAD_SEND_TO is filled in with the conversion
 * label from Google Ads.
 */
export function trackLeadConversion(
  userId: string,
  email: string | undefined,
): void {
  const today = new Date().toISOString().slice(0, 10);
  void emitConversion(
    {
      send_to: GOOGLE_ADS_LEAD_SEND_TO,
      // Lead conversions can carry a value too (some accounts assign a
      // notional $ value to a signup); leaving unset for now so Google
      // Ads bidding doesn't optimize for fake revenue.
      transaction_id: `spk_lead_${userId}_${today}`,
    },
    email,
    `sparkupcloud_conv_lead_${userId}_${today}`,
  );
}

/**
 * Fire a Google Ads "Engagement" conversion when a user submits their
 * first answer in /try-questions.
 *
 * Captures top-of-funnel engagement that happens BEFORE they create an
 * account. Audience segment use case: retarget visitors who tried a
 * question but didn't sign up.
 *
 * Anonymous (no userId yet — they're pre-signup). We use a per-day
 * sessionStorage dedupe + a stable transaction_id derived from a
 * locally-stored visitor uuid.
 *
 * NO-OP until GOOGLE_ADS_ENGAGEMENT_SEND_TO is filled in.
 */
export function trackEngagementConversion(): void {
  const today = new Date().toISOString().slice(0, 10);
  let visitorId = "";
  try {
    visitorId = localStorage.getItem("sparkupcloud_visitor_id") ?? "";
    if (!visitorId) {
      visitorId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("sparkupcloud_visitor_id", visitorId);
    }
  } catch {
    visitorId = `v_${Date.now()}`;
  }

  void emitConversion(
    {
      send_to: GOOGLE_ADS_ENGAGEMENT_SEND_TO,
      transaction_id: `spk_engage_${visitorId}_${today}`,
    },
    undefined, // no email at try-questions time (user is logged out)
    `sparkupcloud_conv_engage_${visitorId}_${today}`,
  );
}
