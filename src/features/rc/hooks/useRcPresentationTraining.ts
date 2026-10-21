import * as React from 'react';
import { rcPresentationTraining, type RcDrillConfig } from '../lib/rcTypes';

export function useRcPresentationTraining({ config, reviewOnly, enabled, scope, passageId, questionId, canPredict }: {
  config: RcDrillConfig; reviewOnly: boolean; enabled: boolean; scope: string;
  passageId?: number; questionId?: number; canPredict: boolean;
}) {
  const modes = rcPresentationTraining(config, reviewOnly);
  const [shownChoices, setShownChoices] = React.useState<Set<string>>(() => new Set());
  const [sentenceLimits, setSentenceLimits] = React.useState<Map<string, number>>(() => new Map());
  const [sentenceCount, setSentenceCount] = React.useState(0);
  const questionKey = `${scope}:${questionId ?? ''}`;
  const passageKey = `${scope}:${passageId ?? ''}`;
  const lineByLine = enabled && modes.lineByLine;
  const choicesHidden = enabled && modes.anticipation && canPredict && !shownChoices.has(questionKey);
  const sentenceLimit = sentenceLimits.get(passageKey) ?? 1;
  return {
    choicesHidden, lineByLine, sentenceLimit, sentenceCount, setSentenceCount,
    showChoices: () => setShownChoices(previous => new Set(previous).add(questionKey)),
    nextSentence: () => setSentenceLimits(previous => new Map(previous).set(passageKey, Math.min(sentenceCount || 1, sentenceLimit + 1))),
    showPassage: () => setSentenceLimits(previous => new Map(previous).set(passageKey, sentenceCount || 1)),
  };
}
