import { describe, expect, it } from 'vitest';

import { FIRST_SENTENCE_QUESTIONS, REBUTTAL_QUESTIONS } from '@/bootcamps/main-conclusion/content/newDrills.source';
import {
  FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS,
  normalizeFirstSentenceVsRebuttalStimulus,
} from './firstSentenceVsRebuttalLabData';

function stripSpeakerPrefix(text: string) {
  return text.replace(
    /^(policy adviser|consumer advocate|legal theorist|nylon industry spokesperson|letter to the editor|patient|broadcaster)\s*:?\s*/i,
    '',
  );
}

describe('firstSentenceVsRebuttalLabData', () => {
  it('preserves the 20-question HTML bank with the same family split', () => {
    expect(FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS).toHaveLength(20);
    expect(FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.filter((question) => question.type === 'first')).toHaveLength(9);
    expect(FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.filter((question) => question.type === 'rebuttal')).toHaveLength(11);
  });

  it('matches the canonical newDrills bank at the full-stimulus level, with only HTML-specific speaker labels and part splits differing', () => {
    const canonical = [...FIRST_SENTENCE_QUESTIONS, ...REBUTTAL_QUESTIONS].map((question) => ({
      id: question.id,
      type: question.type,
      stimulus: normalizeFirstSentenceVsRebuttalStimulus(question.parts.map((part) => part.text).join(' ')),
    })).sort((left, right) => left.id - right.id);

    const htmlPort = FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.map((question) => ({
      id: question.id,
      type: question.type,
      stimulus: normalizeFirstSentenceVsRebuttalStimulus(stripSpeakerPrefix(question.parts.map((part) => part.text).join(' '))),
    })).sort((left, right) => left.id - right.id);

    expect(htmlPort).toEqual(canonical);
  });
});
