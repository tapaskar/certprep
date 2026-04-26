"use client";

import Link from "next/link";
import {
  GraduationCap,
  Brain,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Server,
  Database,
  Globe,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { ReactNode } from "react";

interface FeatureSectionProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  imageSide: "left" | "right";
  bgClass?: string;
  preview: ReactNode;
}

export function FeatureSection({
  eyebrow,
  title,
  description,
  bullets,
  ctaLabel,
  ctaHref,
  imageSide,
  bgClass = "",
  preview,
}: FeatureSectionProps) {
  return (
    <section className={`py-16 sm:py-24 ${bgClass}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={`grid gap-10 lg:gap-16 lg:grid-cols-2 items-center ${
            imageSide === "left" ? "lg:grid-flow-col-dense" : ""
          }`}
        >
          {/* Text */}
          <div className={imageSide === "left" ? "lg:col-start-2" : ""}>
            <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-3">
              {eyebrow}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 leading-tight">
              {title}
            </h2>
            <p className="mt-4 text-base text-stone-600 leading-relaxed">
              {description}
            </p>
            <ul className="mt-6 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-stone-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 text-sm font-bold transition-colors group"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Preview */}
          <div className={imageSide === "left" ? "lg:col-start-1 lg:row-start-1" : ""}>
            {preview}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Individual previews ──────────────────────────────────────────────

export function CoachPreview() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-8 bg-gradient-to-br from-violet-300/30 to-amber-300/20 blur-3xl rounded-full"
      />
      <div className="relative rounded-2xl bg-white border border-stone-200 shadow-2xl shadow-stone-900/10 overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200 bg-gradient-to-r from-violet-50 to-amber-50/40">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-amber-500 text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-stone-900">Coach</span>
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                  Stateful
                </span>
              </div>
              <div className="text-[11px] text-stone-500">
                Path: Red Hat EX188V4K · Step 3.2
              </div>
            </div>
          </div>
          <span className="text-[10px] text-stone-500">7/∞ today</span>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 space-y-3 bg-stone-50/40 min-h-[280px]">
          {/* Coach */}
          <div className="flex">
            <div className="max-w-[85%] rounded-2xl bg-white border border-stone-200 px-3.5 py-2.5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">
                Coach
              </div>
              <p className="text-sm leading-relaxed text-stone-800">
                Nice — you wrote a multi-stage <code className="bg-stone-100 px-1 rounded text-[0.85em] font-mono">Containerfile</code>.
                Before we move on: <strong>why use a separate builder stage</strong>{" "}
                instead of installing Go in the final image?
              </p>
            </div>
          </div>
          {/* User */}
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-stone-900 text-white px-3.5 py-2.5">
              <p className="text-sm leading-relaxed">
                To keep the final image small? Like, runtime doesn&apos;t need the compiler.
              </p>
            </div>
          </div>
          {/* Coach */}
          <div className="flex">
            <div className="max-w-[85%] rounded-2xl bg-white border border-stone-200 px-3.5 py-2.5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1">
                Coach
              </div>
              <p className="text-sm leading-relaxed text-stone-800">
                Exactly. Before: <strong>900 MB</strong>. After: <strong>120 MB</strong>.
                Smaller = faster pulls + smaller attack surface.
                Ready to push it to <code className="bg-stone-100 px-1 rounded text-[0.85em] font-mono">quay.io</code>?
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-stone-200 bg-white px-4 py-3 flex items-center gap-2">
          <div className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-400">
            Ask Coach about &quot;Tagging &amp; pushing&quot;...
          </div>
          <button className="shrink-0 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white p-2 shadow-sm">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PathsPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-to-br from-amber-300/25 to-rose-300/20 blur-3xl rounded-full" />
      <div className="relative rounded-2xl bg-white border border-stone-200 shadow-2xl shadow-stone-900/10 overflow-hidden">
        {/* Path header */}
        <div
          className="px-4 py-4 text-white"
          style={{
            background: "linear-gradient(135deg, #EE0000, #EE0000cc)",
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
            EX188V4K · Intermediate · ~30h
          </div>
          <div className="text-lg font-bold mt-0.5">
            Red Hat — Containers with Podman
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: "32%" }}
              />
            </div>
            <span className="text-xs font-bold">7/22</span>
          </div>
        </div>

        {/* Module list */}
        <div className="p-3 space-y-1 bg-stone-50/30">
          <ModuleRow title="Module 1 — Environment Setup" done={4} total={4} expanded />
          <SubStep done title="Why this exam, what you'll build" />
          <SubStep done title="Install Fedora in VirtualBox (free)" current />
          <SubStep done title="Install Podman + verify" />
          <SubStep done title="Module 1 Quiz" passed pct={80} />
          <ModuleRow title="Module 2 — Podman Fundamentals" done={3} total={4} />
          <ModuleRow title="Module 3 — Building Images" done={0} total={4} />
        </div>
      </div>
    </div>
  );
}

function ModuleRow({
  title,
  done,
  total,
  expanded = false,
}: {
  title: string;
  done: number;
  total: number;
  expanded?: boolean;
}) {
  const complete = done === total;
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-white">
      {expanded ? (
        <span className="text-stone-500 text-xs">▾</span>
      ) : (
        <span className="text-stone-500 text-xs">▸</span>
      )}
      <span className="flex-1 text-xs font-bold text-stone-900">{title}</span>
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
          complete
            ? "bg-emerald-100 text-emerald-700"
            : "bg-stone-100 text-stone-600"
        }`}
      >
        {done}/{total}
      </span>
    </div>
  );
}

