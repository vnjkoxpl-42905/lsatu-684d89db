import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  ModulePartName,
  ModuleProgressRow,
  TranslatorAttempt,
  ViewState,
} from "../types";
import { MODULES, type ModuleId, getModule } from "../data/modules";
import { computeMastery } from "../lib/mastery";
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
import { localDayISO, addLocalDays } from "@/lib/localDate";
import { mirroredSetItem } from "@/lib/cloudMirror";

interface AppContextType {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  currentModuleId: ModuleId | null;
  setCurrentModuleId: (id: ModuleId | null) => void;
  openModule: (id: ModuleId) => void;
  bootcampState: BootcampState;
  loading: boolean;
  markNoteRead: (moduleId: ModuleId) => Promise<BootcampMutationResult>;
  recordQuizScore: (
    moduleId: ModuleId,
    score: number,
    total: number,
    streakHigh: number,
  ) => Promise<BootcampMutationResult>;
  markModuleDrillComplete: (moduleId: ModuleId) => Promise<BootcampMutationResult>;
  isModuleUnlocked: (moduleId: ModuleId) => boolean;
  isPartUnlocked: (moduleId: ModuleId, part: ModulePartName) => boolean;
  isModuleComplete: (moduleId: ModuleId) => boolean;
  addXp: (amount: number) => void;
  bumpStreakActivity: () => void;
  autoAdvance: boolean;
  setAutoAdvance: (v: boolean) => void;
  markLessonComplete: (lessonId: string) => Promise<BootcampMutationResult>;
  markDrillComplete: (
    drillId: string,
    drillType: DrillType,
    correct: boolean,
    selectedIndex?: number,
    confidence?: ConfidenceLevel,
    trapTag?: string,
    timeMs?: number,
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
  moduleProgress: {},
  xpTotal: 0,
  dailyStreak: 0,
  aceBadges: [],
  drillsStats: {},
};

const MODULE_LOCAL_KEY = "lsatu_abstract_v3_modules";

function loadModuleCache(): {
  moduleProgress: Record<string, ModuleProgressRow>;
  xpTotal: number;
  dailyStreak: number;
  dailyStreakLastActive?: string;
  aceBadges: string[];
} {
  try {
    const raw = localStorage.getItem(MODULE_LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load Abstract v3 module cache", e);
  }
  return { moduleProgress: {}, xpTotal: 0, dailyStreak: 0, aceBadges: [] };
}

function persistModuleCache(state: BootcampState) {
  try {
    mirroredSetItem(
      MODULE_LOCAL_KEY,
      JSON.stringify({
        moduleProgress: state.moduleProgress,
        xpTotal: state.xpTotal,
        dailyStreak: state.dailyStreak,
        dailyStreakLastActive: state.dailyStreakLastActive,
        aceBadges: state.aceBadges,
      }),
    );
  } catch (e) {
    console.error("Failed to persist Abstract v3 module cache", e);
  }
}

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
    mirroredSetItem(CARDS_LOCAL_KEY, JSON.stringify(cards));
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
  const [currentModuleId, setCurrentModuleId] = useState<ModuleId | null>(null);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("lsatu_abstract_auto_advance");
      return v == null ? true : v === "1";
    } catch {
      return true;
    }
  });
  const handleSetAutoAdvance = useCallback((v: boolean) => {
    setAutoAdvance(v);
    try {
      localStorage.setItem("lsatu_abstract_auto_advance", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);
  const [bootcampState, setBootcampState] = useState<BootcampState>(() => {
    const moduleCache = loadModuleCache();
    return {
      ...defaultState,
      cards: loadCardsCache(),
      moduleProgress: moduleCache.moduleProgress,
      xpTotal: moduleCache.xpTotal,
      dailyStreak: moduleCache.dailyStreak,
      dailyStreakLastActive: moduleCache.dailyStreakLastActive,
      aceBadges: moduleCache.aceBadges,
    };
  });
  const [loading, setLoading] = useState(true);

  // Mirror the latest state in a ref so event handlers (e.g. rateCard) can read
  // current values without doing DB-affecting work inside a setState updater.
  const bootcampStateRef = useRef(bootcampState);
  useEffect(() => {
    bootcampStateRef.current = bootcampState;
  }, [bootcampState]);

  // Persist the flashcard cache as a side effect of state changes, so setState
  // updaters can stay pure (no I/O inside them).
  useEffect(() => {
    persistCardsCache(bootcampState.cards);
  }, [bootcampState.cards]);

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
            timeMs: r.time_ms ?? undefined,
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
      timeMs?: number,
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
            { drillId, drillType, selectedIndex, correct, confidence, trapTag, timeMs, completedAt },
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
        timeMs,
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
        return res;
      }

      // Mirror to chapter_progress so the teacher Bootcamps dashboard sees
      // per-item gauntlet activity. Namespace mirrors the translator pattern.
      const mirror = await recordChapterProgress(
        user.id,
        TOPIC_TAG,
        `gauntlet_${attempt.choiceId}`,
      );
      if (!mirror.ok) {
        console.error("chapter_progress mirror failed for gauntlet item", attempt.choiceId, mirror.error);
      }
      return { ok: true };
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
      return { ...prev, cards: nextCards };
    });
  }, []);

  const rateCard = useCallback(
    async (cardId: string, rating: FlashcardRating): Promise<BootcampMutationResult> => {
      const reviewedAt = new Date().toISOString();

      // Compute the next review OUTSIDE the setState updater. The updater must
      // stay pure: doing this work inside it (and depending on React's eager-
      // updater optimization for `next`) meant the DB write below was silently
      // skipped whenever the provider had a coincident pending update.
      const currentCard =
        bootcampStateRef.current.cards[cardId] ||
        { cardId, status: "unseen" as const, reviewCount: 0 };
      const next = computeNextReview(rating, currentCard.intervalDays ?? 0, currentCard.reviewCount);
      const nextReviewCount = currentCard.reviewCount + 1;
      // Status policy: "again" walks back to "reviewing", "easy" promotes
      // a card to "mastered" once it's been seen at least twice, every
      // other rating settles the card at "reviewing".
      let nextStatus: CardReview["status"] = "reviewing";
      if (rating === "again") nextStatus = "reviewing";
      else if (rating === "easy" && nextReviewCount >= 2) nextStatus = "mastered";

      setBootcampState((prev) => {
        const prevCard =
          prev.cards[cardId] || { cardId, status: "unseen" as const, reviewCount: 0 };
        const nextCards = {
          ...prev.cards,
          [cardId]: {
            ...prevCard,
            status: nextStatus,
            lastReviewedAt: reviewedAt,
            reviewCount: nextReviewCount,
            rating,
            intervalDays: next.intervalDays,
            dueAtIso: next.dueAtIso,
          },
        };
        return { ...prev, cards: nextCards };
      });

      if (!user) return { ok: true };

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

  // --- Module gating + gamification ---

  const writeModuleRow = useCallback(
    (moduleId: ModuleId, patch: Partial<ModuleProgressRow>) => {
      setBootcampState((prev) => {
        const existing: ModuleProgressRow = prev.moduleProgress[moduleId] || {
          moduleId,
          noteComplete: false,
          quizScore: 0,
          quizTotal: 0,
          quizStreakHigh: 0,
          drillComplete: false,
          aced: false,
          masteryLevel: "none",
        };
        const candidate: ModuleProgressRow = { ...existing, ...patch, moduleId };
        const merged: ModuleProgressRow = {
          ...candidate,
          masteryLevel: computeMastery(candidate),
        };
        const nextProgress = { ...prev.moduleProgress, [moduleId]: merged };
        const nextState: BootcampState = { ...prev, moduleProgress: nextProgress };
        persistModuleCache(nextState);
        return nextState;
      });
    },
    [],
  );

  const addXp = useCallback((amount: number) => {
    if (!amount) return;
    setBootcampState((prev) => {
      const next: BootcampState = { ...prev, xpTotal: prev.xpTotal + amount };
      persistModuleCache(next);
      return next;
    });
  }, []);

  const bumpStreakActivity = useCallback(() => {
    setBootcampState((prev) => {
      const today = localDayISO();
      if (prev.dailyStreakLastActive === today) return prev;
      const yesterday = addLocalDays(-1);
      const next: BootcampState = {
        ...prev,
        dailyStreak:
          prev.dailyStreakLastActive === yesterday ? prev.dailyStreak + 1 : 1,
        dailyStreakLastActive: today,
      };
      persistModuleCache(next);
      return next;
    });
  }, []);

  const markNoteRead = useCallback(
    async (moduleId: ModuleId): Promise<BootcampMutationResult> => {
      const mod = getModule(moduleId);
      if (!mod) return { ok: false, error: new Error("unknown module") };
      writeModuleRow(moduleId, { noteComplete: true });
      addXp(10);
      bumpStreakActivity();
      // Persist via existing lesson-complete pathway so chapter_progress
      // mirror stays consistent. {ok,error} returned upstream.
      return await markLessonComplete(mod.noteLessonId);
    },
    [writeModuleRow, addXp, bumpStreakActivity, markLessonComplete],
  );

  const recordQuizScore = useCallback(
    async (
      moduleId: ModuleId,
      score: number,
      total: number,
      streakHigh: number,
    ): Promise<BootcampMutationResult> => {
      writeModuleRow(moduleId, {
        quizScore: score,
        quizTotal: total,
        quizStreakHigh: streakHigh,
      });
      addXp(score);
      bumpStreakActivity();
      if (!user) return { ok: true };
      const mirror = await recordChapterProgress(
        user.id,
        TOPIC_TAG,
        `module_${moduleId}_quiz`,
      );
      if (!mirror.ok) {
        console.error("chapter_progress mirror failed for module quiz", moduleId, mirror.error);
      }
      return { ok: true };
    },
    [writeModuleRow, addXp, bumpStreakActivity, user],
  );

  const markModuleDrillComplete = useCallback(
    async (moduleId: ModuleId): Promise<BootcampMutationResult> => {
      const mod = getModule(moduleId);
      if (!mod) return { ok: false, error: new Error("unknown module") };
      setBootcampState((prev) => {
        const existing: ModuleProgressRow = prev.moduleProgress[moduleId] || {
          moduleId,
          noteComplete: false,
          quizScore: 0,
          quizTotal: 0,
          quizStreakHigh: 0,
          drillComplete: false,
          aced: false,
          masteryLevel: "none",
        };
        const quizPerfect = existing.quizTotal > 0 && existing.quizScore === existing.quizTotal;
        const drillStats = mod.drillIds.map((id) =>
          prev.drillAttempts.filter((a) => a.drillId === id),
        );
        const lastAttemptCorrect = drillStats.every(
          (attempts) => attempts.length > 0 && attempts[attempts.length - 1].correct,
        );
        const drillCorrect = drillStats.reduce(
          (n, attempts) =>
            n + (attempts.length > 0 && attempts[attempts.length - 1].correct ? 1 : 0),
          0,
        );
        const aced = quizPerfect && lastAttemptCorrect;
        const candidate: ModuleProgressRow = {
          ...existing,
          drillComplete: true,
          drillCorrect,
          drillTotal: mod.drillIds.length,
          aced,
          completedAt: new Date().toISOString(),
        };
        const merged: ModuleProgressRow = {
          ...candidate,
          masteryLevel: computeMastery(candidate),
        };
        const nextProgress = { ...prev.moduleProgress, [moduleId]: merged };
        const nextAceBadges = aced && !prev.aceBadges.includes(moduleId)
          ? [...prev.aceBadges, moduleId]
          : prev.aceBadges;
        const next: BootcampState = {
          ...prev,
          moduleProgress: nextProgress,
          aceBadges: nextAceBadges,
        };
        persistModuleCache(next);
        return next;
      });
      bumpStreakActivity();
      if (!user) return { ok: true };
      const mirror = await recordChapterProgress(
        user.id,
        TOPIC_TAG,
        `module_${moduleId}`,
      );
      if (!mirror.ok) {
        console.error("chapter_progress mirror failed for module", moduleId, mirror.error);
      }
      return { ok: true };
    },
    [bumpStreakActivity, user],
  );

  const isModuleUnlocked = useCallback(
    (moduleId: ModuleId): boolean => {
      if (moduleId === "m1") return true;
      const idx = MODULES.findIndex((m) => m.id === moduleId);
      if (idx <= 0) return true;
      const prevModule = MODULES[idx - 1];
      const prevRow = bootcampState.moduleProgress[prevModule.id];
      return Boolean(prevRow?.drillComplete);
    },
    [bootcampState.moduleProgress],
  );

  const isPartUnlocked = useCallback(
    (moduleId: ModuleId, part: ModulePartName): boolean => {
      if (!isModuleUnlocked(moduleId)) return false;
      const row = bootcampState.moduleProgress[moduleId];
      if (part === "note") return true;
      if (part === "quiz") return Boolean(row?.noteComplete);
      // drill
      if (!row?.noteComplete) return false;
      const mod = getModule(moduleId);
      if (!mod) return false;
      const passed =
        row.quizTotal > 0 && row.quizScore / row.quizTotal >= mod.quizPassThreshold;
      return passed;
    },
    [bootcampState.moduleProgress, isModuleUnlocked],
  );

  const isModuleComplete = useCallback(
    (moduleId: ModuleId): boolean => Boolean(bootcampState.moduleProgress[moduleId]?.drillComplete),
    [bootcampState.moduleProgress],
  );

  const openModule = useCallback((id: ModuleId) => {
    setCurrentModuleId(id);
    setCurrentView("module");
  }, []);

  const value = useMemo<AppContextType>(
    () => ({
      currentView,
      setCurrentView,
      currentModuleId,
      setCurrentModuleId,
      openModule,
      bootcampState,
      loading,
      markNoteRead,
      recordQuizScore,
      markModuleDrillComplete,
      isModuleUnlocked,
      isPartUnlocked,
      isModuleComplete,
      addXp,
      bumpStreakActivity,
      autoAdvance,
      setAutoAdvance: handleSetAutoAdvance,
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
      currentModuleId,
      openModule,
      bootcampState,
      loading,
      markNoteRead,
      recordQuizScore,
      markModuleDrillComplete,
      isModuleUnlocked,
      isPartUnlocked,
      isModuleComplete,
      addXp,
      bumpStreakActivity,
      autoAdvance,
      handleSetAutoAdvance,
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
