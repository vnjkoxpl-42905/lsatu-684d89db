import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { FIRST_SENTENCE_QUESTIONS, REBUTTAL_QUESTIONS } from '@/bootcamps/main-conclusion/content/newDrills.source';
import {
  FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS,
  firstSentenceVsRebuttalFollowUpIds,
  firstSentenceVsRebuttalFollowUpRole,
  normalizeFirstSentenceVsRebuttalStimulus,
} from './firstSentenceVsRebuttalLabData';

const INDICATOR_RE = /<i-w t="[^"]+">([^<]+)<\/i-w>/g;
const TYPED_INDICATOR_RE = /<i-w t="([^"]+)">([^<]+)<\/i-w>/g;
const INTENTIONALLY_ENHANCED_STIMULUS_IDS = new Set([8, 10, 12, 15, 17]);
const STATIC_REFERENCE_FILES = [
  'public/reference-drills/first-sentence-vs-rebuttal/index.html',
  'public/references/bootcamps/first-sentence-vs-rebuttal/index.html',
] as const;
const ALLOWED_OPPOSING_VIEW_INDICATORS = new Set([
  'some people say',
  "it's commonly believed",
  'some economists believe',
  'some biologists believe',
]);

function taggedIndicatorWords(): string[] {
  const words: string[] = [];
  for (const question of FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS) {
    for (const part of question.parts) {
      let match: RegExpExecArray | null;
      INDICATOR_RE.lastIndex = 0;
      while ((match = INDICATOR_RE.exec(part.text)) !== null) {
        words.push(match[1].trim().toLowerCase());
      }
    }
  }
  return words;
}

function stripSpeakerPrefix(text: string) {
  return text.replace(
    /^(policy adviser|consumer advocate|legal theorist|nylon industry spokesperson|letter to the editor|patient|broadcaster)\s*:?\s*/i,
    '',
  );
}

function staticTaggedIndicatorWords(filePath: string): string[] {
  const text = readFileSync(filePath, 'utf8');
  const indicatorPattern = /<i-w t=\\?"[^"]+\\?">([^<]+)<\/i-w>/g;
  const words: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = indicatorPattern.exec(text)) !== null) {
    words.push(match[1].trim().toLowerCase());
  }
  return words;
}

