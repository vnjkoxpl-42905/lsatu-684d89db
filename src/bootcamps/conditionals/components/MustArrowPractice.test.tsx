import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MustArrowPractice } from './MustArrowPractice';

afterEach(cleanup);
function answer(option: string) {
  fireEvent.click(screen.getByRole('radio', { name: option }));
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
}

it('requires an answer before feedback and explains the placement mistake', () => {
  const { container } = render(<MustArrowPractice/>);
  const feedback = container.querySelector('.ma-question-practice-feedback');
  expect(feedback).toBeEmptyDOMElement();
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Next question/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'You are a student.' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
  expect(feedback).toBeEmptyDOMElement();
  fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
  expect(feedback).toHaveTextContent('It belongs on the right, because enrollment requires it.');
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  expect(screen.queryByRole('button', { name: 'Check answer' })).not.toBeInTheDocument();
});

it('keeps submitted choices on revisits and focuses navigation', () => {
  render(<MustArrowPractice/>);
  answer('You are enrolled in law school.');
  fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  expect(screen.getByRole('heading', { name: 'Question 2 of 4' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'Check answer' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(screen.getByRole('heading', { name: 'Question 1 of 4' })).toHaveFocus();
  expect(screen.getByRole('radio', { name: 'You are enrolled in law school.' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'You are enrolled in law school.' })).toBeDisabled();
  expect(screen.getByRole('heading', { name: 'Correct.' })).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
});

it('checks left, right, reading and clause order without claiming mastery', () => {
  render(<MustArrowPractice/>);
  const choices = [
    'You are enrolled in law school.',
    'You are a student.',
    'If this folder is marked complete, it must contain a signed form.',
    'You renew online → The library extends your loan',
  ];
  const prompts = [
    'Which complete condition belongs on the left side of the arrow?',
    'Which complete condition belongs on the right side of the arrow?',
    'How do you read this arrow?',
    'Which arrow keeps the meaning of this rule?',
  ];
  choices.forEach((choice, index) => {
    expect(screen.getByRole('group', { name: prompts[index] })).toBeVisible();
    answer(choice);
    expect(screen.getByRole('heading', { name: 'Correct.' })).toHaveFocus();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', String(index + 1));
    if (index < choices.length - 1) fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  });
  expect(screen.getByText(/You've answered all 4 questions/)).toBeVisible();
  expect(screen.getByText('4 answered · 0 remaining')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Next question/ })).not.toBeInTheDocument();
});

it('explains every distractor using the specific reasoning error', () => {
  const wrongResponses = [
    [
      ['You are a student.', 'Being a student is the necessary condition'],
      ['If.', 'it is not itself a condition'],
    ],
    [
      ['You are enrolled in law school.', 'Enrollment is the sufficient condition.'],
      ['Law school.', 'Law school names a place, not a complete condition.'],
    ],
    [
      ['If this folder contains a signed form, it must be marked complete.', 'That reads the arrow backward.'],
      ['This folder is marked complete and contains a signed form.', 'That treats both sides as facts.'],
    ],
    [
      ['The library extends your loan → You renew online', 'That follows the rule order but reverses the requirement.'],
      ['If → The library extends your loan', 'If is an indicator, not a complete condition.'],
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
    expect(container.querySelector('.ma-question-practice-feedback')).toHaveTextContent(explanation);
    expect(screen.getByRole('heading', { name: 'Not quite.' })).toHaveFocus();
    unmount();
  }));
});
