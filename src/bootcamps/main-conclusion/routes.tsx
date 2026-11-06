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

import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { WorkspaceShell } from '@/bootcamps/main-conclusion/components/workspace-shell/WorkspaceShell';
import { LockedRoute } from '@/bootcamps/main-conclusion/components/workspace-shell/LockedRoute';
import { ModuleIndex } from '@/bootcamps/main-conclusion/modules/ModuleIndex';
import { LessonsIndex } from '@/bootcamps/main-conclusion/modules/lessons/LessonsIndex';
import { Lesson } from '@/bootcamps/main-conclusion/modules/lessons/Lesson';
import { HardSentencesCapstone } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesCapstone';
import { ReferenceIndex } from '@/bootcamps/main-conclusion/modules/reference/ReferenceIndex';
import { ReferenceSection, NamedToolEntry } from '@/bootcamps/main-conclusion/modules/reference/ReferenceSection';
import { IndicatorVault } from '@/bootcamps/main-conclusion/modules/reference/IndicatorVault';
import { StructuredFlashcards } from '@/bootcamps/main-conclusion/modules/reference/StructuredFlashcards';
import { DrillsIndex } from '@/bootcamps/main-conclusion/modules/drills/DrillsIndex';
import { DrillShell } from '@/bootcamps/main-conclusion/modules/drills/DrillShell';
import { ActiveDrillShell } from '@/bootcamps/main-conclusion/modules/drills/ActiveDrillShell';
import { PracticeDrillsIndex } from '@/bootcamps/main-conclusion/modules/practice-drills/PracticeDrillsIndex';
import { IntroPathLearningLayout } from '@/bootcamps/main-conclusion/components/IntroPathLearningLayout';
import {
  SimulatorOverview,
  QuestionBank,
  TrapMaster,
  HardMode,
} from '@/bootcamps/main-conclusion/modules/simulator/SimulatorShell';
import { StructuredDissectionLab } from '@/bootcamps/main-conclusion/components/structured-dissection/StructuredDissectionLab';
import { TraitDeepDive } from '@/bootcamps/main-conclusion/components/trap-master/TraitDeepDive';
import { HardSentencesIndex } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesIndex';
import WhyHardSentences from '@/bootcamps/main-conclusion/modules/hard-sentences/sections/WhyHardSentences';
import WhatIsACluster from '@/bootcamps/main-conclusion/modules/hard-sentences/sections/WhatIsACluster';
import Specifiers from '@/bootcamps/main-conclusion/modules/hard-sentences/sections/Specifiers';
import JordanMove from '@/bootcamps/main-conclusion/modules/hard-sentences/sections/JordanMove';
import OptionalVsCore from '@/bootcamps/main-conclusion/modules/hard-sentences/sections/OptionalVsCore';
import ClusterDecomposerLab from '@/bootcamps/main-conclusion/modules/hard-sentences/sections/ClusterDecomposerLab';
import DrillClusterDecomposition from '@/bootcamps/main-conclusion/modules/hard-sentences/DrillClusterDecomposition';
import { DiagnosticsIndex } from '@/bootcamps/main-conclusion/modules/diagnostics/DiagnosticsIndex';
import { Philosophy } from '@/bootcamps/main-conclusion/modules/diagnostics/Philosophy';
import { Dashboard } from '@/bootcamps/main-conclusion/modules/diagnostics/Dashboard';
import { Journal } from '@/bootcamps/main-conclusion/modules/journal/Journal';
import { Settings } from '@/bootcamps/main-conclusion/modules/settings/Settings';
import { NewGuidedIntro } from '@/bootcamps/main-conclusion/modules/lessons/NewGuidedIntro';
import { IntroLessonPage, type IntroLessonPageId } from '@/bootcamps/main-conclusion/modules/lessons/notes/IntroLessonPage';

function DrillRouteSwitch() {
  const { pathname } = useLocation();
  const isRunRoute = pathname.replace(/\/+$/, '').endsWith('/run');

  return isRunRoute ? <ActiveDrillShell /> : <DrillShell />;
}

function NoteLoader() {
  const { noteId } = useParams();
  const redirects: Record<string, IntroLessonPageId> = {
    'argument-basics': 'three-parts-lr-question',
    'argument-anatomy': 'three-parts-lr-question',
    'where-conclusions-hide': 'conclusions',
    'layered-arguments': 'beyond-premises-and-conclusions',
    'matching-the-answer': 'two-part-conclusion-check',
    'first-sentence-vs-rebuttal-structures': 'first-sentence-vs-rebuttal-structures',
  };

  const pageId = (noteId && noteId in redirects ? redirects[noteId] : noteId) as IntroLessonPageId | undefined;

  switch (pageId) {
    case 'three-parts-lr-question':
    case 'so-an-argument':
    case 'premises':
    case 'conclusions':
    case 'five-types-of-conclusions':
    case 'beyond-premises-and-conclusions':
    case 'two-part-conclusion-check':
    case 'first-sentence-vs-rebuttal-structures':
      return <IntroLessonPage pageId={pageId} />;
    default:
      return <Navigate to="/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question" replace />;
  }
}

