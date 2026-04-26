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
 * Mermaid v11 leaks DOM nodes when render fails — most visibly a
 * "Syntax error in text / mermaid version 11.14.0" SVG appended to
 * <body>. It also leaves behind temporary measurement <div id="dXXX">
 * containers it uses to size labels. Sweep them up after every render.
 *
 * Idempotent and cheap; safe to call from the success path too.
 */
function cleanupOrphans(thisId: string) {
  if (typeof document === "undefined") return;
  // The measurement container mermaid creates per render is `d<id>`.
  document.getElementById(`d${thisId}`)?.remove();
  sweepErrorSvgs();
}

/**
 * Strip every "Syntax error in text" SVG mermaid has attached to
 * <body> (or anywhere else outside our component). Used both by
 * cleanupOrphans (immediate, post-render) and the global observer
 * below (catches late-arriving SVGs that mermaid attaches via
 * microtasks / next-tick after render() resolves).
 */
function sweepErrorSvgs() {
  if (typeof document === "undefined") return;
  // Cast to Element so this also catches mermaid's wrapping <div>
  // around the SVG — some versions wrap, others don't.
  const candidates = document.querySelectorAll<HTMLElement>(
    "body > svg, body > div > svg",
  );
  candidates.forEach((svg) => {
    const t = svg.textContent || "";
    if (
      t.includes("Syntax error in text") ||
      t.includes("mermaid version") ||
      svg.getAttribute("aria-roledescription") === "error"
    ) {
      // If mermaid wrapped in a div with no other children, kill the wrapper
      const parent = svg.parentElement;
      svg.remove();
      if (
        parent &&
        parent !== document.body &&
        parent.childElementCount === 0 &&
        parent.tagName === "DIV"
      ) {
        parent.remove();
      }
    }
  });
}

/**
 * One-shot global guard. Mermaid sometimes appends the error SVG
 * AFTER our per-render cleanup runs (microtask / requestAnimationFrame
 * inside its render pipeline), so a single cleanup call doesn't catch
 * everything. This MutationObserver lives for the page lifetime and
 * removes any orphan as soon as it's added.
 *
 * Idempotent: only installs once per page. Cheap: filters by tag name
 * before reading textContent, so it's a no-op for ~all DOM mutations.
 */
let observerInstalled = false;
function installGlobalErrorSvgObserver() {
  if (observerInstalled || typeof window === "undefined") return;
  observerInstalled = true;
  const isErrorSvgNode = (node: Node): node is HTMLElement => {
    if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return false;
    const el = node as HTMLElement;
    if (el.tagName !== "SVG" && el.tagName !== "DIV") return false;
    // Walk into div wrappers — mermaid may wrap the error SVG.
    const svg = el.tagName === "SVG" ? el : el.querySelector("svg");
    if (!svg) return false;
    const txt = svg.textContent || "";
    return (
      txt.includes("Syntax error in text") ||
      svg.getAttribute("aria-roledescription") === "error"
    );
  };
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (isErrorSvgNode(node)) {
          (node as HTMLElement).remove();
        }
      });
    }
  });
  obs.observe(document.body, { childList: true, subtree: false });
  // Also sweep once on install — handles SVGs that landed before the
  // first MermaidDiagram mounted (rare, but cheap insurance).
  sweepErrorSvgs();
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

/**
 * Sniff for "this looks like Coach is still streaming a partial diagram".
 * Skipping render on these saves a parse failure (and the inevitable
 * orphan SVG) on every chunk during a streamed response. Once the
 * stream completes we'll have a real diagram and render normally.
 *
 * Heuristic: must start with a known mermaid diagram-type keyword AND
 * contain at least one node/edge/arrow that suggests the body has begun.
 */
const DIAGRAM_TYPE_RE = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|gantt|journey|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|sankey-beta|requirementDiagram)\b/;

function looksLikeStreamingPartial(src: string): boolean {
  if (!src || src.length < 12) return true;
  if (!DIAGRAM_TYPE_RE.test(src)) return true;
  // Must contain at least an arrow, colon, or square bracket — i.e.
  // some body content beyond the type declaration.
  return !/(-->|---|==>|::|\[|\(|\{|:)/.test(src);
}

export function MermaidDiagram({ source, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    // Make sure the global janitor is running before we touch mermaid.
    installGlobalErrorSvgObserver();

    let cancelled = false;
    setError(null);
    setRendered(false);

    // Coach streams its replies token-by-token. While the stream is in
    // flight, `source` will keep being a partial mermaid block — render
    // will fail every time and leak an SVG. Debounce render until the
    // source stops changing for ~250ms (i.e. the chunk has settled).
    const timer = window.setTimeout(() => {
      void runRender();
    }, 250);

    async function runRender() {
      if (cancelled) return;
      const cleaned = normaliseSource(source);

      // Skip obvious in-progress partials silently. Show the loader
      // (rendered=false, error=null) while we wait for the rest.
      if (looksLikeStreamingPartial(cleaned)) {
        sweepErrorSvgs();
        return;
      }

      const mermaid = await loadMermaid().catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Mermaid failed to load");
        return null;
      });
      if (!mermaid || cancelled || !containerRef.current) return;

      const id = `mmd-${Math.random().toString(36).slice(2, 10)}`;

      // Validate with parse() first — never call render() on bad input,
      // because render() leaks a "Syntax error in text" SVG to <body>
      // even when suppressErrorRendering is true.
      //
      // We only call parse() with suppressErrors:true. Calling it again
      // without suppression to "get a better error message" is what was
      // ALSO leaking SVGs — the unsuppressed call can side-effect even
      // when wrapped in try/catch. Generic message is fine; full source
      // is in the fallback display anyway.
      try {
        const parsed = await mermaid.parse(cleaned, { suppressErrors: true });
        if (parsed === false) {
          if (cancelled) return;
          // eslint-disable-next-line no-console
          console.warn(
            "[MermaidDiagram] parse failed — showing source fallback.\n--- source ---\n",
            cleaned,
          );
          setError("Invalid diagram syntax");
          sweepErrorSvgs();
          return;
        }
      } catch {
        // older mermaid versions throw synchronously — fall through to render
      }

      try {
        const { svg } = await mermaid.render(id, cleaned);
        if (cancelled || !containerRef.current) {
          cleanupOrphans(id);
          return;
        }
        containerRef.current.innerHTML = svg;
        setRendered(true);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Diagram failed to render";
        // eslint-disable-next-line no-console
        console.warn("[MermaidDiagram] render failed:", msg, "\n--- source ---\n", cleaned);
        setError(msg.split("\n")[0].slice(0, 200));
      } finally {
        // Always sweep up any temporary measurement / error nodes that
        // mermaid leaves attached to <body>. Cheap, safe, idempotent.
        cleanupOrphans(id);
        // And again on the next tick — mermaid sometimes appends the
        // error SVG via microtask AFTER render() resolves.
        window.setTimeout(sweepErrorSvgs, 0);
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // One last sweep on unmount/source-change so errors that arrived
      // while we were already mid-render don't survive.
      sweepErrorSvgs();
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
