/**
 * Module 2: Reference index. Lists all 11 reference sections + named tools list.
 * Sections render placeholder cards that link to /reference/:id.
 */

import { Link } from 'react-router-dom';
import { ArrowUpRight, Wrench } from 'lucide-react';
import refs from '@/bootcamps/main-conclusion/data/references.generated.json';
import namedTools from '@/bootcamps/main-conclusion/data/named-tools.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface RefSection {
  id: string;
  title: string;
  route: string;
  voice_register: 1 | 2 | 'mixed';
  source: string;
  status: 'placeholder' | 'authored';
}
interface NamedTool {
  id: string;
  name: string;
  what: string;
}

export function ReferenceIndex() {
  const sections = refs as RefSection[];
  const tools = namedTools as NamedTool[];
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-12">
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
            Module 2
          </div>
          <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-tight">
            Reference
          </h1>
          <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">
            The decisive lookup surfaces — indicator vault, 2-Part Conclusion Check, FABS, the seven
            traits, the named tools.
          </p>
        </div>
      </header>

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-4">
          Sections · {sections.length}
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
                      <div className="font-mc-mono text-mono text-ink-faint">{s.id}</div>
                      <h3
                        className={cn(
                          'font-mc-serif text-h3 font-semibold mt-1 leading-tight',
                          'transition-colors duration-150 ease-eased',
                          'text-ink group-hover:text-mc-accent',
                        )}
                      >
                        {s.title}
                      </h3>
                    </div>
                    <Badge tone={s.status === 'authored' ? 'success' : 'warn'} dot className="shrink-0">
                      {s.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-mc-mono text-mono text-ink-faint">
                      voice · {String(s.voice_register)}
                    </p>
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

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-4 inline-flex items-center gap-2">
          <Wrench className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
          Named tools · {tools.length}
        </h2>
        <ul
          className={cn(
            'grid sm:grid-cols-2 gap-x-6 gap-y-2 rounded-4 p-5',
            'bg-[image:var(--grad-surface-soft)]',
            'border border-[rgb(var(--border)/0.08)]',
            'shadow-[var(--shadow-1)]',
          )}
        >
          {tools.map((t) => (
            <li key={t.id} className="flex items-baseline gap-3 min-w-0">
              <Link
                to={`/bootcamp/intro-to-lr/reference/named-tools/${t.id}`}
                className={cn(
                  'font-mc-serif text-body-prose text-mc-accent truncate',
                  'hover:underline underline-offset-4 decoration-[rgb(var(--accent)/0.5)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2',
                  'transition-colors duration-150 ease-eased',
                )}
              >
                {t.name}
              </Link>
              <span className="font-mc-mono text-mono text-ink-faint shrink-0">{t.id}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
