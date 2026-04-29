"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, GraduationCap, Trophy, Sparkles, type LucideIcon } from "lucide-react";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
  sublabel: string;
  Icon: LucideIcon;
  color: string;
  bg: string;
}

const stats: Stat[] = [
  {
    value: 8800,
    suffix: "+",
    label: "Practice Questions",
    sublabel: "Hand-curated, exam-style scenarios",
    Icon: BookOpen,
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  {
    value: 55,
    suffix: "+",
    label: "Certifications",
    sublabel: "AWS, Azure, GCP, CompTIA, NVIDIA, Red Hat",
    Icon: GraduationCap,
    color: "text-violet-700",
    bg: "bg-violet-100",
  },
  // Color palette consolidated to amber + violet only — was rose/emerald
  // per stat which read as a rainbow next to the rest of the homepage.
  // Two-color rotation gives the same visual rhythm without the noise.
  {
    value: 24,
    suffix: "/7",
    label: "AI Tutor Coach",
    sublabel: "Patient, stateful, knows your weak topics",
    Icon: Sparkles,
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  {
    value: 92,
    suffix: "%",
    label: "Pass Rate",
    sublabel: "Members who finish a Path + 3 mocks",
    Icon: Trophy,
    color: "text-violet-700",
    bg: "bg-violet-100",
  },
];

export function StatsBanner() {
  return (
    <section className="border-y border-stone-200 bg-gradient-to-br from-white via-stone-50 to-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  value,
  suffix,
  label,
  sublabel,
  Icon,
  color,
  bg,
}: Stat) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            // Animate from 0 to value over 1.6s
            const duration = 1600;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
              setDisplay(Math.floor(value * eased));
              if (t < 1) requestAnimationFrame(tick);
              else setDisplay(value);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return (
    <div ref={ref} className="text-center sm:text-left">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${bg} mb-3`}>
        <Icon className={`h-6 w-6 ${color}`} strokeWidth={2} />
      </div>
      <div className="flex items-baseline gap-1 justify-center sm:justify-start">
        <span className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 tabular-nums">
          {display.toLocaleString()}
        </span>
        {suffix && (
          <span className={`text-2xl font-bold ${color}`}>{suffix}</span>
        )}
      </div>
      <div className="mt-1 text-sm font-bold text-stone-900">{label}</div>
      <div className="mt-0.5 text-xs text-stone-500">{sublabel}</div>
    </div>
  );
}
