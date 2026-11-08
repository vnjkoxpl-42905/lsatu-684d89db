import { supabase } from "@/integrations/supabase/client";
import { parseOwnedDrillRun, type StandaloneDrillRun } from "@/lib/drillRunLedger";
import { estimateScaledScore } from "@/lib/practiceTest";
import { questionBank } from "@/lib/questionLoader";

/**
 * Everything a teacher needs to read one student's practice, for the admin
 * Student Analytics page. Read-only: every query here is a select, and the
 * admin read policies (20260829220000_admin_reads_student_work.sql) are what
 * let a teacher see another student's rows. Nothing here writes.
 *
 * The calculations are pure functions so they can be tested without a
 * database, and so the numbers on screen have one definition.
 */

export interface AttemptRow {
  qid: string;
  pt: number | null;
  section: number | null;
  qnum: number | null;
  qtype: string | null;
  level: number | null;
  mode: string | null;
  selected_answer: string | null;
  correct: boolean | null;
  time_ms: number | null;
  timestamp_iso: string | null;
  br_answer: string | null;
  br_outcome: string | null;
  /** "rc" for Reading Comprehension. LR rows leave it out. */
  kind?: "lr" | "rc";
  /** Set when the question is not in the LR bank (RC): what to show and tag it by. */
  label?: string;
  tags?: Array<[string, string]>;
  correct_answer?: string | null;
}

export interface SectionRow {
  id: string;
  pt: number | null;
  section: number | null;
  mode: string | null;
  initial_score: number | null;
  initial_total: number | null;
  br_used: boolean | null;
  br_score: number | null;
  br_total: number | null;
  completed_at: string | null;
  time_taken_ms: number | null;
  practice_test_run_id: string | null;
}

export interface PracticeTestRow {
  id: string;
  pt: number | null;
  status: string | null;
  completed_at: string | null;
  raw_correct: number | null;
  raw_total: number | null;
  scaled_score: number | null;
}

export interface StudentPractice {
  attempts: AttemptRow[];
  sections: SectionRow[];
  practiceTests: PracticeTestRow[];
  drills: StandaloneDrillRun[];
}

/** A student's id in LSAT U is profiles.class_id, which is their auth user id. */
export async function loadStudentPractice(studentId: string): Promise<StudentPractice> {
  const [attempts, sections, practiceTests, drills] = await Promise.all([
    supabase.from("attempts")
      .select("qid,pt,section,qnum,qtype,level,mode,selected_answer,correct,time_ms,timestamp_iso,br_answer,br_outcome")
      .eq("class_id", studentId)
      .order("timestamp_iso", { ascending: true })
      .limit(10000),
    supabase.from("section_history")
      .select("id,pt,section,mode,initial_score,initial_total,br_used,br_score,br_total,completed_at,time_taken_ms,practice_test_run_id")
      .eq("class_id", studentId)
      .order("completed_at", { ascending: false }),
    supabase.from("practice_test_runs")
      .select("id,pt,status,completed_at,raw_correct,raw_total,scaled_score")
      .eq("user_id", studentId)
      .order("completed_at", { ascending: false }),
    loadStudentDrillRuns(studentId),
  ]);
  const rc = await loadRcAttempts(studentId);
  if (attempts.error) throw attempts.error;
  if (sections.error) throw sections.error;
  if (practiceTests.error) throw practiceTests.error;
  const lr = (attempts.data ?? []) as AttemptRow[];
  return {
    attempts: [...lr, ...drillAnswersMissingFrom(lr, drills), ...rc]
      .sort((a, b) => (a.timestamp_iso ?? "").localeCompare(b.timestamp_iso ?? "")),
    sections: (sections.data ?? []) as SectionRow[],
    practiceTests: (practiceTests.data ?? []) as PracticeTestRow[],
    drills,
  };
}

/**
 * The student's drill runs, read as an admin. The ledger's own loader refuses
 * anyone but the owner (it is also the write path), so this is a separate,
 * select-only read that validates each row with the same parser.
 */
