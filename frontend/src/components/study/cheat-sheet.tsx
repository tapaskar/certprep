"use client";

import { FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ConceptDetail } from "@/lib/api-types";

interface CheatSheetProps {
  concept: ConceptDetail;
  collapsible?: boolean;
}

export function CheatSheet({ concept, collapsible = false }: CheatSheetProps) {
  const [isOpen, setIsOpen] = useState(!collapsible);

  const content = (
    <div className="space-y-3">
      {concept.concept.key_facts.length > 0 && (
        <ul className="space-y-1">
          {concept.concept.key_facts.map((fact, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              {fact}
            </li>
          ))}
        </ul>
      )}
      {concept.concept.common_misconceptions.length > 0 && (
        <div className="space-y-1">
          {concept.concept.common_misconceptions.map((m, i) => (
            <p key={i} className="flex items-start gap-2 text-sm text-red-600">
              <span className="shrink-0 font-bold">&times;</span>
              {m}
            </p>
          ))}
        </div>
      )}
    </div>
  );

  if (collapsible) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-stone-700"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-500" />
            Quick Reference: {concept.concept.name}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-400" />
          )}
        </button>
        {isOpen && <div className="border-t border-amber-200 px-4 pb-4 pt-3">{content}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-700">
        <FileText className="h-4 w-4 text-amber-500" />
        Quick Reference
      </div>
      {content}
    </div>
  );
}
