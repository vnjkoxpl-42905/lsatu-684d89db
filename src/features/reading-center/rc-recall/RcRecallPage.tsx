import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { loadAllIndexPassages, loadPassages } from "@/features/rc/lib/rcBank";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import ExamplePlayer from "./ExamplePlayer";
import RcRecallRunner, { formatClock } from "./RcRecallRunner";
import { recoverRcRecallBackups } from "./lib/backup";
import { createAttempt, listAttempts, summarizeRecordings, uploadRecording, type AttemptRow } from "./lib/attempts";
import {
  COMPARATIVE_NOTE, CUMULATIVE_STEPS, READ_STANDARD, RECAP_STANDARD, RC_RECALL_STEPS,
  SECTION_PICKER_NOTE, TIMING, VOICE_NOTE,
} from "./lib/instructions";
import {
  CUMULATIVE_EXAMPLES, INSTRUCTION_VIDEO, RC_RECALL_DEMO_CORRECTION, RC_RECALL_EXAMPLES, RC_RECALL_NOTE,
  SOURCE_NAME_MAP, instructionsVerified, mediaBase, mediaUrls,
} from "./lib/media";
import { buildRecallSections, sectionLabel, verifyLoadedSection, type RecallSection } from "./lib/sections";
import { MODE_LABEL, type ConfirmScope, type RecallMode } from "./lib/sequence";
import type { SegmentedPassage } from "./lib/segment";

const panel = { background: "var(--rc-card)", borderColor: "var(--rc-outline-2)" };
const muted = { color: "var(--rc-text-2)" };
const field = "min-h-11 rounded-lg border bg-transparent px-3 text-sm";
const button = "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

interface Running { mode: RecallMode; scope: ConfirmScope; passages: RcPassage[]; segmented: SegmentedPassage[]; attempt: AttemptRow }

