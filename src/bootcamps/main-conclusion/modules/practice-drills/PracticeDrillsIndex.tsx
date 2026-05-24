/**
 * Practice Drills — bootcamp-scoped Guided-Drill-style launchers.
 *
 * Two assigned question sets:
 *   • First-Sentence Main Conclusion  — qtype "Main Conclusion" ∩ feature "First Sentence Conclusion"
 *   • Rebuttal Main Conclusion        — qtype "Main Conclusion" ∩ feature "Rebuttals"
 *
 * Flow: list → instruction card (title, count, difficulty, filter, guidance, Start/Back)
 *  → /drill (type-drill) with a pre-resolved, easiest→hardest selectedQids list.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MessageSquareWarning,
  Target,
  ListChecks,
  Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { questionBank } from '@/lib/questionLoader';
import type { TypeDrillConfig } from '@/types/drill';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type SetKey = 'first-sentence' | 'rebuttal-main-conclusion';

interface PracticeSet {
  key: SetKey;
  title: string;
  blurb: string;
  badge: string;
  /** Required qtype — strict AND with the features below. */
  qtype: 'Main Conclusion';
  qfeatures: string[];
  /** Filter chips shown on the intro card. */
  filterChips: string[];
  /** Target count to launch; if fewer matches exist we use all of them. */
  targetCount: number;
  instructions: string[];
  Icon: typeof Sparkles;
}

const SETS: PracticeSet[] = [
  {
    key: 'first-sentence',
    title: 'First-Sentence Main Conclusion',
    blurb:
      "Main Conclusion questions where the author’s conclusion appears in the first sentence.",
    badge: 'Main Conclusion',
    qtype: 'Main Conclusion',
    qfeatures: ['First Sentence Conclusion'],
    filterChips: ['Main Conclusion', 'First Sentence'],
    targetCount: 10,
    instructions: [
      'Read the very first sentence and pre-commit to it as the conclusion.',
      'Then read the rest of the stimulus and verify nothing displaces it.',
      'In the answer choices, pick the closest restatement — same claim, different words.',
    ],
    Icon: Sparkles,
  },
  {
    key: 'rebuttal-main-conclusion',
    title: 'Rebuttal Main Conclusion',
    blurb:
      "Main Conclusion questions where the author responds to or rejects another view.",
    badge: 'Main Conclusion',
    qtype: 'Main Conclusion',
    qfeatures: ['Rebuttals'],
    filterChips: ['Main Conclusion', 'Rebuttal'],
    targetCount: 10,
    instructions: [
      'Identify the view the author is pushing back against — that is NOT the conclusion.',
      'Find the author’s own counter-claim. Pivot words like "but", "however", "in fact" mark it.',
      'Pick the answer that restates the author’s rebuttal, not the view being rebutted.',
    ],
    Icon: MessageSquareWarning,
  },
];

interface Resolved {
  selectedQids: string[];
  matchedTotal: number;
  difficultyMin: number;
  difficultyMax: number;
}

function resolveSet(set: PracticeSet): Resolved {
  const all = questionBank.getAllQuestions();
  const matches = all.filter((q) => {
    if (q.qtype !== set.qtype) return false;
    const features = q.questionFeatures ?? [];
    for (const f of set.qfeatures) {
      if (!features.includes(f)) return false;
    }
    return true;
  });

  // Stable easiest→hardest sort: difficulty asc, then PT/section/qnum for determinism.
  const sorted = [...matches].sort((a, b) => {
    const da = a.difficulty ?? 99;
    const db = b.difficulty ?? 99;
    if (da !== db) return da - db;
    const pa = (a as { pt?: number }).pt ?? 0;
    const pb = (b as { pt?: number }).pt ?? 0;
    if (pa !== pb) return pa - pb;
    const sa = (a as { section?: number }).section ?? 0;
    const sb = (b as { section?: number }).section ?? 0;
    if (sa !== sb) return sa - sb;
    const qa = (a as { qnum?: number }).qnum ?? 0;
    const qb = (b as { qnum?: number }).qnum ?? 0;
    return qa - qb;
  });

  // De-dupe defensively.
  const seen = new Set<string>();
  const uniq = sorted.filter((q) => {
    if (seen.has(q.qid)) return false;
    seen.add(q.qid);
    return true;
  });

  const selected = uniq.slice(0, Math.min(set.targetCount, uniq.length));
  const difficulties = selected.map((q) => q.difficulty ?? 0);
  return {
    selectedQids: selected.map((q) => q.qid),
    matchedTotal: uniq.length,
    difficultyMin: difficulties.length ? Math.min(...difficulties) : 0,
    difficultyMax: difficulties.length ? Math.max(...difficulties) : 0,
  };
}

function verifySet(set: PracticeSet, resolved: Resolved): void {
  if (!import.meta.env.DEV) return;
  const all = questionBank.getAllQuestions();
  const byId = new Map(all.map((q) => [q.qid, q]));
  const issues: string[] = [];
  const ids = resolved.selectedQids;
  if (new Set(ids).size !== ids.length) issues.push('duplicate qids');
  let prev = -Infinity;
  for (const id of ids) {
    const q = byId.get(id);
    if (!q) { issues.push(`missing ${id}`); continue; }
    if (q.qtype !== set.qtype) issues.push(`${id} wrong qtype`);
    for (const f of set.qfeatures) {
      if (!(q.questionFeatures ?? []).includes(f)) issues.push(`${id} missing feature ${f}`);
    }
    const d = q.difficulty ?? 0;
    if (d < prev) issues.push(`${id} out of order`);
    prev = d;
  }
  // eslint-disable-next-line no-console
  console.info(`[PracticeDrills:${set.key}]`, {
    selected: ids.length,
    matchedTotal: resolved.matchedTotal,
    difficulty: `${resolved.difficultyMin}-${resolved.difficultyMax}`,
    issues: issues.length ? issues : 'ok',
  });
}