function LegacyLessonRedirect() {
  const { lessonId } = useParams();
  const noteByLessonId: Record<string, IntroLessonPageId> = {
    '1.1': 'three-parts-lr-question',
    '1.2': 'three-parts-lr-question',
    '1.3': 'so-an-argument',
    '1.4': 'premises',
    '1.5': 'conclusions',
    '1.6': 'five-types-of-conclusions',
    '1.7': 'beyond-premises-and-conclusions',
    '1.8': 'two-part-conclusion-check',
    '1.9': 'first-sentence-vs-rebuttal-structures',
  };

  if (lessonId === 'note' || lessonId === 'notes') {
    return <Navigate to="/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question" replace />;
  }

  if (lessonId && lessonId in noteByLessonId) {
    return <Navigate to={`/bootcamp/intro-to-lr/lessons/notes/${noteByLessonId[lessonId]}`} replace />;
  }
  if (lessonId === '1.13') {
    return <Navigate to="/bootcamp/intro-to-lr/drills" replace />;
  }
  return <Navigate to={`/bootcamp/intro-to-lr/lessons/legacy/${lessonId ?? ''}`} replace />;
}

import { IntroGuidedWorkbook } from '@/bootcamps/main-conclusion/modules/lessons/IntroGuidedWorkbook';

export function BootcampRoutes() {
  return (
    <Routes>
      <Route element={<WorkspaceShell />}>
        <Route index element={<ModuleIndex />} />
        <Route path="lessons" element={<NewGuidedIntro />} />
        <Route path="lessons/workbook" element={<IntroGuidedWorkbook />} />
        <Route path="lessons/legacy" element={<LessonsIndex />} />
        <Route path="lessons/note" element={<Navigate to="/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question" replace />} />
        <Route path="lessons/notes" element={<Navigate to="/bootcamp/intro-to-lr/lessons/notes/three-parts-lr-question" replace />} />
        <Route path="lessons/notes/:noteId" element={<NoteLoader />} />
        <Route path="lessons/:lessonId" element={<LegacyLessonRedirect />} />
        <Route path="lessons/legacy/1.13" element={<Navigate to="/bootcamp/intro-to-lr/drills" replace />} />
        <Route path="lessons/legacy/:lessonId" element={<Lesson />} />
        <Route
          path="reference"
          element={
            <IntroPathLearningLayout>
              <ReferenceIndex />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/flashcards"
          element={<StructuredFlashcards />}
        />
        <Route
          path="reference/indicators"
          element={
            <IntroPathLearningLayout>
              <IndicatorVault />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/indicators-core"
          element={
            <IntroPathLearningLayout>
              <IndicatorVault coreOnly />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/2-part-check"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/fabs"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/stimulus-tendencies"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/conclusion-types"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/rebuttal-structure"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/three-traps"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/pronoun-library"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/concession-decoder"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/quick-card"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/companion-mode"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/named-tools"
          element={
            <IntroPathLearningLayout>
              <ReferenceSection />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="reference/named-tools/:toolId"
          element={
            <IntroPathLearningLayout>
              <NamedToolEntry />
            </IntroPathLearningLayout>
          }
        />
        <Route
          path="drills"
          element={<DrillsIndex />}
        />
        <Route
          path="drills/:drillId/*"
          element={<DrillRouteSwitch />}
        />
        <Route
          path="practice-drills"
          element={<PracticeDrillsIndex />}
        />
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
              <StructuredDissectionLab />
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
        <Route path="hard-sentences/capstone" element={<HardSentencesCapstone />} />
        <Route path="hard-sentences/5.1" element={<WhyHardSentences />} />
        <Route path="hard-sentences/5.2" element={<WhatIsACluster />} />
        <Route path="hard-sentences/5.3" element={<Specifiers />} />
        <Route path="hard-sentences/5.4" element={<JordanMove />} />
        <Route path="hard-sentences/5.5" element={<OptionalVsCore />} />
        <Route path="hard-sentences/5.6" element={<ClusterDecomposerLab />} />
        <Route path="hard-sentences/5.7" element={<DrillClusterDecomposition />} />
        {/* Legacy section ids (e.g. old bookmarks) land on the hub. */}
        <Route path="hard-sentences/:sectionId" element={<Navigate to="/bootcamp/intro-to-lr/hard-sentences" replace />} />
        <Route path="diagnostics" element={<DiagnosticsIndex />} />
        <Route path="diagnostics/philosophy" element={<Philosophy />} />
        <Route path="diagnostics/dashboard" element={<Dashboard />} />
        <Route path="diagnostics/recommendations" element={<Navigate to="/bootcamp/intro-to-lr/diagnostics" replace />} />
        <Route path="diagnostics/rr-review" element={<Navigate to="/bootcamp/intro-to-lr/diagnostics" replace />} />
        <Route path="diagnostics/trait-profile" element={<Navigate to="/bootcamp/intro-to-lr/diagnostics" replace />} />
        <Route path="diagnostics/mistake-profile" element={<Navigate to="/bootcamp/intro-to-lr/diagnostics" replace />} />
        <Route path="diagnostics/srs" element={<Navigate to="/bootcamp/intro-to-lr/diagnostics" replace />} />
        <Route path="journal" element={<Journal />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
