/**
 * Main Conclusion bootcamp routes — adapted for nested mounting inside LSAT U.
 *
 * Original used createBrowserRouter (data router). LSAT U mounts via BrowserRouter
 * + nested <Routes> under the parent path /bootcamp/intro-to-lr/*, so this file
 * exports a <BootcampRoutes /> component that renders the nested route tree.
 *
 * All paths are relative; the parent route's `*` wildcard matches against them.
 * The shell + drawer + palette + tutor live inside <WorkspaceShell />, mounted
 * here so that every nested route shares the chrome.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceShell } from '@/bootcamps/main-conclusion/components/workspace-shell/WorkspaceShell';
import { LockedRoute } from '@/bootcamps/main-conclusion/components/workspace-shell/LockedRoute';
import { ModuleIndex } from '@/bootcamps/main-conclusion/modules/ModuleIndex';
import { LessonsIndex } from '@/bootcamps/main-conclusion/modules/lessons/LessonsIndex';
import { Lesson } from '@/bootcamps/main-conclusion/modules/lessons/Lesson';
import { CapstoneRoute } from '@/bootcamps/main-conclusion/modules/lessons/Capstone';
import { ReferenceIndex } from '@/bootcamps/main-conclusion/modules/reference/ReferenceIndex';
import { ReferenceSection, NamedToolEntry } from '@/bootcamps/main-conclusion/modules/reference/ReferenceSection';
import { IndicatorVault } from '@/bootcamps/main-conclusion/modules/reference/IndicatorVault';
import { DrillsIndex, DrillShell } from '@/bootcamps/main-conclusion/modules/drills/DrillsIndex';
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

export function BootcampRoutes() {
  return (
    <Routes>
      <Route element={<WorkspaceShell />}>
        <Route index element={<ModuleIndex />} />

        {/* ── M1 Lessons ──────────────────────────────────────────────────── */}
        <Route path="lessons" element={<LessonsIndex />} />
        <Route path="lessons/1.13" element={<CapstoneRoute />} />
        <Route path="lessons/:lessonId" element={<Lesson />} />

        {/* ── M2 Reference ────────────────────────────────────────────────── */}
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

        {/* ── M3 Drills ───────────────────────────────────────────────────── */}
        <Route path="drills" element={<DrillsIndex />} />
        <Route path="drills/:drillId" element={<DrillShell />} />

        {/* ── M4 Simulator (gated by Drill 3.4) ──────────────────────────── */}
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

        {/* ── M5 Hard Sentences ───────────────────────────────────────────── */}
        <Route path="hard-sentences" element={<HardSentencesIndex />} />
        <Route path="hard-sentences/capstone" element={<CapstoneRoute />} />
        <Route path="hard-sentences/:sectionId" element={<HardSentenceSection />} />

        {/* ── M6 Diagnostics ──────────────────────────────────────────────── */}
        <Route path="diagnostics" element={<DiagnosticsIndex />} />
        <Route path="diagnostics/philosophy" element={<Philosophy />} />
        <Route path="diagnostics/dashboard" element={<Dashboard />} />
        <Route path="diagnostics/recommendations" element={<Recommendations />} />
        <Route path="diagnostics/rr-review" element={<RrReview />} />
        <Route path="diagnostics/trait-profile" element={<TraitProfile />} />
        <Route path="diagnostics/mistake-profile" element={<MistakeProfile />} />
        <Route path="diagnostics/srs" element={<SrsQueue />} />

        {/* ── Cross-cutting ───────────────────────────────────────────────── */}
        <Route path="journal" element={<Journal />} />
        <Route path="settings" element={<Settings />} />

        {/* 404 → bootcamp index */}
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
