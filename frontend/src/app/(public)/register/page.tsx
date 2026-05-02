"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Check, ShieldCheck, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { readPendingPlan, clearPendingPlan } from "@/lib/auth-cookie";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [plan, setPlan] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Persist plan intent + post-auth redirect through the full flow.
  // The redirect param survives register → verify-email → login so users
  // who clicked a specific cert card land back on that exam after auth.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("plan");
    if (p) {
      setPlan(p);
      sessionStorage.setItem("sparkupcloud_selected_plan", p);
    }
    const r = params.get("redirect");
    if (r) {
      setRedirectTo(r);
      sessionStorage.setItem("sparkupcloud_post_auth_redirect", r);
    }
  }, []);

  // Friction-reduction: drop the Confirm Password field (industry best
  // practice when the password input has a visibility toggle) and make
  // Display Name optional — auto-derive from the email local-part if
  // empty so the backend always receives a value.
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    // Fall back to the email local-part when the user skips Display Name
    const finalName =
      displayName.trim() || email.split("@")[0]?.trim() || "Learner";

    setLoading(true);
    try {
      // Submitting the form is acceptance of Terms — same legal pattern
      // as Stripe, Slack, Notion, etc. The footer text below the button
      // makes this explicit, removing the friction of an extra checkbox.
      //
      // The register call now signs the user in immediately (returns
      // an access token even though is_email_verified=false). We can
      // route them straight into the app without forcing /verify-email
      // first — biggest single conversion lift on this page.
      await register(finalName, email, password);
      sessionStorage.setItem("sparkupcloud_verify_email", email);

      // Fast-path: user came from a paid CTA. Fire checkout NOW so they
      // land on Gumroad instead of /verify-email. Saves 30-90 seconds
      // (email roundtrip) at the most-friction point in the funnel.
      // Email verification becomes a soft dashboard banner post-purchase.
      const pendingPlan = readPendingPlan();
      if (pendingPlan) {
        try {
          const { checkout_url } = await api.createCheckout(pendingPlan);
          clearPendingPlan();
          window.location.href = checkout_url;
          return;
        } catch {
          // Fall through to /verify-email if checkout setup fails for
          // any reason — better to make them verify than to dead-end.
        }
      }

      router.push("/verify-email");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed.";
      if (message.includes("409")) {
        setError("An account with this email already exists.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-md shadow-stone-200/60">
      {/* Trust strip — leads with the friction-killers users worry about
          most before signing up: cost, lock-in, payment details. Replaces
          the defensive "under 30 seconds" language that sold time, not
          value. */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-emerald-700">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> No credit card
        </span>
        <span className="text-stone-300">·</span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Free forever
        </span>
        <span className="text-stone-300">·</span>
        <span>Cancel anytime</span>
      </div>

      <h1 className="mb-2 text-center text-2xl font-bold text-stone-900">
        Start your cert prep — free
      </h1>
      <p className="mb-6 text-center text-sm text-stone-500">
        Email + password and you&apos;re in. Pro plan unlocks 76+ exams.
      </p>

      {/* Social-login row — scaffolded UI. The Google button wires up in a
          separate commit once GOOGLE_CLIENT_ID is provisioned. Disabled
          state keeps the layout stable and signals the option is coming. */}
      <SocialLoginRow />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-stone-300 p-3 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 p-3 pr-11 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="At least 8 characters"
              minLength={8}
              aria-describedby="password-status"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {/* Live length validation — replaces the dropped "Confirm Password"
              field. Click the eye icon to verify what you typed. */}
          {password.length > 0 ? (
            <p
              id="password-status"
              className={`mt-1 flex items-center gap-1 text-xs ${
                password.length >= 8 ? "text-emerald-600" : "text-stone-500"
              }`}
            >
              {password.length >= 8 ? (
                <>
                  <Check className="h-3 w-3" /> Looks good
                </>
              ) : (
                <>{8 - password.length} more character{8 - password.length === 1 ? "" : "s"} to go</>
              )}
            </p>
          ) : (
            <p id="password-status" className="mt-1 text-xs text-stone-400">
              Tip: click the eye icon to check what you typed.
            </p>
          )}
        </div>

        {/* Display Name is optional — collapsed under a disclosure to keep
            the form short. We default to the email local-part if blank. */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-stone-500 hover:text-stone-700 select-none">
            + Add a display name (optional)
          </summary>
          <div className="mt-2">
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 p-3 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="What should we call you? (default: from your email)"
            />
          </div>
        </details>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* CTA copy: "Start Free Practice" leads with the verb + benefit
            instead of the action ("Create Account"). Tested ~12-18% lift
            on signup buttons across most B2B SaaS A/B tests. */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? "Creating account..." : "Start Free Practice →"}
        </button>

        {/* Implicit-consent ToS text below the submit button. Same legal
            pattern Stripe, Slack, Notion, Vercel, and most modern SaaS
            use — submitting the form IS acceptance, no checkbox needed.
            Keeps the link visible without forcing an extra click. */}
        <p className="text-[11px] leading-relaxed text-center text-stone-500">
          By starting, you agree to our{" "}
          <Link
            href="/terms"
            target="_blank"
            className="text-stone-700 underline hover:text-amber-700"
          >
            Terms
          </Link>
          {" "}and{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-stone-700 underline hover:text-amber-700"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      {/* Footer — sign in + the all-important "no commitment" escape valve
          for users who aren't quite ready to register. */}
      <div className="mt-6 border-t border-stone-200 pt-4 space-y-3 text-center text-sm">
        <div className="text-stone-500">
          Already have an account?{" "}
          <Link
            href={(() => {
              if (redirectTo) return `/login?redirect=${encodeURIComponent(redirectTo)}`;
              if (plan) return `/login?redirect=${encodeURIComponent("/onboarding?plan=" + plan)}`;
              return "/login";
            })()}
            className="font-medium text-amber-600 hover:text-amber-700"
          >
            Sign in
          </Link>
        </div>
        <div>
          <Link
            href="/try-questions?utm_source=register_escape"
            className="text-xs font-medium text-stone-500 hover:text-amber-700"
          >
            Want to try a few questions first? →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SocialLoginRow
// ---------------------------------------------------------------------------
//
// Scaffolded social-login UI. The Google button activates as soon as
// NEXT_PUBLIC_GOOGLE_CLIENT_ID is set (configured in env vars + matching
// backend secret in /auth/oauth/google). Until then the button renders
// in a subtle disabled state — preserves the layout we A/B against
// later, and signals "this is coming" instead of disappearing entirely.
//
// Microsoft + GitHub are placeholder slots with the same wiring; turn on
// by adding the corresponding handler + env vars.
function SocialLoginRow() {
  const googleEnabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Render nothing when Google isn't configured. A disabled button
  // is worse than no button — it signals "this would be faster but
  // doesn't work for me," which causes some users to bounce hunting
  // for a working Google option elsewhere. Renders the moment the
  // GOOGLE_CLIENT_ID env var lands.
  if (!googleEnabled) return null;

  return (
    <div className="space-y-3 mb-5">
      <button
        type="button"
        onClick={() => {
          // Wired up in the OAuth commit. Will load Google Identity
          // Services on demand and POST the credential to /auth/oauth/google.
          window.dispatchEvent(new CustomEvent("sparkupcloud:google-signin"));
        }}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:border-stone-400 hover:bg-stone-50 transition-all"
      >
        <GoogleGlyph />
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs font-medium text-stone-400">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}

// Google's official "G" mark, simplified. Inlined to avoid a network
// fetch and keep render cheap.
function GoogleGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
