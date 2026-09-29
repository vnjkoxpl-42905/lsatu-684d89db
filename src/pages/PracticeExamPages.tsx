import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { loadAllIndexPassages } from "@/features/rc/lib/rcBank";
import { buildRcSections } from "@/features/rc/lib/rcSections";
import {
  buildPracticeTests,
  legLabel,
  practiceTestRaw,
  type PracticeTestBlueprint,
} from "@/lib/practiceTest";
import { listAccountPracticeTestRuns } from "@/lib/practiceTestStore";
import { listPracticeSectionAttempts } from "@/lib/practiceSectionAttempts";
import { practiceTestPath } from "@/lib/practiceTestRunner";
import { PracticeExamsNav } from "./PracticeExamsNav";
import "./testing-centre.css";

function useAvailableExams() {
  const { manifest, isLoading: bankLoading, error: bankError } = useQuestionBank();
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const assignedOnly = !permissions.loading && !permissions.is_admin && !permissions.has_practice_access;
  const assignments = useQuery({
    queryKey: ["assigned-preptests", user?.id],
    enabled: assignedOnly && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_test_assignments" as never)
        .select("pt")
        .eq("student_id", user!.id)
        .neq("status", "archived");
      if (error) throw error;
      return new Set(((data ?? []) as Array<{ pt: number }>).map((row) => row.pt));
    },
  });
  const rcSections = useQuery({
    queryKey: ["practice-exams-rc-sections"],
    queryFn: async () => buildRcSections(await loadAllIndexPassages()),
  });
  const exams = React.useMemo(() => {
    if (!manifest || !rcSections.data) return [];
    const all = buildPracticeTests(manifest, rcSections.data);
    return assignedOnly ? all.filter((exam) => assignments.data?.has(exam.pt)) : all;
  }, [manifest, rcSections.data, assignedOnly, assignments.data]);
  return {
    exams,
    loading: permissions.loading || bankLoading || rcSections.isLoading || (assignedOnly && assignments.isLoading),
    error: bankError || rcSections.error || assignments.error,
    assignedOnly,
  };
}

function ExamLayout({ children }: { children: React.ReactNode }) {
  return <>
    <PracticeExamsNav />
    {children}
  </>;
}

export function AllPracticeExams() {
  const { exams, loading, error, assignedOnly } = useAvailableExams();
  const [search, setSearch] = React.useState("");
  const shown = exams.filter((exam) => String(exam.pt).includes(search.trim())).reverse();
  return <ExamLayout>
    <h1 className="classroom-title">All Practice Exams</h1>
    <p className="testing-lede">Choose a PrepTest to see its sections and set up an exam.</p>
    <label className="practice-exams-search-label" htmlFor="practice-exams-search">Find a PrepTest</label>
    <input
      id="practice-exams-search"
      className="practice-exams-search"
      type="search"
      inputMode="numeric"
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      placeholder="PrepTest number"
    />
    {loading && <p className="testing-note" role="status">Loading available exams…</p>}
    {error && <p className="testing-note" role="alert">Available exams could not be loaded. Refresh to try again.</p>}
    {!loading && !error && shown.length === 0 && <p className="testing-note">
      {assignedOnly ? "No PrepTest has been assigned to you yet." : "No matching PrepTests are available."}
    </p>}
    <div className="practice-exams-list">
      {!loading && !error && shown.map((exam) => <Link key={exam.pt} className="practice-exams-card" to={`/practice/exams/${exam.pt}`}>
        <span><strong>PrepTest {exam.pt}</strong><small>{exam.legs.length} sections · {exam.questionCount} questions</small></span>
        <span aria-hidden="true">View exam →</span>
      </Link>)}
    </div>
  </ExamLayout>;
}

export function ExamSections({ exam }: { exam: PracticeTestBlueprint }) {
  return <div className="testing-shape practice-exams-section-list">
    {exam.legs.map((leg, index) => <div key={`${leg.kind}-${leg.section}`} className="testing-shape-row">
      <b>Section {index + 1}</b>
      <span>{legLabel(leg as never)} · S{leg.section}</span>
      <em>{leg.questionCount} questions</em>
    </div>)}
  </div>;
}

