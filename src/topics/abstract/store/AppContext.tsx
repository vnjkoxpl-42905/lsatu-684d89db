import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type {
  BootcampMutationResult,
  BootcampState,
  CardReview,
  ConfidenceLevel,
  DrillType,
  GauntletAttempt,
  TranslatorAttempt,
  ViewState,
} from "../types";
import {
  fetchDrillAttempts,
  fetchGauntletAttempts,
  fetchLatestFinalSetScore,
  fetchLessonProgress,
  fetchTranslatorAttempts,
  insertDrillAttempt,
  insertFlashcardReview,
  insertGauntletAttempt,
  insertTranslatorAttempt,
  isSessionDeadError,
  recordChapterProgress,
  upsertFinalSetScore,
  upsertLessonProgress,
} from "../lib/supabase-progress";
import { computeNextReview } from "../lib/srs";
import type { FlashcardRating } from "@/components/teacher/bootcamps/hooks/useFlashcardReviews";

interface AppContextType {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  bootcampState: BootcampState;
  loading: boolean;
  markLessonComplete: (lessonId: string) => Promise<BootcampMutationResult>;
  markDrillComplete: (
    drillId: string,
    drillType: DrillType,
    correct: boolean,
    selectedIndex?: number,
    confidence?: ConfidenceLevel,
    trapTag?: string,
  ) => Promise<BootcampMutationResult>;
  recordGauntletItem: (
    attempt: Omit<GauntletAttempt, "completedAt">,
  ) => Promise<BootcampMutationResult>;
  markTranslatorComplete: (
    stemNumber: number,
    keywordsPicked: string[],
    translationText: string,
  ) => Promise<BootcampMutationResult>;
  updateCardReview: (cardId: string, status: CardReview["status"]) => void;
  rateCard: (cardId: string, rating: FlashcardRating) => Promise<BootcampMutationResult>;
  setFinalScore: (score: number, total: number) => Promise<BootcampMutationResult>;
}

const TOPIC_TAG = "abstract";

