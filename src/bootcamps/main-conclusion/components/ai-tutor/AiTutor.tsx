/**
 * AI Tutor — template-routed v1. Lives in the right drawer (or a modal on mobile).
 * Surface-aware: opens with the question chips for the current surface.
 * No-match fallback: "Try one of these instead" with chips.
 */

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send, ArrowLeft } from 'lucide-react';
import { findTemplates, type TutorTemplate, TUTOR_REGISTRY } from './templates';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

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

  function trySubmit() {
    if (!query.trim() || matches.length === 0) return;
    setSubmitted({ q: matches[0]!.q, a: matches[0]!.a });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end pointer-events-none">
      <AnimatePresence>
        <motion.button
          key="ai-backdrop"
          type="button"
          onClick={onClose}
          aria-label="Dismiss tutor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-auto absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]"
        />
        <motion.div
          key="ai-panel"
          initial={{ x: '100%', opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'relative pointer-events-auto h-full w-[440px] max-w-full overflow-y-auto',
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
              'sticky top-0 z-[1] flex items-center justify-between px-6 py-4',
              'border-b border-[rgb(var(--border)/0.08)]',
              'bg-[rgb(var(--surface)/0.6)] backdrop-blur-md',
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full',
                  'bg-[image:var(--grad-accent-strong)]',
                  'border border-[color:var(--border-accent-mid)]',
                  'text-mc-accent shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.10)]',
                )}
                aria-hidden="true"
              >
                <Sparkles className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-mc-serif text-h3 font-semibold text-ink leading-none">AI Tutor</div>
                <div className="mt-1.5">
                  <Badge tone="accent" dot>
                    v1 · template-routed
                  </Badge>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tutor (Esc)"
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

          <div className="px-6 py-5 space-y-4">
            {/* Premium input with send button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                trySubmit();
              }}
              className={cn(
                'group/input flex items-center gap-2 rounded-3 px-3 py-1',
                'bg-[image:var(--grad-surface-soft)]',
                'border border-[rgb(var(--border)/0.10)]',
                'transition-[border-color,box-shadow] duration-150 ease-eased',
                'focus-within:border-[color:var(--border-accent-strong)] focus-within:shadow-[var(--glow-accent-soft)]',
              )}
            >
              <input
                placeholder="Ask a question…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSubmitted(null);
                }}
                autoFocus
                className={cn(
                  'h-9 flex-1 bg-transparent border-0 outline-none',
                  'font-mc-serif text-body-prose text-ink placeholder:text-ink-faint',
                  'focus:outline-none',
                )}
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={!query.trim() || matches.length === 0}
                className={cn(
                  'inline-flex h-7 w-7 items-center justify-center rounded-full',
                  'bg-[image:var(--grad-accent-strong)] text-mc-accent',
                  'border border-[color:var(--border-accent-mid)]',
                  'shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
                  'hover:shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.10)]',
                  'disabled:opacity-40 disabled:pointer-events-none',
                  'transition-all duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                )}
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              </button>
            </form>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              >
                <Card variant="surface" accent>
                  <p className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">{submitted.q}</p>
                  <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">{submitted.a}</p>
                  <Button
                    variant="subtle"
                    size="sm"
                    leftIcon={<ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />}
                    className="mt-3"
                    onClick={() => {
                      setSubmitted(null);
                      setQuery('');
                    }}
                  >
                    Ask another
                  </Button>
                </Card>
              </motion.div>
            ) : query.trim() ? (
              matches.length > 0 ? (
                <section>
                  <h3 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-2">
                    Matches
                  </h3>
                  <ul className="space-y-2">
                    {matches.map((m, i) => (
                      <li key={i}>
                        <button
                          onClick={() => setSubmitted({ q: m.q, a: m.a })}
                          className={cn(
                            'group/match w-full text-left rounded-3 px-3 py-2.5',
                            'bg-[image:var(--grad-surface-soft)]',
                            'border border-[rgb(var(--border)/0.10)]',
                            'transition-[border-color,box-shadow,transform] duration-180 ease-eased',
                            'hover:border-[color:var(--border-accent-mid)] hover:shadow-[var(--shadow-2)]',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mc-serif text-body text-ink">{m.q}</span>
                            <span className="font-mc-mono text-mono text-ink-faint shrink-0">{m.surface}</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <Card variant="elev" className="border border-[rgb(var(--warn)/0.40)] bg-[rgb(var(--warn)/0.05)]">
                  <Badge tone="warn" dot>
                    no template match
                  </Badge>
                  <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">
                    v1 routes to pre-authored answers. Your phrasing didn’t match any template. Try one of these instead:
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {allTemplates.slice(0, 6).map((t, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(t.q);
                          setSubmitted(t);
                        }}
                        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-full"
                      >
                        <Chip tone="accent">{t.q}</Chip>
                      </button>
                    ))}
                  </div>
                </Card>
              )
            ) : surfaceTemplates.length > 0 ? (
              <section>
                <h3 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-2">
                  For this surface
                </h3>
                <ul className="space-y-2">
                  {surfaceTemplates.map((t, i) => (
                    <li key={i}>
                      <button
                        onClick={() => setSubmitted(t)}
                        className={cn(
                          'group/template w-full text-left rounded-3 px-3 py-2.5',
                          'bg-[image:var(--grad-surface-soft)]',
                          'border border-[rgb(var(--border)/0.10)]',
                          'transition-[border-color,box-shadow] duration-180 ease-eased',
                          'hover:border-[color:var(--border-accent-mid)] hover:shadow-[var(--shadow-2)]',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
                        )}
                      >
                        <span className="font-mc-serif text-body text-ink">{t.q}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <Card variant="elev">
                <p className="font-mc-serif text-body-prose text-ink-soft leading-relaxed">
                  No templates registered for this surface yet. Try the search above, or browse popular questions.
                </p>
              </Card>
            )}

            <p className="font-mc-mono text-mono text-ink-faint border-t border-[rgb(var(--border)/0.06)] pt-3">
              v1.5 will swap this surface to an LLM call with the same input/output contract. v1 is offline.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
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
