/**
 * Auth session cookie — a small, non-HttpOnly cookie that mirrors a subset of
 * the auth state (display_name, plan) so public/SSR pages can detect that the
 * user is logged in without a backend round-trip.
 *
 * The actual JWT lives in localStorage as before. This cookie is only used as
 * a presence/display signal.
 */

export const AUTH_COOKIE_NAME = "sparkupcloud_session";
export const PENDING_PLAN_COOKIE = "sparkupcloud_pending_plan";

export interface AuthCookiePayload {
  e: string; // email
  n: string; // display name
  p: string; // plan
  a?: 1; // is_admin (1 if true, omitted otherwise)
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function isProdHttps(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

export function setAuthCookie(payload: AuthCookiePayload): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(payload));
  const secure = isProdHttps() ? "; Secure" : "";
  document.cookie = `${AUTH_COOKIE_NAME}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readAuthCookie(): AuthCookiePayload | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`)
  );
  if (!m) return null;
  try {
    const decoded = decodeURIComponent(m[1]);
    return JSON.parse(decoded) as AuthCookiePayload;
  } catch {
    return null;
  }
}

// ── Pending plan (preserved across login/register flow) ──────────
export function setPendingPlan(plan: string): void {
  if (typeof document === "undefined") return;
  const secure = isProdHttps() ? "; Secure" : "";
  // Short-lived: 30 minutes
  document.cookie = `${PENDING_PLAN_COOKIE}=${encodeURIComponent(
    plan
  )}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
}

export function readPendingPlan(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${PENDING_PLAN_COOKIE}=([^;]*)`)
  );
  return m ? decodeURIComponent(m[1]) : null;
}

export function clearPendingPlan(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PENDING_PLAN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
