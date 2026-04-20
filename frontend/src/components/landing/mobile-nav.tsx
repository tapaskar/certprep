"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, LogIn, LayoutDashboard, Crown } from "lucide-react";
import { readAuthCookie, type AuthCookiePayload } from "@/lib/auth-cookie";

const navLinks = [
  { href: "/exams", label: "🎓 All 55+ Certifications" },
  { href: "/try-questions", label: "✨ Try 5 Free Questions" },
  { href: "/visualizer", label: "🌐 3D Visualizer" },
  { href: "/simulator", label: "⚡ Simulator" },
  { href: "/scenarios", label: "🎯 Scenarios" },
  { href: "/study/heuristics", label: "📘 Heuristics" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthCookiePayload | null>(null);

  useEffect(() => {
    setAuth(readAuthCookie());
  }, [open]);

  const isPaid = auth && auth.p && auth.p !== "free";

  return (
    <div className="sm:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Menu */}
          <div className="absolute right-4 left-4 top-[calc(100%+0.5rem)] z-50 rounded-xl border border-stone-200 bg-white p-4 shadow-xl">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-stone-200" />

              {auth ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  {!isPaid ? (
                    <Link
                      href="/pricing"
                      onClick={() => setOpen(false)}
                      className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-white"
                    >
                      <Crown className="h-4 w-4" />
                      Upgrade to Pro
                    </Link>
                  ) : (
                    <div className="px-4 py-2 text-xs text-stone-500">
                      Plan: <span className="font-semibold text-amber-600">{auth.p.replace("_", " ")}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                  >
                    <LogIn className="h-4 w-4" />
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="mt-1 flex items-center justify-center rounded-lg bg-stone-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-stone-800"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
