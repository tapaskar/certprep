"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { StudyExplorer } from "@/components/study/study-explorer";

/**
 * Shared layout for all /study/* routes.
 *
 * The explorer lives here (not in each page) so its collapsed/expanded
 * state survives navigation between concept pages, domain pages, and the
 * study session runner. Next.js does not remount layouts when navigating
 * between their child routes.
 */
export default function StudyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Derive active concept id from the URL — single source of truth
  const conceptMatch = pathname?.match(/\/study\/concept\/([^/?]+)/);
  const activeConceptId = conceptMatch ? decodeURIComponent(conceptMatch[1]) : null;

  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {/* Desktop persistent sidebar */}
        {desktopOpen && (
          <aside className="hidden lg:block shrink-0 w-72 xl:w-80 sticky top-20 self-start">
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
              <StudyExplorer
                onFocusConcept={handleConcept}
                onFocusDomain={handleDomain}
                activeConceptId={activeConceptId}
                className="flex-1 min-h-0"
              />
            </div>
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="hidden lg:flex mb-3 items-center gap-2">
            <button
              onClick={() => setDesktopOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 rounded-md px-2 py-1 hover:bg-stone-100"
            >
              {desktopOpen ? (
                <>
                  <PanelLeftClose className="h-3.5 w-3.5" /> Hide Explorer
                </>
              ) : (
                <>
                  <PanelLeftOpen className="h-3.5 w-3.5" /> Show Explorer
                </>
              )}
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
