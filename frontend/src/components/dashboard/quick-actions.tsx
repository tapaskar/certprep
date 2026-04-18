"use client";

import Link from "next/link";
import { BookOpen, RotateCcw, FileText } from "lucide-react";

interface QuickActionsProps {
  reviewCount?: number;
}

export function QuickActions({ reviewCount = 0 }: QuickActionsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Start Study Session */}
      <Link
        href="/study"
        className="relative flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white shadow-md shadow-stone-200/60 hover:scale-[1.02] transition-all duration-200"
      >
        <BookOpen className="h-6 w-6" />
        <span className="font-bold">Start Study Session</span>
      </Link>

      {/* Review Queue */}
      <Link
        href="/study?mode=review"
        className="relative flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-5 text-stone-700 shadow-md shadow-stone-200/60 transition-all duration-200 hover:border-amber-400 hover:scale-[1.02]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <RotateCcw className="h-5 w-5 text-amber-600" />
        </div>
        <span className="font-bold">Review Queue</span>
        {reviewCount > 0 && (
          <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
            {reviewCount}
          </span>
        )}
      </Link>

      {/* Take Mock Exam */}
      <Link
        href="/mock-exam"
        className="relative flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-5 text-stone-700 shadow-md shadow-stone-200/60 transition-all duration-200 hover:border-amber-400 hover:scale-[1.02]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <FileText className="h-5 w-5 text-violet-600" />
        </div>
        <span className="font-bold">Take Mock Exam</span>
      </Link>
    </div>
  );
}
