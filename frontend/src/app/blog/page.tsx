import Link from "next/link";
import { } from "lucide-react";
import { BlogFilters } from "@/components/blog/blog-filters";
import { HomeNav } from "@/components/landing/home-nav";
import { SiteFooter } from "@/components/landing/site-footer";

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

      <SiteFooter />
    </div>
  );
}
