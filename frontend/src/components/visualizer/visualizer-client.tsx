"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Shield, DollarSign, Activity } from "lucide-react";
import { NetworkScene } from "./network-scene";
import type { AwsService } from "@/lib/aws-services-data";

const categoryLabels: Record<string, string> = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  network: "Networking",
  security: "Security",
  messaging: "Messaging",
  analytics: "Analytics",
  ml: "Machine Learning",
  cdn: "Content Delivery",
};

const categoryColors: Record<string, string> = {
  compute: "bg-orange-100 text-orange-700 border-orange-200",
  storage: "bg-green-100 text-green-700 border-green-200",
  database: "bg-blue-100 text-blue-700 border-blue-200",
  network: "bg-red-100 text-red-700 border-red-200",
  security: "bg-rose-100 text-rose-700 border-rose-200",
  messaging: "bg-pink-100 text-pink-700 border-pink-200",
  analytics: "bg-violet-100 text-violet-700 border-violet-200",
  ml: "bg-purple-100 text-purple-700 border-purple-200",
  cdn: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export function VisualizerClient() {
  const [selected, setSelected] = useState<AwsService | null>(null);

  return (
    <div className="h-screen w-full bg-stone-950 text-white overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-stone-950/60 backdrop-blur-md border-b border-white/10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-stone-400">
            <span>🖱️ DRAG TO ROTATE</span>
            <span>·</span>
            <span>📜 SCROLL TO ZOOM</span>
            <span>·</span>
            <span>👆 CLICK NODES</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold">
            <span className="text-amber-400">3D</span> AWS Network Visualizer
          </h1>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <NetworkScene
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      </div>

      {/* Info Panel (right) */}
      {selected && (
        <div className="absolute top-20 right-4 sm:right-6 z-20 w-[90vw] sm:w-80 max-w-sm rounded-xl bg-stone-900/90 backdrop-blur-md border border-white/10 p-5 shadow-2xl">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div
                className={`inline-block text-xs px-2 py-0.5 rounded-full border ${
                  categoryColors[selected.category]
                }`}
              >
                {categoryLabels[selected.category]}
              </div>
              <h2 className="mt-2 text-xl font-bold flex items-center gap-2">
                <span>{selected.emoji}</span>
                {selected.name}
              </h2>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-stone-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-stone-300 mb-4">{selected.description}</p>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-stone-400">
                <DollarSign className="h-3 w-3" /> Pricing
              </span>
              <span className="font-medium">{selected.pricingModel}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-stone-400">
                <Zap className="h-3 w-3" /> Latency
              </span>
              <span className="font-medium">~{selected.latencyMs}ms</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-stone-400">
                <Activity className="h-3 w-3" /> Reliability
              </span>
              <span className="font-medium">{selected.reliability}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-stone-400">
                <Shield className="h-3 w-3" /> Security
              </span>
              <span className="font-medium">{selected.securityLevel}/100</span>
            </div>
          </div>

          <Link
            href="/simulator"
            className="block w-full text-center rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 py-2 text-sm font-bold transition-colors"
          >
            Swap in Simulator →
          </Link>
        </div>
      )}

      {/* Legend (bottom-left) */}
      <div className="hidden md:block absolute bottom-4 left-4 z-20 rounded-lg bg-stone-900/80 backdrop-blur-md border border-white/10 p-3 text-xs max-w-xs">
        <div className="font-semibold mb-1.5 text-stone-300">Legend</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-stone-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff9900]" /> Compute
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#569a31]" /> Storage
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3b48cc]" /> Database
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#cf1126]" /> Network
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#e7157b]" /> Messaging
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d93732]" /> Security
          </div>
        </div>
      </div>

      {/* CTA (bottom-right) */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
        <Link
          href="/simulator"
          className="rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 px-4 py-2 text-sm font-bold shadow-lg transition-colors"
        >
          Try Architecture Simulator →
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm font-semibold backdrop-blur text-center transition-colors"
        >
          Start Studying Free
        </Link>
      </div>
    </div>
  );
}
