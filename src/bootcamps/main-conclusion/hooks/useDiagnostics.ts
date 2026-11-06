/**
 * useDiagnostics — pulls Intro to LR progress, calibration attempts, and lab
 * session records from persistence in one hook.
 * Waits for `persist.ready()` so cloud `bootcamp_kv` rows hydrate before reading.
 */

import { useEffect, useState } from 'react';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import {
  TABLES,
  type CalibrationAttempt,
  type TrapsTag,
  type SrsQueueItem,
  type RrRecording,
  type ModuleProgress,
  type SimulatorAttempt,
  type DrillStageGate,
  type LessonProgress,
} from '@/bootcamps/main-conclusion/persistence/records';
import type { FirstSentenceVsRebuttalSessionRecord } from '@/bootcamps/main-conclusion/data/reference-drills/firstSentenceVsRebuttalLabData';
import { useUser } from './useUser';
import { progressIdFor } from './useModuleProgress';

const FSVR_SESSION_RECORD_ID = 'first-sentence-vs-rebuttal-lab-session';

interface DiagnosticsState {
  loading: boolean;
  progress: ModuleProgress | null;
  calibrationAttempts: CalibrationAttempt[];
  simulatorAttempts: SimulatorAttempt[];
  drillStageGates: DrillStageGate[];
  trapsTags: TrapsTag[];
  srsItems: SrsQueueItem[];
  rrRecordings: RrRecording[];
  fsvrSession: FirstSentenceVsRebuttalSessionRecord | null;
  fsvrViewedAt: string | null;
}

const initial: DiagnosticsState = {
  loading: true,
  progress: null,
  calibrationAttempts: [],
  simulatorAttempts: [],
  drillStageGates: [],
  trapsTags: [],
  srsItems: [],
  rrRecordings: [],
  fsvrSession: null,
  fsvrViewedAt: null,
};

function parseFsvrSession(record: LessonProgress | null): FirstSentenceVsRebuttalSessionRecord | null {
  const raw = record?.checkpoint_responses;
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { kind?: unknown; session?: unknown };
  if (candidate.kind !== 'first-sentence-vs-rebuttal-lab' || !candidate.session || typeof candidate.session !== 'object') {
    return null;
  }
  const session = candidate.session as Partial<FirstSentenceVsRebuttalSessionRecord>;
  if (!Array.isArray(session.completedQuestionIds)) return null;
  return {
    questionOrder: Array.isArray(session.questionOrder) ? session.questionOrder : [],
    completedQuestionIds: session.completedQuestionIds.filter((id): id is number => typeof id === 'number'),
    currentQuestionIndex: typeof session.currentQuestionIndex === 'number' ? session.currentQuestionIndex : 0,
    attempts: session.attempts && typeof session.attempts === 'object' ? session.attempts : {},
    completedAt: typeof session.completedAt === 'string' ? session.completedAt : null,
  };
}

export function useDiagnostics(): DiagnosticsState {
  const user = useUser();
  const [state, setState] = useState<DiagnosticsState>(initial);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const persist = getPersistence(user.id);
      await persist.ready();
      if (cancelled) return;
      const [calRaw, simRaw, drillRaw, tagRaw, srsRaw, rrRaw, progress, fsvrRecord] = await Promise.all([
        persist.list<CalibrationAttempt>(TABLES.calibration_attempts),
        persist.list<SimulatorAttempt>(TABLES.simulator_attempts),
        persist.list<DrillStageGate>(TABLES.drill_stagegate),
        persist.list<TrapsTag>(TABLES.traps_tag),
        persist.list<SrsQueueItem>(TABLES.srs_queue),
        persist.list<RrRecording>(TABLES.rr_recordings_meta),
        persist.get<ModuleProgress>(TABLES.module_progress, progressIdFor(user.id)),
        persist.get<LessonProgress>(TABLES.lesson_progress, FSVR_SESSION_RECORD_ID),
      ]);
      if (cancelled) return;
      setState({
        loading: false,
        progress: progress ?? null,
        calibrationAttempts: calRaw,
        simulatorAttempts: simRaw,
        drillStageGates: drillRaw,
        trapsTags: tagRaw,
        srsItems: srsRaw,
        rrRecordings: rrRaw,
        fsvrSession: parseFsvrSession(fsvrRecord),
        fsvrViewedAt: fsvrRecord?.viewed_at ?? null,
      });
    })().catch((error) => {
      console.warn('[useDiagnostics] load failed', error);
      if (!cancelled) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
