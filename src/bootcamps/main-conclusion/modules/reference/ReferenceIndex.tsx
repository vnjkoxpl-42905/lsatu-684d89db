/**
 * Module 2: Reference. Tool Lab + lookup surfaces.
 * Tools are practiced in the Tool Lab (interactive try-its). Lookup surfaces are
 * the secondary surface for static notes.
 */

import { Link } from 'react-router-dom';
import { ArrowUpRight, Bookmark, Wrench } from 'lucide-react';
import refs from '@/bootcamps/main-conclusion/data/references.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { ToolCard } from '@/bootcamps/main-conclusion/components/tool-lab/ToolCard';
import { TOOL_LAB } from '@/bootcamps/main-conclusion/content/tool-lab.source';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface RefSection {
  id: string;
  title: string;
  route: string;
  voice_register: 1 | 2 | 'mixed';
  source: string;
  status: 'placeholder' | 'authored';
}

// Map raw reference IDs to clean student-facing names.
const REF_LABEL: Record<string, string> = {
  'MC-REF-2.A': 'Core Indicator Words',
  'MC-REF-2.B': '2-Part Conclusion Check',
  'MC-REF-2.C': 'FABS premise indicators',
  'MC-REF-2.D': 'Stimulus tendencies',
  'MC-REF-2.E': 'Conclusion types',
  'MC-REF-2.F': 'Rebuttal structure',
  'MC-REF-2.G': 'Three-trap landscape',
  'MC-REF-2.H': 'Pronoun replacement',
  'MC-REF-2.I': 'Concession decoder',
  'MC-REF-2.J': 'Quick reference card',
  'MC-REF-2.K': 'Companion mode',
  'MC-REF-2.L': 'Pivot Indicators',
  'MC-REF-2.M': 'Opposing & Concession',
  'MC-REF-2.N': 'Opinion Indicators',
};

export function ReferenceIndex() {
  const sections = refs as RefSection[];
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[920px] mx-auto space-y-14">
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
            Reference
          </div>
          <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-tight">
            Tools you practice
          </h1>
          <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">
            Each tool below trains itself in under a minute: what it does, when to reach for it, and
            a try-it that proves you can use it.
          </p>
        </div>
      </header>

      <section className="max-w-[800px] mx-auto">
        <div className="mb-10">
          <Link
            to="/bootcamp/intro-to-lr/reference/flashcards"
            className="group block rounded-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
          >
            <Card variant="elev" interactive accent>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.16em] text-mc-accent">
                    <Bookmark className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden="true" />
                    Flashcards
                  </div>
                  <h2 className="mt-3 font-mc-serif text-h2 font-semibold leading-tight text-ink group-hover:text-mc-accent transition-colors duration-150 ease-eased">
                    Structured drill flashcards
                  </h2>
                  <p className="mt-3 font-mc-serif text-body-prose text-ink-soft max-w-[60ch] leading-relaxed">
                    All 33 structuredrill flashcards, rebuilt as a native Intro to LR study surface with a sidebar card list.
                  </p>
                </div>
                <Badge tone="success" dot className="shrink-0">
                  33 cards
                </Badge>
              </div>
            </Card>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mc-mono text-label uppercase tracking-[0.16em] text-ink-faint inline-flex items-center gap-2">
            <Wrench className="h-3 w-3 text-mc-accent" strokeWidth={2.2} aria-hidden="true" />
            Tool Lab
          </h2>
          <span className="font-mc-mono text-mono text-ink-faint">
            {TOOL_LAB.length} tools
          </span>
        </div>
        <p className="font-mc-serif text-body-prose text-ink-soft mb-10 max-w-[60ch] leading-relaxed">
          Run the try-it. The reveal will not show up until you have made a call.
        </p>
        <ul>
          {TOOL_LAB.map((tool, i) => (
            <li
              key={tool.slug}
              className={cn(
                i > 0 && 'border-t border-[rgb(var(--border)/0.08)] pt-12 mt-12',
              )}
            >
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-4">
          Quick references · {sections.length}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id}>
              <Link
                to={s.route.startsWith('/bootcamp/intro-to-lr') ? s.route : `/bootcamp/intro-to-lr${s.route}`}
                className="group block rounded-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
              >
                <Card variant="surface" interactive>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3
                        className={cn(
                          'font-mc-serif text-h3 font-semibold leading-tight',
                          'transition-colors duration-150 ease-eased',
                          'text-ink group-hover:text-mc-accent',
                        )}
                      >
                        {REF_LABEL[s.id] ?? s.title}
                      </h3>
                    </div>
                    <Badge tone={s.status === 'authored' ? 'success' : 'warn'} dot className="shrink-0">
                      {s.status === 'authored' ? 'ready' : 'draft'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <ArrowUpRight
                      className="h-3.5 w-3.5 text-ink-faint transition-all duration-220 ease-eased group-hover:text-mc-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

    </article>
  );
}
