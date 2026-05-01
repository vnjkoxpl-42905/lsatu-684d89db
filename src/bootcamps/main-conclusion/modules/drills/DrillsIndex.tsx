/**
 * Module 3: Drills index.
 * 9 drills. 3.4 (Stage-Gate Rebuttal vs First-Sentence) gates the Simulator unlock per G2.DRL-3.4.
 */

import { Link } from 'react-router-dom';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';

interface DrillRow {
  id: string;
  number: string;
  title: string;
  route: string;
  blurb: string;
  gates_simulator?: boolean;
}

export const DRILLS: DrillRow[] = [
  { id: 'MC-DRL-3.1', number: '3.1', title: 'Indicator Word ID', route: '/drills/3.1', blurb: 'Spot premise, conclusion, pivot, concession, opposing, opinion words at speed.' },
  { id: 'MC-DRL-3.2', number: '3.2', title: 'X-Ray Drill', route: '/drills/3.2', blurb: 'Toggle role colors. Confirm or correct your read of the structure.' },
  { id: 'MC-DRL-3.3', number: '3.3', title: 'First-Sentence Reading', route: '/drills/3.3', blurb: 'When the first sentence is the conclusion, support follows. Drill the read.' },
  { id: 'MC-DRL-3.4', number: '3.4', title: 'Rebuttal vs First-Sentence Stage-Gate', route: '/drills/3.4', blurb: 'The unlock-gate for the Simulator. Four stages × five questions.', gates_simulator: true },
  { id: 'MC-DRL-3.5', number: '3.5', title: 'Chain Mapping', route: '/drills/3.5', blurb: 'Premise → intermediate conclusion → main conclusion. Map the chain.' },
  { id: 'MC-DRL-3.6', number: '3.6', title: 'Design the Conclusion', route: '/drills/3.6', blurb: 'Whimsical premise pair. Design a valid conclusion and an invalid one.' },
  { id: 'MC-DRL-3.7', number: '3.7', title: 'Pronoun Replacement', route: '/drills/3.7', blurb: 'Replace this/that/such/those before stating the conclusion to yourself.' },
  { id: 'MC-DRL-3.8', number: '3.8', title: 'R&R Drill (Read & Restate)', route: '/drills/3.8', blurb: 'Read piece, cover, rephrase. Skeptic’s Ear Check between stages.' },
  { id: 'MC-DRL-3.9', number: '3.9', title: 'Nested Claims', route: '/drills/3.9', blurb: 'Multi-conclusion stimuli. Find the main one.' },
];

export function DrillsIndex() {
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Module 3</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Drills</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-3">
          Nine drills. Drill 3.4 unlocks the Simulator.
        </p>
      </header>
      <ul className="grid gap-3">
        {DRILLS.map((d) => (
          <li key={d.id}>
            <Link to={d.route.startsWith('/bootcamp/intro-to-lr') ? d.route : `/bootcamp/intro-to-lr${d.route}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-3">
              <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors duration-150">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mc-mono text-mono text-ink-faint">{d.id}</div>
                    <h3 className="font-mc-serif text-h3 font-semibold mt-1">
                      {d.number} · {d.title}
                    </h3>
                    <p className="font-mc-serif text-body-prose text-ink-soft mt-2">{d.blurb}</p>
                  </div>
                  {d.gates_simulator ? <Badge tone="accent">unlocks Simulator</Badge> : null}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

import { useParams } from 'react-router-dom';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { Drill3_1 } from './Drill3_1';
import { Drill3_2 } from './Drill3_2';
import { Drill3_3 } from './Drill3_3';
import { Drill3_4 } from './Drill3_4';
import { Drill3_5 } from './Drill3_5';
import { Drill3_6 } from './Drill3_6';
import { Drill3_7 } from './Drill3_7';
import { Drill3_8 } from './Drill3_8';
import { Drill3_9 } from './Drill3_9';

export function DrillShell() {
  const { drillId } = useParams<{ drillId: string }>();
  switch (drillId) {
    case '3.1':
      return <Drill3_1 />;
    case '3.2':
      return <Drill3_2 />;
    case '3.3':
      return <Drill3_3 />;
    case '3.4':
      return <Drill3_4 />;
    case '3.5':
      return <Drill3_5 />;
    case '3.6':
      return <Drill3_6 />;
    case '3.7':
      return <Drill3_7 />;
    case '3.8':
      return <Drill3_8 />;
    case '3.9':
      return <Drill3_9 />;
    default:
      return (
        <EmptyState
          title="Drill not found"
          body="Drill IDs are 3.1 through 3.9."
          surfaceId={`drill/${drillId ?? '?'}`}
        />
      );
  }
}
