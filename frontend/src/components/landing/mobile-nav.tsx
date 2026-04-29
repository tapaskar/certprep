"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  LogIn,
  LayoutDashboard,
  Crown,
  Map,
  GraduationCap,
  Trophy,
  Sparkles,
  Globe,
  Zap,
  Target,
  BookOpen,
  Newspaper,
  Tag,
  Mail,
  type LucideIcon,
} from "lucide-react";
import { readAuthCookie, type AuthCookiePayload } from "@/lib/auth-cookie";

// Lucide icons replace the emoji that used to live in the labels.
// Emoji read as their CLDR names to screen readers ("MAP OF WORLD"
// instead of "Guided Learning Paths"), and at body-text size their
// visual weight is unpredictable across font fallbacks. SVG icons we
// can size + color consistently with the rest of the site, and they're
// invisible to screen readers (which then read just the label — what
// we want).
const navLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/paths", label: "Guided Learning Paths", icon: Map },
  { href: "/tutor", label: "Coach (1-on-1 AI Tutor)", icon: GraduationCap },
  { href: "/exams", label: "All 76+ Certifications", icon: Trophy },
  { href: "/try-questions", label: "Try 5 Free Questions", icon: Sparkles },
  { href: "/visualizer", label: "3D Visualizer", icon: Globe },
  { href: "/simulator", label: "Simulator", icon: Zap },
  { href: "/scenarios", label: "Scenarios", icon: Target },
  { href: "/study/heuristics", label: "Heuristics", icon: BookOpen },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/contact", label: "Contact", icon: Mail },
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
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
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
