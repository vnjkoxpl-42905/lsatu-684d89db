import { cn } from '@/lib/utils';
import type { ReplyQuoteData } from './replyUtils';

interface Props {
  quote: ReplyQuoteData;
  /** `ink` sits on the dark instructor bubble, `paper` on the light one. */
  tone: 'ink' | 'paper';
  onJump?: (messageId: string) => void;
}

/** The small quoted block at the top of a reply. Tapping it scrolls to the
 *  original; a deleted original is shown as plain, inert text. */
export function ReplyQuote({ quote, tone, onJump }: Props) {
  const shell = cn(
    'mb-2 block w-full min-w-0 rounded-[10px] border-l-[3px] px-2.5 py-1.5 text-left',
    tone === 'ink'
      ? 'border-white/60 bg-white/[0.14] text-[var(--msg-bubble-ink-text)]'
      : 'border-[var(--msg-accent)] bg-[var(--msg-accent-soft)] text-[var(--msg-ink)]',
  );

  if (quote.deleted === true) {
    return (
      <div className={cn(shell, 'text-[12.5px] italic opacity-75')}>Message deleted</div>
    );
  }
  const { author, text } = quote as Extract<ReplyQuoteData, { deleted: false }>;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onJump?.(quote.id);
      }}
      aria-label={`Replying to ${author}: ${text}. Jump to message`}
      className={cn(
        shell,
        'cursor-pointer transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--msg-accent)]',
      )}
    >
      <span className="block truncate text-[11.5px] font-bold leading-tight opacity-90">
        {author}
      </span>
      <span className="mt-0.5 line-clamp-2 block text-[12.5px] font-medium leading-snug opacity-85">
        {text}
      </span>
    </button>
  );
}
