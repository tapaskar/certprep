"use client";

import dynamic from "next/dynamic";

const VisualizerClient = dynamic(
  () =>
    import("./visualizer-client").then((m) => m.VisualizerClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex items-center justify-center bg-stone-950 text-white">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mb-4" />
          <p className="text-stone-400 text-sm">Loading 3D scene...</p>
        </div>
      </div>
    ),
  }
);

export default function VisualizerLoader() {
  return <VisualizerClient />;
}
