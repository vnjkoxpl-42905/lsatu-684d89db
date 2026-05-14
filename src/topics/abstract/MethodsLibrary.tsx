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
    <div ref={rootRef} className="mx-auto max-w-4xl space-y-8 p-4 md:p-8">
      <header className="space-y-3">
        <p className="codex-eyebrow">Appendix · Methods of Reasoning</p>
        <h1 className="codex-display text-4xl md:text-5xl">
          Seventeen Patterns
        </h1>
        <p className="codex-prose max-w-2xl text-base">
          Every Method of Reasoning answer on the LSAT describes one of the
          patterns below. Read the title, the definition, and the example.
          Then return to the practice set at the bottom and try the assigned
          PT questions.
        </p>
      </header>

      <hr className="codex-rule" />

      <section
        aria-label="Method patterns"
        className="grid gap-4 md:grid-cols-2"
      >
        {DATA.methods.map((m) => (
          <MethodCard key={m.id} method={m} />
        ))}
      </section>

      <section
        aria-label="Practice question set"
        className="codex-card-soft p-5"
      >
        <p className="codex-eyebrow">Practice on these PTs</p>
        <p className="codex-prose mt-3 text-base">
          Use the patterns above on these assigned PT Method questions. Run
          each one twice: blind, then with the pattern map.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {DATA.practiceQuestionSet.map((pt) => (
            <li key={pt} className="codex-chip codex-mono">
              {pt}
            </li>
          ))}
        </ul>
      </section>

      <footer className="codex-marginalia">
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
    <article className="codex-card" data-method-id={method.id}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="codex-eyebrow">Method {method.number}</p>
          <h3 className="codex-display mt-1 text-xl">
            {method.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${method.id}-body`}
          className="codex-btn-ghost min-h-11"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </header>
      <p className="codex-prose mt-3 text-base">{method.definition}</p>
      {open ? (
        <div
          id={`${method.id}-body`}
          className="codex-card-soft mt-4 space-y-2 p-4"
        >
          <p className="codex-eyebrow">Example</p>
          <p className="codex-prose whitespace-pre-wrap text-base">
            {method.example}
          </p>
        </div>
      ) : null}
    </article>
  );
}