function SubStep({
  title,
  done = false,
  current = false,
  passed = false,
  pct,
}: {
  title: string;
  done?: boolean;
  current?: boolean;
  passed?: boolean;
  pct?: number;
}) {
  return (
    <div
      className={`ml-6 flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md text-[11px] border-l-2 ${
        current
          ? "border-amber-400 bg-amber-50 text-amber-900 font-bold"
          : "border-stone-200 text-stone-700"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border border-stone-300 shrink-0" />
      )}
      <span className="flex-1 truncate">{title}</span>
      {passed && (
        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
          PASS · {pct}%
        </span>
      )}
    </div>
  );
}

export function SimulatorPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-to-br from-violet-300/25 to-blue-300/20 blur-3xl rounded-full" />
      <div className="relative rounded-2xl bg-stone-50 border border-stone-200 shadow-2xl shadow-stone-900/10 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-200 bg-white">
          <div className="text-xs font-bold text-stone-900">⚡ AWS Architecture Simulator</div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
            <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded font-bold">
              Connect Mode
            </span>
          </div>
        </div>

        {/* Canvas with mock placed services + connections */}
        <div
          className="relative h-[280px] p-4"
          style={{
            backgroundImage:
              "radial-gradient(circle, #d6d3d1 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          {/* SVG connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="ar"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
            </defs>
            <line x1="50%" y1="22%" x2="50%" y2="55%" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ar)" opacity="0.7" />
            <line x1="50%" y1="55%" x2="22%" y2="78%" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ar)" opacity="0.7" />
            <line x1="50%" y1="55%" x2="78%" y2="78%" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#ar)" opacity="0.7" />
          </svg>

          <NodeChip top="14%" left="50%" color="#CF1126" Icon={Globe} label="ALB" />
          <NodeChip top="50%" left="50%" color="#FF9900" Icon={Server} label="EC2" />
          <NodeChip top="74%" left="20%" color="#3B48CC" Icon={Database} label="RDS" />
          <NodeChip top="74%" left="76%" color="#569A31" Icon={Layers} label="S3" />
        </div>

        {/* Impact panel */}
        <div className="grid grid-cols-4 gap-2 px-3 py-2.5 bg-white border-t border-stone-200">
          <Metric label="Cost" value="$215/mo" tone="emerald" />
          <Metric label="Latency" value="~6ms" tone="amber" />
          <Metric label="Reliability" value="99.97%" tone="blue" />
          <Metric label="Security" value="91/100" tone="rose" />
        </div>
      </div>
    </div>
  );
}

function NodeChip({
  top,
  left,
  color,
  Icon,
  label,
}: {
  top: string;
  left: string;
  color: string;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl border-2 shadow-md px-2 py-1 text-center min-w-[68px]"
      style={{ top, left, borderColor: color }}
    >
      <div
        className="mx-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-md text-white"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </div>
      <div className="text-[10px] font-bold text-stone-900 leading-none">
        {label}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "blue" | "rose";
}) {
  const map = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    amber: "text-amber-700 bg-amber-50 border-amber-100",
    blue: "text-blue-700 bg-blue-50 border-blue-100",
    rose: "text-rose-700 bg-rose-50 border-rose-100",
  };
  return (
    <div className={`rounded-md border p-1.5 text-center ${map[tone]}`}>
      <div className="text-[8px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="text-xs font-bold">{value}</div>
    </div>
  );
}

export function AdaptivePreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-to-br from-emerald-300/25 to-amber-300/20 blur-3xl rounded-full" />
      <div className="relative rounded-2xl bg-white border border-stone-200 shadow-2xl shadow-stone-900/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-600" />
            <span className="text-xs font-bold text-stone-900">
              Adaptive Engine — picking your next question
            </span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <ConceptScore name="KMS & Encryption" pct={41} reason="Weak — needs more reps" tone="rose" />
          <ConceptScore name="VPC Routing" pct={62} reason="Due for review" tone="amber" />
          <ConceptScore name="IAM Roles" pct={89} reason="Strong — push harder difficulty" tone="emerald" />
          <ConceptScore name="S3 Lifecycle" pct={75} reason="Reinforce" tone="blue" />
        </div>
        <div className="px-4 py-3 bg-violet-50 border-t border-violet-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-700 mb-0.5">
            Next question
          </div>
          <div className="text-xs text-stone-700 line-clamp-2">
            A company stores PII in S3 and needs encryption with full key audit
            trail. Which combination of services meets these requirements?
          </div>
        </div>
      </div>
    </div>
  );
}

function ConceptScore({
  name,
  pct,
  reason,
  tone,
}: {
  name: string;
  pct: number;
  reason: string;
  tone: "rose" | "amber" | "blue" | "emerald";
}) {
  const fillColor = {
    rose: "#F43F5E",
    amber: "#F59E0B",
    blue: "#3B82F6",
    emerald: "#10B981",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white p-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-xs font-bold text-stone-900 truncate">{name}</div>
          <div className="text-[10px] font-bold tabular-nums text-stone-500">
            {pct}%
          </div>
        </div>
        <div className="h-1 rounded-full bg-stone-200 overflow-hidden mb-1">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fillColor }} />
        </div>
        <div className="text-[10px] text-stone-500">{reason}</div>
      </div>
    </div>
  );
}

export function MockExamPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-to-br from-amber-300/25 to-violet-300/20 blur-3xl rounded-full" />
      <div className="relative rounded-2xl bg-white border border-stone-200 shadow-2xl shadow-stone-900/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Mock Exam 2 · SAA-C03
            </div>
            <div className="text-sm font-bold text-stone-900">
              Question 47 of 65
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5">
            <span className="text-rose-600">●</span>
            <span className="text-sm font-bold text-rose-700 tabular-nums">
              0:42:16
            </span>
          </div>
        </div>

        {/* Question stem */}
        <div className="p-4">
          <p className="text-sm leading-relaxed text-stone-800">
            A bank needs to connect on-prem to AWS with dedicated bandwidth, low
            latency, and HA across two physical paths. Which combination?
          </p>
          <div className="mt-3 space-y-1.5">
            <MockOption letter="A" text="Two Direct Connects + Transit Gateway" selected correct />
            <MockOption letter="B" text="Single VPN with BGP" />
            <MockOption letter="C" text="Three VPNs aggregated" />
            <MockOption letter="D" text="Direct Connect + VPN backup, no TGW" />
          </div>
        </div>

        {/* Score breakdown by domain */}
        <div className="px-4 pb-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
            Domain breakdown so far
          </div>
          <div className="space-y-1">
            <DomainScore name="Design Resilient" pct={86} weight={26} />
            <DomainScore name="Design Secure" pct={72} weight={30} />
            <DomainScore name="Design High-Performing" pct={68} weight={24} />
            <DomainScore name="Design Cost-Optimized" pct={91} weight={20} />
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
  correct = false,
}: {
  letter: string;
  text: string;
  selected?: boolean;
  correct?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border-2 p-2 text-xs ${
        selected && correct
          ? "border-emerald-300 bg-emerald-50 text-stone-900"
          : selected
          ? "border-amber-400 bg-amber-50"
          : "border-stone-200 bg-white"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
          selected
            ? "bg-emerald-500 text-white"
            : "border border-stone-300 text-stone-500"
        }`}
      >
        {letter}
      </span>
      <span className="flex-1">{text}</span>
      {selected && correct && (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
      )}
    </div>
  );
}

