"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, X, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { readAuthCookie } from "@/lib/auth-cookie";

/**
 * Site-wide floating support button + contact form modal.
 *
 * Mounted once in app/layout.tsx (alongside ExitIntentPopup) so it's
 * available on every page without each route having to opt in.
 *
 * Why a FAB rather than a footer link or a dedicated /contact page
 * (which already exists):
 *   - Footer is below the fold; users in trouble shouldn't have to
 *     scroll to find help
 *   - /contact is a destination page; users in the middle of doing
 *     something don't want to lose their context
 *   - A bottom-right FAB → modal is the universally-recognized
 *     "help" pattern (Intercom, Drift, Crisp all do this)
 *
 * Auto-fills name + email when the visitor is logged in (reads from
 * auth-store + cookie fallback). Logged-out visitors see editable
 * empty fields.
 *
 * Hidden on:
 *   - The /contact page itself (the page IS the form)
 *   - /admin/* (no need on internal tools)
 *   - When the exit-intent popup is open (would stack visually)
 *
 * Captures the page URL the user was on, sends it as part of the
 * subject line — gives ops context without an extra form field.
 */

const SUPPORT_FAB_DISMISS_KEY = "sparkupcloud_support_fab_dismissed";

export function SupportFab() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Pre-fill from logged-in state. Cookie fallback covers the brief
  // window before zustand hydrates so the form isn't empty if you
  // open it within the first ~50ms of page load.
  const cookieAuth = typeof window !== "undefined" ? readAuthCookie() : null;
  const defaultName = user?.display_name ?? cookieAuth?.n ?? "";
  const defaultEmail = user?.email ?? cookieAuth?.e ?? "";

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  // Re-sync defaults if the user logs in while the FAB is open
  useEffect(() => {
    if (user && !name) setName(user.display_name);
    if (user && !email) setEmail(user.email);
  }, [user, name, email]);

  // Hide FAB on routes where it would be redundant or annoying
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const HIDE_PATHS = ["/contact", "/admin"];
    setHidden(HIDE_PATHS.some((p) => path.startsWith(p)));
  }, []);

  // ESC closes the modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorText("Please fill in your name, email and message.");
      setStatus("error");
      return;
    }
    setSubmitting(true);
    setErrorText(null);
    try {
      // Append the page URL to the subject so ops knows where the
      // user was when they clicked Help. Saves a back-and-forth.
      const pagePath =
        typeof window !== "undefined" ? window.location.pathname : "";
      const finalSubject = subject.trim()
        ? `${subject.trim()} (from ${pagePath})`
        : `Support request (from ${pagePath})`;

      await api.sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: finalSubject,
        message: message.trim(),
      });
      setStatus("success");
      // Auto-close after a short pause so the user sees the success
      // state register, then the modal disappears so they can resume
      // whatever they were doing.
      setTimeout(() => {
        setOpen(false);
        // Reset for the next time they open it
        setSubject("");
        setMessage("");
        setStatus("idle");
      }, 2000);
    } catch (err) {
      setErrorText(
        err instanceof Error
          ? `Couldn't send: ${err.message}`
          : "Couldn't send. Try emailing admin@sparkupcloud.com directly.",
      );
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(SUPPORT_FAB_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // Honor session-level dismissal (if user closed the FAB earlier)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SUPPORT_FAB_DISMISS_KEY) === "1") {
      setHidden(true);
    }
  }, []);

  if (hidden) return null;

  return (
    <>
      {/* Floating button — bottom-right, above any other floating UI */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Get support"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/40 px-4 py-3 text-sm font-bold transition-transform hover:scale-105"
        >
          <LifeBuoy className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <LifeBuoy className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    How can we help?
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Typically reply within a few hours.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            {status === "success" ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <p className="mt-3 text-sm font-bold text-stone-900">
                  Sent! We&apos;ll reply to {email}.
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  This window will close in a moment.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-stone-700">
                      Name
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-stone-700">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[11px] font-semibold text-stone-700">
                    Subject (optional)
                  </span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What's this about?"
                    maxLength={120}
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold text-stone-700">
                    Message
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's going on. The more detail, the faster we can help."
                    rows={5}
                    maxLength={2000}
                    className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                    required
                  />
                  <div className="mt-1 text-[10px] text-stone-400 text-right">
                    {message.length}/2000
                  </div>
                </label>

                {status === "error" && errorText && (
                  <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700">{errorText}</p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    Hide for this session
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-60"
                  >
                    {submitting ? (
                      "Sending..."
                    ) : (
                      <>
                        Send message
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-stone-400 text-center pt-1">
                  Or email{" "}
                  <a
                    href="mailto:admin@sparkupcloud.com"
                    className="text-amber-700 hover:underline"
                  >
                    admin@sparkupcloud.com
                  </a>{" "}
                  directly.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
