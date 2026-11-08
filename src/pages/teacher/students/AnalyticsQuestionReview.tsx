import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import SectionReviewWalk from "@/components/drill/SectionReviewWalk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RcExamPane, rcTypeStyles } from "@/features/rc/components/RcExamPane";
import { RcPassagePane } from "@/features/rc/components/RcPassagePane";
import { RcQuestionPane } from "@/features/rc/components/RcQuestionPane";
import { loadPassage } from "@/features/rc/lib/rcBank";
import { RC_LETTERS, type RcLetter } from "@/features/rc/lib/rcTypes";
import "@/features/rc/rc.css";

export type AnalyticsReviewTarget = {
  label: string;
  selectedAnswer: string | null;
} & ({ kind: "lr"; qid: string } | { kind: "rc"; passageId: number; questionId: number });

export default function AnalyticsQuestionReview({ target, onClose, returnFocus }: {
  target: AnalyticsReviewTarget;
  onClose: () => void;
  returnFocus: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent aria-describedby={undefined}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus(); }}
        className="inset-0 block h-dvh w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto border-0 p-0 sm:rounded-none [&>button]:hidden">
        <DialogTitle className="sr-only">Review {target.label}</DialogTitle>
        {target.kind === "lr"
          ? <SectionReviewWalk
              session={{ questionQueue: [target.qid], attempts: new Map([[target.qid, { selectedAnswer: target.selectedAnswer }]]) }}
              variant="drill" initialTab="actual" notepadEnabled={false} backLabel="Back to analytics" onBack={onClose}
              headerExtras={() => <span className="text-sm font-semibold text-slate-800">{target.label}</span>}
            />
          : <RcAnalyticsReview target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const noop = () => {};
const rcStyles = rcTypeStyles(1, 0);

function RcAnalyticsReview({ target, onClose }: {
  target: Extract<AnalyticsReviewTarget, { kind: "rc" }>;
  onClose: () => void;
}) {
  const { data: passage, isLoading, isError, refetch } = useQuery({
    queryKey: ["analytics-review-rc-passage", target.passageId],
    queryFn: () => loadPassage(target.passageId),
    staleTime: Infinity,
  });
  const question = passage?.questions.find((item) => item.questionId === target.questionId);
  const selected = RC_LETTERS.includes(target.selectedAnswer as RcLetter) ? target.selectedAnswer as RcLetter : null;
  const [scrollTop, setScrollTop] = React.useState(0);
  return (
    <div className="flex h-dvh min-h-0 flex-col bg-white text-slate-900">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 border-b border-slate-200 px-4">
        <button type="button" onClick={onClose} className="min-h-11 font-semibold text-sky-800 hover:underline">Back to analytics</button>
        <span className="text-sm font-semibold">{target.label}</span>
      </header>
      {isLoading ? <p role="status" className="p-4">Loading passage…</p>
        : isError ? <p role="alert" className="p-4">The passage couldn’t load. <button type="button" onClick={() => void refetch()} className="underline">Try again</button></p>
        : !passage || !question ? <p role="status" className="p-4">This question is unavailable.</p>
        : <div className="min-h-0 flex-1">
          <RcExamPane responsive schemeClassName="" passageOnly={false}
            passage={<RcPassagePane annotationsDisabled passage={passage} highlights={[]} color="yellow" highlightMode="none"
              onColorChange={noop} onAddHighlight={noop} onRemoveHighlight={noop} onRemoveRange={noop}
              findQuery="" findIndex={0} onFindCount={noop} scrollTop={scrollTop} onScroll={setScrollTop} textStyle={rcStyles.passage} />}
            question={<RcQuestionPane annotationsDisabled interactionDisabled showTutorPrompt={false}
              item={{ passage, question, number: question.position, passageIndex: 0 }} selected={selected}
              eliminations={[]} revealed reattemptMode={false} reattemptPick={null} flagged={false}
              onToggleFlag={noop} onSelect={noop} onToggleElimination={noop} onSkipToAnswer={noop}
              type={rcStyles} highlights={[]} color="yellow" highlightMode="none" onColorChange={noop}
              onAddHighlight={noop} onRemoveHighlight={noop} onRemoveRange={noop} />}
          />
        </div>}
    </div>
  );
}
