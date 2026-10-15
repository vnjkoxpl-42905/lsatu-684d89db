import { createContext, useContext } from 'react';
import { createStore, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StoreApi } from 'zustand';
import type { ReviewItem } from '../types/progress';
import { reviewItem, seedReviewItem, type Quality } from './spaced-repetition';

type CatalogFilter = 'all' | 'g1' | 'g2' | 'g3';

export type DayId = 1 | 2 | 3 | 4 | 5 | 6;

export interface DayCalibration {
  correct: number;
  total: number;
  completedAt: number;
}

export interface ModuleState {
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

function makeStateCreator(set: (fn: (s: ModuleState) => Partial<ModuleState>) => void) {
  return {
    currentSection: 1,
    sectionsCompleted: [] as number[],
    drillProgress: {} as ModuleState['drillProgress'],
    reviewQueue: [] as ReviewItem[],
    catalogFilter: 'all' as CatalogFilter,
    bootcampDayCompleted: [] as DayId[],
    bootcampDayCalibration: {} as Partial<Record<DayId, DayCalibration>>,
    highContrast: false,

    markSectionComplete: (n: number) =>
      set((s) => ({
        sectionsCompleted: Array.from(new Set([...s.sectionsCompleted, n])),
      })),
    setCurrentSection: (n: number) => set(() => ({ currentSection: n })),

    recordAnswer: (drillId: string, questionId: string, correct: boolean) =>
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

    resetDrill: (drillId: string) =>
      set((s) => {
        const { [drillId]: _, ...rest } = s.drillProgress;
        return { drillProgress: rest };
      }),

    seedFromMisses: (entries: { flawSlug: string; questionId: string }[]) =>
      set((s) => {
        const have = new Set(s.reviewQueue.map((r) => r.questionId));
        const additions = entries
          .filter((e) => !have.has(e.questionId))
          .map((e) => seedReviewItem(e.flawSlug, e.questionId));
        return { reviewQueue: [...s.reviewQueue, ...additions] };
      }),

    reviewQueueItem: (questionId: string, q: Quality) =>
      set((s) => ({
        reviewQueue: s.reviewQueue.map((r) =>
          r.questionId === questionId ? reviewItem(r, q) : r,
        ),
      })),

    setCatalogFilter: (f: CatalogFilter) => set(() => ({ catalogFilter: f })),

    recordDayCalibration: (day: DayId, correct: number, total: number) =>
      set((s) => ({
        bootcampDayCompleted: Array.from(
          new Set<DayId>([...s.bootcampDayCompleted, day]),
        ),
        bootcampDayCalibration: {
          ...s.bootcampDayCalibration,
          [day]: { correct, total, completedAt: Date.now() },
        },
      })),

    resetDay: (day: DayId) =>
      set((s) => {
        const { [day]: _, ...rest } = s.bootcampDayCalibration;
        return {
          bootcampDayCalibration: rest,
          bootcampDayCompleted: s.bootcampDayCompleted.filter((d) => d !== day),
        };
      }),

    setHighContrast: (on: boolean) => set(() => ({ highContrast: on })),
    toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
  };
}

function createModuleStore(storageName: string) {
  return createStore<ModuleState>()(
    persist(
      (set) => makeStateCreator(set as any),
      {
        name: storageName,
        storage: createJSONStorage(() => localStorage),
      },
    ),
  );
}

export const mainModuleStore = createModuleStore('ff:module-state-v1');
export const previewModuleStore = createModuleStore('ff:preview-v1');

export const ModuleStoreContext = createContext<StoreApi<ModuleState>>(mainModuleStore);

export function useModuleStore<T>(selector: (s: ModuleState) => T): T {
  const store = useContext(ModuleStoreContext);
  return useStore(store, selector);
}