describe('firstSentenceVsRebuttalLabData', () => {
  it('preserves the 20-question HTML bank with the same family split', () => {
    expect(FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS).toHaveLength(20);
    expect(FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.filter((question) => question.type === 'first')).toHaveLength(9);
    expect(FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.filter((question) => question.type === 'rebuttal')).toHaveLength(11);
  });

  it('matches the canonical newDrills bank at the full-stimulus level except intentionally enhanced items', () => {
    const canonical = [...FIRST_SENTENCE_QUESTIONS, ...REBUTTAL_QUESTIONS].map((question) => ({
      id: question.id,
      type: question.type,
      stimulus: normalizeFirstSentenceVsRebuttalStimulus(question.parts.map((part) => part.text).join(' ')),
    })).filter((question) => !INTENTIONALLY_ENHANCED_STIMULUS_IDS.has(question.id)).sort((left, right) => left.id - right.id);

    const htmlPort = FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.map((question) => ({
      id: question.id,
      type: question.type,
      stimulus: normalizeFirstSentenceVsRebuttalStimulus(stripSpeakerPrefix(question.parts.map((part) => part.text).join(' '))),
    })).filter((question) => !INTENTIONALLY_ENHANCED_STIMULUS_IDS.has(question.id)).sort((left, right) => left.id - right.id);

    expect(htmlPort).toEqual(canonical);
  });

  it('never tags the word "and" as an indicator (deliberately removed from the answer key)', () => {
    expect(taggedIndicatorWords()).not.toContain('and');
  });

  it('does not tag "must" as an indicator', () => {
    expect(taggedIndicatorWords()).not.toContain('must');
  });

  it('uses no more than one pivot indicator per argument', () => {
    for (const question of FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS) {
      const pivotCount = question.parts.reduce((count, part) => {
        const matches = part.text.match(/<i-w t="Pivot">/g);
        return count + (matches?.length ?? 0);
      }, 0);

      expect(pivotCount, `Q${question.id} has too many pivot indicators`).toBeLessThanOrEqual(1);
    }
  });

  it('uses opinion indicators only on conclusion claims', () => {
    for (const question of FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS) {
      for (const part of question.parts) {
        TYPED_INDICATOR_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = TYPED_INDICATOR_RE.exec(part.text)) !== null) {
          if (match[1] === 'Opinion Indicator') {
            expect(['conclusion', 'opposing'], `Q${question.id} ${part.id} tags "${match[2]}" as an opinion indicator`).toContain(
              part.role,
            );
          }
        }
      }
    }
  });

  it('uses conclusion indicators only on conclusion claims', () => {
    for (const question of FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS) {
      for (const part of question.parts) {
        TYPED_INDICATOR_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = TYPED_INDICATOR_RE.exec(part.text)) !== null) {
          if (match[1] === 'Conclusion Indicator') {
            expect(part.role, `Q${question.id} ${part.id} tags "${match[2]}" as a conclusion indicator`).toBe('conclusion');
          }
        }
      }
    }
  });

  it('uses only approved opposing-view indicator phrases', () => {
    for (const question of FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS) {
      for (const part of question.parts) {
        TYPED_INDICATOR_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = TYPED_INDICATOR_RE.exec(part.text)) !== null) {
          if (match[1] === 'Opposing Viewpoint') {
            const word = match[2].trim().toLowerCase().replace(/[’]/g, "'");
            expect(ALLOWED_OPPOSING_VIEW_INDICATORS, `Q${question.id} ${part.id} uses unapproved opposing indicator "${word}"`).toContain(
              word,
            );
          }
        }
      }
    }
  });

  it('keeps every enhanced argument to at least three selectable parts', () => {
    for (const question of FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS) {
      expect(question.parts.length, `Q${question.id} is too short`).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives every rebuttal a standalone opposing viewpoint part', () => {
    for (const question of FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.filter((item) => item.type === 'rebuttal')) {
      expect(question.parts.some((part) => part.role === 'opposing'), `Q${question.id} has no standalone opposing viewpoint`).toBe(true);
    }
  });

  it('asks for support on first-sentence questions and a normal rebuttal asks for the opposing view', () => {
    const first = FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.find((question) => question.id === 1)!;
    const rebuttalWithOpposing = FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.find((question) => question.id === 12)!;
    expect(firstSentenceVsRebuttalFollowUpRole(first)).toBe('support');
    expect(firstSentenceVsRebuttalFollowUpRole(rebuttalWithOpposing)).toBe('opposing');
  });

  it('asks for the opposing viewpoint on Q15', () => {
    const repaired = FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.find((question) => question.id === 15)!;
    expect(repaired.type).toBe('rebuttal');
    expect(firstSentenceVsRebuttalFollowUpRole(repaired)).toBe('opposing');
    expect(firstSentenceVsRebuttalFollowUpIds(repaired)).toEqual(
      repaired.parts.filter((part) => part.role === 'opposing').map((part) => part.id),
    );
  });

  it('grades the single designated follow-up on a question with several same-role parts', () => {
    // Q7 has four support parts but the review prose names one "cleanest"
    // supporting claim (p2, the breaking-of-a-law intermediate conclusion).
    // The grade-one-designated-follow-up fix (commit 8e347680) made the grader
    // target only that part so students are not told "1 of 4" after following
    // the teaching. Assert the designated single id, not every same-role part.
    const multi = FIRST_SENTENCE_VS_REBUTTAL_QUESTIONS.find((question) => question.id === 7)!;
    const supportIds = multi.parts.filter((part) => part.role === 'support').map((part) => part.id);
    expect(supportIds.length).toBeGreaterThan(1);
    expect(multi.followUpId).toBe('p2');
    expect(firstSentenceVsRebuttalFollowUpIds(multi)).toEqual(['p2']);
  });

  it('keeps static HTML copies free of forbidden indicator words', () => {
    for (const filePath of STATIC_REFERENCE_FILES) {
      const words = staticTaggedIndicatorWords(filePath);
      expect(words, `${filePath} still tags "and" as an indicator`).not.toContain('and');
      expect(words, `${filePath} still tags "must" as an indicator`).not.toContain('must');
    }
  });
});