export function PracticeDrillsIndex() {
  const navigate = useNavigate();
  const { isLoading } = useQuestionBank();
  const [activeKey, setActiveKey] = useState<SetKey | null>(null);

  const activeSet = useMemo(
    () => SETS.find((s) => s.key === activeKey) ?? null,
    [activeKey],
  );
  const resolved = useMemo<Resolved | null>(() => {
    if (!activeSet || isLoading) return null;
    const r = resolveSet(activeSet);
    verifySet(activeSet, r);
    return r;
  }, [activeSet, isLoading]);

  const startDrill = () => {
    if (!activeSet || !resolved) return;
    if (resolved.selectedQids.length === 0) {
      toast.error('No questions match this set yet.');
      return;
    }
    const config: TypeDrillConfig = {
      qtypes: [activeSet.qtype],
      qfeatures: activeSet.qfeatures,
      difficulties: [],
      pts: [],
      count: resolved.selectedQids.length,
      selectedQids: resolved.selectedQids,
      unseen_only: false,
    };
    navigate(`/drill?returnTo=/bootcamp/intro-to-lr/practice-drills`, {
      state: { mode: 'type-drill', config },
    });
  };

  // ── Intro card view ──────────────────────────────────────────────────────
  if (activeSet) {
    const count = resolved?.selectedQids.length ?? 0;
    const total = resolved?.matchedTotal ?? 0;
    const dMin = resolved?.difficultyMin ?? 0;
    const dMax = resolved?.difficultyMax ?? 0;
    const Icon = activeSet.Icon;
    return (
      <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-8 pb-32">
        <button
          type="button"
          onClick={() => setActiveKey(null)}
          className="inline-flex items-center gap-1.5 font-mc-mono text-label uppercase tracking-[0.18em] text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back to sets
        </button>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
            Guided practice
          </div>
          <h1 className="font-mc-serif text-h1 italic text-ink leading-[1.05]">
            {activeSet.title}
          </h1>
          <p className="font-mc-sans text-body text-ink-soft max-w-xl">{activeSet.blurb}</p>
        </header>

        <Card className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat
              icon={<ListChecks className="h-4 w-4" strokeWidth={1.8} />}
              label="Questions"
              value={isLoading ? '…' : `${count}`}
              sub={isLoading ? '' : `of ${total} matching`}
            />
            <Stat
              icon={<Gauge className="h-4 w-4" strokeWidth={1.8} />}
              label="Difficulty"
              value={isLoading ? '…' : count ? `${dMin}–${dMax}` : '—'}
              sub="Easiest → hardest"
            />
            <Stat
              icon={<Target className="h-4 w-4" strokeWidth={1.8} />}
              label="Filter"
              value={activeSet.filterChips.join(' · ')}
              sub="Strict AND match"
            />
          </div>

          <div className="space-y-2">
            <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-soft">
              How to attack
            </div>
            <ol className="space-y-2 font-mc-sans text-body text-ink list-decimal pl-5">
              {activeSet.instructions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={startDrill} disabled={isLoading || count === 0}>
              Start drill
              <ArrowRight className="h-4 w-4 ml-1.5" strokeWidth={2} />
            </Button>
            <Button variant="ghost" onClick={() => setActiveKey(null)}>
              Back
            </Button>
          </div>
        </Card>
      </article>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-8 pb-32">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-mc-accent" />
          Practice Drills
        </div>
        <h1 className="font-mc-serif text-h1 italic text-ink leading-[1.05]">
          Assigned question sets
        </h1>
        <p className="font-mc-sans text-body text-ink-soft max-w-xl">
          Curated LR sets that launch directly into the Smart Drill template. Pick a focus and go.
        </p>
      </header>

      <ul className="space-y-4">
        {SETS.map((set) => (
          <li key={set.key}>
            <Card interactive className={cn('p-6 flex items-start gap-5 cursor-pointer')}>
              <button
                type="button"
                onClick={() => setActiveKey(set.key)}
                className="absolute inset-0 z-10"
                aria-label={`Open ${set.title}`}
              />
              <div
                aria-hidden
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px]',
                  'bg-[rgb(var(--surface)/0.86)] border border-[rgb(var(--border)/0.10)]',
                )}
              >
                <set.Icon className="h-5 w-5 text-mc-accent" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0 relative z-20 pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-mc-serif text-h3 italic text-ink">{set.title}</h2>
                  <Badge>{set.badge}</Badge>
                </div>
                <p className="font-mc-sans text-body text-ink-soft mb-4">{set.blurb}</p>
                <span className="inline-flex items-center gap-1.5 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
                  View instructions
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-1.5 font-mc-mono text-label uppercase tracking-[0.18em] text-ink-soft">
        {icon}
        {label}
      </div>
      <div className="font-mc-serif text-h3 italic text-ink leading-tight">{value}</div>
      {sub ? <div className="font-mc-sans text-body-sm text-ink-soft">{sub}</div> : null}
    </div>
  );
}