export async function loadStudentDrillRuns(studentId: string): Promise<StandaloneDrillRun[]> {
  const runs: StandaloneDrillRun[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("bootcamp_kv")
      .select("record_id,data")
      .eq("user_id", studentId)
      .eq("table_name", "drill_runs")
      .order("record_id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    for (const item of data ?? []) {
      const run = parseOwnedDrillRun(studentId, item.record_id, item.data);
      if (run) runs.push(run);
    }
    if ((data ?? []).length < pageSize) break;
  }
  return runs;
}

/**
 * Answers that live only inside a drill run. Most drills also write each
 * answer to `attempts`, but not every older one did, so a question answered
 * in a drill could vanish from Questions & explanations. These fill the gap.
 */
export function drillAnswersMissingFrom(attempts: AttemptRow[], drills: StandaloneDrillRun[]): AttemptRow[] {
  const have = new Set(attempts.map((a) => a.qid));
  const out: AttemptRow[] = [];
  for (const d of drills) {
    for (const a of d.session.attempts ?? []) {
      const qid = (a as { qid?: string }).qid;
      if (!qid || have.has(qid)) continue;
      have.add(qid);
      const at = a as { selected_answer?: string; correct?: boolean; time_ms?: number; answered_at?: string };
      out.push({
        qid, pt: null, section: null, qnum: null, qtype: null, level: null, mode: "drill",
        selected_answer: at.selected_answer ?? null, correct: at.correct ?? null, time_ms: at.time_ms ?? null,
        timestamp_iso: at.answered_at ?? d.updated_at, br_answer: null, br_outcome: null,
      });
    }
  }
  return out;
}

