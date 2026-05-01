/**
 * AI Tutor — template-routed v1. Lives in the right drawer (or a modal on mobile).
 * Surface-aware: opens with the question chips for the current surface.
 * No-match fallback: "Try one of these instead" with chips.
 */

import { useEffect, useMemo, useState } from 'react';
import { findTemplates, type TutorTemplate, TUTOR_REGISTRY } from './templates';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Input } from '@/bootcamps/main-conclusion/components/primitives/Input';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';

interface Props {
  surfaceId: string | null;
  onClose: () => void;
}

export function AiTutor({ surfaceId, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState<TutorTemplate | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const surfaceTemplates = useMemo(() => findTemplates(surfaceId), [surfaceId]);
  const allTemplates = useMemo(
    () => TUTOR_REGISTRY.flatMap((s) => s.questions.map((q) => ({ ...q, surface: s.surface_id }))),
    [],
  );
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allTemplates
      .map((t) => ({ ...t, score: matchScore(q, t.q) }))
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [query, allTemplates]);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end pointer-events-none">
      <div className="pointer-events-auto bg-[rgb(var(--surface-elev))] border-l border-[rgb(var(--border)/0.10)] w-[420px] max-w-full h-full overflow-y-auto">
        <header className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border)/0.08)]">
          <div>
            <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">AI Tutor</div>
            <Badge tone="accent">v1 · template-routed</Badge>
          </div>
          <button
            onClick={onClose}
            className="font-mc-mono text-mono text-ink-soft hover:text-ink"
            aria-label="Close tutor (Esc)"
          >
            ESC ✕
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          <Input
            placeholder="Ask a question…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSubmitted(null);
            }}
            autoFocus
          />

          {submitted ? (
            <Card variant="surface">
              <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{submitted.q}</p>
              <p className="font-mc-serif text-body-prose text-ink mt-2">{submitted.a}</p>
              <Button variant="subtle" size="sm" className="mt-3" onClick={() => setSubmitted(null)}>
                Ask another
              </Button>
            </Card>
          ) : query.trim() ? (
            matches.length > 0 ? (
              <section>
                <h3 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Matches</h3>
                <ul className="mt-2 space-y-2">
                  {matches.map((m, i) => (
                    <li key={i}>
                      <button
                        onClick={() => setSubmitted({ q: m.q, a: m.a })}
                        className="w-full text-left rounded-3 px-3 py-2 bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.10)] hover:border-[rgb(var(--accent)/0.30)]"
                      >
                        <span className="font-mc-serif text-body text-ink">{m.q}</span>
                        <span className="font-mc-mono text-mono text-ink-faint ml-2">{m.surface}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <Card variant="elev" className="border-l-4 border-l-[rgb(var(--warn)/0.50)]">
                <Badge tone="warn">no template match</Badge>
                <p className="font-mc-serif text-body-prose text-ink mt-2">
                  v1 routes to pre-authored answers. Your phrasing didn’t match any template. Try one of these instead:
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {allTemplates.slice(0, 6).map((t, i) => (
                    <button key={i} onClick={() => { setQuery(t.q); setSubmitted(t); }}>
                      <Chip tone="accent">{t.q}</Chip>
                    </button>
                  ))}
                </div>
              </Card>
            )
          ) : surfaceTemplates.length > 0 ? (
            <section>
              <h3 className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">For this surface</h3>
              <ul className="mt-2 space-y-2">
                {surfaceTemplates.map((t, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setSubmitted(t)}
                      className="w-full text-left rounded-3 px-3 py-2 bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.10)] hover:border-[rgb(var(--accent)/0.30)]"
                    >
                      <span className="font-mc-serif text-body text-ink">{t.q}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <Card variant="elev">
              <p className="font-mc-serif text-body-prose text-ink-soft">
                No templates registered for this surface yet. Try the search above, or browse popular questions.
              </p>
            </Card>
          )}

          <p className="font-mc-mono text-mono text-ink-faint border-t border-[rgb(var(--border)/0.06)] pt-3">
            v1.5 will swap this surface to an LLM call with the same input/output contract. v1 is offline.
          </p>
        </div>
      </div>
      {/* Click-outside dismiss */}
      <button onClick={onClose} aria-label="Dismiss tutor" className="pointer-events-auto absolute inset-0 -z-10 cursor-default" />
    </div>
  );
}

function matchScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.filter((tk) => t.includes(tk)).length;
}