function DomainScore({
  name,
  pct,
  weight,
}: {
  name: string;
  pct: number;
  weight: number;
}) {
  const passing = pct >= 72;
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <div className="flex-1 min-w-0 truncate text-stone-700">
        {name} <span className="text-stone-400">· {weight}%</span>
      </div>
      <div className="w-24 h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            passing ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`tabular-nums font-bold ${passing ? "text-emerald-700" : "text-amber-700"}`}>
        {pct}%
      </span>
    </div>
  );
}

// ── The 5-feature wrapper ──────────────────────────────────────────────

export function FeatureSections() {
  return (
    <>
      <FeatureSection
        eyebrow="Coach AI Tutor"
        title={
          <>
            A patient teacher that
            <span className="text-violet-600"> remembers you</span>.
          </>
        }
        description="Coach is a stateful 1-on-1 AI tutor that knows your weakest topics, what you've already studied, and the path you're on. It explains, quizzes, and proactively jumps in when you start to struggle — like a good human tutor would."
        bullets={[
          "Remembers every conversation per exam and per learning path",
          "Watches your answer patterns and intervenes when you're stuck",
          "Asks you questions back instead of lecturing",
          "Knows your top 5 weak concepts — volunteers help there",
        ]}
        ctaLabel="Meet Coach"
        ctaHref="/tutor"
        imageSide="right"
        preview={<CoachPreview />}
      />

      <FeatureSection
        eyebrow="Guided Learning Paths"
        title={
          <>
            Hand-crafted curricula —
            <span className="text-rose-600"> from zero to certified</span>.
          </>
        }
        description="Step-by-step modules with hands-on labs and a quiz after every module. Coach sits next to you the entire path. We currently ship the Red Hat EX188V4K (Containers with Podman) full path and an AWS SAA Foundations starter — more coming."
        bullets={[
          "22-step EX188V4K path: from Fedora install to the final practice test",
          "Hands-on instructions + checkpoints for every lab step",
          "Module quizzes that auto-mark steps complete at 70%+",
          "Coach knows the exact step you're on and gives step-specific hints",
        ]}
        ctaLabel="Browse paths"
        ctaHref="/paths"
        imageSide="left"
        bgClass="bg-gradient-to-br from-stone-50 to-amber-50/40"
        preview={<PathsPreview />}
      />

      <FeatureSection
        eyebrow="Visual Tools"
        title={
          <>
            See architectures
            <span className="text-amber-600"> before you build them</span>.
          </>
        }
        description="A free drag-and-drop AWS architecture simulator with live cost/latency/reliability scoring, a 3D network visualizer with animated traffic flows, and a library of curated design scenarios. Tools that competitors don't ship."
        bullets={[
          "Drag services onto a canvas, draw connections, see real cost in real-time",
          "5 preset architectures + free-form mode",
          "3D visualizer of 30+ AWS services with particle traffic flows",
          "8 curated design scenarios (multi-region DR, multi-tenant SaaS, etc.)",
        ]}
        ctaLabel="Try the simulator"
        ctaHref="/simulator"
        imageSide="right"
        preview={<SimulatorPreview />}
      />

      <FeatureSection
        eyebrow="Adaptive Practice"
        title={
          <>
            8,800+ questions, picked
            <span className="text-emerald-600"> by an algorithm that knows you</span>.
          </>
        }
        description="Bayesian Knowledge Tracing + a multi-armed bandit pick the next question to maximize your readiness gain. Spaced repetition (SM-2) brings shaky concepts back at exactly the right interval. Plus a free diagnostic quiz to anchor your starting point."
        bullets={[
          "Hand-curated, scenario-style questions across 76+ certifications",
          "Adaptive engine prioritizes your weak concepts and recent misses",
          "SM-2 spaced repetition resurfaces concepts at the right cadence",
          "Per-question explanation + 'why other options are wrong'",
        ]}
        ctaLabel="Try 5 free questions"
        ctaHref="/try-questions"
        imageSide="left"
        bgClass="bg-gradient-to-br from-stone-50 to-violet-50/40"
        preview={<AdaptivePreview />}
      />

      <FeatureSection
        eyebrow="Mock Exams"
        title={
          <>
            Real timed mocks with
            <span className="text-rose-600"> domain-by-domain scoring</span>.
          </>
        }
        description="Three full-length, timed mock exams per certification — properly weighted to match the official domain ratios. Get a per-domain pass/fail breakdown so you know exactly where to focus before exam day."
        bullets={[
          "Real timer, real question count (65 for SAA, 75 for SAP, etc.)",
          "Domain-weighted question selection matches the official guide",
          "Per-domain score breakdown so you don't drown the wrong concept",
          "Up to 3 unique mocks per cert; review every question after",
        ]}
        ctaLabel="See exam list"
        ctaHref="/exams"
        imageSide="right"
        preview={<MockExamPreview />}
      />
    </>
  );
}
