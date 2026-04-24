"use client";

import {
  Server,
  Database,
  Globe,
  Shield,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Zap,
  Layers,
  type LucideIcon,
} from "lucide-react";

/**
 * Hero mockup — a layered, browser-chrome-style preview that hints at
 * what's inside the product. Three cards stacked with subtle parallax
 * shadows. Uses real-looking dashboard UI rather than a stock photo so
 * what visitors see is genuinely what they'll get.
 */
export function HeroMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto lg:max-w-none">
      {/* Decorative glow behind */}
      <div
        className="absolute -inset-12 bg-gradient-to-br from-amber-300/30 via-violet-300/20 to-emerald-300/30 blur-3xl rounded-full opacity-50 animate-pulse"
        style={{ animationDuration: "4s" }}
      />

      {/* Main browser chrome */}
      <div className="relative rounded-2xl bg-white border border-stone-200 shadow-2xl shadow-stone-900/10 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-50 border-b border-stone-200">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="flex-1 ml-3">
            <div className="bg-white border border-stone-200 rounded-md px-3 py-1 text-[10px] text-stone-500 max-w-xs">
              sparkupcloud.com/study
            </div>
          </div>
        </div>

        {/* Mock dashboard content */}
        <div className="p-4 space-y-3 bg-gradient-to-br from-white to-amber-50/30">
          {/* Header strip */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                Studying
              </div>
              <div className="text-sm font-bold text-stone-900">
                AWS Solutions Architect Associate
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                Readiness
              </div>
              <div className="text-base font-bold text-emerald-600">73%</div>
            </div>
          </div>

          {/* Question card preview */}
          <div className="rounded-lg border border-stone-200 bg-white p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-3.5 w-3.5 text-rose-500" />
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                Security · Question 12 of 30
              </div>
            </div>
            <p className="text-xs text-stone-800 font-medium leading-relaxed mb-2.5">
              A company stores PII in S3. They need encryption with full key
              audit. Which approach?
            </p>
            <div className="space-y-1.5">
              <MockOption letter="A" text="SSE-S3 default encryption" />
              <MockOption
                letter="B"
                text="SSE-KMS with CMK + CloudTrail"
                selected
              />
              <MockOption letter="C" text="Client-side encryption" />
            </div>
          </div>

          {/* Coach intervention preview */}
          <div className="rounded-lg border-2 border-violet-300 bg-violet-50/70 p-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-amber-500" />
            <div className="flex items-start gap-2">
              <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-violet-500 text-white">
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-violet-800 bg-violet-100 px-1.5 py-0.5 rounded-full">
                    Coach
                  </span>
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                </div>
                <p className="text-[11px] text-stone-700 leading-relaxed">
                  Nice — you got 4 in a row. Want me to push you with a harder
                  scenario?
                </p>
              </div>
            </div>
          </div>

          {/* Mastery bars row */}
          <div className="grid grid-cols-3 gap-2">
            <MasteryPill label="IAM" pct={89} color="#10B981" />
            <MasteryPill label="VPC" pct={62} color="#F59E0B" />
            <MasteryPill label="KMS" pct={41} color="#F97316" />
          </div>
        </div>
      </div>

      {/* Floating mini-card — 3D viz preview */}
      <div
        className="hidden md:block absolute -bottom-6 -left-8 w-44 rounded-xl bg-stone-900 text-white p-3 shadow-xl border border-stone-700 transform -rotate-3 hover:rotate-0 transition-transform"
      >
        <div className="text-[8px] font-bold uppercase tracking-wider text-violet-300 mb-1.5">
          3D Visualizer
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <ServiceTile color="#FF9900" Icon={Server} label="EC2" />
          <ServiceTile color="#3B48CC" Icon={Database} label="RDS" />
          <ServiceTile color="#CF1126" Icon={Globe} label="ALB" />
          <ServiceTile color="#569A31" Icon={Layers} label="S3" />
          <ServiceTile color="#FF9900" Icon={Zap} label="λ" />
          <ServiceTile color="#D93732" Icon={Shield} label="IAM" />
        </div>
      </div>

      {/* Floating mini-card — streak/badge preview */}
      <div
        className="hidden md:block absolute -top-4 -right-6 w-40 rounded-xl bg-white p-3 shadow-xl border border-stone-200 transform rotate-3 hover:rotate-0 transition-transform"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
              Streak
            </div>
            <div className="text-sm font-bold text-stone-900">14 days 🔥</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockOption({
  letter,
  text,
  selected = false,
}: {
  letter: string;
  text: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-[10px] ${
        selected
          ? "border-amber-400 bg-amber-50"
          : "border-stone-200 bg-stone-50/40"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${
          selected
            ? "bg-amber-500 text-white"
            : "border border-stone-300 text-stone-500"
        }`}
      >
        {letter}
      </span>
      <span
        className={`truncate ${selected ? "text-stone-900 font-medium" : "text-stone-600"}`}
      >
        {text}
      </span>
    </div>
  );
}

function MasteryPill({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="rounded-md bg-white border border-stone-200 p-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-bold text-stone-700">{label}</span>
        <span className="text-[9px] font-bold text-stone-500">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ServiceTile({
  color,
  Icon,
  label,
}: {
  color: string;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-md text-white"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}88`,
        }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </div>
      <span className="text-[8px] text-stone-300 font-semibold">{label}</span>
    </div>
  );
}