export function PracticeExamDetail() {
  const { pt } = useParams<{ pt: string }>();
  const { exams, loading, error } = useAvailableExams();
  const exam = exams.find((item) => String(item.pt) === pt);
  const { user } = useAuth();
  const runs = useQuery({
    queryKey: ["practice-exam-runs", user?.id],
    enabled: !!user?.id,
    queryFn: () => listAccountPracticeTestRuns(user!.id),
  });
  const related = (runs.data ?? []).filter((run) => run.pt === exam?.pt && run.status !== "abandoned");
  return <ExamLayout>
    <Link className="practice-exams-back" to="/practice/exams/all">← All Exams</Link>
    <h1 className="classroom-title">PrepTest {pt}</h1>
    {loading && <p className="testing-note" role="status">Loading exam…</p>}
    {error && <p className="testing-note" role="alert">This exam could not be loaded. Refresh to try again.</p>}
    {!loading && !error && !exam && <p className="testing-note">This PrepTest is not available to your account.</p>}
    {!loading && !error && exam && <>
      <p className="testing-lede">{exam.legs.length} scored sections · {exam.questionCount} questions</p>
      <ExamSections exam={exam} />
      {!exam.rcFullLength && <p className="testing-note">This Reading Comprehension section has fewer scorable questions than a full section. All four passages are included.</p>}
      <div className="testing-actions">
        <Link className="practice-exams-primary-link" to={`/practice/exams?pt=${exam.pt}`}>Set up this exam</Link>
        <Link className="practice-exams-secondary-link" to="/practice/exams?view=section">Take one section</Link>
      </div>
      <h2 className="practice-exams-subheading">Your attempts</h2>
      {runs.isLoading && <p className="testing-note" role="status">Loading attempts…</p>}
      {runs.isError && <p className="testing-note" role="alert">Your attempts could not be loaded.</p>}
      {!runs.isLoading && !runs.isError && related.length === 0 && <p className="testing-note">You have not started this exam.</p>}
      <div className="practice-exams-list">
        {related.map((run) => <Link className="practice-exams-card" key={run.id} to={practiceTestPath(run.id)}>
          <span><strong>{run.status === "complete" ? "Completed exam" : "Unfinished exam"}</strong><small>Started {new Date(run.createdAt).toLocaleDateString()} · Section {Math.min(run.currentLeg + 1, run.legs.length)} of {run.legs.length}</small></span>
          <span aria-hidden="true">{run.status === "complete" ? "View results →" : "Resume →"}</span>
        </Link>)}
      </div>
    </>}
  </ExamLayout>;
}

