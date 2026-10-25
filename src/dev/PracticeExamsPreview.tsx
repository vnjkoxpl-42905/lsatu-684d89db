import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PracticeExamsNav } from "@/pages/PracticeExamsNav";
import { ExamSections } from "@/pages/PracticeExamPages";
import { ResumeList } from "@/pages/TestingCentre";
import type { PracticeTestBlueprint, PracticeTestRun } from "@/lib/practiceTest";
import type { PracticeSectionAttempt } from "@/lib/practiceSectionAttempts";
import "@/components/classroom/classroom.css";
import "@/pages/testing-centre.css";

const base = "/dev/practice-exams-preview";
const blueprint: PracticeTestBlueprint = {
  pt: 101,
  questionCount: 77,
  rcFullLength: true,
  legs: [
    { kind: "lr", section: 1, questionCount: 25 },
    { kind: "rc", section: 2, questionCount: 27, passageIds: [1, 2, 3, 4] },
    { kind: "lr", section: 3, questionCount: 25 },
  ],
};
const run: PracticeTestRun = {
  id: "preview-run",
  pt: 101,
  pace: "standard",
  sectionSeconds: 2100,
  legs: blueprint.legs.map((leg) => ({ ...leg })),
  currentLeg: 1,
  breakAfterLeg: 2,
  breakTaken: false,
  status: "in-progress",
  createdAt: "2026-09-27T10:00:00Z",
};
const section: PracticeSectionAttempt = {
  id: "preview-section",
  kind: "rc-section",
  status: "in-progress",
  preptest: 112,
  section: 4,
  startedAt: "2026-09-26T12:00:00Z",
  updatedAt: "2026-09-26T12:20:00Z",
  answered: 11,
  correct: null,
  total: 27,
  href: base,
};

function PreviewBody() {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [showRun, setShowRun] = React.useState(true);
  const pt = location.pathname.match(/\/exams\/(\d+)$/)?.[1];
  const attempts = location.pathname.endsWith("/attempts");
  const detail = Boolean(pt);
  const catalog = location.pathname.includes("/exams");
  if (attempts) return <>
    <h1 className="classroom-title">Exam Attempts</h1>
    <p className="testing-lede">Your unfinished and completed practice exams and timed sections.</p>
    <div className="practice-exams-list">
      <Link className="practice-exams-card" to={base}>
        <span><strong>PrepTest 101 · Full exam</strong><small>Unfinished · Section 2 of 3 · Started Sep 27, 2026</small></span><span>Resume →</span>
      </Link>
      <Link className="practice-exams-card" to={base}>
        <span><strong>PrepTest 112 · Reading Comprehension section 4</strong><small>Unfinished · 11 of 27 answered · Started Sep 26, 2026</small></span><span>Resume →</span>
      </Link>
      <Link className="practice-exams-card" to={base}>
        <span><strong>PrepTest 102 · Full exam</strong><small>Completed · 53 of 76 correct · Started Sep 20, 2026</small></span><span>View results →</span>
      </Link>
    </div>
  </>;
  if (catalog && detail) return <>
    <Link className="practice-exams-back" to={`${base}/exams`}>← All Exams</Link>
    <h1 className="classroom-title">PrepTest {pt}</h1>
    <p className="testing-lede">3 scored sections · 77 questions</p>
    <ExamSections exam={blueprint} />
    <div className="testing-actions">
      <Link className="practice-exams-primary-link" to={base}>Set up this exam</Link>
      <Link className="practice-exams-secondary-link" to={base}>Take one section</Link>
    </div>
    <h2 className="practice-exams-subheading">Your attempts</h2>
    <div className="practice-exams-list"><Link className="practice-exams-card" to={base}><span><strong>Unfinished exam</strong><small>Started Sep 27, 2026 · Section 2 of 3</small></span><span>Resume →</span></Link></div>
  </>;
  if (catalog) return <>
    <h1 className="classroom-title">All Practice Exams</h1>
    <p className="testing-lede">Choose a PrepTest to see its sections and set up an exam.</p>
    <label className="practice-exams-search-label" htmlFor="preview-search">Find a PrepTest</label>
    <input id="preview-search" className="practice-exams-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="PrepTest number" />
    <div className="practice-exams-list">{[159, 158, 157, 156, 101].filter((number) => String(number).includes(search.trim())).map((number) =>
      <Link className="practice-exams-card" key={number} to={`${base}/exams/${number}`}>
        <span><strong>PrepTest {number}</strong><small>3 sections · 77 questions</small></span><span>View exam →</span>
      </Link>)}</div>
  </>;
  return <>
    <h1 className="classroom-title">Practice Exams</h1>
    <p className="testing-lede">Official LSAT material, timed like test day.</p>
    <div className="testing-doors">
      <Link className="testing-door" to={`${base}/exams`}><span className="testing-door-title">Take a section</span><span className="testing-door-body">One real LR or RC section from an official PrepTest.</span><span className="testing-door-meta">One section · 35 minutes</span></Link>
      <Link className="testing-door" to={`${base}/exams`}><span className="testing-door-title">Take a practice test</span><span className="testing-door-body">Three scored sections from one PrepTest, in order, with a break.</span><span className="testing-door-meta">Three sections · about 2 hours</span></Link>
    </div>
    <ResumeList
      runs={showRun ? [run] : []}
      sections={[section]}
      onResume={() => navigate(`${base}/exams/101`)}
      onResumeSection={() => navigate(`${base}/attempts`)}
      onDiscard={() => setShowRun(false)}
    />
  </>;
}

export default function PracticeExamsPreview() {
  return <div className="classroom-root">
    <aside className="practice-exams-preview-sidebar">
      <strong>LSAT U</strong>
      <small>CLASSROOM</small>
      <span>Home</span><span>Drill</span><span className="selected">Practice Exams</span><span>Assigned work</span>
      <small>STUDY</small><span>Notes and recaps</span><span>Bootcamps</span><span>Activities</span>
      <small>REVIEW</small><span>Review</span><span>Analytics</span><span>History</span>
    </aside>
    <div className="practice-exams-preview-mobilebar"><strong>LSAT U</strong><span>Practice Exams</span></div>
    <main className="practice-exams-preview-main">
      <PracticeExamsNav basePath={base} />
      <PreviewBody />
    </main>
  </div>;
}
