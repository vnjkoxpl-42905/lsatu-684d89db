import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RcRedirect from './RcRedirect';

/**
 * /rc is a compatibility adapter now. Every one of these query forms is
 * documented in `src/features/rc/CONTEXT.md` or was produced by a surface that
 * has already shipped, so each is a link that may be sitting in a student's
 * inbox right now.
 */
function Landing() {
  const { pathname, search, hash } = useLocation();
  return <div data-testid="landed">{pathname + search + hash}</div>;
}

function landOn(entry: string) {
  render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/rc" element={<RcRedirect />} />
        <Route path="/classroom/drill" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  );
  return new URL(screen.getByTestId('landed').textContent ?? '', 'https://lsatprep.study');
}

describe('RcRedirect', () => {
  it('sends a bare /rc to the hub RC section, with no stage', () => {
    const url = landOn('/rc');
    expect(url.pathname).toBe('/classroom/drill');
    expect(url.searchParams.get('section')).toBe('rc');
    expect(url.searchParams.get('stage')).toBeNull();
  });

  it('keeps an assignment link intact and opens the builder to read it', () => {
    const url = landOn('/rc?passages=1188,1201&reveal=end_of_set&timing=standard');
    expect(url.searchParams.get('section')).toBe('rc');
    expect(url.searchParams.get('stage')).toBe('type-drill');
    expect(url.searchParams.get('passages')).toBe('1188,1201');
    expect(url.searchParams.get('reveal')).toBe('end_of_set');
    expect(url.searchParams.get('timing')).toBe('standard');
  });

  it('keeps the quick-build autostart form, which is the one that breaks loudest', () => {
    const url = landOn('/rc?count=3&timing=untimed&reveal=per_passage&start=1');
    expect(url.searchParams.get('stage')).toBe('type-drill');
    expect(url.searchParams.get('count')).toBe('3');
    expect(url.searchParams.get('start')).toBe('1');
  });

  it("keeps a Full Section's own per-passage budget", () => {
    const url = landOn('/rc?passages=1188&secondsPerPassage=1050');
    expect(url.searchParams.get('secondsPerPassage')).toBe('1050');
  });

  it('never lets an inbound section param survive to fight the one it sets', () => {
    const url = landOn('/rc?section=lr&count=2');
    expect(url.searchParams.getAll('section')).toEqual(['rc']);
  });

  it('carries the hash through', () => {
    const url = landOn('/rc?passages=1188#q3');
    expect(url.hash).toBe('#q3');
  });
});
