import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { RcMarkdown } from './RcMarkdown';
import type { RcChoice } from '../lib/rcTypes';

/**
 * The per-choice disclosure row beneath a choice in review.
 *
 * This mirrors the LR drill's InlineChoiceExplanation and keeps its two rules:
 * never invent content, and a choice with nothing real to say gets no row at
 * all rather than an empty shell. It is a separate component because RC needs
 * two things that one does not do: a dual tag ("Too Strong / Opposite") splits
 * into two chips, and the prose is markdown rather than plain text.
 */

interface Props {
  choice: RcChoice;
  isPicked: boolean;
  open: boolean;
  onToggle: () => void;
}

/** Dual tags are one string joined with " / ". Split on exactly that. */
export function splitTag(tag: string | null): string[] {
  if (!tag) return [];
  return tag
    .split(' / ')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * A choice with no tag and no explanation gets no row at all, even when a
 * response percentage exists: a row carrying only "1% of students" is the empty
 * shell the design rules out. The student's own pick always gets a row so they
 * can find it.
 */
export function isDisclosureEmpty(choice: RcChoice, isPicked: boolean): boolean {
  if (isPicked) return false;
  return !choice.tag && !choice.explanation;
}

export function RcChoiceDisclosure({ choice, isPicked, open, onToggle }: Props) {
  if (isDisclosureEmpty(choice, isPicked)) return null;

  const tags = splitTag(choice.tag);
  const hasProse = !!choice.explanation && choice.explanation.trim().length > 0;
  const panelId = `rc-choice-note-${choice.letter}`;

  return (
    <div className="rc-disclosure">
      <div className="rc-disclosure-meta">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`rc-tag-chip${choice.correct ? ' rc-tag-correct' : ''}`}
          >
            {tag}
          </span>
        ))}
        {choice.percent != null && (
          <span className="rc-disclosure-percent">{choice.percent}% imported answer share</span>
        )}
        {isPicked && <span className="rc-tag-chip rc-tag-outline">Your answer</span>}
      </div>

      {hasProse && (
        <>
          <button
            type="button"
            className="rc-disclosure-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <ChevronRight
              size={14}
              aria-hidden
              style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }}
            />
            {choice.correct ? 'Why this is correct' : 'Why this is wrong'}
          </button>
          {open && (
            <div id={panelId} className="rc-disclosure-body">
              <RcMarkdown>{choice.explanation}</RcMarkdown>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RcChoiceDisclosure;
