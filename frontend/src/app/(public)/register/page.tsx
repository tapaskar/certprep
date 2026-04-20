"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [plan, setPlan] = useState<string | null>(null);

  // Persist plan intent through auth flow
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("plan");
    if (p) {
      setPlan(p);
      sessionStorage.setItem("sparkupcloud_selected_plan", p);
    }
  }, []);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await register(displayName, email, password);
      sessionStorage.setItem("sparkupcloud_verify_email", email);
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
      <h1 className="mb-2 text-center text-2xl font-bold text-stone-900">
        Create your account
      </h1>
      <p className="mb-6 text-center text-sm text-stone-500">
        Start mastering your certification exam today
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 p-3 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Your name"
          />
        </div>

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
          <p className="mt-1 text-xs text-stone-400">
            Must be at least 8 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-stone-700"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-300 p-3 pr-11 text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Confirm your password"
            />
          </div>
        </div>

        {/* Terms of Service */}
        <label className="flex items-start gap-2 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
          />
          <span className="text-xs text-stone-600 leading-relaxed">
            I agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-amber-600 hover:text-amber-700 underline"
            >
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-amber-600 hover:text-amber-700 underline"
            >
              Privacy Policy
            </Link>
            . I&apos;m at least 16 years old.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !acceptedTerms}
          className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="mt-6 border-t border-stone-200 pt-4 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link
          href={plan ? `/login?redirect=${encodeURIComponent("/onboarding?plan=" + plan)}` : "/login"}
          className="font-medium text-amber-600 hover:text-amber-700"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
