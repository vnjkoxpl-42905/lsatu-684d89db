import { useCallback, useMemo, useState } from "react";
import type { PlaygroundStimulus, SlotId } from "../types";

// useSlotFillerSession: pure local state for the SlotFiller playground.
// No DB writes. Per brief §11, ephemeral session UUID; refresh = new session.

export interface SlotPlacement {
  clauseId: string;
  slot: SlotId | null;
}

export interface CheckResult {
  clauseId: string;
  correct: boolean;
  expectedSlot: SlotId;
  placedSlot: SlotId | null;
  tip?: string;
}

export interface UseSlotFillerSessionResult {
  sessionId: string;
  stimulus: PlaygroundStimulus;
  stimulusIndex: number;
  placements: Record<string, SlotId | null>;
  results: CheckResult[] | null;
  selectedClauseId: string | null;
  sessionAccuracy: { correct: number; total: number };
  showIndicators: boolean;
  showTree: boolean;
  place: (clauseId: string, slot: SlotId | null) => void;
  selectClause: (clauseId: string | null) => void;
  check: () => CheckResult[];
  next: () => void;
  reset: () => void;
  toggleIndicators: () => void;
  toggleTree: () => void;
}

function makeSessionId(): string {
  // crypto.randomUUID per brief §11 (F2.4 fix).
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function useSlotFillerSession(
  stimuli: PlaygroundStimulus[],
): UseSlotFillerSessionResult {
  const [sessionId] = useState(makeSessionId);
  const [stimulusIndex, setStimulusIndex] = useState(0);
  const [placements, setPlacements] = useState<Record<string, SlotId | null>>(
    {},
  );
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [sessionAccuracy, setSessionAccuracy] = useState({
    correct: 0,
    total: 0,
  });
  const [showIndicators, setShowIndicators] = useState(false);
  const [showTree, setShowTree] = useState(false);

  const stimulus = stimuli[stimulusIndex % stimuli.length];

  const place = useCallback((clauseId: string, slot: SlotId | null) => {
    setPlacements((prev) => ({ ...prev, [clauseId]: slot }));
    setResults(null);
  }, []);

  const selectClause = useCallback((clauseId: string | null) => {
    setSelectedClauseId(clauseId);
  }, []);

  const check = useCallback((): CheckResult[] => {
    const currentResults: CheckResult[] = stimulus.clauses.map((clause) => {
      const placedSlot = placements[clause.id] ?? null;
      const correct = placedSlot === clause.slot;
      const tip =
        !correct && placedSlot
          ? clause.tip_on_mismatch?.[placedSlot]
          : undefined;
      return {
        clauseId: clause.id,
        correct,
        expectedSlot: clause.slot,
        placedSlot,
        tip,
      };
    });
    setResults(currentResults);
    const right = currentResults.filter((r) => r.correct).length;
    setSessionAccuracy((acc) => ({
      correct: acc.correct + right,
      total: acc.total + currentResults.length,
    }));
    return currentResults;
  }, [placements, stimulus.clauses]);

  const next = useCallback(() => {
    setStimulusIndex((i) => i + 1);
    setPlacements({});
    setResults(null);
    setSelectedClauseId(null);
  }, []);

  const reset = useCallback(() => {
    setStimulusIndex(0);
    setPlacements({});
    setResults(null);
    setSelectedClauseId(null);
    setSessionAccuracy({ correct: 0, total: 0 });
  }, []);

  const toggleIndicators = useCallback(() => setShowIndicators((v) => !v), []);
  const toggleTree = useCallback(() => setShowTree((v) => !v), []);

  return useMemo(
    () => ({
      sessionId,
      stimulus,
      stimulusIndex,
      placements,
      results,
      selectedClauseId,
      sessionAccuracy,
      showIndicators,
      showTree,
      place,
      selectClause,
      check,
      next,
      reset,
      toggleIndicators,
      toggleTree,
    }),
    [
      sessionId,
      stimulus,
      stimulusIndex,
      placements,
      results,
      selectedClauseId,
      sessionAccuracy,
      showIndicators,
      showTree,
      place,
      selectClause,
      check,
      next,
      reset,
      toggleIndicators,
      toggleTree,
    ],
  );
}
