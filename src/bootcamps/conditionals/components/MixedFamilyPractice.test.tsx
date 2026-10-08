import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MixedFamilyPractice, MixedItemCheck, mixedFamilyItems } from './MixedFamilyPractice';

afterEach(cleanup);

it('requires an independent diagram and readback before exposing complete labels, then retains and retries the attempt', () => {
  const view = render(<MixedFamilyPractice/>);
  const item = view.container.querySelector<HTMLElement>('[data-mixed-item="1"]')!;
  const scope = within(item);
  const diagram = scope.getByLabelText('Your diagram for sentence 1') as HTMLTextAreaElement;
  const readback = scope.getByLabelText('Your English readback for sentence 1') as HTMLTextAreaElement;
  const compare = scope.getByRole('button', { name: 'Compare my translation for sentence 1' }) as HTMLButtonElement;
  expect(compare.disabled).toBe(true);
  expect(scope.queryByRole('button', { name: mixedFamilyItems[0].target })).toBeNull();
  expect(item.querySelector('.co-feedback')).toBeNull();
  fireEvent.change(diagram, { target: { value: 'Lightning forecast -> Move indoors' } });
  expect(compare.disabled).toBe(true);
  fireEvent.change(readback, { target: { value: 'If lightning is forecast, the match moves indoors.' } });
  expect(compare.disabled).toBe(false);
  compare.focus();
  fireEvent.click(compare);
  expect(scope.getByRole('heading', { name: mixedFamilyItems[0].targetPrompt })).toHaveFocus();
  expect(item.textContent).toContain('your written answer is not graded automatically');
  const check = scope.getByRole('button', { name: 'Check sentence 1' }) as HTMLButtonElement;
  expect(check.disabled).toBe(true);
  fireEvent.click(scope.getByRole('button', { name: mixedFamilyItems[0].target }));
  fireEvent.click(scope.getByRole('button', { name: mixedFamilyItems[0].right }));
  fireEvent.click(check);
  expect(item.querySelector('.co-correct')).toBeNull();
  expect(scope.getByRole('status').textContent).toContain('every indoor match proof');
  fireEvent.click(scope.getByRole('button', { name: mixedFamilyItems[0].left }));
  expect(scope.getByRole('status').textContent).toBe('');
  fireEvent.click(check);
  expect(item.querySelector('.co-correct')).toBeTruthy();
  expect(scope.getByRole('status').textContent).toContain(mixedFamilyItems[0].readback);
  expect(scope.getByRole('status').textContent).toContain(mixedFamilyItems[0].why);
  expect(scope.getByRole('status').textContent).not.toContain('preserve the rule');
  fireEvent.click(view.getByRole('button', { name: 'Next mixed sentence' }));
  fireEvent.click(view.getByRole('button', { name: 'Previous mixed sentence' }));
  expect(diagram.value).toBe('Lightning forecast -> Move indoors');
  expect(item.querySelector('.co-correct')).toBeTruthy();
  fireEvent.click(scope.getByRole('button', { name: 'Try sentence 1 again' }));
  expect(diagram.value).toBe('Lightning forecast -> Move indoors');
  expect(readback.value).toBe('If lightning is forecast, the match moves indoors.');
  expect(scope.queryByRole('button', { name: mixedFamilyItems[0].target })).toBeNull();
  expect(item.querySelector('.co-feedback')).toBeNull();
  expect(diagram.readOnly).toBe(false);
  expect(diagram).toBe(document.activeElement);
});

it('describes hidden family labels truthfully for the deterministic mixed order', () => {
  const view = render(<MixedFamilyPractice/>);
  expect(mixedFamilyItems.map(item => item.family)).toEqual(['sufficient', 'necessary', 'sufficient', 'necessary', 'sufficient', 'necessary']);
  expect(view.container.textContent).toContain('The family name stays hidden until you check your choices.');
  expect(view.container.textContent).not.toContain('nothing tells you which kind is coming');
});

it('asks an authored question about each rule and names the restriction retained when only the arrow needs revision', () => {
  for (const [index, item] of mixedFamilyItems.entries()) {
    const view = render(<MixedItemCheck item={item} index={index} embedded onChecked={() => undefined}/>);
    fireEvent.change(view.getByLabelText('Your diagram'), { target: { value: 'My attempted diagram' } });
    fireEvent.change(view.getByLabelText('Read it in English'), { target: { value: 'My attempted reading' } });
    fireEvent.click(view.getByRole('button', { name: 'Compare with the choices' }));
    expect(view.getByRole('heading', { name: item.targetPrompt })).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: item.target }));
    fireEvent.click(view.getByRole('button', { name: item.right }));
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    expect(view.getByRole('status')).toHaveTextContent(item.targetFeedback);
    expect(view.getByRole('status')).toHaveTextContent(item.reversed);
    expect(view.getByRole('status')).not.toHaveTextContent('complete target');
    view.unmount();
  }
});
