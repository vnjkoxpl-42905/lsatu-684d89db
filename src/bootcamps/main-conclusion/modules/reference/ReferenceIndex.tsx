/**
 * Module 2: Reference index. Lists all 11 reference sections + named tools list.
 * Sections render placeholder cards that link to /reference/:id.
 * Prose is authored in Phase B.
 */

import { Link } from 'react-router-dom';
import refs from '@/bootcamps/main-conclusion/data/references.generated.json';
import namedTools from '@/bootcamps/main-conclusion/data/named-tools.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';

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
    <article className="px-6 py-10 max-w-3xl mx-auto space-y-8">
      <header>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Module 2</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Reference</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-3">
          The decisive lookup surfaces — indicator vault, 2-Part Conclusion Check, FABS, the seven traits, the named tools.
        </p>
      </header>

      <section>
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Sections</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id}>
              <Link
                to={`/bootcamp/structure${s.route}`}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-3"
              >
                <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mc-mono text-mono text-ink-faint">{s.id}</div>
                      <h3 className="font-mc-serif text-h3 font-semibold mt-1">{s.title}</h3>
                    </div>
                    <Badge tone={s.status === 'authored' ? 'success' : 'warn'}>{s.status}</Badge>
                  </div>
                  <p className="font-mc-mono text-mono text-ink-faint mt-2">voice: {String(s.voice_register)}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Named tools (15)</h2>
        <ul className="mt-3 space-y-1.5">
          {tools.map((t) => (
            <li key={t.id} className="flex items-baseline gap-3">
              <Link
                to={`/bootcamp/structure/reference/named-tools/${t.id}`}
                className="font-mc-serif text-body-prose text-mc-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2"
              >
                {t.name}
              </Link>
              <span className="font-mc-mono text-mono text-ink-faint">{t.id}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
