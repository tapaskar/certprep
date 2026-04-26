"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftOpen, PanelLeftClose, BookOpen } from "lucide-react";
import { StudyExplorer } from "@/components/study/study-explorer";

/**
 * Shared layout for all /study/* routes.
 *
 * The explorer lives here (not in each page) so its expanded/collapsed
 * state survives navigation between concept pages, domain pages, and the
 * study session runner — Next.js does not remount layouts when navigating
 * between their child routes.
 *
 * Collapse state also persists in localStorage so a user who hides the
 * explorer doesn't have to re-hide it after every full-page nav. Without
 * the persistence the explorer would re-appear every time they came back
 * to /study from elsewhere — the bug that made "hide" feel broken.
 *
 * When collapsed on desktop we render a slim vertical sliver with a
 * "SHOW EXPLORER" affordance, mirroring the Coach panel pattern. The
 * earlier text-only toggle button was easy to miss.
 */
const STORAGE_KEY = "sparkupcloud_study_explorer_open";

export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const conceptMatch = pathname?.match(/\/study\/concept\/([^/?]+)/);
  const activeConceptId = conceptMatch ? decodeURIComponent(conceptMatch[1]) : null;

  // Default OPEN; only switch to closed if a previous session collapsed it.
  // Read-once on mount to avoid SSR/CSR flashes.
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "0") setDesktopOpen(false);
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, desktopOpen ? "1" : "0");
  }, [desktopOpen]);

  const handleConcept = (id: string) => {
    router.push(`/study/concept/${id}`);
    setMobileOpen(false);
  };
  const handleDomain = (id: string) => {
    router.push(`/study/domain/${id}`);
    setMobileOpen(false);
  };

  return (
    <div>
      {/* Mobile explorer toggle — always available on /study/* */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm"
        >
          {mobileOpen ? (
            <span className="flex items-center gap-2">
              <PanelLeftClose className="h-4 w-4" /> Hide Exam Explorer
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <PanelLeftOpen className="h-4 w-4" /> Browse Exam Structure
              </span>
              <span className="text-xs font-normal text-stone-500">
                Domain → Topic → Concept
              </span>
            </>
          )}
        </button>
        {mobileOpen && (
          <div className="mt-2 rounded-xl border border-stone-200 bg-white shadow-sm h-[60vh] overflow-hidden flex flex-col">
            <StudyExplorer
              onFocusConcept={handleConcept}
              onFocusDomain={handleDomain}
              activeConceptId={activeConceptId}
              className="flex-1 min-h-0"
            />
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {/* Desktop persistent sidebar — full panel when open, slim sliver
            with a SHOW handle when collapsed. The sliver guarantees there
            is always a visible affordance to bring the explorer back,
            without taking real estate from the main column. */}
        <aside className="hidden lg:block shrink-0 sticky top-20 self-start">
          {desktopOpen ? (
            <div className="w-72 xl:w-80 rounded-xl border border-stone-200 bg-white shadow-sm h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
              {/* Internal collapse handle */}
              <div className="shrink-0 flex items-center justify-between border-b border-stone-200 px-3 py-2 bg-gradient-to-r from-amber-50/40 to-white">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Explorer
                </div>
                <button
                  onClick={() => setDesktopOpen(false)}
                  className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  title="Hide explorer"
                  aria-label="Hide exam explorer panel"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
              <StudyExplorer
                onFocusConcept={handleConcept}
                onFocusDomain={handleDomain}
                activeConceptId={activeConceptId}
                className="flex-1 min-h-0"
              />
            </div>
          ) : (
            <button
              onClick={() => setDesktopOpen(true)}
              className="group relative w-11 h-[calc(100vh-6rem)] rounded-xl border border-stone-200 bg-white shadow-sm hover:border-amber-400 hover:shadow-md transition-all flex flex-col items-center justify-between py-4"
              title="Show exam explorer"
              aria-label="Show exam explorer panel"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <BookOpen className="h-4 w-4" />
              </div>
              <span
                className="text-[11px] font-bold tracking-wider text-stone-500 group-hover:text-stone-900"
                style={{ writingMode: "vertical-rl" }}
              >
                SHOW EXPLORER
              </span>
              <PanelLeftOpen className="h-4 w-4 text-stone-400 group-hover:text-stone-700" />
            </button>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
