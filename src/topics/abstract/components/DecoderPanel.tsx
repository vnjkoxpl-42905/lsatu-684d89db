import decoderCards from "../content/stimuli/decoder-cards.json";
import type { DecoderCard as DecoderCardData } from "../types";
import { DecoderCard } from "./DecoderCard";
import { useDecoderProgression } from "../hooks/useDecoderProgression";

const CARDS = decoderCards as { cards: DecoderCardData[] };

export interface DecoderPanelProps {
  cardSetId?: string;
  autoAdvance?: boolean;
}

export function DecoderPanel({ autoAdvance = false }: DecoderPanelProps) {
  const cards = CARDS.cards;

  if (!cards.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Decoder cards loading.
        <button
          type="button"
          className="ml-2 underline"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const { card, cardIndex, total, next, prev, jumpTo } = useDecoderProgression(
    cards,
    { autoAdvance },
  );

  return (
    <section
      aria-label="Decoder cards"
      className="decoder-panel my-4 space-y-3"
    >
      <DecoderCard card={card} />
      <nav
        aria-label="Decoder pagination"
        className="flex items-center justify-between gap-2"
      >
        <button
          type="button"
          onClick={prev}
          className="min-h-11 rounded-md border border-border px-3 py-1 text-sm hover:bg-secondary"
          aria-label="Previous decoder card"
        >
          ← Prev
        </button>
        <div className="flex items-center gap-1">
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Go to decoder card ${i + 1} of ${total}`}
              aria-current={i === cardIndex ? "true" : undefined}
              onClick={() => jumpTo(i)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === cardIndex ? "bg-primary" : "bg-border"
                }`}
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="min-h-11 rounded-md border border-border px-3 py-1 text-sm hover:bg-secondary"
          aria-label="Next decoder card"
        >
          Next →
        </button>
      </nav>
      <p className="text-center text-xs text-muted-foreground">
        Card {cardIndex + 1} of {total}
      </p>
    </section>
  );
}
