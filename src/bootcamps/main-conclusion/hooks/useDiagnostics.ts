/**
 * useDiagnostics — pulls all M6 inputs from persistence in one hook.
 * Reads users, module_progress, calibration_attempts, traps_tag, srs_queue, rr_recordings_meta.
 */

import { useEffect, useState } from 'react';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, type CalibrationAttempt, type TrapsTag, type SrsQueueItem, type RrRecording, type ModuleProgress } from '@/bootcamps/main-conclusion/persistence/records';
import { useUser } from './useUser';

interface DiagnosticsState {
  loading: boolean;
  progress: ModuleProgress | null;
  calibrationAttempts: CalibrationAttempt[];
  trapsTags: TrapsTag[];
  srsItems: SrsQueueItem[];
  rrRecordings: RrRecording[];
}

const initial: DiagnosticsState = {
  loading: true,
  progress: null,
  calibrationAttempts: [],
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
      const [calRaw, tagRaw, srsRaw, rrRaw, progress] = await Promise.all([
        persist.list<CalibrationAttempt>(TABLES.calibration_attempts),
        persist.list<TrapsTag>(TABLES.traps_tag),
        persist.list<SrsQueueItem>(TABLES.srs_queue),
        persist.list<RrRecording>(TABLES.rr_recordings_meta),
        persist.get<ModuleProgress>(TABLES.module_progress, '00000000-0000-4000-8000-000000000010'),
      ]);
      if (cancelled) return;
      setState({
        loading: false,
        progress: progress ?? null,
        calibrationAttempts: calRaw,
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
