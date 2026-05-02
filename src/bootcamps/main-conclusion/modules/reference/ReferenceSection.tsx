/**
 * Generic Reference section renderer.
 * Reads the section by current pathname from references.generated.json.
 * Bodies are authored in src/content/references.source.ts and emitted by the pipeline.
 */

import { useParams, Link } from 'react-router-dom';
import refs from '@/bootcamps/main-conclusion/data/references.generated.json';
import namedTools from '@/bootcamps/main-conclusion/data/named-tools.generated.json';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Printer } from 'lucide-react';

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'callout'; label: string; body: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'example'; label: string; body: string }
  | { kind: 'table'; columns: string[]; rows: string[][] };

interface RefSection {
  id: string;
  title: string;
  route: string;
  voice_register: 1 | 2 | 'mixed';
  source: string;
  status: 'placeholder' | 'authored';
  hook?: string;
  blocks?: Block[];
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
      if (block.ordered) {
        return (
          <ol className="font-mc-serif text-body-prose text-ink list-decimal pl-5 space-y-1.5 marker:text-ink-faint">
            {block.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ol>
        );
      }
      return (
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
    case 'table':
      return (
        <div className="overflow-x-auto rounded-3 border border-[rgb(var(--border)/0.10)]">
          <table className="w-full text-left">
            <thead className="bg-[rgb(var(--surface-elev))]">
              <tr>
                {block.columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-mc-mono text-mono uppercase tracking-wider text-ink-faint">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t border-[rgb(var(--border)/0.06)]">
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-2 font-mc-serif text-body text-ink">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function ReferenceSection() {
  const path = window.location.pathname;
  const section = (refs as RefSection[]).find((s) => s.route === path);

  if (!section) {
    return (
      <EmptyState
        title="Reference section not found"
        body="That route didn't resolve to a known reference. Head back to the index."
        cta={
          <Link to="/bootcamp/intro-to-lr/reference">
            <Button variant="subtle">← Back to Reference</Button>
          </Link>
        }
      />
    );
  }

  const isQrc = section.id === 'MC-REF-2.J';

  return (
    <article className={`px-6 py-12 desktop:px-12 desktop:py-16 max-w-prose mx-auto ${isQrc ? 'print-card' : ''}`}>
      <PageHeader
        eyebrow="Reference"
        title={section.title}
        description={
          section.hook ? (
            <span className="italic border-l-2 border-l-[color:var(--border-accent-strong)] pl-3 inline-block">
              {section.hook}
            </span>
          ) : undefined
        }
        actions={
          section.status !== 'authored' ? (
            <Badge tone="warn" dot>
              draft
            </Badge>
          ) : undefined
        }
      />
      {isQrc ? (
        <Button
          variant="subtle"
          size="sm"
          leftIcon={<Printer className="h-3.5 w-3.5" strokeWidth={2.2} />}
          onClick={() => window.print()}
          className="print-hide -mt-6 mb-8"
        >
          Print this card
        </Button>
      ) : null}
      {section.blocks && section.blocks.length > 0 ? (
        <div className="space-y-4">
          {section.blocks.map((b, i) => (
            <RenderBlock key={i} block={b} />
          ))}
        </div>
      ) : (
        <p className="font-mc-serif text-body-prose text-ink-soft">
          This reference is still being written. Use the Tool Lab and your lesson sequence in the
          meantime — every tool you would reach for here is practiced there.
        </p>
      )}
</article>
  );
}

interface NamedTool {
  id: string;
  name: string;
  what: string;
  where: string[];
  source: string;
}

export function NamedToolEntry() {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = (namedTools as NamedTool[]).find((t) => t.id === toolId);
  if (!tool) {
    return (
      <EmptyState
        title="Named tool not found"
        body="Check the URL — IDs are like NT-FABS or NT-Stage-Gate-Tracker."
        cta={
          <Link to="/bootcamp/intro-to-lr/reference">
            <Button variant="subtle">← Back to Reference</Button>
          </Link>
        }
      />
    );
  }
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-prose mx-auto">
      <PageHeader eyebrow="Training tool" title={tool.name} compact />
      <section className="mt-6">
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">What it is</h2>
        <p className="font-mc-serif text-body-prose text-ink mt-1.5 leading-relaxed">{tool.what}</p>
      </section>
      <section className="mt-6">
        <Link
          to="/bootcamp/intro-to-lr/reference"
          className="font-mc-mono text-mono text-mc-accent hover:underline underline-offset-4 decoration-[rgb(var(--accent)/0.5)]"
        >
          ← Open in Tool Lab to practice this
        </Link>
      </section>
</article>
  );
}
