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
  it('describes the lesson hub with an argument structure hero and no guided subtitle copy', () => {
    renderGuidedIntro();

    expect(screen.getByRole('heading', { level: 1, name: 'Argument Structure.' })).toBeInTheDocument();
    expect(screen.queryByText('Intro to LR.')).not.toBeInTheDocument();
    expect(screen.queryByText('A guided, article-based journey into LSAT Logical Reasoning.')).not.toBeInTheDocument();
    expect(screen.queryByText('A guided path through premises, conclusions, structure, and main-conclusion practice.')).not.toBeInTheDocument();
  });

  it('renders the two main conclusion practice cards after the structures note', () => {
    renderGuidedIntro();

    const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

    const structuresIndex = titles.indexOf('First-Sentence vs Rebuttal Structures');
    const labIndex = titles.indexOf('First-Sentence vs Rebuttal Lab');
    const firstSentenceIndex = titles.indexOf('First-Sentence Main Conclusion');
    const rebuttalIndex = titles.indexOf('Rebuttal Main Conclusion');

    // Order: structures note -> lab -> first-sentence drill -> rebuttal drill.
    // The lab now sits between the structures note and the two practice cards,
    // so assert relative ordering rather than strict +1 adjacency.
    expect(structuresIndex).toBeGreaterThanOrEqual(0);
    expect(labIndex).toBe(structuresIndex + 1);
    expect(firstSentenceIndex).toBeGreaterThan(labIndex);
    expect(rebuttalIndex).toBe(firstSentenceIndex + 1);
    expect(titles).not.toContain('First Sentence vs Rebuttal');
  });

  it('launches each practice card through the existing guided-drill route with bootcamp override state', () => {
    renderGuidedIntro();

    const firstSentenceCard = screen.getByRole('heading', { level: 2, name: 'First-Sentence Main Conclusion' }).closest('section');
    expect(firstSentenceCard).not.toBeNull();
    fireEvent.click(within(firstSentenceCard as HTMLElement).getByRole('link', { name: /view instructions/i }));

    expect(screen.getByTestId('guided-drill-path')).toHaveTextContent(
      '/guided-drills/first-sentence-conclusions?returnTo=%2Fbootcamp%2Fintro-to-lr',
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
      '/guided-drills/rebuttal-conclusions?returnTo=%2Fbootcamp%2Fintro-to-lr',
    );
    expect(screen.getByTestId('guided-drill-state')).toHaveTextContent('rebuttal-conclusions');
    expect(screen.getByTestId('guided-drill-state')).toHaveTextContent('Rebuttal Main Conclusion');
  });
});
