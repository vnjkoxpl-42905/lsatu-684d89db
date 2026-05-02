/**
 * ToolCard — single Tool Lab entry. Practiced, not listed.
 *
 * Renders: name, what / when / prevents, optional example, try-it interaction
 * (pick or tag-or-not), reveal.
 */

import { useState } from 'react';
import { Check, X as XIcon, Wrench } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { ToolCard as ToolCardData } from '@/bootcamps/main-conclusion/content/tool-lab.source';

interface Props {
  tool: ToolCardData;
}

export function ToolCard({ tool }: Props): JSX.Element {
  return (
    <Card variant="surface" className="space-y-5">
      <header className="flex items-start gap-3">
        <span
          className={cn(
            'shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-3',
            'bg-[image:var(--grad-accent-soft)]',
            'border border-[color:var(--border-accent-soft)]',
            'text-mc-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
          )}
          aria-hidden="true"
        >
          <Wrench className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            Training tool
          </div>
          <h3 className="font-mc-serif text-h2 font-semibold mt-1 text-ink leading-tight">
            {tool.name}
          </h3>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <ToolBlurb label="What it does" body={tool.what_it_does} />
        <ToolBlurb label="When to use" body={tool.when_to_use} />
        <ToolBlurb label="What it prevents" body={tool.prevents} />
      </div>

      {tool.example ? (
        <p className="font-mc-serif text-body text-ink-soft italic border-l-2 border-l-[color:var(--border-accent-strong)] pl-3 leading-relaxed">
          {tool.example}
        </p>
      ) : null}

      <TryIt tool={tool} />
    </Card>
  );
}

function ToolBlurb({ label, body }: { label: string; body: string }): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-3 px-4 py-3',
        'bg-[image:var(--grad-surface-soft)]',
        'border border-[rgb(var(--border)/0.08)]',
      )}
    >
      <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </div>
      <p className="mt-2 font-mc-serif text-body text-ink leading-relaxed">{body}</p>
    </div>
  );
}

function TryIt({ tool }: { tool: ToolCardData }): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-3 p-4',
        'bg-[image:var(--grad-surface-elev)]',
        'border border-[color:var(--border-accent-soft)]',
        'shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]',
      )}
    >
      <div className="flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent mb-3">
        <span
          aria-hidden="true"
          className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
        />
        Try it
      </div>
      {tool.try_it.kind === 'pick' ? (
        <TryPick item={tool.try_it} />
      ) : (
        <TryTagOrNot item={tool.try_it} />
      )}
    </div>
  );
}

function TryPick({ item }: { item: Extract<ToolCardData['try_it'], { kind: 'pick' }> }): JSX.Element {
  const [picked, setPicked] = useState<string | null>(null);
  const pickedOpt = item.options.find((o) => o.id === picked) ?? null;

  return (
    <div className="space-y-3">
      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">{item.prompt}</p>
      <ul className="space-y-2" role="radiogroup">
        {item.options.map((o) => {
          const isPicked = picked === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isPicked}
                onClick={() => setPicked(o.id)}
                className={cn(
                  'group/opt w-full text-left rounded-3 border px-3.5 py-2.5',
                  'transition-[border-color,background] duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                  !isPicked &&
                    'bg-[image:var(--grad-surface-soft)] border-[rgb(var(--border)/0.10)] hover:border-[color:var(--border-accent-soft)]',
                  isPicked && o.correct &&
                    'bg-[rgb(var(--success)/0.08)] border-[rgb(var(--success)/0.50)]',
                  isPicked && !o.correct &&
                    'bg-[rgb(var(--error)/0.08)] border-[rgb(var(--error)/0.50)]',
                )}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full',
                      'font-mc-mono text-[10.5px] font-semibold',
                      isPicked && o.correct &&
                        'bg-[rgb(var(--success)/0.18)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.50)]',
                      isPicked && !o.correct &&
                        'bg-[rgb(var(--error)/0.18)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.50)]',
                      !isPicked &&
                        'bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.10)]',
                    )}
                  >
                    {o.id}
                  </span>
                  <span className="font-mc-serif text-body text-ink leading-relaxed flex-1">
                    {o.text}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {pickedOpt ? (
        <div
          className={cn(
            'rounded-3 px-3 py-2 border-l-4',
            pickedOpt.correct
              ? 'bg-[rgb(var(--success)/0.06)] border-l-[rgb(var(--success))]'
              : 'bg-[rgb(var(--warn)/0.06)] border-l-[rgb(var(--warn))]',
          )}
        >
          <p className="font-mc-serif text-body text-ink leading-relaxed">
            <span
              className={cn(
                'font-mc-mono text-mono uppercase tracking-wider mr-2',
                pickedOpt.correct ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--warn))]',
              )}
            >
              {pickedOpt.correct ? 'Right' : 'Off'}
            </span>
            {pickedOpt.reveal}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TryTagOrNot({
  item,
}: {
  item: Extract<ToolCardData['try_it'], { kind: 'tag-or-not' }>;
}): JSX.Element {
  const [answer, setAnswer] = useState<boolean | null>(null);
  const submitted = answer !== null;
  const correct = answer === item.expected;

  // Highlight the target inside the sentence.
  const targetIdx = item.sentence.indexOf(item.target);
  const before = targetIdx >= 0 ? item.sentence.slice(0, targetIdx) : item.sentence;
  const tgt = targetIdx >= 0 ? item.target : '';
  const after = targetIdx >= 0 ? item.sentence.slice(targetIdx + item.target.length) : '';

  return (
    <div className="space-y-3">
      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
        Does this tool apply to the highlighted phrase?
      </p>
      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
        {before}
        {tgt ? (
          <span
            className={cn(
              'rounded-2 px-1.5 py-0.5 mx-0.5 align-baseline',
              !submitted &&
                'bg-[rgb(var(--accent)/0.14)] text-mc-accent border border-[color:var(--border-accent-soft)]',
              submitted && correct &&
                'bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.50)]',
              submitted && !correct &&
                'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.50)]',
            )}
          >
            {tgt}
          </span>
        ) : null}
        {after}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={answer === true ? 'primary' : 'subtle'}
          size="sm"
          disabled={submitted}
          onClick={() => setAnswer(true)}
          leftIcon={<Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
        >
          Tool applies
        </Button>
        <Button
          variant={answer === false ? 'primary' : 'subtle'}
          size="sm"
          disabled={submitted}
          onClick={() => setAnswer(false)}
          leftIcon={<XIcon className="h-3.5 w-3.5" strokeWidth={2.4} />}
        >
          Tool does not apply
        </Button>
      </div>
      {submitted ? (
        <div
          className={cn(
            'rounded-3 px-3 py-2 border-l-4',
            correct
              ? 'bg-[rgb(var(--success)/0.06)] border-l-[rgb(var(--success))]'
              : 'bg-[rgb(var(--warn)/0.06)] border-l-[rgb(var(--warn))]',
          )}
        >
          <p className="font-mc-serif text-body text-ink leading-relaxed">
            <span
              className={cn(
                'font-mc-mono text-mono uppercase tracking-wider mr-2',
                correct ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--warn))]',
              )}
            >
              {correct ? 'Right' : 'Off'}
            </span>
            {answer === item.expected ? item.reveal_yes : item.reveal_no}
          </p>
        </div>
      ) : null}
    </div>
  );
}
