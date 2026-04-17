import Link from "next/link";
import { MobileNav } from "@/components/landing/mobile-nav";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="SparkUpCloud" className="h-8 w-auto" />
          <span className="text-lg font-bold text-stone-900">
            Spark<span className="text-amber-500">Up</span>Cloud
          </span>
        </Link>
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/blog"
            className="text-sm font-medium text-stone-500 hover:text-stone-700"
          >
            Blog
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-stone-500 hover:text-stone-700"
          >
            Pricing
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-stone-500 hover:text-stone-700"
          >
            Contact
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-amber-400 hover:text-amber-600"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:scale-105"
          >
            Get Started
          </Link>
        </div>
        <MobileNav />
      </div>
    </nav>
  );
}
