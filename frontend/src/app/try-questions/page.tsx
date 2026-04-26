import Link from "next/link";
import { sampleQuestions } from "@/lib/sample-questions";
import { TryQuestionsClient } from "@/components/landing/try-questions-client";
import { HomeNav } from "@/components/landing/home-nav";

export const metadata = {
  title: "Try 5 Free Practice Questions — No Signup | SparkUpCloud",
  description:
    "Sample real exam-style questions for AWS, Azure, and GCP certifications. See how SparkUpCloud's questions look, with full explanations. No signup required.",
  alternates: {
    canonical: "https://www.sparkupcloud.com/try-questions",
  },
  openGraph: {
    title: "Try Free Practice Questions",
    description:
      "5 hand-picked exam questions across AWS, Azure, GCP — with full explanations. No signup needed.",
  },
};

export default function TryQuestionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-violet-50/30">
      <HomeNav />

      <section className="px-6 pt-12 pb-8 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-4">
            ✨ No signup · No credit card
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 mb-4">
            Try{" "}
            <span className="relative inline-block">
              {sampleQuestions.length} Free Questions
              <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-amber-500" />
            </span>
          </h1>
          <p className="text-lg text-stone-600">
            Hand-picked from our 8,800+ question bank across AWS, Azure, GCP,
            CompTIA, and NVIDIA. See exactly what our questions look like
            before you sign up — full explanations included.
          </p>
        </div>
      </section>

      <section className="px-6 pb-16 max-w-4xl mx-auto">
        <TryQuestionsClient questions={sampleQuestions} />

        {/* Conversion CTA */}
        <div className="mt-12 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center">
          <h2 className="text-2xl font-bold text-stone-900 mb-2">
            Ready for the full experience?
          </h2>
          <p className="text-stone-600 mb-6 max-w-xl mx-auto">
            8,800+ questions across 76+ certifications with adaptive learning,
            mock exams, and AI explanations. Free plan: 10 questions/day. No
            credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-bold text-white shadow-md hover:scale-105 transition-all"
            >
              Start Free →
            </Link>
            <Link
              href="/exams"
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-stone-300 bg-white text-stone-700 hover:border-stone-900 px-6 py-3 font-bold"
            >
              See All 76 Certifications
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
