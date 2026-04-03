"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConceptDetail } from "@/lib/api-types";

interface FlashcardDeckProps {
  concepts: ConceptDetail[];
}

export function FlashcardDeck({ concepts }: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [reviewAgain, setReviewAgain] = useState<Set<number>>(new Set());

  const concept = concepts[currentIndex];
  if (!concept) return null;

  const facts = concept.concept.key_facts || [];
  const misconceptions = concept.concept.common_misconceptions || [];
  const total = concepts.length;
  const progress = ((currentIndex + 1) / total) * 100;

  const handleNext = () => {
    setFlipped(false);
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    setFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const markKnown = () => {
    const next = new Set(known);
    next.add(currentIndex);
    setKnown(next);
    const r = new Set(reviewAgain);
    r.delete(currentIndex);
    setReviewAgain(r);
    handleNext();
  };

  const markReview = () => {
    const next = new Set(reviewAgain);
    next.add(currentIndex);
    setReviewAgain(next);
    const k = new Set(known);
    k.delete(currentIndex);
    setKnown(k);
    handleNext();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-stone-500">
        <span>
          Card {currentIndex + 1} of {total}
        </span>
        <span>
          {known.size} known &middot; {reviewAgain.size} to review
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer select-none"
      >
        <div
          className={cn(
            "relative min-h-[320px] rounded-xl border-2 bg-white p-8 shadow-md transition-all duration-300",
            flipped ? "border-amber-400" : "border-stone-200",
            known.has(currentIndex) && "border-green-400",
            reviewAgain.has(currentIndex) && "border-red-300"
          )}
        >
          {!flipped ? (
            /* Front: Concept name + key facts */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {concept.concept.domain_id?.replace(/-/g, " ")}
                </span>
                <span className="text-xs text-stone-400">
                  Click to flip
                </span>
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {concept.concept.name}
              </h3>
              <div className="space-y-2">
                {facts.map((fact, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-stone-600"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Back: Misconceptions + mastery */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                  Common Misconceptions
                </span>
                <span className="text-xs text-stone-400">
                  Click to flip back
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                {concept.concept.name}
              </h3>
              {misconceptions.length > 0 ? (
                <div className="space-y-2">
                  {misconceptions.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-stone-600"
                    >
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-400 italic">
                  No common misconceptions recorded for this concept.
                </p>
              )}
              {concept.concept.description && (
                <div className="mt-4 rounded-lg bg-stone-50 p-4">
                  <p className="text-sm text-stone-600">
                    {concept.concept.description}
                  </p>
                </div>
              )}
              {concept.user_mastery && (
                <div className="mt-2 text-xs text-stone-400">
                  Mastery: {Math.round(concept.user_mastery.mastery_pct)}% &middot;{" "}
                  {concept.user_mastery.level}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex gap-3">
          <button
            onClick={markReview}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" />
            Review Again
          </button>
          <button
            onClick={markKnown}
            className="flex items-center gap-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
          >
            <Check className="h-4 w-4" />
            I Know This
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === total - 1}
          className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 disabled:opacity-30"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
