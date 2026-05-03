"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { readPendingPlan } from "@/lib/auth-cookie";

export default function VerifyEmailPage() {
  const router = useRouter();
  const setAuthFromToken = useAuthStore((s) => s.setAuthFromToken);

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<"upgrade" | "reset" | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("sparkupcloud_verify_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
    // ?reason= param tells us why the user landed here. Drives the
    // headline copy below so they know what unlocks after they verify.
    const params = new URLSearchParams(window.location.search);
    const r = params.get("reason");
    if (r === "upgrade" || r === "reset") setReason(r);
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (newCode.every((d) => d !== "") && value) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      handleSubmit(pasted);
    }
  };

  const handleSubmit = async (codeStr?: string) => {
    const fullCode = codeStr || code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await api.verifyEmail(email, fullCode);
      setSuccess("Email verified successfully!");
      setAuthFromToken(data.access_token, {
        ...data.user,
        is_admin: false,
        plan: "free",
        active_exam_id: null,
        enrolled_exams: [],
        is_email_verified: true,
      });

      // Defense in depth: most paying users now skip /verify-email
      // entirely (the register page fires checkout straight away). But
      // if someone *does* land here with a pendingPlan — e.g., the
      // register-page fast-path failed, or they came from a different
      // signup origin — fire checkout directly instead of bouncing
      // them through /pricing first. One redirect, not two.
      const pendingPlan = readPendingPlan();
      if (pendingPlan) {
        try {
          const { checkout_url } = await api.createCheckout(pendingPlan);
          // Don't clear pendingPlan here — pricing-cards.tsx clears it
          // when it sees the user post-payment, so a Gumroad-side abort
          // still has the flag for the next signin.
          window.location.href = checkout_url;
          return;
        } catch {
          // Fall through to the destination ladder below
        }
      }

      // Standard post-verify routing. Priority order:
      //   1. Explicit ?redirect= preserved from the register URL
      //   2. They picked a plan via /onboarding flow
      //   3. Default onboarding
      const savedPlan = sessionStorage.getItem("sparkupcloud_selected_plan");
      const savedRedirect = sessionStorage.getItem(
        "sparkupcloud_post_auth_redirect",
      );
      let destination: string;
      if (savedRedirect) {
        destination = savedRedirect;
      } else if (savedPlan) {
        destination = `/onboarding?plan=${savedPlan}`;
      } else {
        destination = "/onboarding";
      }
      sessionStorage.removeItem("sparkupcloud_selected_plan");
      sessionStorage.removeItem("sparkupcloud_post_auth_redirect");
      setTimeout(() => router.push(destination), 1000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Verification failed.";
      if (message.includes("400")) {
        setError("Invalid or expired verification code.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    try {
      // Real resend endpoint — replaces the previous register("") hack
      // that 409'd silently. Surfaces real errors (cooldown, etc.).
      const res = await api.resendVerificationCode();
      setSuccess(res.message);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message.replace(/^API \d+:\s*/, "").replace(/^"|"$/g, "")
          : "Couldn't send code. Try again in a moment.";
      setError(msg);
    }
  };

  // Headline copy based on why the user is here. Without a reason the
  // page just says "Verify your email" — generic. With a reason, lead
  // with what they'll unlock after verifying.
  const headline =
    reason === "upgrade"
      ? "One step to complete your purchase"
      : reason === "reset"
        ? "Verify to reset your password"
        : "Verify your email";
  const subhead =
    reason === "upgrade"
      ? "Confirm your email so we can deliver your invoice and keep your access secure. Takes 30 seconds."
      : reason === "reset"
        ? "We need to confirm we can reach you before resetting your password."
        : null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-md shadow-stone-200/60">
      <h1 className="mb-2 text-center text-2xl font-bold text-stone-900">
        {headline}
      </h1>
      <p className="mb-2 text-center text-sm text-stone-500">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-stone-700">{email || "your email"}</span>
      </p>
      {subhead && (
        <p className="mb-4 text-center text-xs text-stone-500 leading-relaxed">
          {subhead}
        </p>
      )}

      <div className="mb-6 flex justify-center gap-2" onPaste={handlePaste}>
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="h-14 w-12 rounded-lg border border-stone-300 text-center text-2xl font-bold text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        ))}
      </div>

      {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}
      {success && (
        <p className="mb-4 text-center text-sm text-green-600">{success}</p>
      )}

      <button
        onClick={() => handleSubmit()}
        disabled={loading || code.some((d) => !d)}
        className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-3 font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Verifying..." : "Verify Email"}
      </button>

      <div className="mt-4 text-center">
        <button
          onClick={handleResend}
          className="text-sm text-amber-600 hover:text-amber-700"
        >
          Resend code
        </button>
      </div>
    </div>
  );
}
