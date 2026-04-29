"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import { ArchitectureFlowSvg, type Provider } from "./architecture-flow-svg";

/**
 * Marketing banner: animated cloud architecture flow + provider toggle
 * + click-to-learn popover on each box + CTA to the full visualizer.
 *
 * Provider state lives here (not in the SVG) so the toggle UI sits
 * cleanly above the diagram and the SVG stays a pure presentation
 * component.
 */

const providers: { id: Provider; label: string; accent: string }[] = [
  { id: "aws", label: "AWS", accent: "text-amber-700 ring-amber-300 bg-amber-50" },
  { id: "azure", label: "Azure", accent: "text-blue-700 ring-blue-300 bg-blue-50" },
  { id: "gcp", label: "Google Cloud", accent: "text-green-700 ring-green-300 bg-green-50" },
];

export function ArchitectureFlowBanner() {
  const [provider, setProvider] = useState<Provider>("aws");

  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-20">
      {/* Header band */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700 mb-3">
          <Activity className="h-3 w-3" />
          Architecture, in motion
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          See how cloud services{" "}
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            actually talk to each other
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-stone-600">
          Stop memorizing service names. Watch a real request flow — edge,
          DNS, load balancer, compute, data, messaging — the way exam
          questions actually test you.
        </p>
      </div>

      {/* Provider toggle — toggling re-labels every box. Same architecture,
          three vendors. Subtext underneath drives the point home. */}
      <div className="mb-4 flex flex-col items-center gap-2">
        <div
          role="tablist"
          aria-label="Cloud provider"
          className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm"
        >
          {providers.map((p) => {
            const active = provider === p.id;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                onClick={() => setProvider(p.id)}
                className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? `${p.accent} ring-2`
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-stone-500">
          Same architecture, different names. Toggle to see the equivalents.
        </p>
      </div>

      {/* Animation container */}
      <div
        className="relative overflow-hidden rounded-2xl border border-stone-200 shadow-2xl shadow-stone-300/40"
        style={{ aspectRatio: "1200 / 540", maxHeight: "560px" }}
      >
        <ArchitectureFlowSvg provider={provider} />

        {/* Top-left status pill */}
        <div className="pointer-events-none absolute top-4 left-4 inline-flex items-center gap-2 rounded-md bg-black/50 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white border border-white/10">
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live request flow · 12 services · click any to learn
        </div>

        {/* Bottom CTA strip */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3 p-4 sm:p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          <div className="text-white max-w-sm">
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">
              Architecture Visualizer
            </p>
            <p className="text-base sm:text-lg font-semibold mt-0.5 leading-tight">
              Drag, zoom, click any service to learn how it fits.
            </p>
          </div>
          <Link
            href="/visualizer"
            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-stone-900 hover:bg-amber-50 hover:text-amber-700 transition-colors shadow-md"
          >
            Open 3D Visualizer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Provider chips — visual reinforcement of multi-cloud breadth */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
        <span className="text-stone-500">Also covered:</span>
        {[
          { label: "Red Hat", color: "text-rose-700 bg-rose-50 border-rose-200" },
          { label: "CompTIA", color: "text-stone-700 bg-stone-50 border-stone-200" },
          { label: "NVIDIA", color: "text-lime-700 bg-lime-50 border-lime-200" },
        ].map((p) => (
          <span
            key={p.label}
            className={`inline-flex items-center rounded-full border px-3 py-1 font-semibold ${p.color}`}
          >
            {p.label}
          </span>
        ))}
      </div>
    </section>
  );
}
