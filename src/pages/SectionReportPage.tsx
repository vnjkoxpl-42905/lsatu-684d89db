import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { safeReviewHubReturn } from '@/lib/reviewHubReturn';
import { fetchOwnedSectionReport, type SectionHistoryRow } from '@/lib/sectionHistory';
import { saveSectionBlindReview } from '@/lib/sectionReviewRecord';
import { SectionReport } from '@/components/section-report/SectionReport';
import {
  buildDeferredBrSession,
  sectionHistoryToWalkSession,
} from '@/components/section-report/sectionWalkAdapter';
import SectionReviewWalk from '@/components/drill/SectionReviewWalk';
import { EnhancedBlindReview } from '@/components/drill/EnhancedBlindReview';
import type { BlindReviewResult, DrillSession } from '@/types/drill';

type BrContext = {
  historyId: string;
  pt: number;
  section: number;
  questionQids: string[];
  row?: SectionHistoryRow;
  session: DrillSession;
};

export default function SectionReportPage() {
  const { historyId } = useParams<{ historyId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedReturn = searchParams.get('returnTo');
  const returnTo = safeReviewHubReturn(requestedReturn) ?? '/review/history';
  const walkParam = searchParams.get('walk') === '1';
  const qidParam = searchParams.get('qid');

  const [refreshKey, setRefreshKey] = React.useState(0);
  const [walkRow, setWalkRow] = React.useState<SectionHistoryRow | null>(null);
  const [walkQid, setWalkQid] = React.useState<string | null>(qidParam);
  const [brContext, setBrContext] = React.useState<BrContext | null>(null);
  const [pendingBrResults, setPendingBrResults] = React.useState<BlindReviewResult[] | null>(null);
  const [brSaveError, setBrSaveError] = React.useState<string | null>(null);
  const [brSaving, setBrSaving] = React.useState(false);

  // If opened with ?walk=1 or ?qid=..., load the row directly so the walk opens immediately.
  React.useEffect(() => {
    if ((!walkParam && !qidParam) || !historyId || !user?.id || walkRow?.id === historyId) return;
    let active = true;
    void fetchOwnedSectionReport(user.id, historyId)
      .then((res) => {
        if (!active) return;
        if (res.state === 'released' && res.row.questions.length > 0) {
          setWalkRow(res.row);
          if (qidParam) setWalkQid(qidParam);
        }
      })
      .catch(() => {
        // Fall back to SectionReport which shows the error state.
      });
    return () => {
      active = false;
    };
  }, [walkParam, qidParam, historyId, user?.id, walkRow?.id]);

  const submitBlindReview = React.useCallback(
    async (ctx: BrContext, results: BlindReviewResult[]) => {
      setBrSaving(true);
      setBrSaveError(null);
      try {
        await saveSectionBlindReview(
          ctx.historyId,
          results,
          ctx.row ? ctx.session : undefined,
        );
        setPendingBrResults(null);
        setBrContext(null);
        setRefreshKey((k) => k + 1);
      } catch (err: unknown) {
        setPendingBrResults(results);
        setBrSaveError(
          err instanceof Error
            ? err.message
            : 'Could not save your blind review. Please try again.',
        );
      } finally {
        setBrSaving(false);
      }
    },
    [],
  );

  // Deferred blind review save error / retry screen (preserves completed BR results).
  if (brContext && pendingBrResults) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-6 space-y-4 text-center">
          <h2 className="text-lg font-semibold">Could not save blind review</h2>
          <p role="alert" className="text-sm text-destructive">
            {brSaveError ?? 'Saving your blind review failed. Your answers are still here.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              disabled={brSaving}
              onClick={() => void submitBlindReview(brContext, pendingBrResults)}
            >
              {brSaving ? 'Saving...' : 'Retry saving blind review'}
            </Button>
            <Button
              variant="outline"
              disabled={brSaving}
              onClick={() => {
                setPendingBrResults(null);
                setBrSaveError(null);
                setBrContext(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Active deferred blind review screen.
  if (brContext) {
    return (
      <EnhancedBlindReview
        session={brContext.session}
        reviewQids={brContext.questionQids}
        onComplete={(results) => {
          void submitBlindReview(brContext, results);
        }}
        onBack={() => {
          setBrContext(null);
          setBrSaveError(null);
        }}
      />
    );
  }

  // Active read-only review walk screen.
  if (walkRow) {
    const walk = sectionHistoryToWalkSession(walkRow);
    const initialIndex = walkQid
      ? Math.max(0, walk.session.questionQueue.indexOf(walkQid))
      : 0;
    return (
      <SectionReviewWalk
        session={walk.session}
        brResults={walk.brResults}
        savedCorrectAnswers={walk.savedCorrectAnswers}
        savedStatsByQid={walk.savedStatsByQid}
        initialIndex={initialIndex}
        backLabel="Section report"
        onBack={() => {
          setWalkRow(null);
          setWalkQid(null);
          if (walkParam || qidParam) {
            const next = new URLSearchParams(searchParams);
            next.delete('walk');
            next.delete('qid');
            setSearchParams(next, { replace: true });
          }
        }}
      />
    );
  }

  return (
    <SectionReport
      historyId={historyId ?? null}
      onBack={() => navigate(returnTo)}
      backLabel={requestedReturn ? 'Back' : 'Back to History'}
      onReviewSection={(qid, row) => {
        if (!row) return;
        setWalkRow(row);
        setWalkQid(qid ?? null);
      }}
      onStartBlindReview={(ctx) => {
        const session = buildDeferredBrSession({
          pt: ctx.pt,
          section: ctx.section,
          questionQids: ctx.questionQids,
          row: ctx.row,
        });
        setBrContext({ ...ctx, session });
        setPendingBrResults(null);
        setBrSaveError(null);
      }}
      refreshKey={refreshKey}
    />
  );
}
