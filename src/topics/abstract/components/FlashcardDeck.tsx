import { useEffect, useMemo, useState } from "react";
import flashcardsData from "../content/flashcards.json";
import type { FlashcardSet, FlashcardEntry } from "../types";
import { useDrillDarkMode } from "../hooks/useAbstractDrill";
import {
  useRecordFlashcardReview,
  type FlashcardRating,
} from "@/components/teacher/bootcamps/hooks/useFlashcardReviews";

const DATA = flashcardsData as FlashcardSet;

type DifficultyFilter = "all" | "foundation" | "core" | "advanced";
type ConceptFilter = "all" | "glossary" | "indicator" | "verb-taxonomy";

// FlashcardDeck: SRS-compatible self-review deck. Front/back flip; the student
// rates Again / Good / Easy. Intervals double on Good, halve on Again, x2.5 on
// Easy. Persisted to localStorage only for now since the brief permits an
// SRS-compatible schema without yet wiring flashcard_reviews.

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
  useDrillDarkMode();
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
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-lg font-semibold">Flashcards · Abstract</h1>
        <p className="text-sm text-muted-foreground">
          {filtered.length} cards in this slice · {DATA.cards.length} total
        </p>
      </header>
      <div className="flex flex-wrap gap-2 text-sm">
        <label className="flex items-center gap-1">
          <span className="text-muted-foreground">Difficulty:</span>
          <select
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as DifficultyFilter)
            }
            className="min-h-11 rounded-md border border-border bg-background px-2 py-1"
          >
            <option value="all">all</option>
            <option value="foundation">foundation</option>
            <option value="core">core</option>
            <option value="advanced">advanced</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-muted-foreground">Type:</span>
          <select
            value={concept}
            onChange={(e) => setConcept(e.target.value as ConceptFilter)}
            className="min-h-11 rounded-md border border-border bg-background px-2 py-1"
          >
            <option value="all">all</option>
            <option value="glossary">glossary</option>
            <option value="indicator">indicator</option>
            <option value="verb-taxonomy">verb-taxonomy</option>
          </select>
        </label>
      </div>
      {!card ? (
        <p className="text-sm italic text-muted-foreground">
          No cards in this slice.
        </p>
      ) : (
        <article
          className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm"
          data-card-id={card.id}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {card.concept_tag} · {card.difficulty_tag}
          </p>
          <div
            className="mt-3 cursor-pointer rounded-md p-2 transition-colors hover:bg-secondary/40"
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
            <h2 className="text-2xl font-semibold">{card.front}</h2>
            {flipped ? (
              <div className="mt-3 space-y-2 text-sm leading-relaxed">
                <p>{card.back.replace(/\*\*/g, "")}</p>
                {card.example ? (
                  <p className="text-xs italic text-muted-foreground">
                    Example: {card.example}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Tap or press space to flip.
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Card {index + 1} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => rate("again")}
                disabled={!flipped}
                className="min-h-11 min-w-11 rounded-md border border-state-incorrect/60 px-3 py-1 text-sm text-state-incorrect disabled:opacity-40"
              >
                Again
              </button>
              <button
                type="button"
                onClick={() => rate("good")}
                disabled={!flipped}
                className="min-h-11 min-w-11 rounded-md border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Good
              </button>
              <button
                type="button"
                onClick={() => rate("easy")}
                disabled={!flipped}
                className="min-h-11 min-w-11 rounded-md border border-state-correct/60 px-3 py-1 text-sm text-state-correct disabled:opacity-40"
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
