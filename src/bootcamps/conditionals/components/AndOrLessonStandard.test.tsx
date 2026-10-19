import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AndOrLesson } from './AndOrLessons';
import { andOrQuizzes } from '../content/andOrItems';
import { andOrLectures, andOrLectureTranscript } from '../content/andOrLectures';
import { answerLine, choiceStep } from '../content/andOrTasks';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const lessons: { id: string; sections: string[] }[] = [
  { id: 'and-or-both-or-either', sections: ['What AND and OR ask for', 'Why the whole group matters', 'Watch the lesson', 'How to check a group', 'What it is not', 'A habit to keep', 'Pop Quiz'] },
  { id: 'and-or-either-side', sections: ['The group can sit on either side', 'Why the side changes the answer', 'Watch the lesson', 'How to test a rule with a group in it', 'What it is not', 'A habit to keep', 'Pop Quiz'] },
  { id: 'and-or-negate-group', sections: ['Start with when the group fails', 'Why the connector changes', 'Watch the lesson', 'How to flip a rule with a group', 'What it is not', 'A habit to keep', 'Pop Quiz'] },
];
const show = (id: string) => render(<MemoryRouter><AndOrLesson id={id}/></MemoryRouter>);
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('the approved seven-section lesson shape', () => {
  it.each(lessons)('puts $id in the standard order, with the film after the idea and before the procedure', ({ id, sections }) => {
    show(id);
    expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.getAttribute('aria-label') ?? heading.textContent)).toEqual(sections);
  });

  it.each(lessons)('gives $id a user-started film with captions and a poster, and no always-open transcript', ({ id }) => {
    const { container } = show(id);
    const video = container.querySelector('video')!;
    const slug = andOrLectures[id].slug;
    expect(video.controls).toBe(true);
    expect(video.autoplay).toBe(false);
    expect(video.getAttribute('poster')).toBe(`/media/conditionals/and-or/${slug}.jpg`);
    expect(video.querySelector('source')!.getAttribute('src')).toBe(`/media/conditionals/and-or/${slug}.mp4`);
    const track = video.querySelector('track')!;
    expect(track.getAttribute('kind')).toBe('captions');
    expect(track.getAttribute('src')).toBe(`/media/conditionals/and-or/${slug}.vtt`);
    // The written version lives only inside the film's own details container, and is empty until opened.
    const details = container.querySelector('figure details')!;
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.querySelector('p')).toBeNull();
  });

  it('shows the written version only when it is opened, and also when the video fails', () => {
    const id = 'and-or-either-side';
    const { container } = show(id);
    const details = container.querySelector('figure details') as HTMLDetailsElement;
    const sentence = andOrLectures[id].scenes[0].sentences[0];
    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(within(details).getByText(new RegExp(escaped(sentence)))).toBeVisible();
    cleanup();
    const failing = show(id);
    fireEvent.error(failing.container.querySelector('video')!);
    expect(screen.getByRole('alert')).toHaveTextContent(/written out below/);
    const fallback = failing.container.querySelector('figure details') as HTMLDetailsElement;
    expect(fallback.open).toBe(true);
    expect(within(fallback).getByText(new RegExp(escaped(sentence)))).toBeVisible();
  });

  it('keeps each film script at a length that narrates in roughly 60 to 90 seconds', () => {
    for (const id of Object.keys(andOrLectures)) {
      const words = andOrLectureTranscript(id).split(/\s+/).length;
      expect(words, id).toBeGreaterThan(120);
      expect(words, id).toBeLessThan(215);
      expect(andOrLectureTranscript(id), id).not.toMatch(/—|–/);
    }
  });
});

describe('written procedure and operable demos', () => {
  it('states bold numbered steps before the learner-operated explorer in lesson 2.2', () => {
    show('and-or-either-side');
    const step = screen.getByText(/Step 1: Find the whole group/);
    expect(step.closest('strong')).not.toBeNull();
    expect(screen.getByText(/Step 3: Test your facts against the whole group/)).toBeVisible();
    const tabs = screen.getByRole('tablist');
    expect(step.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getAllByText(/A different rule from the others/).length).toBe(1);
  });

  it('names the click on every procedure control', () => {
    show('and-or-negate-group');
    for (const name of [/Step 1\. Click here to switch the left and right sides/]) expect(screen.getAllByRole('button', { name }).length).toBe(2);
    cleanup();
    show('and-or-both-or-either');
    expect(screen.getAllByRole('button', { name: /^Click here to change:/ })).toHaveLength(2);
  });

  it('shows a double negation cancelling in the second demo, not only saying so', () => {
    show('and-or-negate-group');
    const pool = screen.getByRole('group', { name: /the pool/ });
    fireEvent.click(within(pool).getByRole('button', { name: /Step 1\./ }));
    fireEvent.click(within(pool).getByRole('button', { name: /Step 2\./ }));
    expect(within(pool).getByText('NOT + NOT = no NOT')).toBeVisible();
    expect(within(pool).getByRole('status')).toHaveTextContent(/“Pool crowded” already had one, so the two cancel/);
    // The rule is read as a full if/then sentence above and below the diagram.
    expect(within(pool).getAllByText(/^If /).length).toBeGreaterThanOrEqual(1);
    fireEvent.click(within(pool).getByRole('button', { name: /Step 3\./ }));
    expect(within(pool).getByText(/If the lifeguard is not on duty and the pool is crowded, then the pool is closed to swimmers\./)).toBeVisible();
  });
});

