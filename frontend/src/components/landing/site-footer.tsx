import Link from "next/link";

/**
 * Shared site footer for marketing / public pages.
 *
 * Centralised so adding a new top-level link (e.g. "Pricing") only takes
 * one edit. The previous setup had 4 hand-rolled footer blocks across
 * different pages — and 10 more public pages had no footer at all,
 * which the user-testing report flagged as a Pricing/SEO leak.
 *
 * Pages that need a footer should `import { SiteFooter } from "@/components/landing/site-footer"`
 * and drop `<SiteFooter />` at the end. Don't roll your own.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="SparkUpCloud" className="h-6 w-auto" />
          <span className="text-sm font-semibold text-stone-700">
            Spark<span className="text-amber-500">Up</span>Cloud
          </span>
        </div>
        <p className="hidden text-xs text-stone-400 md:block">
          Trusted by professionals preparing for cloud certifications worldwide
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium"
        >
          <Link href="/visualizer" className="text-stone-500 transition-colors hover:text-amber-600">
            3D Visualizer
          </Link>
          <Link href="/simulator" className="text-stone-500 transition-colors hover:text-amber-600">
            Simulator
          </Link>
          <Link href="/scenarios" className="text-stone-500 transition-colors hover:text-amber-600">
            Scenarios
          </Link>
          <Link href="/study/heuristics" className="text-stone-500 transition-colors hover:text-amber-600">
            Heuristics
          </Link>
          <Link href="/blog" className="text-stone-500 transition-colors hover:text-amber-600">
            Blog
          </Link>
          {/* Pricing kept prominent — testing showed many users hit /simulator,
              loved it, then never found their way to a paid plan. */}
          <Link href="/pricing" className="text-stone-700 underline-offset-4 transition-colors hover:text-amber-600 hover:underline">
            Pricing
          </Link>
          <Link href="/contact" className="text-stone-500 transition-colors hover:text-amber-600">
            Contact
          </Link>
          <Link href="/exams" className="text-stone-500 transition-colors hover:text-amber-600">
            All Exams
          </Link>
          <Link href="/try-questions" className="text-stone-500 transition-colors hover:text-amber-600">
            Try Questions
          </Link>
          <Link href="/terms" className="text-stone-400 transition-colors hover:text-amber-600">
            Terms
          </Link>
          <Link href="/privacy" className="text-stone-400 transition-colors hover:text-amber-600">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
