import Link from "next/link";
import { } from "lucide-react";
import { BlogFilters } from "@/components/blog/blog-filters";
import { HomeNav } from "@/components/landing/home-nav";

export const metadata = {
  title: "Blog — Study Guides, Exam Tips & Certification Articles",
  description:
    "Free study guides, exam tips, and certification comparison articles for AWS, Azure, Google Cloud, CompTIA, and NVIDIA certifications.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/blog",
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
      <HomeNav />

      {/* Header */}
      <section className="px-6 pt-16 pb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
          Certification Blog
        </h1>
        <p className="mt-4 text-base text-stone-500">
          Free study guides, exam tips, and preparation articles for IT
          certifications.
        </p>
      </section>

      {/* Filters + Posts */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <BlogFilters />
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="SparkUpCloud" className="h-6 w-auto" />
            <span className="text-sm font-semibold text-stone-700">
              Spark<span className="text-amber-500">Up</span>Cloud
            </span>
          </div>
          <p className="text-xs text-stone-400">
            Trusted by professionals preparing for cloud certifications
            worldwide
          </p>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/blog"
              className="text-stone-500 transition-colors hover:text-amber-600"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="text-stone-500 transition-colors hover:text-amber-600"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-stone-500 transition-colors hover:text-amber-600"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