describe('slim Wrong and Right cards', () => {
  it.each(lessons)('gives every card in $id a status badge, one line and a diagram, with no stacked explanation', ({ id }) => {
    const { container } = show(id);
    const cards = [...container.querySelectorAll('article.ct-move')];
    expect(cards).toHaveLength(3);
    expect(cards.map(card => card.getAttribute('data-verdict'))).toEqual(['wrong', 'wrong', 'right']);
    for (const card of cards) {
      expect(card.children).toHaveLength(3);
      expect(card.querySelector('.ct-move-badge')!.textContent).toMatch(/Wrong|Right/);
      expect(card.querySelector('.ao-diagram, .ao-groupcheck')).not.toBeNull();
    }
  });

  it('writes the 2.2 cards as complete if/then rules, not shorthand', () => {
    show('and-or-either-side');
    expect(screen.getByText('If the team submits a project, then the team is in the regional round.')).toBeVisible();
    expect(screen.getByText('If the team is in the regional round, then the team has a laptop.')).toBeVisible();
    expect(screen.queryByText(/project AND inspection/)).toBeNull();
    expect(screen.queryByText(/do nothing at all|settle the rule/)).toBeNull();
  });
});

describe('colour follows the idea, and 2.2 states its limits exactly', () => {
  it('keeps each idea its original colour in the contrapositive card while the side labels show the new roles', () => {
    const { container } = show('and-or-negate-group');
    const right = container.querySelector('article.ct-move[data-verdict=right]') as HTMLElement;
    expect(within(right).getByText('Float approved')).toHaveAttribute('data-tone', 'teal');
    expect(within(right).getByText('Brakes pass')).toHaveAttribute('data-tone', 'amber');
    expect(within(right).getByText('Lights work')).toHaveAttribute('data-tone', 'amber');
    // The pill that now sits on the left is the original necessary idea, so the left side label says sufficient and the pill stays teal.
    expect(within(right).getByText('Left side · sufficient')).toBeInTheDocument();
    expect(within(right).getByText('Right side · necessary')).toBeInTheDocument();
  });

  it('limits the forward-only instruction, names the exact limit of one member, and shows the full OR rule', () => {
    const { container } = show('and-or-either-side');
    expect(screen.getByText(/Going forward through the rule, wait until the whole left side is established/)).toBeVisible();
    expect(screen.queryByText(/Use the rule only when/)).toBeNull();
    expect(screen.getByText(/A project alone gives no additional conclusion about whether a team is in the regional round/)).toBeVisible();
    expect(screen.queryByText(/may give you nothing/)).toBeNull();
    const orCard = screen.getByText('Pick one branch of an OR on the right.').closest('article') as HTMLElement;
    expect(within(orCard).getByText('If the team is in the regional round, then the team has a laptop or the team has a tablet.')).toBeVisible();
    expect(within(orCard).getByText('If the team is in the regional round, then the team has a laptop.')).toBeVisible();
    expect(container.querySelectorAll('article.ct-move')).toHaveLength(3);
  });
});

describe('concise Pop Quiz feedback', () => {
  const pick = (text: string) => fireEvent.click(within(screen.getByRole('region', { name: 'Pop Quiz' })).getByRole('button', { name: new RegExp(`^${escaped(text)}`) }));

  it('answers in one natural sentence and drops the long reasoning from the quiz', () => {
    show('and-or-negate-group');
    const item = andOrQuizzes['and-or-negate-group'][0];
    fireEvent.click(within(screen.getByRole('region', { name: 'Pop Quiz' })).getByRole('button', { name: new RegExp(`^${escaped(choiceStep(item)!.options.find(option => option.correct)!.text)}`) }));
    expect(screen.getByText(answerLine(item))).toBeVisible();
    expect(screen.queryByText(item.why)).toBeNull();
  });

  it('reads a conditional answer back as if/then, but leaves a status answer as a plain sentence', () => {
    const contra = andOrQuizzes['and-or-negate-group'][2];
    expect(answerLine(contra)).toMatch(/^If .+, then .+\.$/);
    const status = andOrQuizzes['and-or-both-or-either'][0];
    expect(answerLine(status)).toMatch(/^The facts do not establish the whole group yet: /);
    expect(answerLine(status)).not.toMatch(/^If /);
    show('and-or-both-or-either');
    pick(choiceStep(status)!.options.find(option => option.correct)!.text);
    expect(screen.getByText(answerLine(status))).toBeVisible();
  });

  it('keeps Not that one and a specific reason for a wrong choice', () => {
    show('and-or-both-or-either');
    const wrong = choiceStep(andOrQuizzes['and-or-both-or-either'][0])!.options.find(option => !option.correct)!;
    pick(wrong.text);
    expect(screen.getByText('Not that one.')).toBeVisible();
    expect(screen.getByText(wrong.hint)).toBeVisible();
  });
});
