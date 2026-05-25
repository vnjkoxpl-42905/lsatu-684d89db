/**
 * Main Conclusion bootcamp routes — adapted for nested mounting inside LSAT U.
 *
 * Original used createBrowserRouter (data router). LSAT U mounts via BrowserRouter
 * + nested <Routes> under the parent path /bootcamp/intro-to-lr/*, so this file
 * exports a <BootcampRoutes /> component that renders the nested route tree.
 *
 * All paths are relative; the parent route's * wildcard matches against them.
 * The shell + drawer + palette + tutor live inside <WorkspaceShell />, mounted
 * here so that every nested route shares the chrome.
 */

import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { WorkspaceShell } from '@/bootcamps/main-conclusion/components/workspace-shell/WorkspaceShell';
import { LockedRoute } from '@/bootcamps/main-conclusion/components/workspace-shell/LockedRoute';
import { ModuleIndex } from '@/bootcamps/main-conclusion/modules/ModuleIndex';
import { LessonsIndex } from '@/bootcamps/main-conclusion/modules/lessons/LessonsIndex';
import { Lesson } from '@/bootcamps/main-conclusion/modules/lessons/Lesson';
import { CapstoneRoute } from '@/bootcamps/main-conclusion/modules/lessons/Capstone';
import { ReferenceIndex } from '@/bootcamps/main-conclusion/modules/reference/ReferenceIndex';
import { ReferenceSection, NamedToolEntry } from '@/bootcamps/main-conclusion/modules/reference/ReferenceSection';
import { IndicatorVault } from '@/bootcamps/main-conclusion/modules/reference/IndicatorVault';
import { DrillsIndex } from '@/bootcamps/main-conclusion/modules/drills/DrillsIndex';
import { DrillShell } from '@/bootcamps/main-conclusion/modules/drills/DrillShell';
import { PracticeDrillsIndex } from '@/bootcamps/main-conclusion/modules/practice-drills/PracticeDrillsIndex';
import { PracticeRunner } from '@/bootcamps/main-conclusion/components/practice/PracticeRunner';
import SIMULATOR_DATA from '@/bootcamps/main-conclusion/data/simulator.generated.json';
import {
  SimulatorOverview,
  QuestionBank,
  TrapMaster,
  HardMode,
} from '@/bootcamps/main-conclusion/modules/simulator/SimulatorShell';
import { TraitDeepDive } from '@/bootcamps/main-conclusion/components/trap-master/TraitDeepDive';
import { HardSentencesIndex, HardSentenceSection } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesIndex';
import { DiagnosticsIndex } from '@/bootcamps/main-conclusion/modules/diagnostics/DiagnosticsIndex';
import { Philosophy } from '@/bootcamps/main-conclusion/modules/diagnostics/Philosophy';
import { Dashboard } from '@/bootcamps/main-conclusion/modules/diagnostics/Dashboard';
import { Recommendations } from '@/bootcamps/main-conclusion/modules/diagnostics/Recommendations';
import { RrReview } from '@/bootcamps/main-conclusion/modules/diagnostics/RrReview';
import { TraitProfile } from '@/bootcamps/main-conclusion/modules/diagnostics/TraitProfile';
import { MistakeProfile } from '@/bootcamps/main-conclusion/modules/diagnostics/MistakeProfile';
import { SrsQueue } from '@/bootcamps/main-conclusion/modules/diagnostics/SrsQueue';
import { Journal } from '@/bootcamps/main-conclusion/modules/journal/Journal';
import { Settings } from '@/bootcamps/main-conclusion/modules/settings/Settings';
import { NewGuidedIntro } from '@/bootcamps/main-conclusion/modules/lessons/NewGuidedIntro';
import ArgumentBasicsNotes from '@/bootcamps/main-conclusion/modules/lessons/notes/argument-basics';
import WhereConclusionsHideNotes from '@/bootcamps/main-conclusion/modules/lessons/notes/where-conclusions-hide';
import LayeredArgumentsNotes from '@/bootcamps/main-conclusion/modules/lessons/notes/layered-arguments';
import MatchingTheAnswerNotes from '@/bootcamps/main-conclusion/modules/lessons/notes/matching-the-answer';
import PracticePathNotes from '@/bootcamps/main-conclusion/modules/lessons/notes/practice-path';

const PRACTICE_RUNNER_SETS = {
  'first-sentence': {
    title: 'First-Sentence Main Conclusion',
    qids: ['MC-SIM-Q1', 'MC-SIM-Q2', 'MC-SIM-Q3', 'MC-SIM-Q4', 'MC-SIM-Q5', 'MC-SIM-Q6'],
  },
  rebuttal: {
    title: 'Rebuttal Main Conclusion',
    qids: ['MC-SIM-Q8', 'MC-SIM-Q9', 'MC-SIM-Q10', 'MC-SIM-Q11'],
  },
} as const;

function PracticeRunnerWrapper() {
  const { practiceSlug } = useParams();
  const navigate = useNavigate();
  const set = PRACTICE_RUNNER_SETS[practiceSlug as keyof typeof PRACTICE_RUNNER_SETS] ?? PRACTICE_RUNNER_SETS['first-sentence'];
  const items = (SIMULATOR_DATA as any[]).filter((item: any) => (set.qids as readonly string[]).includes(item.id));
  return <PracticeRunner items={items} title={set.title} onExit={() => navigate('/bootcamp/intro-to-lr/practice-drills')} />;
}

