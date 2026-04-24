import { Check, X, Minus } from "lucide-react";

interface Feature {
  label: string;
  spark: boolean | "limited";
  td: boolean | "limited";
  whiz: boolean | "limited";
  cloudacademy: boolean | "limited";
}

const features: Feature[] = [
  { label: "8,000+ practice questions", spark: true, td: true, whiz: true, cloudacademy: true },
  { label: "Adaptive question engine (BKT + bandit)", spark: true, td: false, whiz: false, cloudacademy: "limited" },
  { label: "1-on-1 stateful AI tutor", spark: true, td: false, whiz: false, cloudacademy: false },
  { label: "Agentic interventions during study", spark: true, td: false, whiz: false, cloudacademy: false },
  { label: "Guided learning paths with hands-on labs", spark: true, td: false, whiz: "limited", cloudacademy: true },
  { label: "Drag-and-drop architecture simulator", spark: true, td: false, whiz: false, cloudacademy: false },
  { label: "3D AWS network visualizer", spark: true, td: false, whiz: false, cloudacademy: false },
  { label: "Curated scenario library with 3D diagrams", spark: true, td: false, whiz: false, cloudacademy: false },
  { label: "Spaced repetition (SM-2)", spark: true, td: false, whiz: false, cloudacademy: false },
  { label: "Per-domain mock exam scoring", spark: true, td: true, whiz: true, cloudacademy: true },
  { label: "Free diagnostic + 5 sample questions (no signup)", spark: true, td: false, whiz: false, cloudacademy: false },
  { label: "Pass-or-refund guarantee", spark: true, td: false, whiz: false, cloudacademy: false },
];

const annual = [
  { name: "SparkUpCloud Pro", price: "$149.99/yr", note: "Pass or 100% refund" },
  { name: "Tutorials Dojo", price: "$15-25 / cert", note: "Per-cert one-time" },
  { name: "WhizLabs", price: "$99-149/yr", note: "Subscription" },
  { name: "Cloud Academy", price: "$579/yr", note: "Subscription" },
];

export function ComparisonTable() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-10">
          <div className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-amber-600 mb-3">
            Honest comparison
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            How we stack up
          </h2>
          <p className="mt-3 text-stone-600 max-w-2xl mx-auto">
            We&apos;re newer than the legacy players. Here&apos;s where that
            shows — and where it doesn&apos;t.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left p-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">
                  Feature
                </th>
                <th className="p-4 text-center bg-amber-50/40">
                  <div className="text-sm font-bold text-amber-900">SparkUpCloud</div>
                  <div className="text-[10px] text-amber-700 mt-0.5">us</div>
                </th>
                <th className="p-4 text-center">
                  <div className="text-sm font-bold text-stone-900">
                    Tutorials Dojo
                  </div>
                </th>
                <th className="p-4 text-center">
                  <div className="text-sm font-bold text-stone-900">WhizLabs</div>
                </th>
                <th className="p-4 text-center">
                  <div className="text-sm font-bold text-stone-900">
                    Cloud Academy
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {features.map((f) => (
                <tr key={f.label} className="hover:bg-stone-50/40">
                  <td className="p-4 text-stone-700">{f.label}</td>
                  <td className="p-3 text-center bg-amber-50/30">
                    <Cell value={f.spark} highlight />
                  </td>
                  <td className="p-3 text-center">
                    <Cell value={f.td} />
                  </td>
                  <td className="p-3 text-center">
                    <Cell value={f.whiz} />
                  </td>
                  <td className="p-3 text-center">
                    <Cell value={f.cloudacademy} />
                  </td>
                </tr>
              ))}
              {/* Pricing row */}
              <tr className="bg-stone-50">
                <td className="p-4 font-bold text-stone-900">Annual price</td>
                {annual.map((a, i) => (
                  <td
                    key={a.name}
                    className={`p-4 text-center ${
                      i === 0 ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <div className={`text-sm font-bold ${i === 0 ? "text-amber-900" : "text-stone-900"}`}>
                      {a.price}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${i === 0 ? "text-amber-700" : "text-stone-500"}`}>
                      {a.note}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs text-stone-400 max-w-2xl mx-auto">
          Comparison based on publicly available product pages as of April 2026.
          Tutorials Dojo, WhizLabs, and Cloud Academy are trademarks of their
          respective owners. We&apos;re not affiliated with them.
        </p>
      </div>
    </section>
  );
}

function Cell({ value, highlight = false }: { value: boolean | "limited"; highlight?: boolean }) {
  if (value === true) {
    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          highlight ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  if (value === "limited") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Minus className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-100 text-stone-400">
      <X className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}
