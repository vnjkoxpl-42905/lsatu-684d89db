import { Fragment, type ReactNode } from "react";

// Activity prompts are authored text, and two Activities depend on that text
// carrying structure the panel has to honour.
//
// Spot the Callback marks the callback phrase inline (**"that cartographic
// insulation"**) and its passages are two paragraphs. Vocab Rehab marks the
// target word (*capricious*). Rendering the prompt as a plain string would show
// the asterisks and collapse the paragraph break, so the panel parses a
// deliberately tiny subset of markdown: **strong**, *emphasis*, and a blank
// line as a paragraph break. Nothing else, because nothing else is authored.

/** Longest prompt that still reads well at the display size. */
const DISPLAY_MAX = 180;
/** Above this the prompt is a passage, not a statement, and wants body type. */
const STATEMENT_MAX = 420;

export type PromptScale = "display" | "statement" | "passage";

/**
 * Statements get display type; a Callback passage at display size would be
 * unreadable, so the prompt's own shape picks the ramp step rather than a
 * per-Activity flag.
 *
 * Structure decides before length does. Anything the author broke into more
 * than one paragraph is a passage to be read, not a statement to be stared at,
 * however short it happens to be. Only single-paragraph prompts fall through to
 * the length bands.
 */
export function promptScale(prompt: string): PromptScale {
  if (/\n{2,}/.test(prompt.trim())) return "passage";
  if (prompt.length <= DISPLAY_MAX) return "display";
  if (prompt.length <= STATEMENT_MAX) return "statement";
  return "passage";
}

/**
 * Weight travels with size on purpose. A statement is a few words to be stared
 * at and carries the display weight; a passage is several hundred words to be
 * read, and semibold Fraunces at that length fights the reader.
 */
export const PROMPT_SCALE_CLASS: Record<PromptScale, string> = {
  display: "text-2xl font-semibold leading-snug md:text-[32px]",
  statement: "text-xl font-semibold leading-snug md:text-2xl",
  passage: "text-lg font-normal leading-relaxed md:text-xl",
};

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

/**
 * Inline **strong** and *emphasis* within one paragraph.
 *
 * Exported because prompts are not the only authored text carrying these marks:
 * Vocab Rehab's clue lines mark morphemes (`prefix *a-* = not`) and its
 * explanations mark the near-miss word. Anything rendering authored text has to
 * come through here rather than stripping the marks or printing them.
 */
export function renderInlineMarks(text: string, keyPrefix = "inline"): ReactNode[] {
  return renderInline(text, keyPrefix);
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(TOKEN).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key} className="italic">{part.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

/**
 * Split on blank lines into paragraphs, then render each one's inline marks.
 * A single-paragraph prompt returns one block, so the common case is unchanged.
 */
export function renderPrompt(prompt: string): ReactNode[] {
  return prompt
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((paragraph, i) => (
      <p key={`p-${i}`} className={i > 0 ? "mt-4" : undefined}>
        {renderInline(paragraph, `p-${i}`)}
      </p>
    ));
}
