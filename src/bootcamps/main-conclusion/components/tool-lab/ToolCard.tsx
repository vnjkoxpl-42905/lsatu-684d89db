/**
 * ToolCard. Single Tool Lab entry. Reads as a lesson section, not a dashboard card.
 *
 * Renders: name, what / when / prevents (vertical study-note stack),
 * optional example, try-it interaction (pick or tag-or-not), reveal.
 */

import { useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { ToolCard as ToolCardData } from '@/bootcamps/main-conclusion/content/tool-lab.source';

interface Props {
  tool: ToolCardData;
}

export function ToolCard({ tool }: Props): JSX.Element {
  return (
    <section id={tool.slug} className="scroll-mt-24 space-y-6">
      <header>
        <div className="font-mc-mono text-[10px] uppercase tracking-[0.22em] text-mc-accent inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]"
          />
          Training tool
        </div>
        <h3 className="font-mc-serif text-[26px] font-semibold mt-3 text-[rgb(var(--ink))] leading-tight">
          {tool.name}
        </h3>
      </header>

      <div className="grid gap-6">
        <ToolBlurb label="What it does" body={tool.what_it_does} />
        <ToolBlurb label="When to use" body={tool.when_to_use} />
        <ToolBlurb label="What it prevents" body={tool.prevents} />
      </div>

      {tool.example ? (
        <p className="font-mc-serif text-[16px] text-[rgb(var(--ink-soft))] italic border-l border-l-[rgb(var(--accent))] pl-4 leading-relaxed">
          {tool.example}
        </p>
      ) : null}

      <TryIt tool={tool} />
    </section>
  );
}

function ToolBlurb({ label, body }: { label: string; body: string }): JSX.Element {
  return (
    <div>
      <div className="font-mc-mono text-[10px] uppercase tracking-[0.20em] text-[rgb(var(--ink-faint))]">
        {label}
      </div>
      <p className="mt-2 font-mc-serif text-[15.5px] text-[rgb(var(--ink))] leading-[1.65]">{body}</p>
    </div>
  );
}

function TryIt({ tool }: { tool: ToolCardData }): JSX.Element {
  return (
    <div
      className={cn(
        'mt-8 rounded-[2px] px-6 py-6',
        'bg-[rgb(var(--surface-elev))]',
        'border border-[rgb(var(--border)/0.12)]',
      )}
    >
      <div className="flex items-center gap-2 font-mc-mono text-[10px] uppercase tracking-[0.20em] text-[rgb(var(--accent))] mb-4">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]"
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
                    'bg-transparent border-[rgb(var(--border)/0.10)] hover:border-[color:var(--border-accent-soft)]',
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
            'rounded-3 px-3 py-2 border',
            pickedOpt.correct
              ? 'bg-[rgb(var(--success)/0.06)] border-[rgb(var(--success)/0.40)]'
              : 'bg-[rgb(var(--warn)/0.06)] border-[rgb(var(--warn)/0.40)]',
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
            'rounded-3 px-3 py-2 border',
            correct
              ? 'bg-[rgb(var(--success)/0.06)] border-[rgb(var(--success)/0.40)]'
              : 'bg-[rgb(var(--warn)/0.06)] border-[rgb(var(--warn)/0.40)]',
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
