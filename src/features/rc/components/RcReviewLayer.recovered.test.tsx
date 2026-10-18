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
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

  it('discloses partial coverage and omits blank walkthrough blocks', () => {
    render(<MemoryRouter><RcReviewLayer question={{ ...question,
      explanationBlocks: [{ heading: 'Empty heading', body: '  ' }, { heading: 'Reasoning', body: 'Authored reasoning.' }],
      choices: question.choices.map(choice => ({ ...choice, explanation: choice.letter === 'C' ? 'Authored choice reasoning.' : null })),
    }} firstPick="B" /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Empty heading' })).not.toBeInTheDocument();
    expect(screen.getByText('Written explanations are not available for choices A, B, D, E yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask Joshua about this question' })).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Reasoning' });
    if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle);
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toHaveTextContent('Authored reasoning.');
  });

  it('does not mistake answer tags or blank blocks for explanatory prose', () => {
    render(<MemoryRouter><RcReviewLayer question={{ ...question,
      explanationBlocks: [{ heading: 'Walkthrough', body: '  ' }],
      choices: question.choices.map(choice => ({ ...choice, tag: 'Too Strong', explanation: null })),
    }} firstPick="B" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Ask Joshua about this question' })).toBeInTheDocument();
  });

  it('handles a missing question stem honestly in the tutor draft', () => {
    function ContextProbe() { return <output data-testid="missing-stem-context">{JSON.stringify(useLocation().state)}</output>; }
    render(<MemoryRouter initialEntries={['/rc/drill?sessionId=saved-session&review=1']}>
      <RcReviewLayer question={{ ...question, prompt: null }} firstPick="B" actorId="student" />
      <ContextProbe />
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Joshua about this question' }));
    expect(screen.getByTestId('missing-stem-context')).toHaveTextContent('The question text is not available.');
    expect(screen.getByTestId('missing-stem-context')).not.toHaveTextContent('Credited answer');
  });

  it('opens a contextual editable draft with the original source and question return', () => {
    function ContextProbe() { const location = useLocation(); return <output data-testid="draft-context">{JSON.stringify(location.state)}</output>; }
    render(<MemoryRouter initialEntries={['/rc/drill?sessionId=saved-session&review=1']}>
      <RcReviewLayer question={question} firstPick="B" secondPick="C" actorId="student" sourceLabel="PrepTest 159 · Section 2 · Passage 1 · Question 1" />
      <ContextProbe />
    </MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Joshua about this question' }));
    const context = JSON.parse(screen.getByTestId('draft-context').textContent!).questionContext;
    expect(context.actorId).toBe('student');
    expect(context.text).toContain('PrepTest 159 · Section 2 · Passage 1 · Question 1');
    expect(context.text).toContain('My first answer: B');
    expect(context.text).toContain('My review answer: C');
    expect(context.returnTo).toBe(`/rc/drill?sessionId=saved-session&review=1&q=${question.questionId}`);
  });

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
