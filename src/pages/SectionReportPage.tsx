import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchSectionSittingGeneration } from '@/lib/sectionCloseout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { launchDrill } from '@/lib/drillLaunch';
import { safeReviewHubReturn } from '@/lib/reviewHubReturn';
import { fetchOwnedSectionReport, type SectionHistoryRow } from '@/lib/sectionHistory';
import { saveSectionBlindReview } from '@/lib/sectionReviewRecord';
import { emailSectionReport } from '@/lib/sectionHistorySave';
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
  return <SectionReportSession key={JSON.stringify([user?.id, historyId])} historyId={historyId} userId={user?.id} />;
}

function SectionReportSession({ historyId, userId }: { historyId?: string; userId?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedReturn = searchParams.get('returnTo');
  const returnTo = safeReviewHubReturn(requestedReturn) ?? '/review/history';
  const walkParam = searchParams.get('walk') === '1';
  const qidParam = searchParams.get('qid');

  const [refreshKey, setRefreshKey] = React.useState(0);
  const [walkRow, setWalkRow] = React.useState<SectionHistoryRow | null>(null);
  const [walkQid, setWalkQid] = React.useState<string | null>(qidParam);
  const [openingWalk, setOpeningWalk] = React.useState(Boolean((walkParam || qidParam) && userId && historyId));
  const reportReturn = React.useRef<{ x: number; y: number; focus: HTMLElement | null } | null>(null);

  React.useLayoutEffect(() => {
    if (!reportReturn.current) return;
    if (walkRow) {
      // The hidden report leaves the window scrolled; start the walk at its header.
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
      return;
    }
    const { x, y, focus } = reportReturn.current;
    reportReturn.current = null;
    if (focus?.isConnected) focus.focus({ preventScroll: true });
    window.scrollTo({ left: x, top: y, behavior: 'instant' });
  }, [walkRow]);
  const [brContext, setBrContext] = React.useState<BrContext | null>(null);
  const [pendingBrResults, setPendingBrResults] = React.useState<BlindReviewResult[] | null>(null);
  const [brSaveError, setBrSaveError] = React.useState<string | null>(null);
  const [brSaving, setBrSaving] = React.useState(false);
  const startingOver = React.useRef(false);
  const location = useLocation();
  const [checkingBr, setCheckingBr] = React.useState(false);
  const brCheck = React.useRef<number | null>(null);
  const brCheckSeq = React.useRef(0);

  // A pending blind-review check belongs to the address that started it.
  React.useEffect(() => () => { brCheck.current = null; }, []);
  React.useEffect(() => {
    if (brCheck.current === null) return;
    brCheck.current = null;
    setCheckingBr(false);
  }, [location.key]);

  // Re-read the section before starting blind review: a report kept during a walk can be stale
  // (another tab may have finished it). Start only on a conclusive "not done yet". The check
  // replaces the report, so the report reloads fresh afterwards, as it does on main.
  const startCheckedBlindReview = async (requestedHistoryId: string) => {
    if (!userId || brCheck.current !== null) return;
    const id = ++brCheckSeq.current;
    brCheck.current = id;
    setCheckingBr(true);
    let latest: Awaited<ReturnType<typeof fetchOwnedSectionReport>> | null = null;
    try {
      latest = await fetchOwnedSectionReport(userId, requestedHistoryId);
    } catch (err) {
      console.error('[sectionReport] could not check blind review', err);
    }
    if (brCheck.current !== id) return;
    brCheck.current = null;
    setCheckingBr(false);
    if (!latest) {
      toast.error('Could not open blind review. Please try again.');
      return;
    }
    let next: Omit<BrContext, 'session'> | null = null;
    if (latest.state === 'released') {
      const { row } = latest;
      if (row.brUsed) {
        toast.info('Blind review for this section is already done.');
      } else if (!row.practiceTestRunId && row.questions.length > 0) {
        next = {
          historyId: row.id,
          pt: row.pt,
          section: row.section,
          questionQids: row.questions.map((question) => question.qid),
          row,
        };
      }
    } else if (latest.state === 'sealed' && latest.reason === 'blind-review') {
      if (latest.blindReviewPreparationFailed || latest.questionQids.length === 0) {
        toast.error('Could not load the blind review questions. Please try again.');
      } else {
        next = { historyId: latest.id, pt: latest.pt, section: latest.section, questionQids: latest.questionQids };
      }
    }
    if (!next) return;
    setPendingBrResults(null);
    setBrSaveError(null);
    setBrContext({ ...next, session: buildDeferredBrSession(next) });
  };

  const startBlindReview = searchParams.get('blindReview') === '1';
  React.useEffect(() => {
    if (!startBlindReview || !historyId || !userId) return;
    let active = true;
    void fetchOwnedSectionReport(userId, historyId).then((result) => {
      if (!active || result.state !== 'released') return;
      const { row } = result;
      if (row.brUsed || row.practiceTestRunId || row.questions.length === 0) return;
      const questionQids = row.questions.map((question) => question.qid);
      const context = { historyId, pt: row.pt, section: row.section, questionQids, row };
      setBrContext({ ...context, session: buildDeferredBrSession(context) });
    }).catch(() => {
      if (active) toast.error('Could not open blind review. Try again from the report.');
    }).finally(() => {
      if (!active) return;
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.delete('blindReview');
        return next;
      }, { replace: true });
    });
    return () => { active = false; };
  }, [startBlindReview, historyId, userId, setSearchParams]);

  // If opened with ?walk=1 or ?qid=..., load the row directly so the walk opens immediately.
  React.useEffect(() => {
    if (!walkParam && !qidParam) {
      // The address no longer asks for a walk; an abandoned load must not leave the status behind.
      setOpeningWalk(false);
      return;
    }
    if (!historyId || !userId || walkRow?.id === historyId) return;
    let active = true;
    void fetchOwnedSectionReport(userId, historyId)
      .then((res) => {
        if (!active) return;
        setOpeningWalk(false);
        if (res.state === 'released' && res.row.questions.length > 0) {
          setWalkRow(res.row);
          setWalkQid(qidParam);
        }
      })
      .catch(() => {
        // Fall back to SectionReport which shows the error state.
      })
      .finally(() => {
        if (active) setOpeningWalk(false);
      });
    return () => {
      active = false;
    };
  }, [walkParam, qidParam, historyId, userId, walkRow?.id]);

  const submitBlindReview = React.useCallback(
    async (ctx: BrContext, results: BlindReviewResult[]) => {
      setBrSaving(true);
      setBrSaveError(null);
      try {
        await saveSectionBlindReview(
          ctx.historyId,
          results,
          ctx.row
            ? { savedQuestions: ctx.row.questions, session: ctx.session }
            : undefined,
        );
        if (!ctx.row || ctx.row.releaseRequiresBr) void emailSectionReport(ctx.historyId);
        setPendingBrResults(null);
        setBrContext(null);
        void queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
        void queryClient.invalidateQueries({ queryKey: ['review', 'sections'] });
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
    [queryClient],
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

  // Keep the report mounted during a walk opened from the report.
  let reviewWalk: React.ReactNode = null;
  if (walkRow) {
    const walk = sectionHistoryToWalkSession(walkRow);
    const initialIndex = walkQid
      ? Math.max(0, walk.session.questionQueue.indexOf(walkQid))
      : 0;
    reviewWalk = (
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

  if (startBlindReview || checkingBr) {
    return <div className="light min-h-screen bg-background p-6 text-foreground" role="status">Opening blind review…</div>;
  }

  // Only while the address still asks for a walk that has not loaded yet.
  if (openingWalk && (walkParam || qidParam) && !walkRow) {
    return <div className="light min-h-screen bg-background p-6 text-foreground" role="status">Opening review walk…</div>;
  }

  if (walkRow && !reportReturn.current) return reviewWalk;

  return (
    <>
      <div hidden={Boolean(walkRow)}>
        <SectionReport
          historyId={historyId ?? null}
          onBack={() => navigate(returnTo)}
          backLabel={requestedReturn ? 'Back' : 'Back to History'}
          onReviewSection={(qid, row, trigger) => {
            if (!row) return;
            // Safari does not focus a clicked button, so prefer the element that was activated.
            const focused = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
              ? document.activeElement
              : null;
            reportReturn.current = {
              x: window.scrollX,
              y: window.scrollY,
              focus: trigger ?? focused,
            };
            setWalkRow(row);
            setWalkQid(qid ?? null);
          }}
          onStartOver={async (row) => {
            if (!userId || startingOver.current) return;
            startingOver.current = true;
            try {
              const launch = launchDrill({ kind: 'section', pt: row.pt, section: row.section });
              const intent = row.clientSittingId
                ? `restart=1&gen=${await fetchSectionSittingGeneration(userId, row.clientSittingId)}`
                : 'historicalRetake=1';
              navigate(`/drill?${launch}&${intent}`);
            } catch (err) {
              console.error('[sectionReport] could not start over', err);
              toast.error('Could not start over. Please try again.');
              startingOver.current = false;
            }
          }}
          onStartBlindReview={(ctx) => { void startCheckedBlindReview(ctx.historyId); }}
          refreshKey={refreshKey}
        />
      </div>
      {reviewWalk}
    </>
  );
}
