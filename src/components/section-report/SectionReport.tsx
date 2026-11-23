import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchOwnedSectionReport,
  type OwnedSectionReportResult,
  type SectionHistoryRow,
} from '@/lib/sectionHistory';
import {
  sectionHistoryToReportData,
  type SectionClockInfo,
  type SectionReportData,
} from './sectionReportModel';
import { SealedSectionReportView, SectionReportView } from './SectionReportView';

export interface SectionReportProps {
  historyId?: string | null;
  /** Immediate in-memory view model while a newly-saved row loads, or for legacy callers without a historyId. */
  fallbackData?: SectionReportData;
  /** Optional clock metadata (from an active session) to draw the pace tick. */
  sectionClock?: SectionClockInfo | null;
  onBack: () => void;
  backLabel?: string;
  /** Called when the user opens the read-only review walk (with optional qid and loaded row). */
  onReviewSection?: (qid?: string, row?: SectionHistoryRow) => void;
  /** Called when the user clicks "Do blind review" on a released or sealed section. */
  onStartBlindReview?: (context: {
    historyId: string;
    pt: number;
    section: number;
    questionQids: string[];
    row?: SectionHistoryRow;
  }) => void;
  /** Called when the student explicitly starts a new sitting of a standalone section. */
  onStartOver?: (row: SectionHistoryRow) => void;
  /** Non-blocking retry state when prediction save failed (F11). */
  pendingPrediction?: number | null;
  retryingPrediction?: boolean;
  onRetryPrediction?: () => void;
  title?: string;
  /** Increment to force a reload from the server (for example after completing blind review). */
  refreshKey?: number;
}

export function SectionReport({
  historyId,
  fallbackData,
  sectionClock = null,
  onBack,
  backLabel = 'Back to Home',
  onReviewSection,
  onStartBlindReview,
  onStartOver,
  pendingPrediction,
  retryingPrediction,
  onRetryPrediction,
  title,
  refreshKey = 0,
}: SectionReportProps) {
  const { user } = useAuth();
  const [result, setResult] = React.useState<OwnedSectionReportResult | null>(null);
  const [loading, setLoading] = React.useState<boolean>(Boolean(historyId));
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    if (!historyId || !user?.id) {
      setLoading(false);
      setResult(null);
      setError(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void fetchOwnedSectionReport(user.id, historyId)
      .then((res) => {
        if (!active) return;
        setResult(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not load this section report.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [historyId, user?.id, refreshKey, retryCount]);

  // No historyId: pure in-memory fallback (e.g. practice-test leg or unit test).
  if (!historyId) {
    if (!fallbackData) return null;
    return (
      <SectionReportView
        data={fallbackData}
        onBack={onBack}
        backLabel={backLabel}
        onReviewSection={onReviewSection ? (qid) => onReviewSection(qid) : undefined}
        onStartBlindReview={
          !fallbackData.brUsed && onStartBlindReview
            ? () =>
                onStartBlindReview({
                  historyId: '',
                  pt: fallbackData.pt ?? 0,
                  section: fallbackData.section ?? 0,
                  questionQids: fallbackData.stats.map((s) => s.qid),
                })
            : undefined
        }
        title={title}
      />
    );
  }

  if (loading && !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p role="status" className="text-sm text-muted-foreground">
          Loading section report...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-12">
        <div className="max-w-xl mx-auto px-4 sm:px-6 pt-12">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
          <Card className="p-6 space-y-4 text-center">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={() => setRetryCount((n) => n + 1)}>
              Try again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!result || result.state === 'not-found') {
    return (
      <div className="min-h-screen bg-background pb-12">
        <div className="max-w-xl mx-auto px-4 sm:px-6 pt-12">
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
          <Card className="p-6 text-center">
            <p role="status" className="text-sm text-muted-foreground">
              This section report was not found in your account.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (result.state === 'sealed') {
    return (
      <SealedSectionReportView
        pt={result.pt}
        section={result.section}
        reason={result.reason}
        onBack={onBack}
        backLabel={backLabel}
        pendingPrediction={pendingPrediction}
        retryingPrediction={retryingPrediction}
        onRetryPrediction={onRetryPrediction}
        onStartBlindReview={
          result.reason === 'blind-review' && onStartBlindReview && result.questionQids.length > 0
            ? () =>
                onStartBlindReview({
                  historyId: result.id,
                  pt: result.pt,
                  section: result.section,
                  questionQids: result.questionQids,
                })
            : undefined
        }
      />
    );
  }

  const row = result.row;
  const data = sectionHistoryToReportData(row, sectionClock);
  const canStartOver =
    Boolean(onStartOver) &&
    !row.practiceTestRunId &&
    !row.assignmentId &&
    !row.releaseRequiresBr &&
    row.pt > 0 &&
    row.section > 0;
  return (
    <SectionReportView
      data={data}
      onBack={onBack}
      backLabel={backLabel}
      onReviewSection={onReviewSection ? (qid) => onReviewSection(qid, row) : undefined}
      onStartOver={canStartOver ? () => onStartOver!(row) : undefined}
      pendingPrediction={pendingPrediction}
      retryingPrediction={retryingPrediction}
      onRetryPrediction={onRetryPrediction}
      onStartBlindReview={
        !row.brUsed && !row.practiceTestRunId && onStartBlindReview && row.questions.length > 0
          ? () =>
              onStartBlindReview({
                historyId: row.id,
                pt: row.pt,
                section: row.section,
                questionQids: row.questions.map((q) => q.qid),
                row,
              })
          : undefined
      }
      title={title}
    />
  );
}
