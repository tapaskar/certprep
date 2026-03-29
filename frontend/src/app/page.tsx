import Link from "next/link";
import { Brain, Clock, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Adaptive Learning",
    description:
      "AI-powered question selection targets your weakest areas, maximizing every minute of study time.",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-500",
  },
  {
    icon: Clock,
    title: "Spaced Repetition",
    description:
      "Scientifically-timed reviews ensure concepts move from short-term to long-term memory.",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-500",
  },
  {
    icon: TrendingUp,
    title: "Real-time Progress",
    description:
      "Track mastery across every domain and concept with live readiness scores and pass predictions.",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-violet-50/30">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center">
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-stone-900 sm:text-6xl lg:text-7xl">
          Master Your{" "}
          <span className="relative inline-block">
            Certification
            <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-amber-500" />
          </span>{" "}
          Exam
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-stone-600">
          AI-powered adaptive learning that knows exactly what you need to study.
          Stop wasting time on what you already know.
        </p>
        <Link
          href="/onboarding"
          className="mt-10 inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-8 text-base font-bold text-white shadow-md shadow-stone-200/60 hover:scale-105 transition-all"
        >
          Get Started Free
        </Link>
        <div className="mt-8 flex items-center gap-6 text-sm font-medium text-stone-500">
          <span>500+ Questions</span>
          <span className="h-1 w-1 rounded-full bg-amber-400" />
          <span>20+ Concepts</span>
          <span className="h-1 w-1 rounded-full bg-amber-400" />
          <span>85% Pass Rate</span>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="animate-fadeInUp rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60"
              style={index > 0 ? { animationDelay: `${index * 0.1}s` } : undefined}
            >
              <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-lg ${feature.iconBg}`}>
                <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-base leading-6 text-stone-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust tagline */}
      <section className="pb-20 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          Trusted by professionals preparing for AWS, Azure & GCP
        </p>
      </section>
    </div>
  );
}
