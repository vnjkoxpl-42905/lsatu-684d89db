import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, ChevronRight, Info, Search, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useDossier } from "./StudentDossier";
import {
  buildSittings, loadStudentPractice, performanceSeries, questionRows, tagAnalytics,
  type Priority, type Sitting, type SittingKind, type TagStat,
} from "@/lib/studentAnalytics";

/**
 * A student's analytics for the teacher, in 7Sage's Analytics shape:
 * Overview (performance, tag analytics, practice history), then Drills,
 * Sections, PrepTests, Priorities by tag, and Questions & explanations.
 * Read-only: it shows what the student did and never changes it.
 */

type Tab = "overview" | "drills" | "sections" | "preptests" | "tags" | "questions";
const TABS: Array<[Tab, string]> = [
  ["overview", "Overview"], ["drills", "Drills"], ["sections", "Sections"],
  ["preptests", "PrepTests"], ["tags", "Priorities by tag"], ["questions", "Questions & explanations"],
];

const RANGES: Array<[string, number | null]> = [["All time", null], ["Last 14 days", 14], ["Last 21 days", 21], ["Last 30 days", 30], ["Last 60 days", 60]];
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtLong = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
const fmtTime = (ms: number | null) => (ms == null ? "–" : `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`);

function goalKey(studentId: string) { return `lsatu-analytics-goal:${studentId}`; }
function readGoal(studentId: string) {
  try { const v = Number(localStorage.getItem(goalKey(studentId))); return v >= 120 && v <= 180 ? v : 165; } catch { return 165; }
}

/** The dossier's Analytics tab. */
export default function DossierAnalytics() {
  const { studentId, studentName } = useDossier();
  return <StudentAnalyticsView studentId={studentId} studentName={studentName} runHref={(id) => `../analytics/runs/${id}`} />;
}

/** One student's analytics. Used by the dossier tab and the standalone page. */
export function StudentAnalyticsView({ studentId, studentName, runHref, audience = "teacher" }: {
  studentId: string;
  studentName: string | null;
  /** "student" when someone reads their own analytics: the wording turns to "you". */
  audience?: "teacher" | "student";
  /** Where a drill run opens. */
  runHref: (runId: string) => string;
}) {
  const navigate = useNavigate();
  const { isLoading: bankLoading } = useQuestionBank();
  const [tab, setTab] = React.useState<Tab>("overview");
  const { data, isLoading, error } = useQuery({
    queryKey: ["student-analytics", studentId],
    queryFn: () => loadStudentPractice(studentId),
    enabled: !!studentId,
  });
  const [goal, setGoal] = React.useState(() => readGoal(studentId));
  const [goalDraft, setGoalDraft] = React.useState(String(goal));
  React.useEffect(() => { const g = readGoal(studentId); setGoal(g); setGoalDraft(String(g)); }, [studentId]);

  const sittings = React.useMemo(() => (data ? buildSittings(data) : []), [data]);
  const tags = React.useMemo(() => (data && !bankLoading ? tagAnalytics(data.attempts, goal) : []), [data, goal, bankLoading]);
  const openSitting = (s: Sitting) => { if (s.drillRunId) navigate(runHref(s.drillRunId)); };
  const name = studentName || "This student";

  if (isLoading || bankLoading) return <p role="status" className="p-6 text-sm text-black/60">Loading {name}'s analytics…</p>;
  if (error || !data) return <p role="alert" className="p-6 text-sm text-red-700">Analytics could not be loaded. Try again.</p>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-5" aria-label="Student analytics">
      <header>
        <h2 className="font-serif text-4xl font-semibold text-slate-800">Analytics</h2>
        <nav className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-b border-black/10" aria-label="Analytics sections">
          {TABS.map(([t, label]) => (
            <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t ? "page" : undefined}
              className={cn("-mb-px border-b-2 pb-3 text-[15px] font-medium transition-colors",
                tab === t ? "border-amber-400 font-semibold text-slate-900" : "border-transparent text-slate-600 hover:text-slate-900")}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "overview" && (
        <>
          <PerformanceCard sittings={sittings} tags={tags} name={name} self={audience === "student"} />
          <TagAnalytics tags={tags} goal={goal} goalDraft={goalDraft} setGoalDraft={setGoalDraft}
            onSaveGoal={() => {
              const g = Math.max(120, Math.min(180, Number(goalDraft) || 165));
              setGoal(g); setGoalDraft(String(g));
              try { localStorage.setItem(goalKey(studentId), String(g)); } catch { /* per-device only */ }
            }}
            onReview={() => setTab("questions")} compact />
          <PracticeHistory sittings={sittings} onOpen={openSitting} />
        </>
      )}
      {tab === "drills" && <PracticeHistory sittings={sittings} onOpen={openSitting} only="drill" />}
      {tab === "sections" && <PracticeHistory sittings={sittings} onOpen={openSitting} only="section" />}
      {tab === "preptests" && <PracticeHistory sittings={sittings} onOpen={openSitting} only="preptest" />}
      {tab === "tags" && (
        <TagAnalytics tags={tags} goal={goal} goalDraft={goalDraft} setGoalDraft={setGoalDraft}
          onSaveGoal={() => { const g = Math.max(120, Math.min(180, Number(goalDraft) || 165)); setGoal(g); try { localStorage.setItem(goalKey(studentId), String(g)); } catch { /* */ } }}
          onReview={() => setTab("questions")} />
      )}
      {tab === "questions" && <QuestionsTable attempts={data.attempts} />}
    </div>
  );
}

