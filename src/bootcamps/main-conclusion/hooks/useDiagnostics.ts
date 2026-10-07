/**
 * useDiagnostics — pulls all M6 inputs from persistence in one hook.
 * Reads users, module_progress, calibration_attempts, traps_tag, srs_queue, rr_recordings_meta.
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
} from '@/bootcamps/main-conclusion/persistence/records';
import { useUser } from './useUser';
import { progressIdFor } from './useModuleProgress';

interface DiagnosticsState {
  loading: boolean;
  progress: ModuleProgress | null;
  calibrationAttempts: CalibrationAttempt[];
  simulatorAttempts: SimulatorAttempt[];
  drillStageGates: DrillStageGate[];
  trapsTags: TrapsTag[];
  srsItems: SrsQueueItem[];
  rrRecordings: RrRecording[];
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
};

export function useDiagnostics(): DiagnosticsState {
  const user = useUser();
  const [state, setState] = useState<DiagnosticsState>(initial);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const persist = getPersistence(user.id);
      const [calRaw, simRaw, drillRaw, tagRaw, srsRaw, rrRaw, progress] = await Promise.all([
        persist.list<CalibrationAttempt>(TABLES.calibration_attempts),
        persist.list<SimulatorAttempt>(TABLES.simulator_attempts),
        persist.list<DrillStageGate>(TABLES.drill_stagegate),
        persist.list<TrapsTag>(TABLES.traps_tag),
        persist.list<SrsQueueItem>(TABLES.srs_queue),
        persist.list<RrRecording>(TABLES.rr_recordings_meta),
        persist.get<ModuleProgress>(TABLES.module_progress, progressIdFor(user.id)),
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
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
