"use client";

import Link from "next/link";
import {
  GraduationCap,
  Map,
  Zap,
  Brain,
  Trophy,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

/**
 * Compact 5-card replacement for the old FeatureSections component.
 *
 * The old one rendered five alternating left-right deep-dives — each
 * with its own eyebrow, paragraph, bullets, and CTA — adding up to
 * ~3000px of homepage and one button per section. This grid trims the
 * same five product surfaces down to ~600px and one subtle "Learn
 * more →" link per card.
 *
 * Coach gets a violet-tinted card to mark it as the brand
 * differentiator; the other four cards use a uniform amber accent.
 * That two-color pattern matches the palette lockdown shipped just
 * before this.
 */

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  /** "violet" reserves visual weight for the brand differentiator (Coach). */
  accent?: "amber" | "violet";
}

const features: Feature[] = [
  {
    icon: GraduationCap,
    title: "Coach (1-on-1 AI Tutor)",
    description:
      "A patient teacher that remembers you. Watches your answers and steps in when you're stuck.",
    href: "/tutor",
    accent: "violet",
  },
  {
    icon: Map,
    title: "Guided Learning Paths",
    description:
      "Step-by-step modules with hands-on labs and a quiz after every module.",
    href: "/paths",
  },
  {
    icon: Zap,
    title: "Visual Tools",
    description:
      "Drag-and-drop architecture simulator with live cost scoring + 3D network visualizer.",
    href: "/simulator",
  },
  {
    icon: Brain,
    title: "Adaptive Practice",
    description:
      "8,800+ questions, picked by an algorithm that knows your weak concepts.",
    href: "/try-questions",
  },
  {
    icon: Trophy,
    title: "Real Mock Exams",
    description:
      "Three full-length, timed mocks per cert with domain-by-domain scoring.",
    href: "/exams",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="text-center mb-10">
        <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-3">
          What you get
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          Everything you need to pass —{" "}
          <span className="text-stone-500 font-medium">nothing you don&apos;t</span>
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {features.map((f) => {
          const Icon = f.icon;
          const isCoach = f.accent === "violet";
          return (
            <Link
              key={f.title}
              href={f.href}
              className={`group flex flex-col rounded-xl border p-5 transition-all ${
                isCoach
                  ? "border-violet-300 bg-gradient-to-br from-violet-50/80 to-white shadow-sm shadow-violet-200/40 hover:border-violet-500 hover:shadow-lg"
                  : "border-stone-200 bg-white hover:border-amber-400 hover:shadow-md"
              }`}
            >
              <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg ${
                  isCoach
                    ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-md shadow-violet-200"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1">
                {f.title}
              </h3>
              <p className="text-sm text-stone-600 mb-3 leading-relaxed">
                {f.description}
              </p>
              <div
                className={`mt-auto inline-flex items-center gap-1 text-xs font-semibold transition-all ${
                  isCoach
                    ? "text-violet-700 group-hover:text-violet-900"
                    : "text-amber-700 group-hover:text-amber-900"
                }`}
              >
                Learn more
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
