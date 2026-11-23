import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildSectionStats,
  emailSectionReport,
  logSectionWrongAnswers,
  persistSectionResults,
  wajQidsForSection,
} from '@/lib/sectionHistorySave';
import type { DrillSession, BlindReviewResult } from '@/types/drill';
import { toast } from 'sonner';
import { SectionReport } from '@/components/section-report/SectionReport';
import {
  sectionClockFromSession,
  sessionToReportData,
} from '@/components/section-report/sectionReportModel';

interface LRSectionResultsProps {
  session: DrillSession;
  brResults?: BlindReviewResult[];
  classId: string;
  onBack: () => void;
  backLabel?: string;
  predictedScore?: number | null;
  /**
   * The row already saved by the atomic close-out. When present this screen
   * writes nothing: no second history row, no second journal pass (audit F2, F3).
   */
  savedHistoryId?: string | null;
  /** The close-out call that just ran created the row (not a replay). */
  savedHistoryCreatedNow?: boolean;
  /** Opens the read-only walk over the whole section. */
  onReviewSection?: () => void;
  /** Opens blind review from the results screen when it was skipped earlier. */
  onStartBlindReview?: () => void;
  /** Starts the next fresh sitting generation for a standalone section. */
  onStartOver?: () => void;
}

export function LRSectionResults({
  session,
  brResults,
  classId,
  onBack,
  backLabel = 'Back to Home',
  predictedScore,
  onReviewSection,
  onStartBlindReview,
  onStartOver,
  savedHistoryId,
  savedHistoryCreatedNow,
}: LRSectionResultsProps) {
  const { user } = useAuth();
  const savedRef = React.useRef(false);

  const fallbackData = React.useMemo(
    () => sessionToReportData(session, brResults, predictedScore, savedHistoryId),
    [session, brResults, predictedScore, savedHistoryId],
  );

  const sectionClock = React.useMemo(
    () => sectionClockFromSession(session, fallbackData.stats.length),
    [session, fallbackData.stats.length],
  );

  React.useEffect(() => {
    const saveHistory = async () => {
      if (!user || savedRef.current) return;
      savedRef.current = true;

      if (savedHistoryId) {
        if (savedHistoryCreatedNow) void emailSectionReport(savedHistoryId);
        return;
      }

      try {
        const stats = buildSectionStats(session, brResults);
        const sectionHistoryId = await persistSectionResults({
          session,
          stats,
          brResults,
          classId,
          userId: user.id,
        });

        void emailSectionReport(sectionHistoryId);

        await logSectionWrongAnswers({
          stats,
          qids: wajQidsForSection(stats),
          classId,
        });
      } catch (error) {
        toast.error('Failed to save section results. Please try again.');
        console.error('Failed to save section history:', error);
      }
    };

    void saveHistory();
  }, []);

  return (
    <SectionReport
      historyId={savedHistoryId}
      fallbackData={fallbackData}
      sectionClock={sectionClock}
      onBack={onBack}
      backLabel={backLabel}
      onReviewSection={onReviewSection ? () => onReviewSection() : undefined}
      onStartBlindReview={onStartBlindReview ? () => onStartBlindReview() : undefined}
      onStartOver={onStartOver ? () => onStartOver() : undefined}
      title="Section Results"
    />
  );
}
