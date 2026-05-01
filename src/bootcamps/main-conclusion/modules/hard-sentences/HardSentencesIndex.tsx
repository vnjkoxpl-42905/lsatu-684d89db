/**
 * Module 5: Hard Sentences — index + section renderer with full bodies.
 * Phase E authored 2026-05-01.
 */

import { Link, useParams } from 'react-router-dom';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { ClusterDecomposer, type ClusterSentence } from '@/bootcamps/main-conclusion/components/cluster-decomposer/ClusterDecomposer';
import { HARD_SECTIONS, type Block, type HardSection } from '@/bootcamps/main-conclusion/content/hard-sentences.source';

const CAPSTONE: { id: string; number: string; title: string; route: string } = {
  id: 'MC-HS-5.8',
  number: '5.8',
  title: 'Capstone (5 calibration items)',
  route: '/bootcamp/structure/hard-sentences/capstone',
};

export function HardSentencesIndex() {
  const all: Array<HardSection | typeof CAPSTONE> = [...HARD_SECTIONS, CAPSTONE];
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Module 5</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Hard Sentences</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-3">
          The cluster-sentence decomposer. Specifier chains. The Alex/Jordan walkthrough.
        </p>
      </header>
      <ul className="grid gap-3">
        {all.map((s) => (
          <li key={s.id}>
            <Link to={s.route} className="block">
              <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mc-mono text-mono text-ink-faint">{s.id}</div>
                    <h3 className="font-mc-serif text-h3 font-semibold mt-1">
                      {s.number} · {s.title}
                    </h3>
                  </div>
                  {s.id === CAPSTONE.id ? <Badge tone="accent">capstone</Badge> : null}
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

function RenderBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case 'p':
      return <p className="font-mc-serif text-body-prose text-ink leading-relaxed">{block.text}</p>;
    case 'h2':
      return <h2 className="font-mc-serif text-h2 font-semibold mt-6">{block.text}</h2>;
    case 'callout':
      return (
        <Card variant="elev" className="border-l-4 border-l-[rgb(var(--accent)/0.50)]">
          <div className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">{block.label}</div>
          <p className="font-mc-serif text-body-prose text-ink mt-2">{block.body}</p>
        </Card>
      );
    case 'list':
      return block.ordered ? (
        <ol className="font-mc-serif text-body-prose text-ink list-decimal pl-5 space-y-1.5 marker:text-ink-faint">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <ul className="font-mc-serif text-body-prose text-ink list-disc pl-5 space-y-1.5 marker:text-ink-faint">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case 'example':
      return (
        <Card variant="surface" className="border-l-4 border-l-[rgb(var(--role-premise)/0.50)]">
          <div className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--role-premise))]">
            Example · {block.label}
          </div>
          <p className="font-mc-serif text-body-prose text-ink mt-2">{block.body}</p>
        </Card>
      );
    case 'cluster-demo': {
      const cs: ClusterSentence = {
        id: `inline-${block.sentence.slice(0, 16)}`,
        sentence: block.sentence,
        specifiers: block.specifiers,
        core: block.core,
      };
      return <ClusterDecomposer sentences={[cs]} />;
    }
    case 'visual-spec':
      // Special handling for the Cluster Decomposer mounted page; rendered via section route.
      return (
        <Card variant="elev">
          <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">
            Visual · {block.component}
          </div>
          <p className="font-mc-serif text-body-prose text-ink-soft mt-2">{block.caption}</p>
        </Card>
      );
  }
}

const DECOMPOSER_SAMPLES: ClusterSentence[] = [
  {
    id: 'CD-1',
    sentence:
      'The recommendation, made yesterday by the senior committee that has reviewed the program’s outcomes since 2018, that the funding be doubled, has met with resistance.',
    specifiers: [
      'made yesterday by the senior committee that has reviewed the program’s outcomes since 2018',
      'that the funding be doubled',
    ],
    core: 'The recommendation has met with resistance.',
  },
  {
    id: 'CD-2',
    sentence:
      'The proposal, advanced by the council’s finance subcommittee with the support of three of the five trustees, that the campus expand its athletic facilities, was tabled.',
    specifiers: [
      'advanced by the council’s finance subcommittee with the support of three of the five trustees',
      'that the campus expand its athletic facilities',
    ],
    core: 'The proposal was tabled.',
  },
  {
    id: 'CD-3',
    sentence:
      'The decision by the city council, despite public opposition that had been building over the previous six months, to relocate the bus depot has been finalized.',
    specifiers: ['by the city council', 'despite public opposition that had been building over the previous six months'],
    core: 'The decision to relocate the bus depot has been finalized.',
  },
];

export function HardSentenceSection() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const sec = HARD_SECTIONS.find((s) => s.number === sectionId);
  if (!sec) {
    return (
      <EmptyState
        title="Hard Sentences section not found"
        body="Section IDs are 5.1–5.7. Use /hard-sentences/capstone for the capstone."
        cta={
          <Link to="/bootcamp/structure/hard-sentences">
            <Button variant="subtle">← Back to Hard Sentences</Button>
          </Link>
        }
      />
    );
  }
  const isDecomposer = sec.number === '5.7';
  return (
    <article className="px-6 py-10 max-w-prose mx-auto">
      <header className="mb-6">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{sec.id}</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">
          {sec.number} · {sec.title}
        </h1>
        <p className="font-mc-serif text-body-prose text-ink-soft italic mt-4 border-l-2 border-l-[rgb(var(--accent)/0.40)] pl-3">
          {sec.hook}
        </p>
        <div className="mt-3 flex gap-2">
          <Badge tone="success">authored</Badge>
          <span className="font-mc-mono text-mono text-ink-faint">voice: {String(sec.voice_register)}</span>
        </div>
      </header>
      <div className="space-y-4">
        {sec.blocks.map((b, i) => (
          <RenderBlock key={i} block={b} />
        ))}
        {isDecomposer ? <ClusterDecomposer sentences={DECOMPOSER_SAMPLES} /> : null}
      </div>
      <p className="mt-8 font-mc-mono text-mono text-ink-faint border-t border-[rgb(var(--border)/0.08)] pt-4">
        source: {sec.source}
      </p>
    </article>
  );
}
