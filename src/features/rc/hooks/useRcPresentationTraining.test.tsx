import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRcPresentationTraining } from './useRcPresentationTraining';
import type { RcDrillConfig } from '../lib/rcTypes';

const config: RcDrillConfig = { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' }, training: { anticipation: true, lineByLine: true } };
const initial = { config, reviewOnly: false, enabled: true, scope: 'owner:session', passageId: 1, questionId: 10, canPredict: true };
describe('RC presentation training', () => {
  it('reveals choices only for the current question without changing reveal config', () => {
    const { result, rerender } = renderHook(props => useRcPresentationTraining(props), { initialProps: initial });
    expect(result.current.choicesHidden).toBe(true);
    act(() => result.current.showChoices()); expect(result.current.choicesHidden).toBe(false);
    expect(config.reveal).toBe('end_of_set');
    rerender({ ...initial, questionId: 11 }); expect(result.current.choicesHidden).toBe(true);
    rerender({ ...initial, scope: 'other:session' }); expect(result.current.choicesHidden).toBe(true);
    rerender(initial); expect(result.current.choicesHidden).toBe(false);
  });
  it('keeps sentence progress per passage and starts a new owner/session at one', () => {
    const { result, rerender } = renderHook(props => useRcPresentationTraining(props), { initialProps: initial });
    act(() => result.current.setSentenceCount(3));
    act(() => result.current.nextSentence()); expect(result.current.sentenceLimit).toBe(2);
    rerender({ ...initial, passageId: 2 }); expect(result.current.sentenceLimit).toBe(1);
    act(() => result.current.showPassage()); expect(result.current.sentenceLimit).toBe(3);
    rerender(initial); expect(result.current.sentenceLimit).toBe(2);
    rerender({ ...initial, scope: 'owner:new-session' }); expect(result.current.sentenceLimit).toBe(1);
  });
  it.each([
    { ...config, source: 'assignment' as const },
    { ...config, practiceTestRunId: 'protected' },
    { ...config, timedSectionSittingId: 'protected' },
  ])('ignores flags for protected or assigned sessions', protectedConfig => {
    const { result } = renderHook(() => useRcPresentationTraining({ ...initial, config: protectedConfig }));
    expect(result.current.choicesHidden).toBe(false); expect(result.current.lineByLine).toBe(false);
  });
  it('does not hide choices in review, before ownership is ready, or after an answer', () => {
    for (const patch of [{ reviewOnly: true }, { enabled: false }, { canPredict: false }]) {
      const { result, unmount } = renderHook(() => useRcPresentationTraining({ ...initial, ...patch }));
      expect(result.current.choicesHidden).toBe(false); unmount();
    }
  });
});
