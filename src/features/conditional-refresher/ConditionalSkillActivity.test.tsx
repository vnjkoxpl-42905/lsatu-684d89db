import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConditionalSkillActivity, type ConditionalSkillActivityProps } from './ConditionalSkillActivity';
import { PRACTICE_CARDS, PRACTICE_DIAGRAMS, diagramMatches, englishRule, negateSideText } from './practiceContent';
import { freshRun, rateCard, restoreRun } from './practiceState';

const defaults: ConditionalSkillActivityProps = { kind: 'translate-cards', groups: ['g1', 'g2', 'g3', 'g4'], stage: 'translate', review: 'all', storageScope: 'actor-a', embedded: true };
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
describe('conditional practice interactions', () => {
  it('asks identification directly and keeps contrasts in separate vs rows', () => {
    const view = render(<ConditionalSkillActivity {...defaults} itemId="f1" />);
    expect(screen.getByText('Answer the question before you reveal the explanation.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'I have the diagram' })).toBeNull();
    click('Show answer');
    expect(screen.getByText(/Group 1. The indicator introduces/)).toBeInTheDocument();
    view.rerender(<ConditionalSkillActivity {...defaults} itemId="f10" />);
    const comparison = screen.getByLabelText('Compare these statements');
    expect(within(comparison).getByText('Unless you pay, you leave')).toBeInTheDocument();
    expect(within(comparison).getByText('If you pay, you leave')).toBeInTheDocument();
    expect(within(comparison).getByText('vs')).toBeInTheDocument();
    expect(comparison.textContent).not.toContain('\u2014');
    click('Show answer');
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });
  it('saves staged recall, reloads at the same step, and isolates another actor', () => {
    const view = render(<ConditionalSkillActivity {...defaults} itemId="f5" stage="contrapositive" />);
    click('I have the diagram');
    click('I said it in English');
    expect(screen.getByText(/Now reverse and negate/)).toBeInTheDocument();
    view.unmount();
    const second = render(<ConditionalSkillActivity {...defaults} itemId="f5" stage="contrapositive" />);
    expect(screen.getByRole('button', { name: 'Show answer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'I have the diagram' })).toBeNull();
    second.rerender(<ConditionalSkillActivity {...defaults} itemId="f5" stage="contrapositive" storageScope="actor-b" />);
    expect(screen.getByRole('button', { name: 'I have the diagram' })).toBeInTheDocument();
    second.rerender(<ConditionalSkillActivity {...defaults} itemId="f5" stage="translate" />);
    expect(screen.getByRole('button', { name: 'I have the diagram' })).toBeInTheDocument();
  });
  it('keeps a wrong arrangement, hints first and reveals only on request', () => {
    render(<ConditionalSkillActivity {...defaults} kind="diagram" itemId="d1" />);
    click('Add qualifies'); click('Build THEN condition'); click('Add trains'); click('Check answer');
    expect(screen.getByText(/Keep your arrangement and check the indicator/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build IF condition' })).toHaveTextContent('qualifies');
    expect(screen.queryByRole('img')).toBeNull();
    click('Show answer');
    expect(screen.getByRole('img')).toHaveAccessibleName('If trains, then qualifies');
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    click('Next');
    expect(screen.getByText(/0 correct on the first attempt out of 1 attempted/)).toBeInTheDocument();
    expect(screen.getByText(/1 resolved, including revealed answers/)).toBeInTheDocument();
  });
  it('hints before revealing a sort answer and keeps retry available', () => {
    render(<ConditionalSkillActivity {...defaults} kind="sort" groups={['g1', 'g2']} itemId="g1:if" />);
    click('Group 2 · Necessary');
    expect(screen.getByText(/Think about what the word does/)).toBeInTheDocument();
    expect(screen.queryByText(/The indicator introduces the sufficient idea/)).toBeNull();
    click('Group 1 · Sufficient');
    expect(screen.getByText(/The indicator introduces the sufficient idea/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  });
  it('discards a stored diagram containing a token outside its actual palette', () => {
    const view = render(<ConditionalSkillActivity {...defaults} kind="diagram" itemId="d1" />);
    click('Add trains');
    view.unmount();
    const key = 'lsatu.conditional-skill.v2:actor-a:diagram:g1,g2,g3,g4:translate:all:d1';
    const saved = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...saved, left: ['a foreign token'] }));
    render(<ConditionalSkillActivity {...defaults} kind="diagram" itemId="d1" />);
    expect(screen.getByText(/A fresh round has started/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build IF condition' })).toHaveTextContent('IF');
    expect(screen.getByRole('button', { name: 'Build IF condition' })).not.toHaveTextContent('foreign');
  });
  it('accepts reordered compounds and makes both De Morgan connectors available', () => {
    render(<ConditionalSkillActivity {...defaults} kind="diagram" itemId="d4" stage="contrapositive" />);
    expect(screen.getByRole('button', { name: 'Add or' })).toBeInTheDocument();
    click('Add rests'); click('Add +'); click('Add studies'); click('Build THEN condition'); click('Add passes'); click('Check answer');
    expect(screen.getByText('That follows the rule.')).toBeInTheDocument();
  });
  it('makes one bounded retry and allows an empty needs-work review', () => {
    const view = render(<ConditionalSkillActivity {...defaults} itemId="f1" />);
    click('Show answer'); click('Again');
    expect(screen.getByText(/Card 2 of 2/)).toBeInTheDocument();
    click('Show answer'); click('Again');
    expect(screen.getByRole('heading', { name: 'Round finished' })).toBeInTheDocument();
    view.rerender(<ConditionalSkillActivity {...defaults} groups={['g4']} review="needs" />);
    expect(screen.getByRole('heading', { name: 'No cards need practice yet' })).toBeInTheDocument();
    click('Practice all cards');
    expect(screen.queryByRole('heading', { name: 'No cards need practice yet' })).toBeNull();
  });
  it('continues in memory after storage fails with honest saved-state text', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Unavailable'); });
    render(<ConditionalSkillActivity {...defaults} itemId="f1" />);
    expect(screen.getByText(/This browser could not save your work/)).toBeInTheDocument();
    click('Show answer'); click('Got it');
    expect(screen.getByRole('heading', { name: 'Round finished' })).toBeInTheDocument();
  });
  it('shares card ratings across topic and stage filters without overwriting another topic or newer ledger marks', () => {
    const ledgerKey = 'lsatu.conditional-skill.ratings.v3:actor-a:translate-cards';
    let view = render(<ConditionalSkillActivity {...defaults} groups={['g3']} itemId="f3" />);
    expect(localStorage.getItem(ledgerKey)).toBeNull();
    click('Show answer'); click('Needs work');
    view.unmount();
    view = render(<ConditionalSkillActivity {...defaults} groups={['g4']} itemId="f4" />);
    click('Show answer'); click('Needs work');
    expect(JSON.parse(localStorage.getItem(ledgerKey)!)).toMatchObject({ f3: 'needs', f4: 'needs' });
    view.unmount();
    view = render(<ConditionalSkillActivity {...defaults} review="needs" stage="contrapositive" />);
    expect(screen.getByText('Which group does “unless” belong to?')).toBeInTheDocument();
    expect(screen.getByText(/Card 1 of 2/)).toBeInTheDocument();
    click('Show answer'); click('Got it');
    expect(JSON.parse(localStorage.getItem(ledgerKey)!)).toMatchObject({ f3: 'got', f4: 'needs' });
    view.unmount();
    // This earlier topic round saved f3=needs. Merely resuming it must not
    // replace the newer f3=got mark in the authoritative actor ledger.
    view = render(<ConditionalSkillActivity {...defaults} groups={['g3']} itemId="f3" />);
    expect(JSON.parse(localStorage.getItem(ledgerKey)!)).toMatchObject({ f3: 'got', f4: 'needs' });
    view.unmount();
    view = render(<ConditionalSkillActivity {...defaults} review="needs" stage="contrapositive" />);
    expect(screen.getByText('Which group does “not both” belong to?')).toBeInTheDocument();
    expect(screen.getByText(/Card 2 of 2/)).toBeInTheDocument();
    click('Restart round');
    expect(screen.getByText(/Card 1 of 1/)).toBeInTheDocument();
    view.rerender(<ConditionalSkillActivity {...defaults} review="needs" stage="contrapositive" storageScope="actor-b" />);
    expect(screen.getByRole('heading', { name: 'No cards need practice yet' })).toBeInTheDocument();
  });
  it('reads known same-actor former filter ratings without importing another actor', () => {
    localStorage.setItem('lsatu.conditional-skill.ratings.v2:actor-a:translate-cards:g3:translate', JSON.stringify({ f3: 'needs' }));
    localStorage.setItem('lsatu.conditional-skill.ratings.v2:actor-b:translate-cards:g4:translate', JSON.stringify({ f4: 'needs' }));
    render(<ConditionalSkillActivity {...defaults} review="needs" stage="contrapositive" />);
    expect(screen.getByText('Which group does “unless” belong to?')).toBeInTheDocument();
    expect(screen.getByText(/Card 1 of 1/)).toBeInTheDocument();
  });
  it('keeps translation hints within the assigned task and limits compound hints to taught practice', () => {
    const view = render(<ConditionalSkillActivity {...defaults} kind="diagram" itemId="d1" allowCompound={false} />);
    click('Add qualifies'); click('Build THEN condition'); click('Add trains'); click('Check answer');
    expect(screen.getByText(/Check which complete condition guarantees the other and keep existing negatives/)).toBeInTheDocument();
    expect(screen.queryByText(/reverse the arrow/)).toBeNull();
    expect(screen.queryByText(/Switch AND with OR/)).toBeNull();
    view.rerender(<ConditionalSkillActivity {...defaults} kind="diagram" itemId="d1" stage="contrapositive" allowCompound={false} />);
    click('Add trains'); click('Build THEN condition'); click('Add not qualifies'); click('Check answer');
    expect(screen.getByText(/reverse the arrow, negate both conditions/)).toBeInTheDocument();
    expect(screen.queryByText(/Switch AND with OR/)).toBeNull();
  });
});
describe('authored conditional practice integrity', () => {
  it('keeps 12 cards and 21 diagrams with explicit positive and negative meanings', () => {
    expect(PRACTICE_CARDS).toHaveLength(12);
    expect(PRACTICE_DIAGRAMS).toHaveLength(21);
    for (const card of PRACTICE_CARDS) {
      expect(card.front).not.toContain('\u2014');
      expect(card.rows.every(row => row.english.startsWith('If ') && row.contraEnglish.startsWith('If '))).toBe(true);
    }
    for (const item of PRACTICE_DIAGRAMS) {
      expect(item.names.every(name => item.meanings?.[name]?.yes && item.meanings?.[name]?.no)).toBe(true);
      expect(diagramMatches(item, item.left, item.right, false)).toBe(true);
      const contraLeft = negateSideText(item.right), contraRight = negateSideText(item.left);
      expect(diagramMatches(item, contraLeft, contraRight, true)).toBe(true);
      expect(englishRule(item, contraLeft, contraRight)).not.toMatch(/undefined|\//);
    }
    expect(PRACTICE_DIAGRAMS.find(item => item.id === 'd9')?.group).toBe('g1');
  });
  it('rejects malformed state and bounds repeated cards', () => {
    const initial = freshRun(['a', 'b'], 'revision-a');
    const retry = rateCard(initial, 'again');
    expect(retry.queue).toEqual(['a', 'b', 'a']);
    expect(restoreRun(retry, ['a', 'b'], 'revision-a')).toEqual(retry);
    expect(restoreRun(retry, ['a', 'b'], 'revision-b')).toBeNull();
    expect(restoreRun({ ...retry, queue: ['a', 'a', 'a'] }, ['a', 'b'], 'revision-a')).toBeNull();
    expect(restoreRun({ ...retry, index: 100 }, ['a', 'b'], 'revision-a')).toBeNull();
  });
});
