"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MobileNav } from "@/components/landing/mobile-nav";
import { AuthCTA } from "@/components/landing/auth-cta";

/**
 * Sticky home navigation. The brand mark (logo + wordmark) starts large
 * at the top of the page and smoothly shrinks once the user scrolls,
 * so the hero feels generous and the rest of the page reclaims vertical
 * space.
 */
export function HomeNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Hysteresis: use different thresholds for shrink vs grow with a wide
    // dead-zone in between. This prevents the nav from oscillating when
    // its own height change shifts the page enough to flip the trigger
    // (the classic "dancing logo" feedback loop).
    const SHRINK_AT = 80; // grow → shrink only after meaningful scroll
    const GROW_AT = 8; //   shrink → grow only when very close to the top

    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      setScrolled((prev) => {
        if (prev && y <= GROW_AT) return false;
        if (!prev && y >= SHRINK_AT) return true;
        return prev; // inside the dead zone — don't change
      });
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update(); // initial — important if user deep-links mid-page
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b backdrop-blur-lg transition-all duration-300 ${
        scrolled
          ? "border-stone-200/60 bg-white/85 shadow-sm shadow-stone-900/[0.03]"
          : "border-transparent bg-white/70"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-6 transition-all duration-300 ${
          scrolled ? "h-16" : "h-20 sm:h-24"
        }`}
      >
        {/* Brand — scales down on scroll */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="SparkUpCloud home"
        >
          <img
            src="/logo.svg"
            alt=""
            className={`w-auto transition-all duration-300 ease-out ${
              scrolled ? "h-8" : "h-12 sm:h-14"
            }`}
          />
          <span
            className={`font-bold text-stone-900 transition-all duration-300 ease-out leading-none ${
              scrolled ? "text-lg" : "text-2xl sm:text-3xl"
            }`}
          >
            Spark<span className="text-amber-500">Up</span>Cloud
          </span>
        </Link>

        {/* Desktop nav links + auth */}
        <div className="hidden sm:flex items-center gap-1">
          <NavLink href="/simulator" scrolled={scrolled}>
            Tools
          </NavLink>
          <NavLink href="/scenarios" scrolled={scrolled}>
            Scenarios
          </NavLink>
          <NavLink href="/blog" scrolled={scrolled}>
            Blog
          </NavLink>
          <NavLink href="/pricing" scrolled={scrolled}>
            Pricing
          </NavLink>
          <div className="h-5 w-px bg-stone-200 mx-2" />
          <AuthCTA variant="nav-desktop" />
        </div>

        {/* Mobile */}
        <MobileNav />
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
  scrolled,
}: {
  href: string;
  children: React.ReactNode;
  scrolled: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-lg font-medium text-stone-600 transition-all duration-200 hover:bg-stone-100 hover:text-stone-900 ${
        scrolled ? "px-3 py-2 text-sm" : "px-3.5 py-2 text-[15px]"
      }`}
    >
      {children}
    </Link>
  );
}
