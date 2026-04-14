"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowRight, Map } from "lucide-react";

interface RoadmapPath {
  exam_id: string;
  stage: number;
  label: string;
}

interface Roadmap {
  id: string;
  title: string;
  description: string;
  color: string;
  paths: RoadmapPath[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExamMap = Record<string, any>;

export default function RoadmapsPage() {
  const router = useRouter();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [exams, setExams] = useState<ExamMap>({});
  const [loading, setLoading] = useState(true);
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getRoadmaps(), api.getExams()])
      .then(([r, e]) => {
        setRoadmaps(r);
        const map: ExamMap = {};
        for (const exam of e) {
          map[exam.id] = exam;
        }
        setExams(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-500" />
      </div>
    );
  }

  const active = selectedRoadmap
    ? roadmaps.find((r) => r.id === selectedRoadmap)
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-stone-900">
          <Map className="h-8 w-8 text-amber-500" />
          Certification Roadmaps
        </h1>
        <p className="mt-2 text-stone-500">
          Choose a career path and follow the recommended certification sequence
          across cloud providers.
        </p>
      </div>

      {/* Roadmap selector */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roadmaps.map((rm) => (
          <button
            key={rm.id}
            onClick={() =>
              setSelectedRoadmap(selectedRoadmap === rm.id ? null : rm.id)
            }
            className={cn(
              "rounded-xl border-2 p-5 text-left transition-all",
              selectedRoadmap === rm.id
                ? "shadow-lg scale-[1.02]"
                : "border-stone-200 hover:border-stone-300 hover:shadow-md"
            )}
            style={
              selectedRoadmap === rm.id
                ? { borderColor: rm.color, backgroundColor: rm.color + "08" }
                : {}
            }
          >
            <div
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: rm.color }}
            />
            <h3 className="mt-2 text-lg font-bold text-stone-900">
              {rm.title}
            </h3>
            <p className="mt-1 text-sm text-stone-500">{rm.description}</p>
            <p className="mt-2 text-xs text-stone-400">
              {rm.paths.length} certifications
            </p>
          </button>
        ))}
      </div>

      {/* Selected roadmap detail */}
      {active && (
        <div className="mt-10">
          <h2
            className="text-2xl font-bold"
            style={{ color: active.color }}
          >
            {active.title}
          </h2>
          <p className="mt-1 text-sm text-stone-500">{active.description}</p>

          {/* Stage-based visualization */}
          {[1, 2, 3].map((stage) => {
            const stagePaths = active.paths.filter((p) => p.stage === stage);
            if (stagePaths.length === 0) return null;

            const stageLabel =
              stage === 1
                ? "Foundation"
                : stage === 2
                  ? "Core"
                  : "Advanced";

            return (
              <div key={stage} className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold"
                    style={{ backgroundColor: active.color }}
                  >
                    {stage}
                  </div>
                  <h3 className="text-lg font-bold text-stone-700">
                    Stage {stage}: {stageLabel}
                  </h3>
                  {stage < 3 && (
                    <ArrowRight className="h-5 w-5 text-stone-300 ml-auto hidden sm:block" />
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ml-11">
                  {stagePaths.map((p) => {
                    const exam = exams[p.exam_id];
                    if (!exam) return null;
                    return (
                      <button
                        key={p.exam_id}
                        onClick={() => router.push(`/exam/${p.exam_id}`)}
                        className="rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-amber-400 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span
                              className="inline-block rounded-full px-2 py-0.5 text-xs font-bold text-white"
                              style={{ backgroundColor: active.color + "CC" }}
                            >
                              {p.label}
                            </span>
                            <h4 className="mt-2 text-sm font-bold text-stone-900">
                              {exam.name}
                            </h4>
                            <p className="mt-0.5 text-xs text-stone-400">
                              {exam.code} &middot;{" "}
                              {exam.provider?.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-3 text-xs text-stone-500">
                          <span>{exam.total_questions} Qs</span>
                          <span>{exam.time_limit_minutes} min</span>
                          <span>{exam.passing_score_pct}% pass</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
