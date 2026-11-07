import { useMemo, useState } from 'react';
import { HomeProgressCardView } from '@/components/classroom/home/HomeProgressCard';
import { StrengthsWeaknessesView } from '@/components/analytics/StrengthsWeaknessesPage';
import '@/components/classroom/home/home.css';
import { classifyTypes } from '@/lib/strengthsWeaknesses';
import type { StrengthsResult } from '@/hooks/useStrengthsWeaknesses';

/**
 * Dev-only (the route is gated on import.meta.env.DEV). Fixture answers stand in for a
 * student so the Home card and the Strengths and weaknesses page can be looked at.
 */
const row = (topic: string, correct: number, denominator: number) => ({
  topic, correct, denominator, percent: null, evidenceAttemptIds: [] as string[],
});

const SCENARIOS: Record<string, ReturnType<typeof row>[] | 'withheld'> = {
  'Beginner (first drills)': [row('Main Conclusion', 4, 6), row('Role', 1, 2)],
  'Mixed': [
    row('Main Conclusion', 9, 10), row('Flaw', 2, 10), row('Necessary Assumption', 5, 9),
    row('Weaken', 3, 8), row('Strengthen', 7, 8), row('Paradox', 1, 2),
  ],
  'Empty': [],
  'Source missing': 'withheld',
};

function resultFor(scenario: string): StrengthsResult {
  const data = SCENARIOS[scenario];
  const rows = data === 'withheld' ? [row('Flaw', 2, 10)] : data;
  const denominator = rows.reduce((n, r) => n + r.denominator, 0);
  const correct = rows.reduce((n, r) => n + r.correct, 0);
  return {
    status: 'ready',
    summary: classifyTypes(rows, data === 'withheld'),
    overall: { correct, denominator, percent: denominator >= 3 && data !== 'withheld' ? Math.round((100 * correct) / denominator) : null },
    asOf: new Date().toISOString(),
    refresh: () => undefined,
  };
}

export default function StudentInsightsPreview() {
  const [scenario, setScenario] = useState('Mixed');
  const [dark, setDark] = useState(false);
  const result = useMemo(() => resultFor(scenario), [scenario]);
  const [last, setLast] = useState('');
  return (
    <>
      <div className={dark ? 'dark' : ''} style={{ padding: 24, background: dark ? '#161b17' : '#f0ede5', minHeight: '100vh' }}>
        <p style={{ marginBottom: 12 }}>
          {Object.keys(SCENARIOS).map((name) => (
            <button key={name} type="button" onClick={() => setScenario(name)} aria-pressed={scenario === name}
              style={{ marginRight: 8, padding: '6px 10px', border: '1px solid #888', fontWeight: scenario === name ? 700 : 400 }}>
              {name}
            </button>
          ))}
          <button type="button" onClick={() => setDark(!dark)} style={{ padding: '6px 10px', border: '1px solid #888' }}>
            {dark ? 'Light' : 'Dark'}
          </button>
          <span data-testid="last-open" style={{ marginLeft: 12 }}>{last}</span>
        </p>
        <div style={{ display: 'grid', gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
          <div className="classroom-root">
            <div className="classroom-home" style={{ padding: 0 }}>
              <div className="classroom-home-rail">
                <HomeProgressCardView result={result} onOpen={setLast} />
              </div>
            </div>
          </div>
          <StrengthsWeaknessesView result={result} />
        </div>
      </div>
    </>
  );
}
