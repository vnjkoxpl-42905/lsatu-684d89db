import { useEffect, useMemo, useState } from "react";
import flashcardsData from "../content/flashcards.json";
import type { FlashcardSet, FlashcardEntry } from "../types";
import {
  useRecordFlashcardReview,
  type FlashcardRating,
} from "@/components/teacher/bootcamps/hooks/useFlashcardReviews";

const DATA = flashcardsData as FlashcardSet;

type DifficultyFilter = "all" | "foundation" | "core" | "advanced";
type ConceptFilter = "all" | "glossary" | "indicator" | "verb-taxonomy";

interface ReviewState {
  cardId: string;
  intervalDays: number;
  dueIso: string;
}

const STORAGE_KEY = "lsat-u-abstract-flashcards-v1";

function loadReviews(): Record<string, ReviewState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveReviews(reviews: Record<string, ReviewState>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Storage quota exceeded or disabled; in-memory state still works.
  }
}

export function FlashcardDeck() {
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [concept, setConcept] = useState<ConceptFilter>("all");
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setReviews(loadReviews());
  }, []);

  const filtered = useMemo<FlashcardEntry[]>(() => {
    return DATA.cards.filter((c) => {
      if (difficulty !== "all" && c.difficulty_tag !== difficulty) return false;
      if (concept !== "all" && c.concept_tag !== concept) return false;
      return true;
    });
  }, [difficulty, concept]);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [difficulty, concept]);

  const card = filtered[index];
  const recordReview = useRecordFlashcardReview();

  const rate = (rating: FlashcardRating) => {
    if (!card) return;
    const multiplier =
      rating === "again" ? 0.5 : rating === "good" ? 2 : 2.5;
    const existing = reviews[card.id];
    const prev = existing?.intervalDays ?? 1;
    const nextInterval = Math.max(1, Math.round(prev * multiplier));
    const due = new Date();
    due.setDate(due.getDate() + nextInterval);
    const next = {
      ...reviews,
      [card.id]: {
        cardId: card.id,
        intervalDays: nextInterval,
        dueIso: due.toISOString(),
      },
    };
    setReviews(next);
    saveReviews(next);
    void recordReview({
      topicTag: "abstract",
      cardId: card.id,
      rating,
      intervalDays: nextInterval,
      dueAtIso: due.toISOString(),
      reviewCount: (existing ? 1 : 0) + 1,
    });
    setFlipped(false);
    setIndex((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <header className="space-y-2">
        <p className="codex-eyebrow">Appendix · Translation Cards</p>
        <h1 className="codex-display text-3xl md:text-4xl">Flashcards</h1>
        <p className="codex-marginalia">
          {filtered.length} cards in this slice · {DATA.cards.length} total
        </p>
      </header>

      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="codex-eyebrow">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as DifficultyFilter)
            }
            className="codex-mono min-h-11 rounded-sm border border-border bg-card/40 px-3 py-1 text-sm"
          >
            <option value="all">all</option>
            <option value="foundation">foundation</option>
            <option value="core">core</option>
            <option value="advanced">advanced</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="codex-eyebrow">Type</span>
          <select
            value={concept}
            onChange={(e) => setConcept(e.target.value as ConceptFilter)}
            className="codex-mono min-h-11 rounded-sm border border-border bg-card/40 px-3 py-1 text-sm"
          >
            <option value="all">all</option>
            <option value="glossary">glossary</option>
            <option value="indicator">indicator</option>
            <option value="verb-taxonomy">verb-taxonomy</option>
          </select>
        </label>
      </div>

      {!card ? (
        <p className="codex-marginalia italic">No cards in this slice.</p>
      ) : (
        <article
          className="codex-card"
          data-card-id={card.id}
        >
          <p className="codex-eyebrow">
            {card.concept_tag} · {card.difficulty_tag}
          </p>
          <div
            className="mt-4 cursor-pointer rounded-sm p-2 transition-colors hover:bg-paper-deep/40"
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-pressed={flipped}
            aria-label="Flip flashcard"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setFlipped((f) => !f);
              }
            }}
          >
            <h2 className="codex-display text-3xl md:text-4xl">{card.front}</h2>
            {flipped ? (
              <div className="mt-4 space-y-3">
                <p className="codex-prose text-base">{card.back.replace(/\*\*/g, "")}</p>
                {card.example ? (
                  <p className="codex-marginalia italic">
                    Example: {card.example}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="codex-marginalia mt-3">
                Tap or press space to flip.
              </p>
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="codex-marginalia">
              Card {index + 1} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => rate("again")}
                disabled={!flipped}
                className="codex-stamp-btn min-h-11 min-w-11"
                style={{ borderColor: "hsl(var(--state-again) / 0.5)", color: "hsl(var(--state-again))" }}
              >
                Again
              </button>
              <button
                type="button"
                onClick={() => rate("good")}
                disabled={!flipped}
                className="codex-stamp-btn min-h-11 min-w-11"
              >
                Good
              </button>
              <button
                type="button"
                onClick={() => rate("easy")}
                disabled={!flipped}
                className="codex-stamp-btn min-h-11 min-w-11"
                style={{ borderColor: "hsl(var(--state-easy) / 0.5)", color: "hsl(var(--state-easy))" }}
              >
                Easy
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
