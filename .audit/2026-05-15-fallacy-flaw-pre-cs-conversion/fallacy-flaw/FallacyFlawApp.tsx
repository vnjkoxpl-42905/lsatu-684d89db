/**
 * Flaw & Famous Flaws bootcamp — self-contained sub-app.
 *
 * Tab-based navigation: Overview | Day 1–6.
 * No router — pure useState tabs, following the PrincipleFlawApp pattern.
 * All localStorage keys namespaced under `ff:`.
 */

import React, { useState, useCallback, lazy, Suspense } from 'react';
import type { DayId } from './lib/store';
import { ModuleStoreContext, mainModuleStore, previewModuleStore } from './lib/store';
import './fallacy-flaw.css';

const BootcampLanding = lazy(() =>
  import('./views/BootcampLanding').then((m) => ({ default: m.BootcampLanding })),
);
const Day1View = lazy(() =>
  import('./views/Day1View').then((m) => ({ default: m.Day1View })),
);
const Day2View = lazy(() =>
  import('./views/Day2View').then((m) => ({ default: m.Day2View })),
);
const Day3View = lazy(() =>
  import('./views/Day3View').then((m) => ({ default: m.Day3View })),
);
const Day4View = lazy(() =>
  import('./views/Day4View').then((m) => ({ default: m.Day4View })),
);
const Day5View = lazy(() =>
  import('./views/Day5View').then((m) => ({ default: m.Day5View })),
);
const Day6View = lazy(() =>
  import('./views/Day6View').then((m) => ({ default: m.Day6View })),
);

type Tab = 'overview' | 1 | 2 | 3 | 4 | 5 | 6;

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 1, label: 'Day 1' },
  { id: 2, label: 'Day 2' },
  { id: 3, label: 'Day 3' },
  { id: 4, label: 'Day 4' },
  { id: 5, label: 'Day 5' },
  { id: 6, label: 'Day 6' },
];

function ViewFallback() {
  return (
    <div className="py-24 flex justify-center" role="status" aria-live="polite">
      <span className="protocol text-ink-mute">Loading...</span>
    </div>
  );
}

interface Props {
  userName: string;
  previewMode?: boolean;
}

export default function FallacyFlawApp({ userName, previewMode = false }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const store = previewMode ? previewModuleStore : mainModuleStore;

  const selectDay = useCallback((day: DayId) => {
    setActiveTab(day);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goOverview = useCallback(() => {
    setActiveTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTabClick = useCallback((tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <ModuleStoreContext.Provider value={store}>
      <div className="ff-bootcamp bg-paper text-ink min-h-screen">
        {/* Masthead */}
        <header className="border-b border-rule">
          <div className="mx-auto grid max-w-6xl grid-cols-3 items-baseline gap-4 px-6 py-5">
            <div className="protocol text-ink-mute">Vol. I · No. 01</div>
            <button
              type="button"
              onClick={goOverview}
              className="text-center display-title text-2xl md:text-3xl text-ink hover:text-verdigris-deep transition-colors"
            >
              Flaw &amp; Famous Flaws
            </button>
            <div className="protocol text-right text-ink-mute">
              {previewMode ? 'Student View' : userName}
            </div>
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="border-b border-rule-soft bg-paper-bright/40 backdrop-blur-sm overflow-x-auto">
          <ol className="mx-auto flex max-w-6xl items-center gap-1 px-6 py-2 protocol text-ink-mute">
            {TABS.map((t, i) => {
              const active = activeTab === t.id;
              return (
                <li key={String(t.id)} className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTabClick(t.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-sm px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? 'bg-verdigris-tint text-verdigris-deep'
                        : 'hover:text-ink hover:bg-paper-bright'
                    }`}
                  >
                    {t.label}
                  </button>
                  {i < TABS.length - 1 && (
                    <span aria-hidden className="text-rule">/</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Content */}
        <main>
          <Suspense fallback={<ViewFallback />}>
            {activeTab === 'overview' && <BootcampLanding onSelectDay={selectDay} />}
            {activeTab === 1 && <Day1View />}
            {activeTab === 2 && <Day2View />}
            {activeTab === 3 && <Day3View />}
            {activeTab === 4 && <Day4View />}
            {activeTab === 5 && <Day5View />}
            {activeTab === 6 && <Day6View />}
          </Suspense>
        </main>
      </div>
    </ModuleStoreContext.Provider>
  );
}
