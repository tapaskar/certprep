"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { Sparkles, GraduationCap, Target, MessageCircle } from "lucide-react";

export default function TutorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
        </div>
      }
    >
      <TutorPageInner />
    </Suspense>
  );
}

function TutorPageInner() {
  const searchParams = useSearchParams();
  const conceptId = searchParams.get("concept") || undefined;
  const conceptName = searchParams.get("name") || undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      {/* Main chat */}
      <div className="min-w-0">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-100 px-3 py-1 rounded-full">
            <Sparkles className="h-3 w-3" />
            New
          </div>
          <h1 className="mt-2 text-2xl font-bold text-stone-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-violet-600" />
            Coach — your 1-on-1 AI tutor
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            A patient teacher that knows your study progress and walks you
            through topics like a real human tutor.
          </p>
        </div>

        <TutorChat
          conceptId={conceptId}
          conceptName={conceptName}
          className="h-[calc(100vh-15rem)] min-h-[500px]"
        />
      </div>

      {/* Sidebar — what Coach knows about you */}
      <aside className="hidden lg:block">
        <div className="rounded-xl border border-stone-200 bg-white p-5 sticky top-20">
          <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-600" />
            What Coach knows
          </h3>
          <ul className="space-y-3 text-xs text-stone-700">
            <Item title="Your active exam">
              Coach scopes everything to the cert you&apos;re prepping for.
            </Item>
            <Item title="Your weakest concepts">
              The 5 topics where your mastery is lowest — Coach can volunteer
              practice in those areas.
            </Item>
            <Item title="Your overall readiness %">
              So Coach calibrates depth (basics for newcomers, traps for
              experts).
            </Item>
            <Item title="Optional concept focus">
              Open Coach from any concept page and the conversation centers on
              that topic with the cheat sheet pre-loaded.
            </Item>
          </ul>

          <div className="mt-5 pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2 flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3" />
              How it works best
            </h4>
            <ul className="space-y-1.5 text-xs text-stone-600">
              <li className="flex gap-1.5">
                <span className="text-amber-600">→</span>
                Be specific: &quot;Explain RDS Multi-AZ vs read replica.&quot;
              </li>
              <li className="flex gap-1.5">
                <span className="text-amber-600">→</span>
                Ask for examples: &quot;Give me a real-world scenario.&quot;
              </li>
              <li className="flex gap-1.5">
                <span className="text-amber-600">→</span>
                Quiz yourself: &quot;Test me with 3 hard questions.&quot;
              </li>
              <li className="flex gap-1.5">
                <span className="text-amber-600">→</span>
                Push back: &quot;That doesn&apos;t make sense, try another way.&quot;
              </li>
            </ul>
          </div>

          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <strong>Free plan:</strong> 10 messages per day. Pro members get
            unlimited.
          </div>
        </div>
      </aside>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="font-semibold text-stone-900">{title}</span>
      <span className="text-stone-600 leading-relaxed">{children}</span>
    </li>
  );
}
