import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import lessons from '@/bootcamps/main-conclusion/data/lessons.generated.json';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, LessonProgress } from '@/bootcamps/main-conclusion/persistence/records';
import { newId, now } from '@/bootcamps/main-conclusion/lib/ids';
import { useDrawer } from '@/bootcamps/main-conclusion/components/workspace-shell/WorkspaceShell';
import { CakeOnBlocks } from '@/bootcamps/main-conclusion/components/argument-structure-map/CakeOnBlocks';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { LessonId, NamedToolId, ReferenceId } from '@/bootcamps/main-conclusion/types/source-slots';

interface LessonData {
  id: LessonId;
  number: string;
  title: string;
  hook: string;
  prose_blocks: Array<
    | { kind: 'p'; text: string }
    | { kind: 'callout'; label: string; body: string }
    | { kind: 'example'; tag: string; body: string }
    | { kind: 'visual-spec'; component: 'CakeOnBlocks'; caption: string }
  >;
  named_tool_callouts: Array<{ tool_id: NamedToolId; appears_in_paragraph: number }>;
  reference_callouts: Array<{ reference_id: ReferenceId; label: string }>;
  checkpoint: {
    prompt: string;
    options: Array<{ id: string; text: string; correct: boolean; reveal: string }>;
  };
  sources: string[];
}

