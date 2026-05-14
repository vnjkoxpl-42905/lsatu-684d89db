import React, { createContext, useContext, useState, useEffect } from 'react';
import { BootcampState, CardReview, DrillType, ViewState } from '../types';

interface AppContextType {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  bootcampState: BootcampState;
  markLessonComplete: (lessonId: string) => void;
  markDrillComplete: (drillId: string, drillType: DrillType, correct: boolean) => void;
  updateCardReview: (cardId: string, status: CardReview['status']) => void;
  setFinalScore: (score: number, total: number) => void;
}

const defaultState: BootcampState = {
  completedLessons: [],
  completedDrills: [],
  cards: {},
  drillsStats: {}
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [bootcampState, setBootcampState] = useState<BootcampState>(() => {
    try {
      const saved = localStorage.getItem('lsatu_bootcamp_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load state', e);
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('lsatu_bootcamp_state', JSON.stringify(bootcampState));
  }, [bootcampState]);

  const markLessonComplete = (lessonId: string) => {
    setBootcampState(prev => ({
      ...prev,
      completedLessons: prev.completedLessons.includes(lessonId) 
        ? prev.completedLessons 
        : [...prev.completedLessons, lessonId]
    }));
  };

  const markDrillComplete = (drillId: string, drillType: DrillType, correct: boolean) => {
    setBootcampState(prev => {
      const stats = prev.drillsStats[drillType] || { correct: 0, total: 0 };
      return {
        ...prev,
        completedDrills: prev.completedDrills.includes(drillId)
          ? prev.completedDrills
          : [...prev.completedDrills, drillId],
        drillsStats: {
          ...prev.drillsStats,
          [drillType]: {
            correct: stats.correct + (correct ? 1 : 0),
            total: stats.total + 1
          }
        }
      };
    });
  };

  const updateCardReview = (cardId: string, status: CardReview['status']) => {
    setBootcampState(prev => {
      const currentCard = prev.cards[cardId] || { cardId, status: 'unseen', reviewCount: 0 };
      return {
        ...prev,
        cards: {
          ...prev.cards,
          [cardId]: {
            ...currentCard,
            status,
            lastReviewedAt: new Date().toISOString(),
            reviewCount: currentCard.reviewCount + 1
          }
        }
      };
    });
  };

  const setFinalScore = (score: number, total: number) => {
    setBootcampState(prev => ({
      ...prev,
      finalSetScore: {
        score,
        total,
        completedAt: new Date().toISOString()
      }
    }));
  };

  return (
    <AppContext.Provider value={{
      currentView,
      setCurrentView,
      bootcampState,
      markLessonComplete,
      markDrillComplete,
      updateCardReview,
      setFinalScore
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
