"use client";

import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { FlashcardDeck } from "@/components/study/flashcard-deck";
import type { ConceptDetail } from "@/lib/api-types";

export default function FlashcardsPage() {
  const user = useAuthStore((s) => s.user);
  const [concepts, setConcepts] = useState<ConceptDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.active_exam_id) {
        setLoading(false);
        return;
      }
      try {
        const summaries = await api.getConcepts(user.active_exam_id);
        // Fetch details for each concept (limit to first 30 for performance)
        const toFetch = summaries.slice(0, 30);
        const details = await Promise.all(
          toFetch.map((c) =>
            api.getConceptDetail(user.active_exam_id!, c.id).catch(() => null)
          )
        );
        setConcepts(
          details.filter((d): d is ConceptDetail => d !== null && (d.concept.key_facts?.length ?? 0) > 0)
        );
      } catch (err) {
        setError("Failed to load flashcards. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.active_exam_id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!user?.active_exam_id) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <Layers className="h-16 w-16 text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-900">No Exam Selected</h2>
        <p className="mt-2 max-w-md text-sm text-stone-500">
          Select a certification exam from your dashboard to start reviewing
          flashcards.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <Layers className="h-16 w-16 text-stone-300 mb-4" />
        <h2 className="text-xl font-bold text-stone-900">No Flashcards Available</h2>
        <p className="mt-2 max-w-md text-sm text-stone-500">
          Flashcards are generated from exam concepts. Start a study session
          first to populate your concept data.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-stone-900">Flashcards</h1>
        <p className="mt-2 text-sm text-stone-500">
          Review key facts and misconceptions. Click a card to flip it.
        </p>
      </div>
      <FlashcardDeck concepts={concepts} />
    </div>
  );
}
