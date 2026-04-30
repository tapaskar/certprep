import Link from "next/link";
import { Award, Users, Star, ArrowRight } from "lucide-react";
import PricingCards from "@/components/pricing/pricing-cards";
import FAQSection from "@/components/pricing/faq-section";
import { pricingFaqs } from "@/components/pricing/faq-data";
import { HomeNav } from "@/components/landing/home-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { JsonLd, faqSchema } from "@/components/seo/json-ld";

export const metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for cloud certification exam prep. AWS, Azure, and Google Cloud. Start free, upgrade when you're ready.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/pricing",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "SparkUpCloud",
  description: "AI-powered cloud certification exam preparation platform for AWS, Azure, and Google Cloud",
  url: "https://www.sparkupcloud.com/pricing",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "50% content of 1 exam, basic progress tracking",
    },
    {
      "@type": "Offer",
      name: "Single Exam",
      price: "9.99",
      priceCurrency: "USD",
      description: "Full access to 1 exam for 6 months",
    },
    {
      "@type": "Offer",
      name: "Pro Monthly",
      price: "19.99",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        billingDuration: "P1M",
      },
      description: "All 76+ certifications (AWS, Azure, GCP), completely unlocked",
    },
    {
      "@type": "Offer",
      name: "Pro Annual",
      price: "149.99",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        billingDuration: "P1Y",
      },
      description: "All 76+ certifications (AWS, Azure, GCP), completely unlocked, billed annually",
    },
  ],
};

const stats = [
  {
    value: "85%",
    label: "Pro users pass rate",
    icon: Award,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  {
    value: "76+",
    label: "Cloud certifications covered",
    icon: Star,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-500",
  },
  {
    value: "4.8/5",
    label: "Average user rating",
    icon: Users,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-500",
  },
];

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Pricing-page FAQ schema — uses the same source the visible FAQ
          renders from, so what users see and what Google indexes can never
          drift apart. */}
      <JsonLd
        data={faqSchema(
          pricingFaqs.map((f) => ({ question: f.q, answer: f.a }))
        )}
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
        <HomeNav />

        {/* Hero */}
        <section className="flex flex-col items-center px-6 pt-12 pb-16 text-center">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
            Simple,{" "}
            <span className="relative inline-block">
              Transparent
              <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-amber-500" />
            </span>{" "}
            Pricing
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600">
            Start free, upgrade when you&apos;re ready. No hidden fees, no surprises.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
            <Award className="h-4 w-4" />
            Pro users pass at 85% vs 62% for free users
          </div>
        </section>

        {/* Pricing Cards */}
        <PricingCards />

        {/* Social Proof */}
        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-xl border border-stone-200 bg-white p-6 shadow-sm text-center"
              >
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${stat.iconBg}`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-stone-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-stone-500">{stat.label}</p>
              </div>
            ))}
          </div>

        </section>

        {/* Testimonials — moved here from the homepage. Social proof
            works harder near the buy decision than on a landing page
            where the visitor isn't ready to convert yet. The richer
            3-card block replaces the single inline testimonial that
            used to live above. */}
        <TestimonialsSection />

        {/* FAQ */}
        <FAQSection />

        {/* Bottom CTA */}
        <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-10 shadow-lg shadow-amber-200/50">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to pass your AWS exam?
            </h2>
            <p className="mt-3 text-amber-50">
              Join thousands of professionals who chose the smarter way to prepare.
            </p>
            <Link
              href="/register"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-8 text-sm font-bold text-amber-600 shadow-md hover:scale-[1.02] transition-all"
            >
              Start Studying Today
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Trust tagline */}
        <section className="pb-16 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
            Trusted by professionals preparing for cloud certifications worldwide
          </p>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