const dateLabel = (v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function RcRecallPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<RecallMode>("rc_recall");
  const [scope, setScope] = useState<ConfirmScope>("all_read");
  const [preptest, setPreptest] = useState<number | null>(null);
  const [sectionNumber, setSectionNumber] = useState<number | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const base = mediaBase();

  const index = useQuery({ queryKey: ["rc-recall-index"], queryFn: loadAllIndexPassages, staleTime: Infinity });
  const sections = useMemo(() => buildRecallSections(index.data ?? []), [index.data]);
  const preptests = useMemo(() => [...new Set(sections.map((s) => s.preptest))], [sections]);
  const inTest = useMemo(() => sections.filter((s) => s.preptest === preptest), [sections, preptest]);
  const selected: RecallSection | undefined = inTest.find((s) => s.section === sectionNumber);

  useEffect(() => { if (preptest === null && preptests.length) setPreptest(preptests[0]); }, [preptests, preptest]);
  useEffect(() => { if (inTest.length && !inTest.some((s) => s.section === sectionNumber)) setSectionNumber(inTest[0].section); }, [inTest, sectionNumber]);

  const history = useQuery({
    queryKey: ["rc-recall-history", user?.id],
    enabled: !!user,
    queryFn: () => listAttempts(user!.id),
  });

  // Upload any recording this device still holds from an earlier session.
  useEffect(() => {
    if (!user) return;
    void recoverRcRecallBackups(user.id, ({ run, blob }) => uploadRecording({
      studentId: run.studentId, attemptId: run.attemptId, recapId: run.recapId, path: run.path,
      blob, mimeType: run.mimeType, durationMs: run.durationMs ?? null,
    })).then((r) => { if (r.recovered) void queryClient.invalidateQueries({ queryKey: ["rc-recall-history", user.id] }); });
  }, [user, queryClient]);

  const start = async () => {
    if (!user || !selected) return;
    setStarting(true);
    setStartError(null);
    try {
      const loaded = await loadPassages(selected.passageIds);
      const { passages, segmented } = verifyLoadedSection(selected, loaded);
      const attempt = await createAttempt({
        studentId: user.id, mode, preptest: selected.preptest, section: selected.section,
        passageIds: selected.passageIds, confirmationScope: mode === "rc_recall" ? scope : null,
      });
      setRunning({ mode, scope, passages, segmented, attempt });
    } catch (err) {
      setStartError(err instanceof Error && err.message
        ? `This section could not be started: ${err.message} Nothing was saved.`
        : "This section could not be started. Nothing was saved.");
    } finally { setStarting(false); }
  };

  if (running && user) {
    return <RcRecallRunner {...running} studentId={user.id} onExit={() => {
      setRunning(null);
      void queryClient.invalidateQueries({ queryKey: ["rc-recall-history", user.id] });
    }} />;
  }

  const instructionUrls = instructionsVerified() ? mediaUrls(INSTRUCTION_VIDEO.stem) : null;
  const examples = mode === "rc_recall" ? RC_RECALL_EXAMPLES : CUMULATIVE_EXAMPLES;
  const timing = TIMING[mode];

  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10" data-reading-activity="rc-recall">
    <h1 className="text-2xl font-semibold">RC Recall</h1>
    <p className="mt-1 max-w-3xl text-sm leading-6" style={muted}>
      Work a full four-passage RC section, one paragraph at a time. You translate, recall from memory, and check yourself. The app keeps the time and your recordings. It does not score your recall.
    </p>

    <section className="mt-6 rounded-2xl border p-5 sm:p-6" style={panel} aria-labelledby="rc-recall-start">
      <h2 id="rc-recall-start" className="text-lg font-semibold">Start a section</h2>
      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">Mode</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(["rc_recall", "cumulative_recall"] as RecallMode[]).map((m) => <label key={m} className="flex min-h-11 cursor-pointer gap-3 rounded-xl border p-3 text-sm" style={{ borderColor: mode === m ? "var(--rc-accent, #494387)" : "var(--rc-outline-2)" }}>
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-1" />
            <span><span className="block font-semibold">{MODE_LABEL[m]}</span>
              <span className="block leading-6" style={muted}>{m === "rc_recall"
                ? "Recall each paragraph, then look back and confirm it."
                : "Recall each paragraph, then recall everything read so far, without looking back."}</span></span>
          </label>)}
        </div>
      </fieldset>

      {mode === "rc_recall" && <fieldset className="mt-4">
        <legend className="text-sm font-semibold">What each confirmation covers</legend>
        <div className="mt-2 space-y-1 text-sm">
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="scope" checked={scope === "all_read"} onChange={() => setScope("all_read")} /> All the text read so far (the written default)</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="scope" checked={scope === "current_sub_passage"} onChange={() => setScope("current_sub_passage")} /> Only the current sub-passage (comparative passages)</label>
        </div>
      </fieldset>}

      <p className="mt-4 text-sm" style={muted}>{SECTION_PICKER_NOTE}</p>
      {index.isPending && <p role="status" className="mt-2 text-sm" style={muted}>Loading sections…</p>}
      {index.isError && <p role="alert" className="mt-2 text-sm">The section list could not load. Try reloading the page.</p>}
      {sections.length > 0 && <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">PrepTest
          <select className={`${field} mt-1 block`} style={{ borderColor: "var(--rc-outline-2)", color: "var(--rc-text)" }} value={preptest ?? ""} onChange={(e) => setPreptest(Number(e.target.value))}>
            {preptests.map((p) => <option key={p} value={p}>PT{p}</option>)}
          </select></label>
        <label className="text-sm font-semibold">Section
          <select className={`${field} mt-1 block`} style={{ borderColor: "var(--rc-outline-2)", color: "var(--rc-text)" }} value={sectionNumber ?? ""} onChange={(e) => setSectionNumber(Number(e.target.value))}>
            {inTest.map((s) => <option key={s.section} value={s.section}>{sectionLabel(s)}</option>)}
          </select></label>
        <button type="button" className={button} style={{ background: "var(--rc-accent, #494387)", color: "#fff" }} disabled={!selected || starting} onClick={() => void start()}>
          {starting ? "Starting…" : `Start ${MODE_LABEL[mode]}`}
        </button>
      </div>}
      {startError && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>{startError}</p>}
      <p className="mt-3 text-xs" style={muted}>Timing guide for {MODE_LABEL[mode]}: {timing.perPassage} per passage, {timing.section} for the section. These are guides, not limits.</p>
    </section>

    <section className="mt-6 rounded-2xl border p-5 sm:p-6" style={panel} aria-labelledby="rc-recall-how">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rc-recall-how" className="text-lg font-semibold">How {MODE_LABEL[mode]} works</h2>
        {instructionUrls && <button type="button" className={button} style={{ border: "1px solid var(--rc-outline-2)" }} aria-expanded={showVideo} onClick={() => setShowVideo((v) => !v)}>
          {showVideo ? "Hide instructions video" : "Watch Instructions"}</button>}
      </div>
      {instructionUrls && showVideo && <div className="mt-3">
        <ExamplePlayer base={base} heading={INSTRUCTION_VIDEO.title} clip={{ id: "instructions", mode, kind: "example", stem: INSTRUCTION_VIDEO.stem, title: INSTRUCTION_VIDEO.title, sourceTitle: "How and Why to Do Decaf RC Translation and How and Why to Do Cappuccino RC Translation" }} />
      </div>}
      <p className="mt-2 text-sm leading-6" style={muted}>
        The source lesson uses “Decaf” and “Cappuccino” for these two methods. You may hear those names in the footage.
        {" "}{SOURCE_NAME_MAP.map((m) => `${m.source} = ${m.app}`).join("; ")}.
      </p>
      <h3 className="mt-4 text-sm font-semibold">The standards</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
        {READ_STANDARD.map((t) => <li key={t}>{t}</li>)}
        {RECAP_STANDARD.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <h3 className="mt-4 text-sm font-semibold">The steps</h3>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-6">
        {(mode === "rc_recall" ? RC_RECALL_STEPS : CUMULATIVE_STEPS).map((t) => <li key={t}>{t}</li>)}
      </ol>
      <p className="mt-3 text-sm leading-6">{VOICE_NOTE}</p>
      <p className="mt-2 text-sm leading-6">{COMPARATIVE_NOTE}</p>
    </section>

    {base && <section className="mt-6 rounded-2xl border p-5 sm:p-6" style={panel} aria-labelledby="rc-recall-examples">
      <h2 id="rc-recall-examples" className="text-lg font-semibold">{MODE_LABEL[mode]} worked examples</h2>
      {mode === "rc_recall" && <div className="mt-2 rounded-xl border p-4" style={{ borderColor: "var(--rc-outline-2)" }}>
        <h3 className="text-sm font-semibold">Read this before the examples</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">{RC_RECALL_DEMO_CORRECTION.map((t) => <li key={t}>{t}</li>)}</ul>
        <div className="mt-3"><ExamplePlayer clip={RC_RECALL_NOTE} /></div>
      </div>}
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {examples.map((clip) => <ExamplePlayer key={clip.id} clip={clip} />)}
      </div>
    </section>}

    <section className="mt-6 rounded-2xl border p-5 sm:p-6" style={panel} aria-labelledby="rc-recall-history">
      <h2 id="rc-recall-history" className="text-lg font-semibold">Your attempts</h2>
      {history.isPending ? <p role="status" className="mt-2 text-sm" style={muted}>Loading your attempts…</p>
        : history.isError ? <p role="alert" className="mt-2 text-sm">Your attempts could not load. Your saved work has not changed.</p>
          : !history.data?.attempts.length ? <p className="mt-2 text-sm" style={muted}>No attempts yet. Each one you finish is kept, and a new attempt never replaces an old one.</p>
            : <ul className="mt-3 divide-y text-sm" style={{ borderColor: "var(--rc-outline-2)" }}>
              {history.data.attempts.map((a) => {
                const own = history.data.recaps.filter((r) => r.attempt_id === a.id);
                const sum = summarizeRecordings(own);
                return <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <span className="font-semibold">{MODE_LABEL[a.mode]} · {sectionLabel(a)}</span>
                  <span style={muted}>{dateLabel(a.started_at)} · {a.finished_at ? `${formatClock(a.elapsed_seconds ?? 0)} · ${a.completed ? "Completed" : "Ended early"}` : "Not finished"}
                    {a.mode === "rc_recall" && a.confirmation_scope ? ` · Confirmation: ${a.confirmation_scope === "all_read" ? "all text so far" : "current sub-passage"}` : ""}
                    {` · ${sum.spoken ? `${sum.saved} of ${sum.spoken} spoken recaps saved${sum.failed ? `, ${sum.failed} failed` : ""}` : "No spoken recaps"}`}</span>
                </li>;
              })}
            </ul>}
    </section>
  </main>;
}
