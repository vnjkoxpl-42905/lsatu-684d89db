import { useCallback, useEffect, useMemo, useState } from "react";
import type { DecoderCard } from "../types";

export interface UseDecoderProgressionOptions {
  autoAdvance?: boolean;
  autoAdvanceMs?: number;
}

export interface UseDecoderProgressionResult {
  cardIndex: number;
  card: DecoderCard;
  total: number;
  next: () => void;
  prev: () => void;
  jumpTo: (i: number) => void;
}

export function useDecoderProgression(
  cards: DecoderCard[],
  opts: UseDecoderProgressionOptions = {},
): UseDecoderProgressionResult {
  const { autoAdvance = false, autoAdvanceMs = 6000 } = opts;
  const [cardIndex, setCardIndex] = useState(0);
  const total = cards.length;

  const next = useCallback(
    () => setCardIndex((i) => (i + 1) % Math.max(total, 1)),
    [total],
  );
  const prev = useCallback(
    () => setCardIndex((i) => (i - 1 + total) % Math.max(total, 1)),
    [total],
  );
  const jumpTo = useCallback(
    (i: number) =>
      setCardIndex(() =>
        total === 0 ? 0 : ((i % total) + total) % total,
      ),
    [total],
  );

  useEffect(() => {
    if (!autoAdvance || total <= 1) return;
    const id = setTimeout(next, autoAdvanceMs);
    return () => clearTimeout(id);
  }, [autoAdvance, autoAdvanceMs, cardIndex, total, next]);

  return useMemo(
    () => ({
      cardIndex,
      card: cards[cardIndex] ?? cards[0],
      total,
      next,
      prev,
      jumpTo,
    }),
    [cardIndex, cards, total, next, prev, jumpTo],
  );
}
