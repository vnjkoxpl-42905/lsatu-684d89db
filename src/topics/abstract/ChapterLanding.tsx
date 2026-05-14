import { Link } from "react-router-dom";
import chapter from "./content/chapter.md?raw";
import { ChapterReader } from "./components/ChapterReader";

// Three master keys pinned above the chapter, framed as a marginalia rail.
const PINNED = [
  { term: "Explanation", meaning: "Cause" },
  { term: "Hypothesis", meaning: "Potential cause" },
  { term: "Presuppose", meaning: "Require" },
];

const NEXT_UP = [
  {
    to: "/topics/abstract/drills/d1",
    label: "D1 · Abstract Language Warm-Up",
    hint: "translate abstract phrases into plain English",
  },
  {
    to: "/topics/abstract/drills/d2",
    label: "D2 · Translation Buckets",
    hint: "sort terms by language category",
  },
  {
    to: "/topics/abstract/methods",
    label: "Methods Library",
    hint: "17 method-of-reasoning patterns",
  },
  {
    to: "/topics/abstract/flashcards",
    label: "Flashcards",
    hint: "review master keys, verb taxonomy, decoded glossary",
  },
];

export function ChapterLanding() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-12 md:py-16">
      <header className="codex-reveal-stack max-w-3xl">
        <p className="codex-eyebrow">Volume I · Chapter 01</p>
        <h1 className="codex-display mt-2 text-4xl md:text-5xl leading-[1.04] tracking-tight">
          The Translation Codex
        </h1>
        <p className="codex-marginalia mt-3 text-base text-foreground/80" style={{ fontStyle: "normal" }}>
          A reading-and-decoding bootcamp on the private dialect the LSAT uses
          inside its Logical Reasoning answer choices.
        </p>
      </header>

      <hr className="codex-rule" />

      <div className="codex-chapter-spread mt-2">
        <div className="codex-reveal-stack">
          <ChapterReader markdown={chapter} topicTag="abstract" />
        </div>

        <aside aria-label="Marginalia" className="space-y-8 lg:pt-2">
          <section
            aria-label="Three master keys"
            className="codex-card-soft p-5"
          >
            <p className="codex-eyebrow">Three master keys</p>
            <dl className="mt-3 space-y-2.5">
              {PINNED.map((p) => (
                <div key={p.term} className="flex items-baseline gap-3 border-b border-border/50 pb-2 last:border-b-0">
                  <dt className="codex-display text-base text-primary">
                    {p.term}
                  </dt>
                  <dd className="codex-marginalia">{p.meaning}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4">
              <Link
                to="/topics/abstract/reference/04"
                className="codex-eyebrow underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                Open the Master Keys card →
              </Link>
            </p>
          </section>

          <section aria-label="Next up" className="codex-card-soft p-5">
            <p className="codex-eyebrow">Next up</p>
            <ul className="mt-3 space-y-3">
              {NEXT_UP.map((n) => (
                <li key={n.to} className="border-b border-border/50 pb-3 last:border-b-0">
                  <Link
                    to={n.to}
                    className="codex-display text-base text-foreground underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                  >
                    {n.label}
                  </Link>
                  <p className="codex-marginalia mt-1">{n.hint}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