const defaultState: BootcampState = {
  completedLessons: [],
  completedDrills: [],
  drillAttempts: [],
  gauntletAttempts: [],
  translatorAttempts: [],
  cards: {},
  drillsStats: {},
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Local cache for flashcard reviews. flashcard_reviews persistence is owned
// by the existing useFlashcardReviews hook in
// src/components/teacher/bootcamps; this cache holds the optimistic view
// state so the Flashcards UI stays snappy. v2.1 will route all writes
// through that hook.
const CARDS_LOCAL_KEY = "lsatu_abstract_v2_cards";

function loadCardsCache(): Record<string, CardReview> {
  try {
    const raw = localStorage.getItem(CARDS_LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load Abstract v2 cards cache", e);
  }
  return {};
}

function persistCardsCache(cards: Record<string, CardReview>) {
  try {
    localStorage.setItem(CARDS_LOCAL_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error("Failed to persist Abstract v2 cards cache", e);
  }
}

function describeError(error: unknown): string | undefined {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return undefined;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");
  const [bootcampState, setBootcampState] = useState<BootcampState>(() => ({
    ...defaultState,
    cards: loadCardsCache(),
  }));
  const [loading, setLoading] = useState(true);

  // Hydrate from Supabase on mount whenever we have an authed user.
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [lessons, drills, gauntlets, translators, finalSet] = await Promise.all([
          fetchLessonProgress(user.id),
          fetchDrillAttempts(user.id),
          fetchGauntletAttempts(user.id),
          fetchTranslatorAttempts(user.id),
          fetchLatestFinalSetScore(user.id),
        ]);
        if (cancelled) return;
        const drillsStats: BootcampState["drillsStats"] = {};
        for (const row of drills) {
          const key = row.drill_type as DrillType;
          const prior = drillsStats[key] ?? { correct: 0, total: 0 };
          drillsStats[key] = {
            correct: prior.correct + (row.correct ? 1 : 0),
            total: prior.total + 1,
          };
        }
        const completedDrillIds = Array.from(new Set(drills.map((r) => r.drill_id)));
        setBootcampState((prev) => ({
          ...prev,
          completedLessons: lessons.map((r) => r.lessonId),
          completedDrills: completedDrillIds,
          drillAttempts: drills.map((r) => ({
            drillId: r.drill_id,
            drillType: r.drill_type as DrillType,
            selectedIndex: r.selected_index,
            correct: r.correct,
            confidence: r.confidence as ConfidenceLevel,
            trapTag: r.trap_tag ?? undefined,
            completedAt: r.completed_at,
          })),
          gauntletAttempts: gauntlets.map((r) => ({
            choiceId: r.choice_id,
            keywordsPicked: r.keywords_picked ?? [],
            translationText: r.translation_text ?? "",
            requirementsChecked: r.requirements_checked ?? [],
            correctCount: r.correct_count ?? 0,
            completedAt: r.completed_at,
          })),
          translatorAttempts: translators.map((r) => ({
            stemNumber: r.stem_number,
            keywordsPicked: r.keywords_picked ?? [],
            translationText: r.translation_text ?? "",
            completedAt: r.completed_at,
          })),
          drillsStats,
          finalSetScore: finalSet
            ? {
                score: finalSet.score,
                total: finalSet.total,
                completedAt: finalSet.completed_at,
              }
            : undefined,
        }));
      } catch (err) {
        if (isSessionDeadError(err)) {
          toast.error("Your session expired. Please sign in again.");
        } else {
          console.error("Failed to hydrate Abstract v2 state", err);
          toast.error("Could not load your Abstract bootcamp progress.", {
            description: describeError(err),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authReady]);

  const markLessonComplete = useCallback(
    async (lessonId: string): Promise<BootcampMutationResult> => {
      setBootcampState((prev) =>
        prev.completedLessons.includes(lessonId)
          ? prev
          : { ...prev, completedLessons: [...prev.completedLessons, lessonId] },
      );

      if (!user) return { ok: true };

      const writeRes = await upsertLessonProgress(user.id, lessonId);
      if (!writeRes.ok) {
        if (isSessionDeadError(writeRes.error)) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Could not save lesson completion.", {
            description: describeError(writeRes.error),
          });
        }
        return writeRes;
      }

      // Analytics mirror so the teacher Bootcamps dashboard sees this lesson.
      const mirror = await recordChapterProgress(user.id, TOPIC_TAG, lessonId);
      if (!mirror.ok) {
        console.error("chapter_progress mirror failed for lesson", lessonId, mirror.error);
      }
      return { ok: true };
    },
    [user],
  );

  const markDrillComplete = useCallback(
    async (
      drillId: string,
      drillType: DrillType,
      correct: boolean,
      selectedIndex: number = -1,
      confidence: ConfidenceLevel = "Pretty sure",
      trapTag?: string,
    ): Promise<BootcampMutationResult> => {
      const completedAt = new Date().toISOString();
      setBootcampState((prev) => {
        const stats = prev.drillsStats[drillType] || { correct: 0, total: 0 };
        return {
          ...prev,
          completedDrills: prev.completedDrills.includes(drillId)
            ? prev.completedDrills
            : [...prev.completedDrills, drillId],
          drillAttempts: [
            ...prev.drillAttempts,
            { drillId, drillType, selectedIndex, correct, confidence, trapTag, completedAt },
          ],
          drillsStats: {
            ...prev.drillsStats,
            [drillType]: {
              correct: stats.correct + (correct ? 1 : 0),
              total: stats.total + 1,
            },
          },
        };
      });

      if (!user) return { ok: true };

      const res = await insertDrillAttempt(user.id, {
        drillId,
        drillType,
        selectedIndex,
        correct,
        confidence,
        trapTag,
      });
      if (!res.ok) {
        if (isSessionDeadError(res.error)) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Could not save drill attempt.", {
            description: describeError(res.error),
          });
        }
      }
      return res;
    },
    [user],
  );

  const markTranslatorComplete = useCallback(
    async (
      stemNumber: number,
      keywordsPicked: string[],
      translationText: string,
    ): Promise<BootcampMutationResult> => {
      const completedAt = new Date().toISOString();
      setBootcampState((prev) => ({
        ...prev,
        translatorAttempts: [
          ...prev.translatorAttempts,
          { stemNumber, keywordsPicked, translationText, completedAt },
        ],
      }));

      if (!user) return { ok: true };

      const res = await insertTranslatorAttempt(user.id, {
        stemNumber,
        keywordsPicked,
        translationText,
      });
      if (!res.ok) {
        if (isSessionDeadError(res.error)) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Could not save translator attempt.", {
            description: describeError(res.error),
          });
        }
        return res;
      }

      // Mirror to chapter_progress so the teacher Bootcamps dashboard sees
      // per-stem translator activity. Chapter id namespace mirrors the
      // pattern used for lesson completion.
      const mirror = await recordChapterProgress(
        user.id,
        TOPIC_TAG,
        `translator_stem_${stemNumber}`,
      );
      if (!mirror.ok) {
        console.error("chapter_progress mirror failed for translator stem", stemNumber, mirror.error);
      }
      return { ok: true };
    },
    [user],
  );

  const recordGauntletItem = useCallback(
    async (
      attempt: Omit<GauntletAttempt, "completedAt">,
    ): Promise<BootcampMutationResult> => {
      const completedAt = new Date().toISOString();
      setBootcampState((prev) => ({
        ...prev,
        gauntletAttempts: [...prev.gauntletAttempts, { ...attempt, completedAt }],
      }));

      if (!user) return { ok: true };
      const res = await insertGauntletAttempt(user.id, attempt);
      if (!res.ok) {
        if (isSessionDeadError(res.error)) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Could not save gauntlet attempt.", {
            description: describeError(res.error),
          });
        }
      }
      return res;
    },
    [user],
  );

  const updateCardReview = useCallback((cardId: string, status: CardReview["status"]) => {
    setBootcampState((prev) => {
      const currentCard = prev.cards[cardId] || { cardId, status: "unseen", reviewCount: 0 };
      const nextCards = {
        ...prev.cards,
        [cardId]: {
          ...currentCard,
          status,
          lastReviewedAt: new Date().toISOString(),
          reviewCount: currentCard.reviewCount + 1,
        },
      };
      persistCardsCache(nextCards);
      return { ...prev, cards: nextCards };
    });
  }, []);

  const rateCard = useCallback(
    async (cardId: string, rating: FlashcardRating): Promise<BootcampMutationResult> => {
      const reviewedAt = new Date().toISOString();
      let next: ReturnType<typeof computeNextReview> | null = null;
      let nextReviewCount = 1;

      setBootcampState((prev) => {
        const currentCard = prev.cards[cardId] || { cardId, status: "unseen" as const, reviewCount: 0 };
        next = computeNextReview(rating, currentCard.intervalDays ?? 0, currentCard.reviewCount);
        nextReviewCount = currentCard.reviewCount + 1;
        // Status policy: "again" walks back to "reviewing", "easy" promotes
        // a card to "mastered" once it's been seen at least twice, every
        // other rating settles the card at "reviewing".
        let nextStatus: CardReview["status"] = "reviewing";
        if (rating === "again") nextStatus = "reviewing";
        else if (rating === "easy" && nextReviewCount >= 2) nextStatus = "mastered";
        const nextCards = {
          ...prev.cards,
          [cardId]: {
            ...currentCard,
            status: nextStatus,
            lastReviewedAt: reviewedAt,
            reviewCount: nextReviewCount,
            rating,
            intervalDays: next.intervalDays,
            dueAtIso: next.dueAtIso,
          },
        };
        persistCardsCache(nextCards);
        return { ...prev, cards: nextCards };
      });

      if (!user || !next) return { ok: true };

      const res = await insertFlashcardReview(user.id, {
        topicTag: TOPIC_TAG,
        cardId,
        rating,
        intervalDays: next.intervalDays,
        dueAtIso: next.dueAtIso,
        reviewCount: nextReviewCount,
      });
      if (!res.ok) {
        if (isSessionDeadError(res.error)) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Could not save flashcard review.", {
            description: describeError(res.error),
          });
        }
      }
      return res;
    },
    [user],
  );

  const setFinalScore = useCallback(
    async (score: number, total: number): Promise<BootcampMutationResult> => {
      setBootcampState((prev) => ({
        ...prev,
        finalSetScore: { score, total, completedAt: new Date().toISOString() },
      }));
      if (!user) return { ok: true };

      const writeRes = await upsertFinalSetScore(user.id, score, total);
      if (!writeRes.ok) {
        if (isSessionDeadError(writeRes.error)) {
          toast.error("Session expired. Please sign in again.");
        } else {
          toast.error("Could not save final-set score.", {
            description: describeError(writeRes.error),
          });
        }
        return writeRes;
      }
      const mirror = await recordChapterProgress(user.id, TOPIC_TAG, "final_set");
      if (!mirror.ok) {
        console.error("chapter_progress mirror failed for final_set", mirror.error);
      }
      return { ok: true };
    },
    [user],
  );

  const value = useMemo<AppContextType>(
    () => ({
      currentView,
      setCurrentView,
      bootcampState,
      loading,
      markLessonComplete,
      markDrillComplete,
      recordGauntletItem,
      markTranslatorComplete,
      updateCardReview,
      rateCard,
      setFinalScore,
    }),
    [
      currentView,
      bootcampState,
      loading,
      markLessonComplete,
      markDrillComplete,
      recordGauntletItem,
      markTranslatorComplete,
      updateCardReview,
      rateCard,
      setFinalScore,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
