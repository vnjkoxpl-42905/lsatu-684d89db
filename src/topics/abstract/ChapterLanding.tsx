import { Link } from "react-router-dom";
import chapter from "./content/chapter.md?raw";
import { ChapterReader } from "./components/ChapterReader";

// Three master keys pinned above the chapter per brief §7 surface placement.
const PINNED = [
  { term: "Explanation", meaning: "Cause" },
  { term: "Hypothesis", meaning: "Potential cause" },
  { term: "Presuppose", meaning: "Require" },
];

export function ChapterLanding() {
  return (
    <div className="mx-auto max-w-3xl">
      <section
        aria-label="Three master keys"
        className="m-4 md:mt-6 md:mx-6 rounded-2xl border border-border bg-card/40 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Three master keys
        </p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {PINNED.map((p) => (
            <li
              key={p.term}
              className="rounded-md border border-border bg-background/60 p-3"
            >
              <p className="text-sm font-semibold">{p.term}</p>
              <p className="text-xs text-muted-foreground">{p.meaning}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          <Link
            to="/topics/abstract/reference/04"
            className="underline text-muted-foreground"
          >
            Open the Master Keys reference card
          </Link>
          {" · "}
          <Link
            to="/topics/abstract/playground"
            className="underline text-muted-foreground"
          >
            Try the playground
          </Link>
        </p>
      </section>
      <ChapterReader markdown={chapter} />
      <footer className="px-4 md:px-6 pb-10">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <p className="text-sm font-semibold">Next up</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
            <li>
              <Link
                className="underline"
                to="/topics/abstract/drills/d1"
              >
                D1 · Strip-Down Warm-Up
              </Link>{" "}
              <span className="text-muted-foreground">
                ·label clauses, then reveal.
              </span>
            </li>
            <li>
              <Link
                className="underline"
                to="/topics/abstract/drills/d2"
              >
                D2 · Indicator Classification
              </Link>{" "}
              <span className="text-muted-foreground">
                ·bucket the indicator words.
              </span>
            </li>
            <li>
              <Link
                className="underline"
                to="/topics/abstract/flashcards"
              >
                Flashcards
              </Link>{" "}
              <span className="text-muted-foreground">
                ·review the master keys + FABS + slots.
              </span>
            </li>
            <li>
              <Link
                className="underline"
                to="/topics/abstract/playground"
              >
                Playground
              </Link>{" "}
              <span className="text-muted-foreground">
                ·strip a stimulus into slots.
              </span>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