export function PracticeExamAttempts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const statusFilter = statusParam === "unfinished" || statusParam === "completed" ? statusParam : "all";
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const assigned = useQuery({
    queryKey: ["practice-exam-assigned-pts", user?.id],
    enabled: !!user?.id && !permissions.loading && !permissions.is_admin && !permissions.has_practice_access,
    queryFn: async () => {
      const { data, error } = await supabase.from("practice_test_assignments" as never)
        .select("pt").eq("student_id", user!.id).neq("status", "archived");
      if (error) throw error;
      return new Set(((data ?? []) as Array<{ pt: number }>).map((row) => row.pt));
    },
  });
  const exams = useQuery({
    queryKey: ["practice-exam-runs", user?.id],
    enabled: !!user?.id,
    queryFn: () => listAccountPracticeTestRuns(user!.id),
  });
  const sections = useQuery({
    queryKey: ["practice-section-attempts", user?.id],
    enabled: !!user?.id,
    queryFn: () => listPracticeSectionAttempts(user!.id),
  });
  const entries = [
    ...(exams.data ?? []).filter((run) => run.status !== "abandoned").map((run) => ({
      id: `exam-${run.id}`,
      at: run.createdAt,
      title: `PrepTest ${run.pt} · Full exam`,
      detail: run.status === "complete"
        ? `${practiceTestRaw(run).correct} of ${practiceTestRaw(run).total} correct`
        : `Section ${Math.min(run.currentLeg + 1, run.legs.length)} of ${run.legs.length}`,
      result: null as string | null,
      status: run.status === "complete" ? "Completed" : "Unfinished",
      href: practiceTestPath(run.id),
      canOpen: run.status === "complete" || permissions.is_admin || permissions.has_practice_access || !!assigned.data?.has(run.pt),
    })),
    ...(sections.data ?? []).map((section) => ({
      id: `${section.kind}-${section.id}`,
      at: section.startedAt,
      title: `PrepTest ${section.preptest} · ${section.kind === "lr-section" ? "Logical Reasoning" : "Reading Comprehension"} section ${section.section}`,
      detail: `${section.answered} of ${section.total} answered`,
      result: section.correct === null ? null : `${section.correct} of ${section.total} correct`,
      status: section.status === "completed" ? "Completed" : "Unfinished",
      href: section.href,
      canOpen: section.status === "completed" || permissions.is_admin || permissions.has_drill_access,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const visibleEntries = statusFilter === "all"
    ? entries
    : entries.filter((entry) => entry.status === (statusFilter === "completed" ? "Completed" : "Unfinished"));
  const setStatusFilter = (status: "all" | "unfinished" | "completed") => {
    const next = new URLSearchParams(searchParams);
    if (status === "all") next.delete("status");
    else next.set("status", status);
    setSearchParams(next);
  };
  const navigate = useNavigate();
  return <ExamLayout>
    <h1 className="classroom-title">Exam Attempts</h1>
    <p className="testing-lede">Your unfinished and completed practice exams and timed sections.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter exam attempts">
      {([ ["all", "All"], ["unfinished", "Unfinished"], ["completed", "Completed"] ] as const).map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={`practice-exams-nav-link${statusFilter === value ? " active" : ""}`}
          aria-pressed={statusFilter === value}
          onClick={() => setStatusFilter(value)}
        >
          {label} ({value === "all" ? entries.length : entries.filter((entry) => entry.status === (value === "completed" ? "Completed" : "Unfinished")).length})
        </button>
      ))}
    </div>
    {(exams.isLoading || sections.isLoading) && <p className="testing-note" role="status">Loading your attempts…</p>}
    {(exams.isError || sections.isError) && <p className="testing-note" role="alert">Some attempts could not be loaded. Refresh to try again.</p>}
    {!exams.isLoading && !sections.isLoading && entries.length === 0 && <div className="testing-panel">
      <p>You have not started an exam or timed section yet.</p>
      <button className="practice-exams-primary-link" onClick={() => navigate("/practice/exams")}>Choose a practice exam</button>
    </div>}
    {!exams.isLoading && !sections.isLoading && !exams.isError && !sections.isError && entries.length > 0 && visibleEntries.length === 0 && (
      <p className="testing-note">No {statusFilter === "completed" ? "completed" : "unfinished"} attempts yet.</p>
    )}
    <div className="practice-exams-list">
      {visibleEntries.map((entry) => entry.canOpen
        ? <Link className="practice-exams-card" key={entry.id} to={entry.href}>
            <span><strong>{entry.title}</strong><small>{entry.status} · {entry.result ?? entry.detail} · Started {new Date(entry.at).toLocaleDateString()}</small></span>
            <span aria-hidden="true">{entry.status === "Completed" ? "View results →" : "Resume →"}</span>
          </Link>
        : <div className="practice-exams-card" key={entry.id}>
            <span><strong>{entry.title}</strong><small>{entry.status} · {entry.detail} · Started {new Date(entry.at).toLocaleDateString()}</small></span>
            <span>Access needed to resume</span>
          </div>)}
    </div>
  </ExamLayout>;
}

export function PracticeSectionResult() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const sections = useQuery({
    queryKey: ["practice-section-attempts", user?.id],
    enabled: !!user?.id,
    queryFn: () => listPracticeSectionAttempts(user!.id),
  });
  const attempt = sections.data?.find((section) =>
    section.kind === "lr-section" && section.id === sessionId && section.status === "completed",
  );
  return <ExamLayout>
    <Link className="practice-exams-back" to="/practice/exams/attempts">← Attempts</Link>
    <h1 className="classroom-title">Logical Reasoning result</h1>
    {sections.isLoading && <p className="testing-note" role="status">Loading your result…</p>}
    {sections.isError && <p className="testing-note" role="alert">This result could not be loaded. Refresh to try again.</p>}
    {!sections.isLoading && !sections.isError && !attempt && <p className="testing-note">This result was not found in your account.</p>}
    {attempt && <div className="testing-panel">
      <h2 className="testing-heading">PrepTest {attempt.preptest} · Section {attempt.section}</h2>
      <p className="testing-note">Completed {new Date(attempt.updatedAt).toLocaleDateString()}</p>
      <div className="testing-score"><strong>{attempt.correct === null ? "Score unavailable" : `${attempt.correct} / ${attempt.total}`}</strong><span>{attempt.correct === null ? "This older result has no saved score." : "correct on first attempt"}</span></div>
      <p className="testing-note">{attempt.answered} of {attempt.total} questions answered.</p>
    </div>}
  </ExamLayout>;
}
