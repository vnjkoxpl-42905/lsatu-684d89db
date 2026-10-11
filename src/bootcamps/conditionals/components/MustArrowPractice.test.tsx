import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MustArrowPractice } from './MustArrowPractice';

afterEach(cleanup);

it('counts unique explanations viewed, preserves revisits, and focuses the new question', () => {
  render(<MustArrowPractice/>);
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
  expect(screen.getByRole('button', { name: /Next question/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Show explanation' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
  fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  expect(screen.getByRole('heading', { name: 'Question 2 of 4' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Previous question' }));
  expect(screen.getByText(/Being a folder marked complete is enough/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Explanation shown' }));
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '1');
});

it('finishes after all four explanations without implying mastery', () => {
  render(<MustArrowPractice/>);
  for (let i = 0; i < 4; i++) {
    fireEvent.click(screen.getByRole('button', { name: 'Show explanation' }));
    if (i < 3) fireEvent.click(screen.getByRole('button', { name: /Next question/ }));
  }
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '4');
  expect(screen.getByRole('status')).toHaveTextContent("You've viewed all four explanations.");
  expect(screen.queryByRole('button', { name: /Next question/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/Recall card|Think before you turn|Revisit this card/)).not.toBeInTheDocument();
});
