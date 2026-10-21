/**
 * A recovered question has to be usable, not just present.
 *
 * 548 RC questions were republished from the LSAT Lab API after the original
 * extract dropped them for having no answer choices. They carry no authored
 * walkthrough, which is fine and expected — but "fine" only holds if the player
 * meets one honestly instead of rendering an empty explanation shell. This
 * takes a real recovered question off disk, renders the review layer with it,
 * and pins both halves: the verdict is right, and the tutor fallback is what
 * fills the space where prose would have been.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { RcReviewLayer } from './RcReviewLayer';
import type { RcQuestion } from '../lib/rcTypes';

/** PT159 S2 was published with zero questions before the recovery. */
function recoveredQuestion(): RcQuestion {
  const file = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/data/rc/RC-PT159.json'), 'utf8'),
  ) as { passages: { section: number; questions: RcQuestion[] }[] };
  const passage = file.passages.find((p) => p.section === 2);
  const question = passage?.questions.find((q) => !q.hasWrittenExplanation);
  if (!question) throw new Error('no recovered question found in PT159 S2');
  return question;
}

describe('a recovered RC question in review', () => {
  const question = recoveredQuestion();

  it('is a real, answerable question', () => {
    expect(question.prompt).toBeTruthy();
    expect(question.choices).toHaveLength(5);
    expect(question.choices.filter((c) => c.correct)).toHaveLength(1);
    expect(['A', 'B', 'C', 'D', 'E']).toContain(question.correctAnswer);
    // The honest part: nothing authored, and nothing invented to cover for it.
    expect(question.hasWrittenExplanation).toBe(false);
    expect(question.explanationBlocks ?? []).toHaveLength(0);
  });

  it('shows the verdict and the tutor fallback rather than an empty shell', () => {
    const wrong = (['A', 'B', 'C', 'D', 'E'] as const).find((l) => l !== question.correctAnswer)!;
    render(
      <MemoryRouter>
        <RcReviewLayer question={question} firstPick={wrong} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Credited answer ${question.correctAnswer}`)),
    ).toBeInTheDocument();
    expect(screen.getByText(/No written walkthrough for this one yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ask Joshua about this question/ })).toBeInTheDocument();
  });

  it('marks a correct answer correct', () => {
    render(
      <MemoryRouter>
        <RcReviewLayer question={question} firstPick={question.correctAnswer} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Correct')).toBeInTheDocument();
  });
});
