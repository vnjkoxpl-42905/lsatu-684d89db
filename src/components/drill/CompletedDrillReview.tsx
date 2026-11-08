import * as React from "react";
import { Check, Minus, Search, X } from "lucide-react";
import { questionBank } from "@/lib/questionLoader";
import { cn } from "@/lib/utils";
import SectionReviewWalk, { type ReviewWalkSession } from "@/components/drill/SectionReviewWalk";
import { useAnswerPopularity, type PopularityKey } from "@/hooks/useAnswerPopularity";

/**
 * The one results-and-review page for a finished drill, in 7Sage's shape:
 * score header, filters, a question table (result, answer popularity, timing,
 * difficulty), and About this drill. A question opens in the real exam screen
 * (SectionReviewWalk, the frame the drill itself runs in), full screen.
 *
 * Never hand-build question markup here. Two earlier versions did and both
 * drifted from the drill layout. Reusing the drill's own components stops that.
 */

export interface ReviewAttempt {
  qid?: string;
  selected_answer?: string;
  correct?: boolean;
  time_ms?: number;
}

const LETTERS = ["A", "B", "C", "D", "E"] as const;
type ResultFilter = "all" | "correct" | "incorrect" | "unanswered";

function formatTime(ms = 0) {
  const total = Math.round(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function ResultMark({ attempt, small }: { attempt?: ReviewAttempt; small?: boolean }) {
  const size = small ? "h-4 w-4" : "h-8 w-8";
  if (!attempt) return <span className={cn("inline-block rounded-full border-2 border-muted-foreground/40", size)} aria-label="Unanswered"><span className="sr-only">Unanswered</span></span>;
  return attempt.correct ? (
    <span className={cn("inline-flex items-center justify-center rounded-full bg-emerald-500 text-white", size)} aria-label="Correct"><Check className={small ? "h-3 w-3" : "h-4 w-4"} aria-hidden /><span className="sr-only">Correct</span></span>
  ) : (
    <span className={cn("inline-flex items-center justify-center rounded-full bg-red-400 text-white", size)} aria-label="Incorrect"><Minus className={small ? "h-3 w-3" : "h-4 w-4"} aria-hidden /><span className="sr-only">Incorrect</span></span>
  );
}

function questionLabel(qid: string) {
  const q = questionBank.getQuestion(qid);
  return q ? `PT${q.pt}.S${q.section}.Q${q.qnum}` : qid;
}

/** Five bars, A to E: height is the share of students, green is the right answer. */
function PopularityBars({ percents, correct, picked }: { percents?: Record<string, number>; correct?: string; picked?: string }) {
  if (!percents) return <span className="text-muted-foreground">–</span>;
  return (
    <div className="inline-flex flex-col items-center" aria-label={LETTERS.map((l) => `${l} ${percents[l] ?? 0}%`).join(", ")}>
      <div className="flex h-14 items-end gap-1">
        {LETTERS.map((l) => (
          <div key={l} className="relative h-full w-4 overflow-hidden rounded-sm bg-muted">
            <div className={cn("absolute inset-x-0 bottom-0", l === correct ? "bg-emerald-500" : "bg-muted-foreground/30")} style={{ height: `${Math.max(percents[l] ?? 0, 2)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-muted-foreground">
        {LETTERS.map((l) => (
          <span key={l} className={cn("w-4 text-center", l === picked && l !== correct && "rounded-full text-red-500 ring-1 ring-red-400")}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function DifficultyDots({ level }: { level?: number }) {
  if (!level) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="inline-flex gap-1" aria-label={`Difficulty ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={cn("h-2.5 w-2.5 rounded-sm", i <= level ? "bg-primary" : "bg-muted")} />)}
    </span>
  );
}

export function CompletedDrillReview({ title, qids, attempts, openIndex, onOpen, about }: {
  title: string;
  qids: string[];
  attempts: ReviewAttempt[];
  /** Index of the open question, or null for the table. */
  openIndex: number | null;
  onOpen: (index: number | null) => void;
  /** Rows for "About this drill", label and value. */
  about?: Array<[string, React.ReactNode]>;
}) {
  const byQid = React.useMemo(() => new Map(attempts.map((a) => [a.qid, a])), [attempts]);
  const [result, setResult] = React.useState<ResultFilter>("all");
  const [tag, setTag] = React.useState("all");
  const [difficulty, setDifficulty] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<"question" | "time" | "difficulty">("question");
  const lastOpened = React.useRef<number | null>(null);

  const keys = React.useMemo<PopularityKey[]>(() => qids.flatMap((qid) => {
    const q = questionBank.getQuestion(qid);
    return q ? [{ qid, pt: Number(q.pt), section: Number(q.section), qnum: Number(q.qnum) }] : [];
  }), [qids]);
  const { data: popularity } = useAnswerPopularity(keys);

  // Coming back from a question lands on its row, as 7Sage's return_to does.
  React.useEffect(() => {
    if (openIndex !== null) { lastOpened.current = openIndex; return; }
    if (lastOpened.current === null) return;
    document.getElementById(`question-row-${lastOpened.current}`)?.scrollIntoView({ block: "center" });
  }, [openIndex]);

  if (openIndex !== null && openIndex >= 0 && openIndex < qids.length) {
    const session: ReviewWalkSession = {
      questionQueue: qids,
      attempts: new Map(attempts.filter((a) => a.qid).map((a) => [a.qid!, { selectedAnswer: a.selected_answer ?? null }])),
    };
    return (
      <div className="fixed inset-0 z-[200] overflow-auto bg-white" role="dialog" aria-modal="true" aria-label={`${title} review`}>
        <SectionReviewWalk
          session={session}
          variant="drill"
          backLabel="All questions"
          initialIndex={openIndex}
          onIndexChange={(i) => { if (i !== openIndex) onOpen(i); }}
          onBack={() => onOpen(null)}
        />
      </div>
    );
  }

  const answered = qids.filter((qid) => byQid.get(qid));
  const correctCount = qids.filter((qid) => byQid.get(qid)?.correct).length;
  const pct = qids.length ? Math.round((correctCount / qids.length) * 100) : 0;
  const allTags = [...new Set(qids.flatMap((qid) => { const q = questionBank.getQuestion(qid); return q ? [q.qtype, ...(q.questionFeatures ?? [])].filter(Boolean) : []; }))].sort();

  const rows = qids.map((qid, index) => ({ qid, index, q: questionBank.getQuestion(qid), attempt: byQid.get(qid) }))
    .filter(({ q, attempt }) => {
      if (result === "correct" && !attempt?.correct) return false;
      if (result === "incorrect" && (!attempt || attempt.correct)) return false;
      if (result === "unanswered" && attempt) return false;
      if (tag !== "all" && !(q && [q.qtype, ...(q.questionFeatures ?? [])].includes(tag))) return false;
      if (difficulty !== "all" && q?.difficulty !== Number(difficulty)) return false;
      if (search.trim()) {
        const hay = q ? `${q.stimulus} ${q.questionStem} ${Object.values(q.answerChoices ?? {}).join(" ")}`.toLowerCase() : "";
        if (!hay.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    })
    .sort((a, b) => sort === "time" ? (b.attempt?.time_ms ?? 0) - (a.attempt?.time_ms ?? 0)
      : sort === "difficulty" ? (b.q?.difficulty ?? 0) - (a.q?.difficulty ?? 0) : a.index - b.index);

  const select = "rounded-lg border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <section aria-label="Drill results" className="flex flex-col gap-8 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-start">
        <div className="flex gap-10 sm:border-r sm:border-border sm:pr-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your score</p>
            <p className="mt-1 text-6xl font-bold leading-none">{pct}%</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{correctCount}/{qids.length} correct</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pink-600">Blind review</p>
            <p className="mt-1 text-2xl font-bold text-pink-600/50" title="No blind review was saved for this drill">–</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results</p>
          <div className="mt-2 flex max-w-xs flex-wrap gap-1.5">
            {qids.map((qid, i) => <button key={`${qid}-${i}`} type="button" onClick={() => onOpen(i)} aria-label={`Open question ${i + 1}`}><ResultMark attempt={byQid.get(qid)} small /></button>)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{answered.length} of {qids.length} answered</p>
        </div>
      </section>

      <section aria-label="Filters" className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-serif text-xl font-semibold">Filters</h2>
          <label className="relative block sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question text…" aria-label="Search question text" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-8 text-sm" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2"><X className="h-4 w-4" /></button>}
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Result" className={select} value={result} onChange={(e) => setResult(e.target.value as ResultFilter)}>
            <option value="all">Result: all</option><option value="correct">Correct</option><option value="incorrect">Incorrect</option><option value="unanswered">Unanswered</option>
          </select>
          <select aria-label="Difficulty" className={select} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="all">Difficulty: all</option>{[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} of 5</option>)}
          </select>
          <select aria-label="Tags" className={select} value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="all">Tags: all</option>{allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{rows.length} question{rows.length === 1 ? "" : "s"}</p>
        <select aria-label="Sort" className={select} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="question">Sort by question</option><option value="time">Sort by time</option><option value="difficulty">Sort by difficulty</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left">Question</th>
              <th className="px-2 py-3 text-center"><div>Result</div><div className="mt-1 flex justify-center gap-4 font-medium normal-case tracking-normal"><span>Actual</span><span>BR</span></div></th>
              <th className="hidden px-2 py-3 text-center md:table-cell">Answer<br />popularity</th>
              <th className="px-4 py-3 text-left">Timing</th>
              <th className="hidden px-4 py-3 text-left md:table-cell">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No questions match these filters.</td></tr>
            ) : rows.map(({ qid, index, q, attempt }) => {
              const tags = q ? [q.qtype, ...(q.questionFeatures ?? [])].filter(Boolean) : [];
              return (
                <tr id={`question-row-${index}`} key={`${qid}-${index}`} className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40" onClick={() => onOpen(index)}>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="w-5 pt-0.5 text-muted-foreground">{index + 1}</span>
                      <div>
                        <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={(e) => { e.stopPropagation(); onOpen(index); }}>{questionLabel(qid)}</button>
                        {tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{t}</span>)}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-4"><div className="flex items-center justify-center gap-5"><ResultMark attempt={attempt} /><span className="w-8 text-center text-muted-foreground">–</span></div></td>
                  <td className="hidden px-2 py-4 text-center md:table-cell"><PopularityBars percents={popularity?.[qid]} correct={q?.correctAnswer} picked={attempt?.selected_answer} /></td>
                  <td className="px-4 py-4 font-mono text-muted-foreground">
                    {attempt ? formatTime(attempt.time_ms) : "–"}
                    {attempt && !attempt.correct && q && <div className="mt-1 font-sans text-xs">Picked <span className="font-semibold text-red-500">{attempt.selected_answer}</span> · answer {q.correctAnswer}</div>}
                  </td>
                  <td className="hidden px-4 py-4 md:table-cell"><DifficultyDots level={q?.difficulty} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {about && about.length > 0 && (
        <section aria-label="About this drill" className="pt-6">
          <h2 className="font-serif text-2xl font-semibold">About this drill</h2>
          <dl className="mt-5 grid max-w-xl grid-cols-[10rem_1fr] gap-y-3 text-sm">
            {about.map(([label, value]) => <React.Fragment key={label}><dt className="text-muted-foreground">{label}</dt><dd>{value}</dd></React.Fragment>)}
          </dl>
        </section>
      )}
    </div>
  );
}
