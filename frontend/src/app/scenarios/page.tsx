import { scenarios } from "@/lib/scenarios-data";
import { ScenarioFilters } from "@/components/scenarios/scenario-filters";
import { HomeNav } from "@/components/landing/home-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { UpgradeBanner } from "@/components/landing/upgrade-banner";

export const metadata = {
  title: "AWS Architecture Scenarios — Real Exam-Ready Designs | SparkUpCloud",
  description: `${scenarios.length} curated AWS architecture scenarios with visual diagrams, reference designs, and common traps. Exam-ready prep for SAA, SAP, DVA, SCS.`,
  alternates: {
    canonical: "https://www.sparkupcloud.com/scenarios",
  },
};

export default function ScenariosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/40 via-white to-amber-50/30">
      <UpgradeBanner
        toolId="scenarios"
        message="Scenarios are a fraction of what's inside. Get 8,800+ practice questions and AI-powered exam prep."
      />
      <HomeNav />

      <section className="px-6 pt-16 pb-10 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block text-xs font-bold uppercase tracking-wider text-violet-600 bg-violet-100 px-3 py-1 rounded-full mb-4">
            Scenario Library
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 mb-4">
            Architecture{" "}
            <span className="relative inline-block">
              Scenarios
              <span className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-violet-500" />
            </span>
          </h1>
          <p className="text-lg text-stone-600">
            {scenarios.length} curated AWS design scenarios with visual
            architectures, reference solutions, applied heuristics, and common
            exam traps. The way AWS actually tests you.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <ScenarioFilters />
      </section>

      <SiteFooter />
    </div>
  );
}
