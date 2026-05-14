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
      <div className="codex-card-soft p-6 text-center">
        <p className="codex-marginalia">Decoder cards loading.</p>
        <button
          type="button"
          className="codex-btn-ghost mt-2 min-h-11"
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
          className="codex-btn-ghost min-h-11"
          aria-label="Previous decoder card"
        >
          ← Prev
        </button>
        <div className="hidden items-center gap-1 md:flex">
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
          className="codex-btn-ghost min-h-11"
          aria-label="Next decoder card"
        >
          Next →
        </button>
      </nav>
      <p className="codex-marginalia text-center">
        Card {cardIndex + 1} of {total}
      </p>
    </section>
  );
}
