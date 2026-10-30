import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import DossierNotes from './DossierNotes';

const state = vi.hoisted(() => ({ studentId: 'student-a' }));
vi.mock('./StudentDossier', () => ({ useDossier: () => ({ studentId: state.studentId, studentName: state.studentId }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'teacher' } }) }));
vi.mock('@/components/hub/StudentNotes', () => ({ default: () => null }));
vi.mock('@/components/teacher/students/SessionBundleList', () => ({ default: () => null }));
vi.mock('@/components/teacher/PostedRecapsList', () => ({ default: () => null }));
vi.mock('@/components/teacher/RecapComposer', () => ({ default: ({ studentId }: { studentId: string }) => <div role="dialog">Recap for {studentId}</div> }));

afterEach(() => {
  cleanup();
  state.studentId = 'student-a';
});

it('closes a recap draft when the selected student changes and does not reopen it on return', () => {
  const view = render(<DossierNotes />);
  fireEvent.click(screen.getByRole('button', { name: 'Post a session recap' }));
  expect(screen.getByRole('dialog').textContent).toBe('Recap for student-a');

  state.studentId = 'student-b';
  view.rerender(<DossierNotes />);
  expect(screen.queryByRole('dialog')).toBeNull();

  state.studentId = 'student-a';
  view.rerender(<DossierNotes />);
  expect(screen.queryByRole('dialog')).toBeNull();
});
