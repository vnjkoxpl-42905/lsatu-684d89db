import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { RcMarkdown } from './RcMarkdown';
import type { RcExplanationBlock } from '../lib/rcTypes';

/**
 * The authored walkthrough for a question, disclosed progressively rather than
 * dumped as a wall of text. Blocks render in their authored order with their
 * headings; a block with no heading is body-only.
 *
 * All blocks start closed, except after a wrong answer, when the first one opens
 * so the student lands on the reasoning they missed.
 */

interface Props {
  blocks: RcExplanationBlock[];
  /** Opens the first block on mount. Set when the student answered incorrectly. */
  openFirst: boolean;
  /** Changing this resets which blocks are open. */
  resetKey: string | number;
}

export function RcExplanationBlocks({ blocks, openFirst, resetKey }: Props) {
  const disclosureId = React.useId();
  const [open, setOpen] = React.useState<Set<number>>(() => new Set(openFirst ? [0] : []));

  React.useEffect(() => {
    setOpen(new Set(openFirst ? [0] : []));
  }, [resetKey, openFirst]);

  if (blocks.length === 0) return null;

  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="rc-blocks">
      {blocks.map((block, index) => {
        const isOpen = open.has(index);
        const heading = block.heading ?? 'Walkthrough';
        return (
          <div key={`${heading}-${index}`} className="rc-block">
            <button
              type="button"
              className="rc-block-toggle"
              aria-expanded={isOpen}
              aria-controls={`${disclosureId}-${index}`}
              onClick={() => toggle(index)}
            >
              <ChevronRight
                size={14}
                aria-hidden
                style={{
                  transform: isOpen ? 'rotate(90deg)' : undefined,
                  transition: 'transform .2s',
                }}
              />
              {heading}
            </button>
            {isOpen && (
              <div id={`${disclosureId}-${index}`} className="rc-block-body">
                <RcMarkdown>{block.body}</RcMarkdown>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default RcExplanationBlocks;
