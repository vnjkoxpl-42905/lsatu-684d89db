import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MustArrowPractice } from './MustArrowPractice';

afterEach(cleanup);

function answer(option: string) {
  fireEvent.click(screen.getByRole('radio', { name: option }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
}

it('requires a response before feedback and explains an incorrect answer', () => {
  const { container } = render(<MustArrowPractice/>);
  const liveRegion = container.querySelector('[aria-live="polite"]');
  expect(liveRegion).toBeEmptyDOMElement();
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Next question/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'The folder is not marked complete.' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
  expect(liveRegion).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(liveRegion).toHaveTextContent('Not quite.');
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
  expect(liveRegion).toHaveTextContent('the rule leaves open whether it contains a signed form');
  expect(liveRegion).toHaveTextContent('The answer: The folder is marked complete.');
  expect(liveRegion).toHaveTextContent('The rule covers every folder with that label.');
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  expect(screen.queryByRole('button', { name: 'Check answer' })).not.toBeInTheDocument();
});

it('preserves the submitted answer on revisits and focuses navigation', () => {
  render(<MustArrowPractice/>);
  answer('The folder is marked complete.');
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  expect(screen.getByRole('heading', { name: 'Question 2 of 4' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(screen.getByRole('heading', { name: 'Question 1 of 4' })).toHaveFocus();
  expect(screen.getByRole('radio', { name: 'The folder is marked complete.' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'The folder is marked complete.' })).toBeDisabled();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
});

it('teaches all four concepts and completes without claiming mastery', () => {
  render(<MustArrowPractice/>);
  const choices = [
    'The folder is marked complete.',
    'This folder contains a signed form.',
    'No. It could be marked complete, but we do not know.',
    'No. It tells us what follows if a folder is marked complete.',
  ];
  choices.forEach((choice, index) => {
    answer(choice);
    expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', String(index + 1));
    if (index < choices.length - 1) fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  });
  expect(screen.getByText(/You've answered all 4 questions/)).toBeVisible();
  expect(screen.getByText(/We need a separate fact/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /Next question/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/Recall card|Think before you turn|Revisit this card|Explanation shown/)).not.toBeInTheDocument();
});

it('explains the specific mistake for each wrong choice', () => {
  const wrongResponses = [
    [
      ['The folder is not marked complete.', 'the rule leaves open whether it contains a signed form'],
      ['The folder has some unfinished work.', 'Unfinished work does not tell us whether'],
    ],
    [
      ['Every folder with a signed form is marked complete.', 'That reverses the rule.'],
      ['This folder contains no unsigned forms.', 'That adds a claim the rule does not make.'],
    ],
    [
      ['Yes. It must be marked complete.', 'That moves backward from the right side to the left.'],
      ['Yes. It cannot be marked complete.', 'A signed form does not rule out the complete label.'],
    ],
    [
      ['Yes. At least one folder must be marked complete.', 'That turns a rule into a fact.'],
      ['No. It tells us that no folders are marked complete.', 'That also turns the rule into a fact.'],
    ],
  ];
  wrongResponses.forEach((responses, questionIndex) => responses.forEach(([choice, explanation]) => {
    const { container, unmount } = render(<MustArrowPractice/>);
    for (let previous = 0; previous < questionIndex; previous++) {
      fireEvent.click(screen.getAllByRole('radio')[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
      fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
    }
    answer(choice);
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(explanation);
    expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
    unmount();
  }));
});
