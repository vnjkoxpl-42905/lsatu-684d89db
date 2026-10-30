import { useState } from "react";
import type { RelationKind } from "../observatory";
import { indicatorsUsed, type ForgeTask } from "./rounds";
import "../observatory.css";
import "./wings.css";

/**
 * Forge a Statement.
 *
 * The observatory asks for a relationship and the student writes one. Producing
 * the structure cements it deeper than spotting it, which is the whole reason
 * this wing exists.
 *
 * What comes back is deliberately narrow. The observatory can tell whether the
 * sentence reached for an indicator the bank uses for that type, and it says
 * exactly that. It does not say the statement is good, or true, or well formed,
 * because it cannot see any of those, and a world that pretended otherwise
 * would be the fake feedback this Centre refuses everywhere else.
 */

const LABEL: Record<RelationKind, string> = {
  conditional: "conditional",
  causal: "causal",
  comparative: "comparative",
};

export function ForgeStatement({
  tasks,
  onComplete,
}: {
  tasks: ForgeTask[];
  onComplete?: (written: { kind: RelationKind; sentence: string }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [sentence, setSentence] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [written, setWritten] = useState<{ kind: RelationKind; sentence: string }[]>([]);

  const task = tasks[index];

  if (!tasks.length) {
    return (
      <div
        className="observatory ob-wing flex min-h-[560px] flex-col justify-center gap-3 px-5 py-8 md:px-12"
        data-testid="forge-empty"
      >
        <p className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">Forge a statement</p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ob-ink-dim))]">
          This wing builds its lexicon from indicators the bank names. None in this set do, so there
          is nothing here to forge yet.
        </p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="observatory ob-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">Log complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--ob-ink))]">
          {written.length} {written.length === 1 ? "statement" : "statements"} in your constellation
          log
        </p>
      </div>
    );
  }

  const used = submitted ? indicatorsUsed(task, sentence) : [];

  function submit() {
    if (!sentence.trim() || submitted) return;
    setSubmitted(true);
    setWritten((w) => [...w, { kind: task.kind, sentence: sentence.trim() }]);
  }

  function next() {
    setSubmitted(false);
    setSentence("");
    const at = index + 1;
    setIndex(at);
    if (at >= tasks.length) onComplete?.(written);
  }

  return (
    <div
      className="observatory ob-wing flex min-h-[560px] flex-col gap-6 px-5 py-8 md:px-12"
      data-testid="forge-statement"
    >
      <div className="flex items-center justify-between">
        <span className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
          Forge a statement
        </span>
        <span className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
          {index + 1} of {tasks.length}
        </span>
      </div>

      <p className="observatory-type text-xl leading-snug" data-testid="ob-forge-task">
        Write me a <em>{LABEL[task.kind]}</em> statement
        {task.about ? <> about {task.about}</> : null}.
      </p>

      <label className="flex flex-col gap-2">
        <span className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
          Your statement
        </span>
        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          disabled={submitted}
          rows={3}
          className="ob-input rounded-md px-3 py-2 text-sm"
          placeholder="one sentence"
          data-testid="ob-forge-input"
        />
      </label>

      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          disabled={!sentence.trim()}
          className="ob-button observatory-mono w-fit rounded-md px-4 py-2 text-xs"
          data-testid="ob-forge-submit"
        >
          Draw it
        </button>
      ) : (
        <div className="flex flex-col gap-3" data-testid="ob-forge-verdict">
          <p className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
            {used.length ? "Indicator found" : "No indicator found"}
          </p>
          <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ob-ink-dim))]">
            {used.length ? (
              <>
                You built it on {used.map((u) => `"${u}"`).join(", ")}, which is{" "}
                {LABEL[task.kind]} in this bank's own vocabulary. Whether the statement is a good
                one is not something the observatory can see; that is for the Coach.
              </>
            ) : (
              <>
                Nothing in that sentence matches an indicator this bank uses for a{" "}
                {LABEL[task.kind]} relationship. That does not make it wrong, but the observatory
                cannot draw a figure it cannot anchor.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="ob-button observatory-mono w-fit rounded-md px-4 py-2 text-xs"
            data-testid="ob-forge-next"
          >
            Next
          </button>
        </div>
      )}

      {written.length ? (
        <div className="mt-auto pt-4" data-testid="ob-forge-log">
          <p className="observatory-mono mb-2 text-xs text-[hsl(var(--ob-ink-dim))]">
            Constellation log · {written.length}
          </p>
          <ul className="flex flex-col gap-1">
            {written.slice(-3).map((w, i) => (
              <li key={i} className="ob-log-line truncate text-xs">
                {w.sentence}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
