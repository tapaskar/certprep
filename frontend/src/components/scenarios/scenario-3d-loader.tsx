"use client";

import dynamic from "next/dynamic";
import type { Scenario } from "@/lib/scenarios-data";

const Scenario3DView = dynamic(
  () => import("./scenario-3d-view").then((m) => m.Scenario3DView),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-stone-900 text-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mb-2" />
          <p className="text-stone-400 text-xs">Loading diagram...</p>
        </div>
      </div>
    ),
  }
);

export default function Scenario3DLoader({ scenario }: { scenario: Scenario }) {
  return <Scenario3DView scenario={scenario} />;
}
