import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import methodsData from "./content/methods.json";
import { useRecordChapterSection } from "@/components/teacher/bootcamps/hooks/useChapterProgress";

interface MethodEntry {
  id: string;
  number: number;
  title: string;
  definition: string;
  example: string;
}

interface MethodsFile {
  version: number;
  source: string;
  practiceQuestionSet: string[];
  methods: MethodEntry[];
}

const DATA = methodsData as MethodsFile;

// The Methods Library lists 17 verbatim method-of-reasoning patterns with
// definitions and examples. Each card is collapsible to reduce scroll length
// on mobile. Scrolling the page into view fires a single chapter_progress
// write keyed "methods-library" so the Teacher Bootcamps dashboard counts
// the surface as a completed section.

export function MethodsLibrary() {
  const recordSection = useRecordChapterSection();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!rootRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !firedRef.current) {
            firedRef.current = true;
            void recordSection("abstract", "methods-library");
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(rootRef.current);
    return () => obs.disconnect();
  }, [recordSection]);

  return (
    <div ref={rootRef} className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Methods of Reasoning Library
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          17 Method Patterns
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Every Method of Reasoning answer on the LSAT describes one of the
          patterns below. Read the title, the definition, and the example.
          Then return to the practice set at the bottom and try the assigned
          PT questions.
        </p>
      </header>

      <section
        aria-label="Method patterns"
        className="grid gap-3 md:grid-cols-2"
      >
        {DATA.methods.map((m) => (
          <MethodCard key={m.id} method={m} />
        ))}
      </section>

      <section
        aria-label="Practice question set"
        className="rounded-xl border border-border bg-card/50 p-4"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Practice on these PTs
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the patterns above on these assigned PT Method questions. Run
          each one twice: blind, then with the pattern map.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {DATA.practiceQuestionSet.map((pt) => (
            <li
              key={pt}
              className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs"
            >
              {pt}
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs text-muted-foreground">
        <Link to="/topics/abstract/reference/09" className="underline">
          See the Matching Keywords Framework card
        </Link>{" "}
        ·{" "}
        <Link to="/topics/abstract/reference/10" className="underline">
          See the Key Terms card
        </Link>
      </footer>
    </div>
  );
}

function MethodCard({ method }: { method: MethodEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <article
      className="rounded-xl border border-border bg-card/40 p-4"
      data-method-id={method.id}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            Method {method.number}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug">
            {method.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${method.id}-body`}
          className="min-h-11 rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary/60"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </header>
      <p className="mt-2 text-sm leading-relaxed">{method.definition}</p>
      {open ? (
        <div
          id={`${method.id}-body`}
          className="mt-3 space-y-2 rounded-md border border-border bg-background/60 p-3 text-sm leading-relaxed"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Example
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {method.example}
          </p>
        </div>
      ) : null}
    </article>
  );
}