/** The student's Reading Comprehension answers, labelled and tagged from the RC tables. */
export async function loadRcAttempts(studentId: string): Promise<AttemptRow[]> {
  const { data: rows, error } = await supabase.from("rc_attempts")
    .select("question_id,passage_id,selected,is_correct,time_ms,created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: true })
    .limit(10000);
  if (error) throw error;
  if (!rows?.length) return [];
  const qIds = [...new Set(rows.map((r) => r.question_id))];
  const pIds = [...new Set(rows.map((r) => r.passage_id))];
  const [qs, ps] = await Promise.all([
    supabase.from("rc_questions").select("question_id,preptest,section,position,question_type,correct_answer,difficulty").in("question_id", qIds),
    supabase.from("rc_passages").select("passage_id,topic").in("passage_id", pIds),
  ]);
  if (qs.error) throw qs.error;
  const qMeta = new Map((qs.data ?? []).map((q) => [q.question_id, q]));
  const topic = new Map((ps.data ?? []).map((x) => [x.passage_id, x.topic]));
  return rows.map((r) => {
    const q = qMeta.get(r.question_id);
    const tags: Array<[string, string]> = [];
    if (q?.question_type) tags.push([q.question_type, "RC Question Stem"]);
    const t = topic.get(r.passage_id);
    if (t) tags.push([t, "RC Passage Subject"]);
    return {
      qid: `rc:${r.question_id}`, pt: q?.preptest ?? null, section: q?.section ?? null, qnum: q?.position ?? null,
      qtype: q?.question_type ?? null, level: q?.difficulty ?? null, mode: "rc",
      selected_answer: r.selected ?? null, correct: r.is_correct ?? null, time_ms: r.time_ms ?? null,
      timestamp_iso: r.created_at, br_answer: null, br_outcome: null,
      kind: "rc", label: q ? `PT${q.preptest}.S${q.section}.Q${q.position}` : `RC question ${r.question_id}`,
      tags, correct_answer: q?.correct_answer ?? null,
    } satisfies AttemptRow;
  });
}

/* ---------------------------------------------------------------- History */

export type SittingKind = "preptest" | "section" | "drill";

export interface Sitting {
  id: string;
  kind: SittingKind;
  title: string;
  subtitle: string;
  date: string;
  /** What the row shows: a scaled score for a PrepTest, a percent otherwise. */
  score: { kind: "scaled"; value: number } | { kind: "percent"; value: number } | null;
  br: { kind: "percent"; value: number } | null;
  correct: number;
  total: number;
  completed: boolean;
  /** Where the teacher goes to review it, when there is a review to open. */
  drillRunId?: string;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function buildSittings(p: StudentPractice): Sitting[] {
  const out: Sitting[] = [];
  for (const t of p.practiceTests) {
    if (t.status !== "complete" || !t.completed_at) continue;
    const scaled = t.scaled_score ?? (t.raw_total ? estimateScaledScore(t.raw_correct ?? 0, t.raw_total) : null);
    out.push({
      id: `pt:${t.id}`, kind: "preptest", title: t.pt ? `PT${t.pt}` : "PrepTest", subtitle: "PrepTest",
      date: t.completed_at, score: scaled ? { kind: "scaled", value: scaled } : null, br: null,
      correct: t.raw_correct ?? 0, total: t.raw_total ?? 0, completed: true,
    });
  }
  for (const s of p.sections) {
    if (!s.completed_at) continue;
    const total = s.initial_total ?? 0;
    out.push({
      id: `section:${s.id}`, kind: "section",
      title: s.pt && s.section ? `PT${s.pt}.S${s.section}` : "Section",
      subtitle: s.practice_test_run_id ? "Section of a PrepTest" : "Section",
      date: s.completed_at,
      score: total ? { kind: "percent", value: pct(s.initial_score ?? 0, total) } : null,
      br: s.br_used && s.br_total ? { kind: "percent", value: pct(s.br_score ?? 0, s.br_total) } : null,
      correct: s.initial_score ?? 0, total, completed: true,
    });
  }
  for (const d of p.drills) {
    const attempts = d.session.attempts ?? [];
    const correct = attempts.filter((a) => a.correct).length;
    const guided = d.source_key.startsWith("guided::");
    const adaptive = d.source_key === "drill::adaptive";
    out.push({
      id: `drill:${d.id}`, kind: "drill",
      title: adaptive ? "Smart Drill" : d.label || (guided ? "Guided drill" : "LR drill"),
      subtitle: guided ? "Guided drill" : adaptive ? "Smart Drill" : "LR drill",
      date: d.updated_at,
      score: attempts.length ? { kind: "percent", value: pct(correct, attempts.length) } : null,
      br: null, correct, total: attempts.length,
      completed: d.session.status === "completed", drillRunId: d.id,
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------ Performance */

export interface PerformancePoint {
  date: string;
  /** Scaled-score equivalent, so PrepTests, sections and drills share an axis. */
  score: number;
  br: number | null;
  kind: SittingKind;
  title: string;
}

/**
 * One point per finished sitting. Sections and drills become a scaled-score
 * equivalent through the same conversion the PrepTest runner uses, so a
 * percent and a PrepTest score can sit on one line; the tooltip still names
 * what each point really was.
 */
export function performanceSeries(sittings: Sitting[], include: Record<SittingKind, boolean>, sinceIso?: string | null): PerformancePoint[] {
  return sittings
    .filter((s) => s.completed && include[s.kind] && s.score && s.total > 0 && (!sinceIso || s.date >= sinceIso))
    .map((s) => ({
      date: s.date,
      score: s.score!.kind === "scaled" ? s.score!.value : estimateScaledScore(s.correct, s.total),
      br: s.br ? estimateScaledScore(Math.round((s.br.value / 100) * s.total), s.total) : null,
      kind: s.kind,
      title: s.title,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------- Tags */

export type Priority = "Highest" | "High" | "Medium" | "Low";

export interface TagStat {
  tag: string;
  group: string;
  answered: number;
  correct: number;
  accuracy: number;
  /** Estimated LSAT score if every question were this tag. */
  tagScore: number;
  vsGoal: number;
  priority: Priority;
  limitedData: boolean;
  qids: string[];
}

export const LIMITED_DATA_BELOW = 8;

/**
 * Per-tag performance from first answers. A question's type is its "LR
 * Question Stem" tag; its features (Causal, Conditional, ...) are "LR
 * Reasoning" tags. Priority weighs how far the tag sits below the goal by how
 * often it was seen, then ranks: top 15% Highest, next 25% High, next 40%
 * Medium, the rest Low. Tags with limited data are capped at Medium.
 */
export function tagAnalytics(attempts: AttemptRow[], goal: number): TagStat[] {
  const byTag = new Map<string, { group: string; answered: number; correct: number; qids: Set<string> }>();
  const seen = new Set<string>();
  for (const a of attempts) {
    if (!a.qid || a.correct == null || seen.has(a.qid)) continue; // first answer only
    seen.add(a.qid);
    const tags: Array<[string, string]> = [];
    if (a.tags) {
      tags.push(...a.tags);
    } else {
      const q = questionBank.getQuestion(a.qid);
      const stem = q?.qtype || a.qtype;
      if (stem) tags.push([stem, "LR Question Stem"]);
      for (const f of q?.questionFeatures ?? []) tags.push([f, "LR Reasoning"]);
    }
    for (const [tag, group] of tags) {
      const t = byTag.get(tag) ?? { group, answered: 0, correct: 0, qids: new Set<string>() };
      t.answered += 1;
      if (a.correct) t.correct += 1;
      t.qids.add(a.qid);
      byTag.set(tag, t);
    }
  }
  const stats = [...byTag.entries()].map(([tag, t]) => {
    const tagScore = estimateScaledScore(t.correct, t.answered);
    return {
      tag, group: t.group, answered: t.answered, correct: t.correct,
      accuracy: t.answered ? t.correct / t.answered : 0,
      tagScore, vsGoal: tagScore - goal,
      priority: "Low" as Priority,
      limitedData: t.answered < LIMITED_DATA_BELOW,
      qids: [...t.qids],
    };
  });
  const weight = (s: TagStat) => Math.max(0, goal - s.tagScore) * Math.sqrt(s.answered);
  const ranked = [...stats].sort((a, b) => weight(b) - weight(a));
  ranked.forEach((s, i) => {
    const r = ranked.length ? i / ranked.length : 1;
    s.priority = weight(s) === 0 ? "Low" : r < 0.15 ? "Highest" : r < 0.4 ? "High" : r < 0.8 ? "Medium" : "Low";
    // A handful of answers is not evidence: thin tags never outrank Medium.
    if (s.limitedData && (s.priority === "Highest" || s.priority === "High")) s.priority = "Medium";
  });
  // Show the strongest evidence first within a priority.
  const order: Record<Priority, number> = { Highest: 0, High: 1, Medium: 2, Low: 3 };
  ranked.sort((a, b) => order[a.priority] - order[b.priority] || weight(b) - weight(a));
  return ranked;
}

/* -------------------------------------------------------------- Questions */

export interface QuestionRow {
  qid: string;
  kind: "lr" | "rc";
  label: string;
  tags: string[];
  difficulty: number | null;
  firstCorrect: boolean | null;
  firstAnswer: string | null;
  correctAnswer: string | null;
  timesSeen: number;
  lastSeen: string | null;
  timeMs: number | null;
  br: string | null;
}

export function questionRows(attempts: AttemptRow[]): QuestionRow[] {
  const map = new Map<string, QuestionRow>();
  for (const a of attempts) {
    if (!a.qid) continue;
    const existing = map.get(a.qid);
    if (existing) {
      existing.timesSeen += 1;
      existing.lastSeen = a.timestamp_iso ?? existing.lastSeen;
      continue;
    }
    const q = a.kind === "rc" ? null : questionBank.getQuestion(a.qid);
    map.set(a.qid, {
      qid: a.qid,
      kind: a.kind ?? "lr",
      label: a.label ?? (q ? `PT${q.pt}.S${q.section}.Q${q.qnum}` : a.pt ? `PT${a.pt}.S${a.section}.Q${a.qnum}` : a.qid),
      tags: a.tags ? a.tags.map(([t]) => t) : q ? [q.qtype, ...(q.questionFeatures ?? [])].filter(Boolean) : a.qtype ? [a.qtype] : [],
      difficulty: q?.difficulty ?? a.level ?? null,
      firstCorrect: a.correct, firstAnswer: a.selected_answer, correctAnswer: a.correct_answer ?? q?.correctAnswer ?? null,
      timesSeen: 1, lastSeen: a.timestamp_iso, timeMs: a.time_ms, br: a.br_answer,
    });
  }
  return [...map.values()].sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));
}
