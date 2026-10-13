import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { DrawerPayload } from './WorkspaceShell';
import namedTools from '@/bootcamps/main-conclusion/data/named-tools.generated.json';
import refs from '@/bootcamps/main-conclusion/data/references.generated.json';

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'callout'; label: string; body: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'example'; label: string; body: string }
  | { kind: 'table'; columns: string[]; rows: string[][] };

interface ReferenceData {
  id: string;
  title: string;
  hook?: string;
  blocks?: Block[];
  source: string;
}

interface NamedToolEntry {
  id: string;
  name: string;
  what: string;
  where: string[];
  source: string;
}

interface Props {
  payload: DrawerPayload;
  onClose: () => void;
}

/**
 * Right Drawer — opens in place. ESC closes. No URL change.
 * Premium: backdrop blur, framer-motion slide+fade, refined close affordance.
 */
export function RightDrawer({ payload, onClose }: Props): JSX.Element {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (payload) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [payload, onClose]);

  const open = payload != null;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="rd-backdrop"
            type="button"
            aria-label="Close drawer"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] cursor-default"
          />
          <motion.aside
            key="rd-panel"
            role="dialog"
            aria-modal="false"
            initial={{ x: '100%', opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'right-drawer fixed top-0 right-0 z-50 h-full w-[440px] max-w-full',
              'phone:w-full',
              'bg-[image:var(--grad-surface-elev)]',
              'border-l border-[color:var(--border-accent-soft)]',
              'shadow-[var(--shadow-3),var(--glow-accent-soft)]',
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[color:var(--border-accent-strong)] to-transparent"
            />
            <header
              className={cn(
                'flex items-center justify-between px-6 py-4',
                'border-b border-[rgb(var(--border)/0.08)]',
                'bg-[rgb(var(--surface)/0.6)] backdrop-blur-md',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
                />
                <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent">
                  {payload?.mode === 'named-tool'
                    ? 'Named tool'
                    : payload?.mode === 'reference'
                    ? 'Reference'
                    : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer (Esc)"
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5',
                  'bg-transparent text-ink-faint hover:text-ink hover:bg-[rgb(var(--ink)/0.06)]',
                  'border border-[rgb(var(--border)/0.08)] hover:border-[rgb(var(--border)/0.16)]',
                  'font-mc-mono text-mono transition-colors duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                )}
              >
                <span className="text-ink-faint">ESC</span>
                <X className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </header>
            <div className="px-6 py-5 overflow-y-auto h-[calc(100%-65px)]">
              {payload?.mode === 'named-tool' && (
                <NamedToolDrawerBody toolId={payload.named_tool_id} />
              )}
              {payload?.mode === 'reference' && (
                <ReferenceDrawerBody referenceId={payload.reference_id} />
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function NamedToolDrawerBody({ toolId }: { toolId: string }): JSX.Element {
  const tool = (namedTools as NamedToolEntry[]).find((t) => t.id === toolId);
  if (!tool) {
    return <div className="text-body text-ink-soft">Named tool {toolId} not found in inventory.</div>;
  }
  return (
    <article data-named-tool-id={tool.id}>
      <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent">
        {tool.id}
      </div>
      <h2 className="font-mc-serif text-h2 font-semibold mt-2 text-ink">{tool.name}</h2>
      <p className="text-body-prose font-mc-serif mt-4 text-ink-soft leading-relaxed">{tool.what}</p>
      <h3 className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mt-6 mb-2">
        Where it lives
      </h3>
      <ul className="space-y-1">
        {tool.where.map((w) => (
          <li key={w} className="text-small font-mc-mono text-ink-soft">{w}</li>
        ))}
      </ul>
      <h3 className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mt-6 mb-2">
        Source
      </h3>
      <p className="text-small text-ink-soft">{tool.source}</p>
    </article>
  );
}

function ReferenceDrawerBody({ referenceId }: { referenceId: string }): JSX.Element {
  const section = (refs as ReferenceData[]).find((r) => r.id === referenceId);
  if (!section) {
    return (
      <article data-reference-id={referenceId}>
        <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent">{referenceId}</div>
        <p className="font-mc-serif text-body-prose mt-4 text-ink-soft">
          Reference {referenceId} not found.
        </p>
      </article>
    );
  }
  return (
    <article data-reference-id={section.id}>
      <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent">{section.id}</div>
      <h2 className="font-mc-serif text-h2 font-semibold mt-2 text-ink">{section.title}</h2>
      {section.hook ? (
        <p className="font-mc-serif text-body-prose mt-3 text-ink-soft italic">{section.hook}</p>
      ) : null}
      <div className="mt-4 space-y-3">
        {(section.blocks ?? []).map((b, i) => (
          <DrawerBlock key={i} block={b} />
        ))}
      </div>
      <p className="mt-6 font-mc-mono text-mono text-ink-faint border-t border-[rgb(var(--border)/0.06)] pt-3">
        source: {section.source}
      </p>
    </article>
  );
}

function DrawerBlock({ block }: { block: Block }): JSX.Element {
  switch (block.kind) {
    case 'p':
      return <p className="font-mc-serif text-body-prose text-ink leading-relaxed">{block.text}</p>;
    case 'h2':
      return <h3 className="font-mc-serif text-h3 font-semibold mt-4 text-ink">{block.text}</h3>;
    case 'callout':
      return (
        <div
          className={cn(
            'rounded-3 p-3',
            'bg-[rgb(var(--accent)/0.06)]',
            'border border-[color:var(--border-accent-soft)]',
          )}
        >
          <div className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">{block.label}</div>
          <p className="font-mc-serif text-body text-ink mt-1.5">{block.body}</p>
        </div>
      );
    case 'list':
      return block.ordered ? (
        <ol className="font-mc-serif text-body text-ink list-decimal pl-5 space-y-1 marker:text-ink-faint">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <ul className="font-mc-serif text-body text-ink list-disc pl-5 space-y-1 marker:text-ink-faint">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case 'example':
      return (
        <div
          className={cn(
            'rounded-3 p-3',
            'bg-[rgb(var(--role-premise)/0.06)]',
            'border border-[rgb(var(--role-premise)/0.30)]',
          )}
        >
          <div className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--role-premise))]">
            Example · {block.label}
          </div>
          <p className="font-mc-serif text-body text-ink mt-1.5">{block.body}</p>
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-3 border border-[rgb(var(--border)/0.10)]">
          <table className="w-full text-left text-small">
            <thead className="bg-[rgb(var(--surface))]">
              <tr>
                {block.columns.map((c) => (
                  <th key={c} className="px-2.5 py-1.5 font-mc-mono text-mono uppercase tracking-wider text-ink-faint">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-t border-[rgb(var(--border)/0.06)]">
                  {r.map((cell, j) => (
                    <td key={j} className="px-2.5 py-1.5 font-mc-serif text-body text-ink">
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