/* ------------------------------------------------------------ Performance */

function PerformanceCard({ sittings, tags, name, self }: { sittings: Sitting[]; tags: TagStat[]; name: string; self?: boolean }) {
  const [include, setInclude] = React.useState<Record<SittingKind, boolean>>({ preptest: true, section: true, drill: true });
  const [range, setRange] = React.useState<number | null>(null);
  const [advice, setAdvice] = React.useState(false);
  const since = range ? new Date(Date.now() - range * 86400000).toISOString() : null;
  const points = performanceSeries(sittings, include, since).map((p) => ({ ...p, day: fmtDay(p.date) }));
  const top = tags.filter((t) => !t.limitedData).slice(0, 3);

  return (
    <section aria-label="Performance">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-3xl font-semibold text-slate-800">Performance</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAdvice((v) => !v)} aria-expanded={advice}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-violet-500 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">
            <Sparkles className="h-4 w-4" />{self ? "What should I do?" : "What should they do?"}
          </button>
          <select aria-label="Time range" value={range ?? ""} onChange={(e) => setRange(e.target.value ? Number(e.target.value) : null)}
            className="rounded-xl border-2 border-black/10 bg-white px-3 py-2 text-sm">
            {RANGES.map(([l, d]) => <option key={l} value={d ?? ""}>{l}</option>)}
          </select>
        </div>
      </div>
      {advice && (
        <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-5 text-sm leading-relaxed text-slate-800">
          {top.length === 0 ? <p>Not enough answered questions yet to point anywhere specific.</p> : (
            <>
              <p className="font-semibold">{self ? "Where you lose the most points" : `Where ${name} loses the most points`}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {top.map((t) => <li key={t.tag}><b>{t.tag}</b>: {t.correct} of {t.answered} right, about {t.tagScore} ({t.vsGoal > 0 ? "+" : ""}{t.vsGoal} vs goal).</li>)}
              </ol>
              <p className="mt-2 text-slate-600">Ranked by distance from the goal, weighted by how often the tag came up.</p>
            </>
          )}
        </div>
      )}
      <div className="rounded-[20px] border-2 border-black/10 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          Include
          {(["preptest", "section", "drill"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={include[k]} onClick={() => setInclude((p) => ({ ...p, [k]: !p[k] }))}
              className={cn("rounded-xl border px-4 py-1.5 font-semibold transition-colors",
                include[k] ? "border-sky-700 bg-sky-50 text-sky-800" : "border-black/15 text-slate-500")}>
              {k === "preptest" ? "PrepTests" : k === "section" ? "Sections" : "Drills"}
            </button>
          ))}
        </div>
        {points.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">No finished sittings in this range.</p>
        ) : (
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis domain={[120, 180]} ticks={[120, 130, 140, 150, 160, 170, 180]} tick={{ fontSize: 12 }} width={40} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as typeof points[number];
                  return (
                    <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs shadow">
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-slate-500">{fmtLong(p.date)}</p>
                      <p className="mt-1">Score about <b>{p.score}</b>{p.br != null && <> · BR about <b>{p.br}</b></>}</p>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="score" name="Score" stroke="#2b6a8f" strokeWidth={2.5} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="br" name="Blind review" stroke="#7c6bd6" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 4, fill: "#fff" }} connectNulls />
                {points.length > 6 && <Brush dataKey="day" height={22} stroke="#2b6a8f" travellerWidth={8} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">Sections and drills are shown as a scaled-score equivalent of their percent, so every sitting shares one axis.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- Tags */

function PriorityBars({ p }: { p: Priority }) {
  const n = p === "Highest" ? 4 : p === "High" ? 3 : p === "Medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="inline-flex items-end gap-0.5">
        {[1, 2, 3, 4].map((i) => <span key={i} className={cn("w-1 rounded-sm", i <= n ? "bg-pink-600" : "bg-pink-200")} style={{ height: 6 + i * 3 }} />)}
      </span>
      {p}
    </span>
  );
}

function TagAnalytics({ tags, goal, goalDraft, setGoalDraft, onSaveGoal, onReview, compact }: {
  tags: TagStat[]; goal: number; goalDraft: string; setGoalDraft: (v: string) => void; onSaveGoal: () => void; onReview: () => void; compact?: boolean;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <section aria-label="Tag analytics">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-serif text-3xl font-semibold text-slate-800">Tag analytics</h3>
          <p className="mt-1 text-sm text-slate-600">Tag score shows performance. Priority says what to work on.</p>
        </div>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); onSaveGoal(); }}>
          <label className="sr-only" htmlFor="goal-score">Goal score</label>
          <input id="goal-score" inputMode="numeric" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)}
            className="w-24 rounded-xl border-2 border-black/10 px-3 py-2 text-sm" aria-describedby="goal-help" />
          <button type="submit" className="rounded-xl border-2 border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Save</button>
          <span id="goal-help" className="sr-only">Goal score from 120 to 180. Saved on this device.</span>
        </form>
      </div>
      {[["Logical Reasoning", tags.filter((t) => !t.group.startsWith("RC"))], ["Reading Comprehension", tags.filter((t) => t.group.startsWith("RC"))]].map(([title, list]) => (
        <React.Fragment key={title as string}>{((title: string, list: TagStat[]) => (<>
      <h4 className="mb-3 mt-6 font-serif text-xl font-semibold text-slate-800">{title}</h4>
      <div className="overflow-hidden rounded-[20px] border-2 border-black/10 bg-white">
        <div className="grid grid-cols-[1fr_140px_170px] border-b-2 border-black/10 px-6 py-4 text-sm font-semibold text-slate-700">
          <span>Tag</span><span>Priority</span>
          <span className="inline-flex items-center gap-1">Tag score (vs goal)<span title="Estimated LSAT score if every question were this tag, from first answers."><Info className="h-4 w-4 text-slate-400" /></span></span>
        </div>
        <div className={cn(compact && "max-h-[430px] overflow-y-auto")}>
          {list.length === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-500">No answered questions yet.</p> : list.map((t) => (
            <div key={t.tag} className="border-b border-black/10 last:border-0">
              <button type="button" onClick={() => setOpen(open === t.tag ? null : t.tag)} aria-expanded={open === t.tag}
                className="grid w-full grid-cols-[1fr_140px_170px] items-center px-6 py-5 text-left hover:bg-slate-50">
                <span className="flex items-center gap-3">
                  {open === t.tag ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span><b className="text-slate-800">{t.tag}</b><span className="text-sm text-slate-500"> · {t.group}</span></span>
                </span>
                <PriorityBars p={t.priority} />
                <span>
                  <span className="font-serif text-2xl text-slate-800">{t.tagScore}</span>{" "}
                  <span className={cn("text-sm", t.vsGoal < 0 ? "text-red-500" : "text-emerald-600")}>({t.vsGoal > 0 ? "+" : ""}{t.vsGoal})</span>
                  {t.limitedData && <span className="block text-xs text-slate-500">Limited data</span>}
                </span>
              </button>
              {open === t.tag && (
                <div className="flex flex-wrap items-center gap-4 bg-slate-50/70 px-14 pb-5 text-sm text-slate-700">
                  <span>{t.correct} of {t.answered} right on first answer ({Math.round(t.accuracy * 100)}%)</span>
                  <button type="button" onClick={onReview} className="font-semibold text-sky-800 hover:underline">Review questions</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
        </>))(title as string, list as TagStat[])}</React.Fragment>
      ))}
      <p className="mt-2 text-xs text-slate-500">Goal {goal}. Tag scores use first answers only.</p>
    </section>
  );
}

/* --------------------------------------------------------------- History */

function PracticeHistory({ sittings, onOpen, only }: { sittings: Sitting[]; onOpen: (s: Sitting) => void; only?: SittingKind }) {
  const [filter, setFilter] = React.useState<"all" | SittingKind>(only ?? "all");
  const rows = sittings.filter((s) => (filter === "all" ? true : s.kind === filter));
  const bar = (v: number | null) => (
    <span className="relative inline-block h-2 w-40 overflow-hidden rounded-full bg-slate-100 align-middle">
      {v != null && <span className="absolute inset-y-0 left-0 rounded-full bg-sky-700" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />}
    </span>
  );
  return (
    <section aria-label="Practice history">
      {!only && <h3 className="mb-4 font-serif text-3xl font-semibold text-slate-800">Practice history</h3>}
      <div className="overflow-hidden rounded-[20px] border-2 border-black/10 bg-white">
        {!only && (
          <div className="flex flex-wrap items-center gap-4 border-b-2 border-black/10 p-5">
            <div className="inline-flex overflow-hidden rounded-xl border-2 border-black/10" role="tablist">
              {(["all", "preptest", "section", "drill"] as const).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                  className={cn("border-r-2 border-black/10 px-5 py-2 text-sm font-semibold last:border-0", filter === k ? "bg-amber-200" : "bg-white text-slate-700 hover:bg-slate-50")}>
                  {k === "all" ? "All" : k === "preptest" ? "PrepTests" : k === "section" ? "Sections" : "Drills"}
                </button>
              ))}
            </div>
          </div>
        )}
        {rows.length === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-500">Nothing here yet.</p> : rows.map((s) => (
          <button key={s.id} type="button" onClick={() => onOpen(s)} disabled={!s.drillRunId}
            className="grid w-full grid-cols-1 items-center gap-3 border-b border-black/10 px-6 py-5 text-left last:border-0 enabled:hover:bg-slate-50 disabled:cursor-default sm:grid-cols-[1fr_auto]">
            <span>
              <span className="font-semibold text-slate-800">{s.title}</span>{" "}
              <span className="text-sm text-slate-500">{s.subtitle}</span>
              {!s.completed && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">In progress</span>}
              <span className="block text-sm text-slate-500">{fmtLong(s.date)}</span>
            </span>
            <span className="grid grid-cols-[3rem_10rem_3.5rem] items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-slate-700">Score</span>{bar(s.score?.kind === "percent" ? s.score.value : s.score ? ((s.score.value - 120) / 60) * 100 : null)}
              <span className="text-right">{s.score ? (s.score.kind === "scaled" ? s.score.value : `${s.score.value}%`) : "—"}</span>
              <span className="font-semibold text-slate-500">BR</span>{bar(s.br?.value ?? null)}
              <span className="text-right">{s.br ? `${s.br.value}%` : "—"}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Open a drill to see its full review. Sections and PrepTests list their questions under Questions & explanations.</p>
    </section>
  );
}

/* ------------------------------------------------------------- Questions */

function QuestionsTable({ attempts }: { attempts: Parameters<typeof questionRows>[0] }) {
  const all = React.useMemo(() => questionRows(attempts), [attempts]);
  const [result, setResult] = React.useState<"all" | "correct" | "incorrect">("all");
  const [section, setSection] = React.useState<"all" | "lr" | "rc">("all");
  const [tag, setTag] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const tagsList = React.useMemo(() => [...new Set(all.flatMap((r) => r.tags))].sort(), [all]);
  const rows = all.filter((r) => (section === "all" || r.kind === section) && (result === "all" || (result === "correct" ? r.firstCorrect : r.firstCorrect === false))
    && (tag === "all" || r.tags.includes(tag))
    && (!search.trim() || r.label.toLowerCase().includes(search.trim().toLowerCase())));
  const sel = "rounded-xl border-2 border-black/10 bg-white px-3 py-2 text-sm";
  return (
    <section aria-label="Questions and explanations" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a question, e.g. PT124.S1" aria-label="Find a question" className="w-64 rounded-xl border-2 border-black/10 py-2 pl-9 pr-3 text-sm" />
        </label>
        <select aria-label="Section" className={sel} value={section} onChange={(e) => setSection(e.target.value as typeof section)}>
          <option value="all">LR and RC</option><option value="lr">Logical Reasoning</option><option value="rc">Reading Comprehension</option>
        </select>
        <select aria-label="Result" className={sel} value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
          <option value="all">Result: all</option><option value="correct">Correct first time</option><option value="incorrect">Missed first time</option>
        </select>
        <select aria-label="Tag" className={sel} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="all">Tags: all</option>{tagsList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-500">{rows.length} questions</span>
      </div>
      <div className="overflow-x-auto rounded-[20px] border-2 border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-black/10 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
            <th className="px-5 py-3">Question</th><th className="px-3 py-3">First answer</th><th className="px-3 py-3">Time</th><th className="px-3 py-3">Difficulty</th><th className="px-3 py-3">Seen</th><th className="px-3 py-3">Last seen</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.qid} className="border-b border-black/10 last:border-0">
                <td className="px-5 py-3"><b className="text-sky-800">{r.label}</b>
                  <div className="mt-1 flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className="rounded-full border border-black/10 px-2 py-0.5 text-xs text-slate-500">{t}</span>)}</div></td>
                <td className="px-3 py-3">{r.firstCorrect == null ? "–" : r.firstCorrect
                  ? <span className="font-semibold text-emerald-700">{r.firstAnswer} ✓</span>
                  : <span><span className="font-semibold text-red-600">{r.firstAnswer ?? "blank"}</span>{r.correctAnswer && <span className="text-slate-500"> → {r.correctAnswer}</span>}</span>}</td>
                <td className="px-3 py-3 font-mono text-slate-600">{fmtTime(r.timeMs)}</td>
                <td className="px-3 py-3">{r.difficulty ? <span className="inline-flex gap-0.5" aria-label={`Difficulty ${r.difficulty} of 5`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={cn("h-2 w-2 rounded-sm", i <= r.difficulty! ? "bg-sky-800" : "bg-slate-200")} />)}</span> : "–"}</td>
                <td className="px-3 py-3">{r.timesSeen}×</td>
                <td className="px-3 py-3 text-slate-500">{r.lastSeen ? fmtDay(r.lastSeen) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