export function Lesson(): JSX.Element {
  const { lessonId: routeId } = useParams<{ lessonId: string }>();
  const data = (lessons as LessonData[]).find((l) => l.number === routeId);
  const user = useUser();
  const { progress, markLessonComplete } = useModuleProgress();
  const drawer = useDrawer();
  const [checkpointPicked, setCheckpointPicked] = useState<string | null>(null);

  // Persistence write — Layer 8. Keys on the bridged auth user.
  useEffect(() => {
    if (!data || !user) return;
    (async () => {
      const persist = getPersistence(user.id);
      const id = newId();
      const rec = LessonProgress.parse({
        id,
        user_id: user.id,
        lesson_id: data.id,
        viewed_at: now(),
      });
      await persist.set(TABLES.lesson_progress, id, rec);
    })();
  }, [data, user]);

  if (!data) {
    return (
      <div className="px-6 py-12 max-w-prose mx-auto">
        <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint">Not found</div>
        <h1 className="font-mc-serif text-h1 mt-2">Lesson {routeId} not in v1.</h1>
        <Link to="/bootcamp/intro-to-lr/lessons" className="text-mc-accent font-mc-mono text-mono mt-4 inline-block">← Back to Lessons</Link>
      </div>
    );
  }

  const checkpointOption = data.checkpoint.options.find((o) => o.id === checkpointPicked);

  async function handleMarkComplete() {
    if (!data) return;
    await markLessonComplete(data.id, `/lessons/${data.number}`);
  }

  const completed = progress?.completed_lessons.includes(data.id) ?? false;

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[840px] mx-auto" data-lesson-id={data.id}>
      <header className="relative isolate mb-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.20), transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
              />
              Lesson {data.number}
            </div>
            <span className="font-mc-mono text-mono text-ink-faint">{data.id}</span>
            {completed && (
              <Badge tone="success" dot>
                completed
              </Badge>
            )}
          </div>
          <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-[1.05]">
            {data.title}
          </h1>
          <p className="font-mc-serif text-h3 mt-4 text-ink-soft italic border-l-2 border-l-[color:var(--border-accent-strong)] pl-4 leading-relaxed">
            {data.hook}
          </p>
        </div>
      </header>

      {/* Layer 2 — Register-2 prose with inline named-tool + reference callouts */}
      <div className="lesson-prose">
        {data.prose_blocks.map((block, i) => {
          if (block.kind === 'p') {
            return <ProseParagraph key={i} text={block.text} drawer={drawer} />;
          }
          if (block.kind === 'callout') {
            return (
              <aside key={i} className="my-6 px-5 py-4 rounded-3 border-l-2 border-mc-accent bg-[rgb(var(--accent)/0.06)]">
                <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent mb-2">{block.label}</div>
                <div className="font-mc-serif text-body-prose text-ink" dangerouslySetInnerHTML={{ __html: block.body }} />
              </aside>
            );
          }
          if (block.kind === 'example') {
            // Layer 3 — guided example
            return (
              <aside key={i} className="my-6 px-5 py-4 rounded-3 bg-surface border border-[rgb(var(--border)/0.08)]">
                <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mb-2">{block.tag}</div>
                <div className="font-mc-serif text-body-prose" dangerouslySetInnerHTML={{ __html: block.body }} />
              </aside>
            );
          }
          if (block.kind === 'visual-spec') {
            // Layer 7 — CakeOnBlocks SVG
            return (
              <div key={i} className="my-8">
                <CakeOnBlocks />
                <p className="font-mc-mono text-mono text-ink-faint text-center mt-2">{block.caption}</p>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Layer 4 — Checkpoint question */}
      <section
        className="relative isolate mt-12 px-6 py-7 rounded-5 overflow-hidden bg-[image:var(--grad-surface-elev)] border border-[color:var(--border-accent-soft)] shadow-[var(--shadow-2),var(--glow-accent-soft)]"
        aria-labelledby="checkpoint-heading"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--border-accent-strong)] to-transparent"
        />
        <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]" />
          Checkpoint
        </div>
        <h2 id="checkpoint-heading" className="font-mc-serif text-h2 font-semibold mt-2 text-ink leading-tight">
          {data.checkpoint.prompt}
        </h2>
        <ul className="mt-4 space-y-2" role="radiogroup" aria-label="Checkpoint options">
          {data.checkpoint.options.map((opt) => {
            const picked = checkpointPicked === opt.id;
            const showVerdict = picked;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  onClick={() => setCheckpointPicked(opt.id)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-3 border transition-colors duration-150 ease-eased',
                    picked
                      ? opt.correct
                        ? 'border-role-conclusion bg-[rgb(var(--role-conclusion)/0.08)]'
                        : 'border-mc-error bg-[rgb(var(--error)/0.08)]'
                      : 'border-[rgb(var(--border)/0.08)] hover:border-[rgb(var(--accent)/0.4)] hover:bg-surface',
                  ].join(' ')}
                >
                  <span className="font-mc-mono text-mono text-ink-faint mr-3">{opt.id}</span>
                  <span className="text-body">{opt.text}</span>
                  {showVerdict && (
                    <div className={[
                      'mt-2 font-mc-mono text-mono',
                      opt.correct ? 'text-role-conclusion' : 'text-mc-error',
                    ].join(' ')}>
                      {opt.correct ? '✓ ' : '✕ '}{opt.reveal}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {checkpointOption && (
          <p className="mt-4 font-mc-mono text-mono text-ink-faint">
            Checkpoints aren&apos;t graded — they&apos;re a pulse on whether the framework is landing. Move on when ready.
          </p>
        )}
      </section>

      {/* Layer 5 — Named-tool quick callouts (lateral access to the lexicon) */}
      {data.named_tool_callouts.length > 0 && (
        <section className="mt-10">
          <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mb-3">Named tools used here</div>
          <div className="flex flex-wrap gap-2">
            {data.named_tool_callouts.map((cb) => (
              <button
                key={cb.tool_id}
                type="button"
                className="named-tool-inline"
                onClick={() => drawer.open({ mode: 'named-tool', named_tool_id: cb.tool_id })}
              >
                {cb.tool_id}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Layer 6 — Reference quick callouts (drawer overlay, no URL change) */}
      {data.reference_callouts.length > 0 && (
        <section className="mt-6">
          <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mb-3">Open in reference</div>
          <div className="flex flex-wrap gap-2">
            {data.reference_callouts.map((ref) => (
              <button
                key={ref.reference_id}
                type="button"
                className="px-3 py-1.5 rounded-2 border border-[rgb(var(--border)/0.08)] hover:bg-surface font-mc-mono text-mono text-ink-soft hover:text-ink transition-colors duration-150 ease-eased"
                onClick={() => drawer.open({ mode: 'reference', reference_id: ref.reference_id })}
              >
                {ref.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Source citation — handoff §6 SBSR */}
      <footer className="mt-12 pt-6 border-t border-[rgb(var(--border)/0.08)]">
        <div className="font-mc-mono text-label uppercase tracking-wider text-ink-faint mb-2">Sources</div>
        <ul className="space-y-1">
          {data.sources.map((s) => (
            <li key={s} className="font-mc-mono text-mono text-ink-soft">{s}</li>
          ))}
        </ul>
      </footer>

      {/* Mark complete + next */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        {completed ? (
          <Button
            variant="subtle"
            disabled
            leftIcon={<Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
            className="!opacity-100 !cursor-default !pointer-events-none border-[rgb(var(--success)/0.40)] bg-[rgb(var(--success)/0.10)] text-[rgb(var(--success))]"
          >
            Lesson marked complete
          </Button>
        ) : (
          <Button
            onClick={handleMarkComplete}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}
          >
            Mark lesson complete
          </Button>
        )}
        <Link
          to="/bootcamp/intro-to-lr/lessons"
          className="inline-flex items-center gap-1.5 font-mc-mono text-mono text-ink-soft hover:text-mc-accent transition-colors duration-150 ease-eased focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          Back to Lessons
        </Link>
      </div>
    </article>
  );
}

/**
 * ProseParagraph — renders a paragraph with inline triggers for named-tool callouts.
 * Convention: any text wrapped in `[[NT-Foo]]label[[/]]` becomes a clickable inline tool callout.
 * Drawer opens in place; no URL change.
 */
function ProseParagraph({ text, drawer }: { text: string; drawer: ReturnType<typeof useDrawer> }): JSX.Element {
  const parts: Array<{ type: 'text'; value: string } | { type: 'tool'; toolId: NamedToolId; label: string }> = [];
  const re = /\[\[(NT-[A-Za-z0-9-]+)\]\](.+?)\[\[\/\]\]/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    if (m.index > lastIdx) parts.push({ type: 'text', value: text.slice(lastIdx, m.index) });
    parts.push({ type: 'tool', toolId: m[1] as NamedToolId, label: m[2]! });
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) parts.push({ type: 'text', value: text.slice(lastIdx) });

  return (
    <p>
      {parts.map((p, i) =>
        p.type === 'text' ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: p.value }} />
        ) : (
          <button
            key={i}
            type="button"
            className="named-tool-inline mx-0.5"
            onClick={() => drawer.open({ mode: 'named-tool', named_tool_id: p.toolId })}
          >
            {p.label}
          </button>
        ),
      )}
    </p>
  );
}
