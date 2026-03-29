"use client";

interface ReadinessCardProps {
  overallPct: number;
  passProbability: number | null;
  daysUntilExam: number | null;
  conceptsMastered: number;
  conceptsTotal: number;
}

export function ReadinessCard({
  overallPct: readiness,
  passProbability,
  daysUntilExam,
  conceptsMastered,
  conceptsTotal: totalConcepts,
}: ReadinessCardProps) {
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (readiness / 100) * circumference;

  const ringColor =
    readiness >= 70 ? "#16a34a" : readiness < 30 ? "#dc2626" : "#f59e0b";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-md shadow-stone-200/60">
      <h2 className="text-xs font-medium uppercase tracking-widest text-stone-500">
        Exam Readiness
      </h2>

      <div className="mt-6 flex flex-col items-center">
        {/* Circular progress */}
        <div className="relative h-44 w-44">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-stone-200"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={ringColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="animate-ringDraw"
              style={{ filter: "drop-shadow(0 0 8px rgba(245,158,11,0.4))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl tabular-nums font-bold text-amber-500">
              {Math.round(readiness)}%
            </span>
            <span className="text-xs text-stone-500">Ready</span>
          </div>
        </div>

        {/* Stats below the circle */}
        <div className="mt-6 grid w-full grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-stone-900">
              {passProbability != null ? Math.round(passProbability) : "--"}%
            </p>
            <p className="text-xs text-stone-500">Pass Prob.</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-900">
              {daysUntilExam !== null ? daysUntilExam : "--"}
            </p>
            <p className="text-xs text-stone-500">Days Left</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-stone-900">
              {conceptsMastered}/{totalConcepts}
            </p>
            <p className="text-xs text-stone-500">Mastered</p>
          </div>
        </div>
      </div>
    </div>
  );
}
