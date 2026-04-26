"use client";

/**
 * MermaidDiagram — renders a ```mermaid code block as an actual diagram.
 *
 * Mermaid (~150KB gzipped) is dynamically imported so it doesn't bloat
 * the initial bundle for users who never see a diagram. We only load it
 * the first time a MermaidDiagram component mounts.
 *
 * Used by both the path runner Markdown and the tutor-chat RichText
 * renderers — when they encounter a code fence with language="mermaid",
 * they render this instead of CodeBlock. Means Coach can emit:
 *
 *   ```mermaid
 *   flowchart LR
 *     A[Client] --> B[ALB] --> C[ECS]
 *   ```
 *
 * and the user sees a real diagram.
 *
 * On render failure (e.g. invalid mermaid syntax from a hallucinated
 * AI response), we gracefully fall back to showing the source as a
 * code block so the explanation isn't lost.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Maximize2 } from "lucide-react";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  source: string;
  className?: string;
}

// Module-level singleton so we only initialize Mermaid once across all
// instances. Re-initializing is allowed but wasteful.
let mermaidInitPromise: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import("mermaid").then((mod) => {
      const m = mod.default;
      m.initialize({
        startOnLoad: false,
        theme: "base",
        // Tuned to fit Anthropic's warm clay palette used elsewhere.
        themeVariables: {
          primaryColor: "#FBF3E5",
          primaryTextColor: "#2A1810",
          primaryBorderColor: "#DA7756",
          lineColor: "#B85A3D",
          secondaryColor: "#FCE9D4",
          tertiaryColor: "#FFFAF1",
          fontSize: "13px",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        },
        // "loose" lets the model use parentheses, quotes, HTML in node
        // labels without choking. Coach output is trusted (server-rendered
        // by us via the LLM, not user-submitted HTML).
        securityLevel: "loose",
        flowchart: { curve: "basis", htmlLabels: true },
        // Don't blow up on minor parse errors — log to console instead.
        suppressErrorRendering: true,
      });
      return m;
    });
  }
  return mermaidInitPromise;
}

/**
 * Massage common LLM quirks into syntactically clean Mermaid before
 * we hand it to the parser. The model often:
 *   - prefixes the source with stray whitespace or a BOM
 *   - wraps the diagram in backticks even though we already stripped them
 *   - uses smart-quotes that the parser doesn't recognise
 */
function normaliseSource(s: string): string {
  return s
    .replace(/^\uFEFF/, "")       // BOM
    .replace(/^\s*```(?:mermaid)?\s*/i, "")  // accidental inner fence
    .replace(/```\s*$/i, "")      // accidental trailing fence
    .replace(/[\u2018\u2019]/g, "'")  // smart single quotes → straight
    .replace(/[\u201C\u201D]/g, '"')  // smart double quotes → straight
    .trim();
}

export function MermaidDiagram({ source, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRendered(false);

    loadMermaid()
      .then(async (mermaid) => {
        if (cancelled || !containerRef.current) return;
        const cleaned = normaliseSource(source);
        try {
          // mermaid.render needs a unique id per call to avoid SVG id collisions.
          const id = `mmd-${Math.random().toString(36).slice(2, 10)}`;
          const { svg } = await mermaid.render(id, cleaned);
          if (cancelled || !containerRef.current) return;
          containerRef.current.innerHTML = svg;
          setRendered(true);
        } catch (e) {
          if (cancelled) return;
          const msg = e instanceof Error ? e.message : "Diagram failed to render";
          // Log full error in dev console so we can see what Coach produced.
          // eslint-disable-next-line no-console
          console.warn("[MermaidDiagram] render failed:", msg, "\n--- source ---\n", cleaned);
          // Strip Mermaid's verbose internal stack noise — first line is enough
          setError(msg.split("\n")[0].slice(0, 200));
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Mermaid failed to load");
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    // Graceful fallback — show the parser error AND the source so we can
    // diagnose what went wrong, plus a button to open it in Mermaid's
    // online live editor for quick fixing.
    const liveEditorUrl = `https://mermaid.live/edit#pako:${encodeURIComponent(
      btoa(JSON.stringify({ code: source, mermaid: { theme: "default" } })),
    )}`;
    return (
      <div className={cn("my-2", className)}>
        <div className="rounded-t-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            Diagram couldn&apos;t render
          </div>
          <div className="mt-1 font-mono text-[11px] text-amber-800 break-words">
            {error}
          </div>
          <a
            href={liveEditorUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-[11px] font-medium text-amber-700 underline hover:text-amber-900"
          >
            Open in Mermaid Live Editor →
          </a>
        </div>
        <CodeBlock code={source} language="mermaid" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative my-3 rounded-lg border border-stone-200 bg-stone-50/60 overflow-hidden",
        !rendered && "min-h-[60px]",
        className,
      )}
    >
      {/* Optional fullscreen — opens the source in a new window. Lightweight
          MVP for "I want a bigger view" without us shipping a modal. */}
      {rendered && (
        <button
          type="button"
          onClick={() => {
            const w = window.open("", "_blank", "width=900,height=700");
            if (!w || !containerRef.current) return;
            w.document.write(
              `<title>Diagram</title><body style="margin:0;padding:24px;background:#FFFAF1;font-family:system-ui">${containerRef.current.innerHTML}</body>`,
            );
            w.document.close();
          }}
          title="Open diagram in new window"
          className="absolute top-1.5 right-1.5 z-10 rounded-md bg-white/80 backdrop-blur px-2 py-1 text-[10px] font-semibold text-stone-500 hover:text-stone-900 ring-1 ring-stone-200"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      )}
      <div
        ref={containerRef}
        className="px-4 py-3 [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto"
      />
      {!rendered && !error && (
        <div className="flex items-center justify-center px-4 py-3 text-xs text-stone-400">
          Rendering diagram…
        </div>
      )}
    </div>
  );
}
