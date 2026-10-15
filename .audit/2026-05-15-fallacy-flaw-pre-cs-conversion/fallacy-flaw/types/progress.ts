export interface ReviewItem {
  flawSlug: string;
  questionId: string;
  ease: number;
  interval: number;
  repetitions: number;
  due: number;
  lastSeen: number;
}

export interface ModulePersisted {
  currentSection: number;
  sectionsCompleted: number[];
  drillProgress: Record<
    string,
    { questionsAnswered: number; correct: number; missedQuestionIds: string[] }
  >;
  reviewQueue: ReviewItem[];
}
