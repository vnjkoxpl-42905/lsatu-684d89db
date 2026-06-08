import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { NewGuidedIntro } from './NewGuidedIntro';

function GuidedDrillProbe() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="guided-drill-path">{`${location.pathname}${location.search}`}</div>
      <div data-testid="guided-drill-state">{JSON.stringify(location.state)}</div>
    </div>
  );
}

function renderGuidedIntro() {
  return render(
    <MemoryRouter initialEntries={['/bootcamp/intro-to-lr/lessons']}>
      <Routes>
        <Route path="/bootcamp/intro-to-lr/lessons" element={<NewGuidedIntro />} />
        <Route path="/guided-drills/:slug" element={<GuidedDrillProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewGuidedIntro', () => {
  it('renders the two main conclusion practice cards after the structures note', () => {
    renderGuidedIntro();

    const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

    const structuresIndex = titles.indexOf('First-Sentence vs Rebuttal Structures');
    const firstSentenceIndex = titles.indexOf('First-Sentence Main Conclusion');
    const rebuttalIndex = titles.indexOf('Rebuttal Main Conclusion');

    expect(structuresIndex).toBeGreaterThanOrEqual(0);
    expect(firstSentenceIndex).toBe(structuresIndex + 1);
    expect(rebuttalIndex).toBe(firstSentenceIndex + 1);
    expect(titles).not.toContain('First Sentence vs Rebuttal');
  });

  it('launches each practice card through the existing guided-drill route with bootcamp override state', () => {
    renderGuidedIntro();

    const firstSentenceCard = screen.getByRole('heading', { level: 2, name: 'First-Sentence Main Conclusion' }).closest('section');
    expect(firstSentenceCard).not.toBeNull();
    fireEvent.click(within(firstSentenceCard as HTMLElement).getByRole('link', { name: /view instructions/i }));

    expect(screen.getByTestId('guided-drill-path')).toHaveTextContent(
      '/guided-drills/first-sentence-conclusions?returnTo=%2Fbootcamp%2Fintro-to-lr%2Fpractice-drills',
    );
    expect(screen.getByTestId('guided-drill-state')).toHaveTextContent('first-sentence-conclusions');
    expect(screen.getByTestId('guided-drill-state')).toHaveTextContent('First-Sentence Main Conclusion');
  });

  it('links the rebuttal card to the existing rebuttal guided-drill route', () => {
    renderGuidedIntro();

    const rebuttalCard = screen.getByRole('heading', { level: 2, name: 'Rebuttal Main Conclusion' }).closest('section');
    expect(rebuttalCard).not.toBeNull();
    fireEvent.click(within(rebuttalCard as HTMLElement).getByRole('link', { name: /view instructions/i }));

    expect(screen.getByTestId('guided-drill-path')).toHaveTextContent(
      '/guided-drills/rebuttal-conclusions?returnTo=%2Fbootcamp%2Fintro-to-lr%2Fpractice-drills',
    );
    expect(screen.getByTestId('guided-drill-state')).toHaveTextContent('rebuttal-conclusions');
    expect(screen.getByTestId('guided-drill-state')).toHaveTextContent('Rebuttal Main Conclusion');
  });
});
