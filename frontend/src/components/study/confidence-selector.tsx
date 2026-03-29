"use client";

interface ConfidenceSelectorProps {
  onSelect: (confidence: number) => void;
}

const levels = [
  { label: "Low", value: 1 },
  { label: "Medium", value: 2 },
  { label: "High", value: 3 },
];

export function ConfidenceSelector({ onSelect }: ConfidenceSelectorProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-3 text-center text-sm text-stone-500">
        How confident are you?
      </p>
      <div className="flex justify-center gap-3">
        {levels.map((level) => (
          <button
            key={level.value}
            onClick={() => onSelect(level.value)}
            className="rounded-lg border border-stone-200 bg-stone-100 px-5 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-amber-400 hover:bg-white"
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}
