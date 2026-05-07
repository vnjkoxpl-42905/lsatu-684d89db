import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ReviewItem } from '../types/progress';
import { reviewItem, seedReviewItem, type Quality } from './spaced-repetition';

type CatalogFilter = 'all' | 'g1' | 'g2' | 'g3';

export type DayId = 1 | 2 | 3 | 4 | 5 | 6;

export interface DayCalibration {
  correct: number;
  total: number;
  completedAt: number;
}

interface ModuleState {
  currentSection: number;
  sectionsCompleted: number[];
  drillProgress: Record<
    string,
    { questionsAnswered: number; correct: number; missedQuestionIds: string[] }
  >;
  reviewQueue: ReviewItem[];
  catalogFilter: CatalogFilter;

  /** Bootcamp slice */
  bootcampDayCompleted: DayId[];
  bootcampDayCalibration: Partial<Record<DayId, DayCalibration>>;
  /** UI preference: high-contrast read mode */
  highContrast: boolean;

  markSectionComplete: (n: number) => void;
  setCurrentSection: (n: number) => void;
  recordAnswer: (drillId: string, questionId: string, correct: boolean) => void;
  resetDrill: (drillId: string) => void;
  seedFromMisses: (entries: { flawSlug: string; questionId: string }[]) => void;
  reviewQueueItem: (questionId: string, q: Quality) => void;
  setCatalogFilter: (f: CatalogFilter) => void;

  recordDayCalibration: (day: DayId, correct: number, total: number) => void;
  resetDay: (day: DayId) => void;
  setHighContrast: (on: boolean) => void;
  toggleHighContrast: () => void;
}

export const useModuleStore = create<ModuleState>()(
  persist(
    (set, _get) => ({
      currentSection: 1,
      sectionsCompleted: [],
      drillProgress: {},
      reviewQueue: [],
      catalogFilter: 'all',
      bootcampDayCompleted: [],
      bootcampDayCalibration: {},
      highContrast: false,

      markSectionComplete: (n) =>
        set((s) => ({
          sectionsCompleted: Array.from(new Set([...s.sectionsCompleted, n])),
        })),
      setCurrentSection: (n) => set({ currentSection: n }),

      recordAnswer: (drillId, questionId, correct) =>
        set((s) => {
          const prev = s.drillProgress[drillId] ?? {
            questionsAnswered: 0,
            correct: 0,
            missedQuestionIds: [],
          };
          const next = {
            questionsAnswered: prev.questionsAnswered + 1,
            correct: prev.correct + (correct ? 1 : 0),
            missedQuestionIds: correct
              ? prev.missedQuestionIds
              : Array.from(new Set([...prev.missedQuestionIds, questionId])),
          };
          return { drillProgress: { ...s.drillProgress, [drillId]: next } };
        }),

      resetDrill: (drillId) =>
        set((s) => {
          const { [drillId]: _, ...rest } = s.drillProgress;
          return { drillProgress: rest };
        }),

      seedFromMisses: (entries) =>
        set((s) => {
          const have = new Set(s.reviewQueue.map((r) => r.questionId));
          const additions = entries
            .filter((e) => !have.has(e.questionId))
            .map((e) => seedReviewItem(e.flawSlug, e.questionId));
          return { reviewQueue: [...s.reviewQueue, ...additions] };
        }),

      reviewQueueItem: (questionId, q) =>
        set((s) => ({
          reviewQueue: s.reviewQueue.map((r) =>
            r.questionId === questionId ? reviewItem(r, q) : r,
          ),
        })),

      setCatalogFilter: (f) => set({ catalogFilter: f }),

      recordDayCalibration: (day, correct, total) =>
        set((s) => ({
          bootcampDayCompleted: Array.from(
            new Set<DayId>([...s.bootcampDayCompleted, day]),
          ),
          bootcampDayCalibration: {
            ...s.bootcampDayCalibration,
            [day]: { correct, total, completedAt: Date.now() },
          },
        })),

      resetDay: (day) =>
        set((s) => {
          const { [day]: _, ...rest } = s.bootcampDayCalibration;
          return {
            bootcampDayCalibration: rest,
            bootcampDayCompleted: s.bootcampDayCompleted.filter((d) => d !== day),
          };
        }),

      setHighContrast: (on) => set({ highContrast: on }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
    }),
    {
      name: 'ff:module-state-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
