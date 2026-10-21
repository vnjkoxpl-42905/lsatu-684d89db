import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RcSearch from './RcSearch';

const passage = (passageId: number, preptest: number, title: string) => ({
  passageId,
  section: 1,
  setNumber: 1,
  title,
  topic: 'Law',
  format: 'Standard (Non-Comparative)',
  frameworks: [] as string[],
  difficulty: 2,
  questionCount: 1,
  explainedCount: 1,
  questionIds: [passageId * 10],
  firstWords: 'Opening words',
  preptest,
});

const question = (passageId: number, preptest: number) => ({
  questionId: passageId * 10,
  passageId,
  preptest,
  section: 1,
  setNumber: 1,
  position: 3,
  questionType: 'Main Point',
  questionTypeFamily: 'Big Picture',
  difficulty: 1,
  features: [] as string[],
  prompt: 'Which one of the following best expresses the main point?',
});

vi.mock('../lib/rcBank', () => ({
  loadAllIndexPassages: () =>
    Promise.resolve([passage(1, 120, 'Open Passage'), passage(2, 150, 'Held Back Passage')]),
  loadRcQuestionIndex: () =>
    Promise.resolve({ questionCount: 2, questions: [question(1, 120), question(2, 150)] }),
}));

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

const renderSearch = () =>
  render(
    <MemoryRouter initialEntries={['/rc/search']}>
      <Routes>
        <Route path="/rc/search" element={<RcSearch />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('RcSearch', () => {
  it('searches question text without revealing it in result rows', async () => {
    renderSearch();
    await screen.findAllByRole('table');
    expect(screen.queryByText('Which one of the following best expresses the main point?')).toBeNull();
    expect(screen.getAllByText(/Question text stays hidden/).length).toBeGreaterThan(0);
  });
  it('opens the read-only preview with the question id, never a live drill', async () => {
    renderSearch();
    const table = (await screen.findAllByRole('table'))[0];
    fireEvent.click(await within(table).findByRole('button', { name: /Preview Open Passage/ }));
    const where = (await screen.findByTestId('where')).textContent ?? '';
    expect(where).toMatch(/^\/rc\/preview\?/);
    expect(where).toContain('passage=1');
    expect(where).toContain('q=10');
    expect(where).not.toContain('/rc/drill');
  });

  it('opens the preview on the clicked question from the question table', async () => {
    renderSearch();
    const tables = await screen.findAllByRole('table');
    fireEvent.click(await within(tables[1]).findByRole('button', { name: /Preview question 3 of PrepTest 120/ }));
    const where = (await screen.findByTestId('where')).textContent ?? '';
    expect(where).toContain('passage=1');
    expect(where).toContain('q=10');
  });

  it('holds back PrepTests above 148, says so, and includes them on request', async () => {
    renderSearch();
    await screen.findByText('Open Passage');
    expect(screen.queryByText('Held Back Passage')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/1 more in held-back PrepTests/);

    fireEvent.click(screen.getByRole('button', { name: 'Include them' }));
    await waitFor(() => expect(screen.getAllByText('Held Back Passage').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Held back').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Include held-back PrepTests/)).toBeChecked();
  });

  it('finds a held-back PrepTest by exact address without widening the range', async () => {
    renderSearch();
    await screen.findByText('Open Passage');
    fireEvent.change(screen.getByLabelText('Search passage titles and question stems'), {
      target: { value: 'PT150 S1' },
    });
    await waitFor(() => expect(screen.getAllByText('Held Back Passage').length).toBeGreaterThan(0));
    expect(screen.queryByText('Open Passage')).toBeNull();
  });
});
