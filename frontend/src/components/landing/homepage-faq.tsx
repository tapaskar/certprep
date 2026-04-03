"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "How does the adaptive learning work?",
    a: "SparkUpCloud uses Bayesian Knowledge Tracing and a multi-armed bandit algorithm to identify your weakest concepts. Questions are selected to maximize your learning at the edge of your knowledge — not too easy, not too hard. As you improve, the system adapts in real time.",
  },
  {
    q: "What certifications are available?",
    a: "We currently cover 55+ certifications across AWS (14 certs), Microsoft Azure (12 certs), Google Cloud (10 certs), CompTIA (9 certs including Security+, Network+, A+), and NVIDIA AI (10 certs including Agentic AI, GenAI LLMs, and AI Infrastructure). New certifications are added regularly.",
  },
  {
    q: "How many practice questions are included?",
    a: "Each certification includes hundreds of practice questions across all exam domains, with detailed explanations for every answer. Questions cover multiple formats including scenario-based, factual, comparison, and troubleshooting types, mirroring the actual exam experience.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes! The free plan gives you access to 50% of the content for one certification exam, up to 10 practice questions per day, basic progress tracking, and a free readiness assessment. You can upgrade at any time to unlock full access.",
  },
  {
    q: "How is SparkUpCloud different from other exam prep platforms?",
    a: "SparkUpCloud combines concept-first learning with AI-powered question selection and spaced repetition. Instead of just drilling questions, you learn the underlying concepts first, then practice. The system tracks your mastery at the concept level and schedules reviews at optimal intervals based on cognitive science research.",
  },
  {
    q: "Can I study on mobile?",
    a: "Yes. SparkUpCloud is a fully responsive web application that works on any device with a modern browser. Study on your phone, tablet, or desktop. Your progress syncs across all devices automatically.",
  },
];

export function HomepageFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl px-6 pb-24">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-3 text-base text-stone-500">
          Everything you need to know about SparkUpCloud.
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
