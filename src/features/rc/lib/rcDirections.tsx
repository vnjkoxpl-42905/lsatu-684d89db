import * as React from 'react';
import type { ToolbarDirections } from '@/components/drill/official/OfficialDrillToolbar';
import { RC_FONT_SIZES } from '../hooks/useRcA11y';

/**
 * The Reading Comprehension section directions, sitting where the LR player
 * puts its own. A Directions button is the first control in the official
 * interface's toolbar, so the section reads the same way it does on test day.
 */
export const RC_DIRECTIONS: ToolbarDirections = {
  title: 'Reading Comprehension Directions',
  srDescription: 'Directions for the LSAT Reading Comprehension section.',
  body: (
    <>
      <p>
        Each set of questions in this section is based on a single passage or a pair of
        passages. The questions are to be answered on the basis of what is <em>stated</em> or{' '}
        <em>implied</em> in the passage or pair of passages. For some questions, more than one
        of the choices could conceivably answer the question. However, you are to choose the{' '}
        <em>best</em> answer; that is, the response that most accurately and completely answers
        the question.
      </p>
      <p>
        After you have chosen the best answer, blacken the corresponding space on your answer
        sheet.
      </p>
    </>
  ),
};

/**
 * Text sizes as percentages, the official interface's own wording. 100% is the
 * LR player's base size, so the two drills read identically at the default.
 */
export const RC_FONT_SCALE_OPTIONS = RC_FONT_SIZES.map((size) => ({
  key: String(size),
  label: size === 100 ? '100% (default)' : `${size}%`,
  value: size / 100,
}));
