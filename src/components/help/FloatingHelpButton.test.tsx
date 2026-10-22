import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { FloatingHelpButton } from './FloatingHelpButton';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'ordinary-student' } }),
}));
vi.mock('@/hooks/useUserPermissions', () => ({
  useUserPermissions: () => ({ is_admin: false, loading: false }),
}));

function open(path: string) {
  render(<MemoryRouter initialEntries={[path]}><FloatingHelpButton /></MemoryRouter>);
}

describe('official timed child overlays', () => {
  it.each([
    '/testing/test/run-1/lr/0',
    '/testing/test/run-1/rc/2?returnTo=%2Fpractice%2Fexams#question-3',
    '/testing/test/run-1/rc/2/',
  ])('keeps the ordinary student player free of floating Help: %s', (path) => {
    open(path);
    expect(screen.queryByRole('button', { name: 'Get help from Joshua' })).not.toBeInTheDocument();
  });

  it.each([
    '/testing/test/run-1',
    '/practice/exams/attempts',
    '/testing/test/run-1/lr/0/report',
  ])('retains Help outside the official child player: %s', (path) => {
    open(path);
    expect(screen.getByRole('button', { name: 'Get help from Joshua' })).toBeInTheDocument();
  });
});
