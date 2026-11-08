import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ChevronDown } from "lucide-react";
import { loadRcQuestionIndex } from "@/features/rc/lib/rcBank";
import { useFirstAnswerProgress } from "@/hooks/useFirstAnswerProgress";
import { formatDuration } from "@/lib/analyticsBreakdowns";
import { answersInScope, breakdownInsights, evidenceQuestion, loadInsightTraps, type InsightAnswer, type InsightDimension } from "@/lib/studentInsights";
import type { RcQuestionIndexEntry } from "@/features/rc/lib/rcTypes";
import type { SittingKind } from "@/lib/studentAnalytics";

const DIMENSIONS: Array<[InsightDimension, string]> = [
  ["qtype", "Question type"],
  ["reasoningType", "Reasoning type"],
  ["questionFeature", "Question features"],
  ["difficulty", "Difficulty"],
  ["wrongAnswers", "Wrong answers"],
];
const EMPTY_RC = new Map<number, RcQuestionIndexEntry>();
const EMPTY_TRAPS = new Map<string, string>();
const control = "inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-slate-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function AnalyticsInsights({ id, studentId, self, rangeLabel, since, asOf, include }: {
  id: string;
  studentId: string;
  self: boolean;
  rangeLabel: string;
  since: string | null;
  asOf: string;
  include: Record<SittingKind, boolean>;
}) {
  const { ledger, loading, error, refresh, refreshError } = useFirstAnswerProgress("all", self ? undefined : studentId);
  const [explore, setExplore] = useState(false);
  const [dimension, setDimension] = useState<InsightDimension>("qtype");
  const [area, setArea] = useState<"all" | "LR" | "RC">("all");
  const [selection, setSelection] = useState<{ label: string; ids: string[] } | null>(null);
  const evidenceHeading = useRef<HTMLHeadingElement>(null);
  const evidenceTrigger = useRef<HTMLButtonElement>(null);
  const evidenceId = useId();
  const answers = useMemo(() => answersInScope(ledger?.answers ?? [], include, since, asOf), [ledger, include, since, asOf]);
  const needsRc = answers.some((answer) => answer.area === "RC");
  const rc = useQuery({
    queryKey: ["analytics-insights-rc-index"],
    queryFn: async () => new Map((await loadRcQuestionIndex()).questions.map((question) => [question.questionId, question])),
    enabled: needsRc,
    staleTime: Infinity,
  });
  const index = rc.data ?? EMPTY_RC;
  const scoped = useMemo(() => area === "all" ? answers : answers.filter((answer) => answer.area === area), [answers, area]);
  const trapQuery = useQuery({
    queryKey: ["analytics-insights-traps", self ? "self" : studentId, since, include, area, scoped.map((answer) => answer.attemptId)],
    queryFn: () => loadInsightTraps(scoped),
    enabled: explore && dimension === "wrongAnswers" && scoped.some((answer) => answer.area === "LR" && !answer.correct),
    staleTime: 5 * 60_000,
  });
  const priorities = useMemo(() => breakdownInsights(answers, "qtype", index, EMPTY_TRAPS).rows
    .filter((row) => row.answers.length >= 5 && row.misses.length >= 2).slice(0, 3), [answers, index]);
  const breakdown = useMemo(() => explore
    ? breakdownInsights(scoped, dimension, index, trapQuery.data ?? EMPTY_TRAPS)
    : { rows: [], matched: 0 }, [explore, scoped, dimension, index, trapQuery.data]);
  const wrongByType = useMemo(() => explore && dimension === "wrongAnswers"
    ? breakdownInsights(scoped.filter((answer) => !answer.correct), "qtype", index, EMPTY_TRAPS).rows
    : [], [explore, dimension, scoped, index]);
  const population = dimension === "wrongAnswers" ? scoped.filter((answer) => !answer.correct).length : scoped.length;
  const selectedIds = useMemo(() => new Set(selection?.ids), [selection]);
  const includedLabels = [include.preptest && "PrepTests", include.section && "Sections", include.drill && "Drills"].filter(Boolean);
  const evidence = selection ? answers.filter((answer) => selectedIds.has(answer.attemptId)) : [];

  useEffect(() => {
    if (selection) evidenceHeading.current?.focus();
  }, [selection]);
  const showEvidence = (trigger: HTMLButtonElement, label: string, rows: InsightAnswer[]) => {
    evidenceTrigger.current = trigger;
    setSelection({ label, ids: rows.map((answer) => answer.attemptId) });
  };

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-4 overflow-hidden rounded-[20px] border border-slate-300 bg-white text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[var(--lsatu-canvas,#f7f4ee)] px-4 py-3 sm:px-5">
        <div>
          <h4 id={`${id}-title`} className="font-serif text-xl font-semibold">Insights</h4>
          <p className="text-sm text-slate-600">{rangeLabel} · First try per question{includedLabels.length < 3 ? ` · ${includedLabels.join(", ") || "No practice types selected"}` : ""}</p>
        </div>
        <button type="button" aria-expanded={explore} className={control} onClick={() => setExplore(!explore)}>
          Explore breakdowns <ChevronDown aria-hidden className={`h-4 w-4 ${explore ? "rotate-180" : ""}`} />
        </button>
      </header>

      {loading ? <p role="status" className="p-4 text-sm">Loading first answers…</p>
        : !ledger ? <p role="status" className="p-4 text-sm">{error ? "Insights could not load." : "First answers are unavailable."} {error && <button type="button" className={control} onClick={() => void refresh()}>Try again</button>}</p>
        : <>
          {(ledger.coverage.missingSources.length > 0 || refreshError) && (
            <p role="status" className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">Some practice records could not load. Counts reflect the records available. <button type="button" className={control} onClick={() => void refresh()}>Try again</button></p>
          )}
          {needsRc && rc.isError && <p className="px-4 pt-3 text-sm text-slate-600">Reading Comprehension labels could not load. <button type="button" className={control} onClick={() => void rc.refetch()}>Try again</button></p>}
          {priorities.length ? (
            <ul className="divide-y divide-slate-200 px-4 sm:px-5">
              {priorities.map((row) => (
                <li key={row.label} className="flex flex-wrap items-center justify-between gap-x-4 py-2">
                  <div className="py-1">
                    <p className="font-semibold">{row.label}</p>
                    <p className="text-sm text-slate-600">{self ? "You missed" : "Missed"} {row.misses.length} of {row.answers.length} questions on the first try{row.answers.length < 10 ? " · Small sample" : ""}</p>
                  </div>
                  <button type="button" className={control} aria-controls={evidenceId} onClick={(event) => showEvidence(event.currentTarget, row.label, row.misses)}>
                    Review {row.misses.length} misses <ArrowDownRight aria-hidden className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-sm text-slate-600 sm:px-5">
              {answers.length ? "No question type has enough repeated misses to highlight in this range. Explore the breakdowns to see individual results." : "No first answers match these filters. Try a longer date range or include more practice types."}
            </p>
          )}

          {explore && <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-sm font-medium">Group by
                <select className="min-h-11 rounded-lg border border-slate-400 bg-white px-2" value={dimension} onChange={(event) => { setDimension(event.target.value as InsightDimension); setSelection(null); }}>
                  {DIMENSIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">Section
                <select className="min-h-11 rounded-lg border border-slate-400 bg-white px-2" value={area} onChange={(event) => { setArea(event.target.value as typeof area); setSelection(null); }}>
                  <option value="all">LR and RC</option>
                  <option value="LR">Logical Reasoning</option>
                  <option value="RC">Reading Comprehension</option>
                </select>
              </label>
            </div>
            {dimension === "wrongAnswers" && trapQuery.isFetching ? <p role="status" className="mt-4 text-sm">Loading wrong-answer labels…</p>
              : dimension === "wrongAnswers" && trapQuery.isError ? <p role="status" className="mt-4 text-sm">Wrong-answer labels could not load. <button type="button" className={control} onClick={() => void trapQuery.refetch()}>Try again</button></p>
              : <>
                <p className="mt-4 text-sm text-slate-600">
                  {breakdown.matched} of {population} {dimension === "wrongAnswers" ? "misses have a tag for the selected choice" : "first answers have this label"}.
                </p>
                <ul className="mt-2 divide-y divide-slate-200">
                  {breakdown.rows.map((row) => (
                    <li key={row.label} className="grid items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]">
                      <span className="break-words font-semibold">{row.label}</span>
                      <span className="text-sm tabular-nums text-slate-700">
                        {dimension === "wrongAnswers" ? `${row.misses.length} ${row.misses.length === 1 ? "miss" : "misses"}`
                          : `${row.answers.length - row.misses.length}/${row.answers.length} correct · ${Math.round(100 * (row.answers.length - row.misses.length) / row.answers.length)}%`}
                        {dimension !== "wrongAnswers" && <span aria-hidden className="mt-1 block h-1.5 w-20 max-w-full overflow-hidden rounded-full bg-slate-200">
                          <span className="block h-full rounded-full bg-slate-600" style={{ width: `${100 * (row.answers.length - row.misses.length) / row.answers.length}%` }} />
                        </span>}
                        {row.answers.length < 10 && <span className="mt-1 block text-xs text-slate-600">Small sample</span>}
                      </span>
                      <span className="text-sm text-slate-600">{row.averageTime == null ? "Time unavailable" : `Avg. ${formatDuration(row.averageTime)} · ${row.timedCount} timed`}</span>
                      <button type="button" className={`${control} justify-self-start`} aria-controls={evidenceId} onClick={(event) => showEvidence(event.currentTarget, row.label, row.answers)}>View {row.answers.length} {row.answers.length === 1 ? "answer" : "answers"}</button>
                    </li>
                  ))}
                </ul>
              </>}
            {wrongByType.length > 0 && <>
              <h5 className="mt-5 border-t border-slate-200 pt-4 font-serif text-lg font-semibold">Misses by question type</h5>
              <ul className="mt-1 divide-y divide-slate-200">
                {wrongByType.map((row) => (
                  <li key={row.label} className="flex flex-wrap items-center justify-between gap-x-3 py-1">
                    <span className="text-sm font-semibold">{row.label}</span>
                    <button type="button" className={control} aria-controls={evidenceId} onClick={(event) => showEvidence(event.currentTarget, row.label, row.misses)}>
                      Review {row.misses.length} {row.misses.length === 1 ? "miss" : "misses"}
                    </button>
                  </li>
                ))}
              </ul>
            </>}
          </div>}

          <div id={evidenceId} hidden={!selection} className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
            {selection && <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 tabIndex={-1} ref={evidenceHeading} className="font-serif text-lg font-semibold">{selection.label} · {evidence.length} {evidence.length === 1 ? "answer" : "answers"}</h5>
                <button type="button" className={control} onClick={() => { setSelection(null); evidenceTrigger.current?.focus(); }}>Close answers</button>
              </div>
              <ul className="divide-y divide-slate-200">
                {evidence.map((answer) => {
                  const question = evidenceQuestion(answer, index);
                  return <li key={answer.attemptId} className="py-3 text-sm">
                    <p className="font-semibold">{question.label} · {answer.correct ? "Correct" : "Missed"}</p>
                    {question.prompt && <p className="mt-1 max-w-prose">{question.prompt}</p>}
                    <p className="mt-1 text-slate-600">{question.picked ? `Picked ${question.picked} · ` : ""}{question.correct ? `Correct answer ${question.correct} · ` : ""}{new Date(answer.gradedAt).toLocaleDateString()}</p>
                    {question.choices && (
                      <details className="mt-1">
                        <summary className="min-h-11 w-fit cursor-pointer py-3 font-semibold underline-offset-4 hover:underline">Read question and choices</summary>
                        <p className="mb-3 max-w-prose">{question.stimulus}</p>
                        <ul className="max-w-prose space-y-1">
                          {Object.entries(question.choices).map(([letter, choice]) => <li key={letter}><strong>{letter}.</strong> {choice}</li>)}
                        </ul>
                      </details>
                    )}
                  </li>;
                })}
              </ul>
            </>}
          </div>
        </>}
    </section>
  );
}
