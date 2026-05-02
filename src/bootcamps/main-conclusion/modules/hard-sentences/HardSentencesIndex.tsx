/**
 * Module 5: Hard Sentences — index + section renderer with full bodies.
 * Phase E authored 2026-05-01.
 */

import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Award } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { ClusterDecomposer, type ClusterSentence } from '@/bootcamps/main-conclusion/components/cluster-decomposer/ClusterDecomposer';
import { HARD_SECTIONS, type Block, type HardSection } from '@/bootcamps/main-conclusion/content/hard-sentences.source';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const CAPSTONE: { id: string; number: string; title: string; route: string } = {
  id: 'MC-HS-5.8',
  number: '5.8',
  title: 'Capstone (5 calibration items)',
  route: '/hard-sentences/capstone',
};

export function HardSentencesIndex() {
  const all: Array<HardSection | typeof CAPSTONE> = [...HARD_SECTIONS, CAPSTONE];
  // We don't track per-section completion for hard sentences in v1 (no
  // markComplete hook for them today). Direct the student to the first section
  // by default — honest: this reflects "where to start," not "what is incomplete."
  const next = all[0]!;
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-8">
      <header className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.20), transparent 70%)' }}
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
            />
            Hard Sentences
          </div>
          <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-tight">
            Decompose the cluster
          </h1>
          <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">
            LSAT writers stack qualifiers around a core thought until you can&apos;t see it. This module
            is the dive crew. One section at a time, peel the coral off the statue.
          </p>
        </div>
      </header>

      <section
        className={cn(
          'relative isolate overflow-hidden rounded-5 p-6',
          'bg-[image:var(--grad-surface-elev)]',
          'border border-[color:var(--border-accent-soft)]',
          'shadow-[var(--shadow-3),var(--glow-accent-soft)]',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--border-accent-strong)] to-transparent"
        />
        <div className="relative flex flex-col desktop:flex-row desktop:items-center desktop:justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
              />
              Start here
            </div>
            <h2 className="font-mc-serif text-h1 font-semibold mt-2 text-ink leading-tight">
              {next.number}: {next.title}
            </h2>
            <p className="font-mc-serif text-body-prose mt-3 text-ink-soft leading-relaxed">
              Begin with the why and the cluster anatomy before you reach the decomposer in 5.7.
            </p>
            <div className="mt-4">
              <Link
                to={next.route}
                className="rounded-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
              >
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}>
                  Open section {next.number}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">All sections</h2>
      <ul className="grid gap-3">
        {all.map((s) => {
          const isCapstone = s.id === CAPSTONE.id;
          return (
            <li key={s.id}>
              <Link
                to={s.route}
                className="group block rounded-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
              >
                <Card variant="surface" interactive accent={isCapstone}>
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full font-mc-mono text-body font-semibold',
                        isCapstone
                          ? 'bg-[image:var(--grad-accent-strong)] text-mc-accent border border-[color:var(--border-accent-mid)] shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.10)]'
                          : 'bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.10)]',
                      )}
                    >
                      {isCapstone ? <Award className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" /> : s.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        {isCapstone ? (
                          <Badge tone="accent" dot>
                            capstone · 5 calibration items
                          </Badge>
                        ) : null}
                      </div>
                      <h3
                        className={cn(
                          'font-mc-serif text-h3 font-semibold mt-1 leading-tight',
                          'transition-colors duration-150 ease-eased',
                          'text-ink group-hover:text-mc-accent',
                        )}
                      >
                        {s.number} · {s.title}
                      </h3>
                    </div>
                    <ArrowRight
                      className="shrink-0 h-4 w-4 text-ink-faint transition-all duration-220 ease-eased group-hover:text-mc-accent group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
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
        <Card variant="elev" className="border border-[color:var(--border-accent-mid)] bg-[rgb(var(--accent)/0.05)]">
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
        <Card variant="surface" className="border border-[rgb(var(--role-premise)/0.35)] bg-[rgb(var(--role-premise)/0.04)]">
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
          <Link to="/bootcamp/intro-to-lr/hard-sentences">
            <Button variant="subtle">← Back to Hard Sentences</Button>
          </Link>
        }
      />
    );
  }
  const isDecomposer = sec.number === '5.7';
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-prose mx-auto">
      <PageHeader
        eyebrow="Hard Sentences"
        title={sec.title}
        description={
          <span className="italic border-l-2 border-l-[color:var(--border-accent-strong)] pl-3 inline-block">
            {sec.hook}
          </span>
        }
      />
      <div className="space-y-4">
        {sec.blocks.map((b, i) => (
          <RenderBlock key={i} block={b} />
        ))}
        {isDecomposer ? <ClusterDecomposer sentences={DECOMPOSER_SAMPLES} /> : null}
      </div>
</article>
  );
}