function NoteLoader() {
  const { noteId } = useParams();
  switch (noteId) {
    case 'argument-basics': return <ArgumentBasicsNotes />;
    case 'where-conclusions-hide': return <WhereConclusionsHideNotes />;
    case 'layered-arguments': return <LayeredArgumentsNotes />;
    case 'matching-the-answer': return <MatchingTheAnswerNotes />;
    case 'practice-path': return <PracticePathNotes />;
    default: return <Navigate to="/bootcamp/intro-to-lr/lessons" replace />;
  }
}

function LegacyLessonRedirect() {
  const { lessonId } = useParams();
  if (lessonId === '1.1') {
    return <Navigate to="/bootcamp/intro-to-lr/lessons/notes/argument-basics" replace />;
  }
  if (lessonId === '1.13') {
    return <Navigate to="/bootcamp/intro-to-lr/lessons/legacy/1.13" replace />;
  }
  return <Navigate to={`/bootcamp/intro-to-lr/lessons/legacy/${lessonId ?? ''}`} replace />;
}

import { IntroGuidedWorkbook } from '@/bootcamps/main-conclusion/modules/lessons/IntroGuidedWorkbook';

export function BootcampRoutes() {
  return (
    <Routes>
      <Route element={<WorkspaceShell />}>
        <Route index element={<ModuleIndex />} />
        <Route path="lessons" element={<IntroGuidedWorkbook />} />
        <Route path="lessons/grid" element={<NewGuidedIntro />} />
        <Route path="lessons/legacy" element={<LessonsIndex />} />
        <Route path="lessons/notes/:noteId" element={<NoteLoader />} />
        <Route path="lessons/:lessonId" element={<LegacyLessonRedirect />} />
        <Route path="lessons/legacy/1.13" element={<CapstoneRoute />} />
        <Route path="lessons/legacy/:lessonId" element={<Lesson />} />
        <Route path="reference" element={<ReferenceIndex />} />
        <Route path="reference/indicators" element={<IndicatorVault />} />
        <Route path="reference/2-part-check" element={<ReferenceSection />} />
        <Route path="reference/fabs" element={<ReferenceSection />} />
        <Route path="reference/stimulus-tendencies" element={<ReferenceSection />} />
        <Route path="reference/conclusion-types" element={<ReferenceSection />} />
        <Route path="reference/rebuttal-structure" element={<ReferenceSection />} />
        <Route path="reference/three-traps" element={<ReferenceSection />} />
        <Route path="reference/pronoun-library" element={<ReferenceSection />} />
        <Route path="reference/concession-decoder" element={<ReferenceSection />} />
        <Route path="reference/quick-card" element={<ReferenceSection />} />
        <Route path="reference/companion-mode" element={<ReferenceSection />} />
        <Route path="reference/named-tools" element={<ReferenceSection />} />
        <Route path="reference/named-tools/:toolId" element={<NamedToolEntry />} />
        <Route path="drills" element={<DrillsIndex />} />
        <Route path="drills/:drillId" element={<DrillShell />} />
        <Route path="practice-drills" element={<PracticeDrillsIndex />} />
        <Route path="practice-drills/:practiceSlug" element={<PracticeRunnerWrapper />} />
        <Route
          path="simulator"
          element={
            <LockedRoute routeId="/simulator">
              <SimulatorOverview />
            </LockedRoute>
          }
        />
        <Route
          path="simulator/bank"
          element={
            <LockedRoute routeId="/simulator/bank">
              <QuestionBank />
            </LockedRoute>
          }
        />
        <Route
          path="simulator/trap-master"
          element={
            <LockedRoute routeId="/simulator/trap-master">
              <TrapMaster />
            </LockedRoute>
          }
        />
        <Route
          path="simulator/trap-master/:traitId"
          element={
            <LockedRoute routeId="/simulator/trap-master">
              <TraitDeepDive />
            </LockedRoute>
          }
        />
        <Route
          path="simulator/answer-key-views"
          element={
            <LockedRoute routeId="/simulator/answer-key-views">
              <QuestionBank />
            </LockedRoute>
          }
        />
        <Route
          path="simulator/hard-mode"
          element={
            <LockedRoute routeId="/simulator/hard-mode">
              <HardMode />
            </LockedRoute>
          }
        />
        <Route path="hard-sentences" element={<HardSentencesIndex />} />
        <Route path="hard-sentences/capstone" element={<CapstoneRoute />} />
        <Route path="hard-sentences/:sectionId" element={<HardSentenceSection />} />
        <Route path="diagnostics" element={<DiagnosticsIndex />} />
        <Route path="diagnostics/philosophy" element={<Philosophy />} />
        <Route path="diagnostics/dashboard" element={<Dashboard />} />
        <Route path="diagnostics/recommendations" element={<Recommendations />} />
        <Route path="diagnostics/rr-review" element={<RrReview />} />
        <Route path="diagnostics/trait-profile" element={<TraitProfile />} />
        <Route path="diagnostics/mistake-profile" element={<MistakeProfile />} />
        <Route path="diagnostics/srs" element={<SrsQueue />} />
        <Route path="journal" element={<Journal />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
