"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Can I switch plans at any time?",
    a: "Yes! You can upgrade from Free to Single Exam or Pro at any time. If you're on a Single Exam plan and want to upgrade to Pro, we'll prorate the remaining value. Downgrades take effect at the end of your current billing period.",
  },
  {
    q: "What's included in the free plan?",
    a: "The Free plan gives you access to 50% of the content for one AWS certification exam. This includes practice questions, basic progress tracking, and community access. It's a great way to experience the platform before committing.",
  },
  {
    q: "How long does Single Exam access last?",
    a: "Single Exam access lasts for 6 months from the date of purchase. This gives you plenty of time to study and pass your certification. You get full access to all content, practice questions, mock exams, and AI features for that one exam.",
  },
  {
    q: "What's the refund policy?",
    a: "We offer a pass-or-refund guarantee. If you complete the study plan and don't pass your exam, we'll refund 100% of your payment. No questions asked. Contact support with your exam results and we'll process the refund within 5 business days.",
  },
  {
    q: "Do you offer student or group discounts?",
    a: "Yes! We offer discounts for students with a valid .edu email address. For teams of 3 or more, contact us for custom pricing with volume discounts, admin dashboards, and bulk license management.",
  },
  {
    q: "Can I change my exam after subscribing?",
    a: "On the Pro plan, you have access to all 15 AWS certifications and can switch freely. On the Single Exam plan, you can change your selected exam once within the first 7 days of purchase.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, American Express) through our secure payment provider Stripe. Annual plans can also be paid via bank transfer.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-3 text-base text-stone-500">
          Everything you need to know about our plans.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100">
        {faqs.map((faq, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-5 text-left"
            >
              <span className="pr-4 text-sm font-medium text-stone-900">
                {faq.q}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200",
                  open === i && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm leading-relaxed text-stone-500">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
