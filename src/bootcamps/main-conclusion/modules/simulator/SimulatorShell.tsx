/**
 * Module 4: Simulator shell pages.
 * Question bank reads simulator.generated.json (stimuli now populated from MCFIRST extract).
 * Distractors author at Phase D.
 */

import { Link } from 'react-router-dom';
import sim from '@/bootcamps/main-conclusion/data/simulator.generated.json';
import traps from '@/bootcamps/main-conclusion/data/traps.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';

interface SimQ {
  id: string;
  number: number;
  title: string;
  structure_family: 'First-sentence' | 'Rebuttal';
  stimulus?: string;
  main_conclusion?: string;
  why?: string;
  structure_map?: string;
  follow_up_answer?: string;
  source_anchor: { primary: string; secondary: string; tertiary: string; spec_ref: string };
  ocr_status: 'captured' | 'pending';
}

export function SimulatorOverview() {
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto space-y-6">
      <header>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Module 4</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Question Simulator</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-3">
          The canonical 20. Two structure families: First-sentence (9 Qs) and Rebuttal (11 Qs).
          Wrong answers tagged with one of the seven trap traits.
        </p>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2">
        <li>
          <Link to="/bootcamp/intro-to-lr/simulator/bank" className="block">
            <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors">
              <h2 className="font-mc-serif text-h3 font-semibold">Question bank →</h2>
              <p className="font-mc-serif text-body-prose text-ink-soft mt-1">All 20 questions in canonical order.</p>
            </Card>
          </Link>
        </li>
        <li>
          <Link to="/bootcamp/intro-to-lr/simulator/trap-master" className="block">
            <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors">
              <h2 className="font-mc-serif text-h3 font-semibold">Trap Master →</h2>
              <p className="font-mc-serif text-body-prose text-ink-soft mt-1">Seven trap traits with deep-dive pages.</p>
            </Card>
          </Link>
        </li>
        <li>
          <Link to="/bootcamp/intro-to-lr/simulator/hard-mode" className="block">
            <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors">
              <h2 className="font-mc-serif text-h3 font-semibold">Hard mode →</h2>
              <p className="font-mc-serif text-body-prose text-ink-soft mt-1">Five hardest questions per your performance.</p>
            </Card>
          </Link>
        </li>
      </ul>
    </article>
  );
}

export function QuestionBank() {
  const items = sim as SimQ[];
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">/simulator/bank</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Question bank · 20</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-2">
          Stimuli + main conclusions populated. Distractors author at Phase D.
        </p>
      </header>
      <ul className="space-y-3">
        {items.map((q) => (
          <li key={q.id}>
            <Card variant="surface" data-question-id={q.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mc-mono text-mono text-ink-faint">{q.id}</div>
                  <h3 className="font-mc-serif text-h3 font-semibold mt-1">
                    Q{q.number} · {q.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone={q.structure_family === 'Rebuttal' ? 'opposing' : 'conclusion'}>{q.structure_family}</Chip>
                  <Badge tone={q.ocr_status === 'captured' ? 'success' : 'warn'}>{q.ocr_status}</Badge>
                </div>
              </div>
              {q.stimulus ? (
                <p className="font-mc-serif text-body-prose text-ink mt-3 leading-relaxed">{q.stimulus}</p>
              ) : null}
              {q.main_conclusion ? (
                <p className="font-mc-serif text-body-prose mt-3">
                  <span className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Main conclusion · </span>
                  <span className="text-ink">{q.main_conclusion}</span>
                </p>
              ) : null}
              {q.structure_map ? (
                <p className="font-mc-mono text-mono text-ink-faint mt-2">map: {q.structure_map}</p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </article>
  );
}

interface Trait {
  id: string;
  name: string;
  what: string;
}

export function TrapMaster() {
  const items = traps as Trait[];
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">/simulator/trap-master</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Trap Master · 7 traits</h1>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((t) => (
          <li key={t.id}>
            <Link to={`/simulator/trap-master/${t.id}`} className="block">
              <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors">
                <div className="font-mc-mono text-mono text-ink-faint">{t.id}</div>
                <h3 className="font-mc-serif text-h3 font-semibold mt-1">{t.name}</h3>
                <p className="font-mc-serif text-body-prose text-ink-soft mt-2">{t.what}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function HardMode() {
  return (
    <EmptyState
      title="Hard mode"
      body="Five hardest questions surface here once you've attempted the bank. Wires in at Phase D."
      surfaceId="simulator/hard-mode"
    />
  );
}
