/**
 * Walking a finished section, read-only.
 *
 * Until now the only way to see the teaching for a question you had just sat
 * was to open the row on Section Results and press "Review this question",
 * which navigates to `/drill` as a fresh single-question type-drill. The
 * question is served again, must be ANSWERED again before anything is
 * revealed, and the re-attempt lands in the student's attempt history as
 * another row. One question at a time, and the record of the sitting gets
 * dirtier every time they review it.
 *
 * The content was never the problem — `lr_answer_choices` carries a trap tag
 * and a student percentage on all 18,855 of them, and `InlineChoiceExplanation`
 * has always rendered both. What was missing was a way to READ the section
 * back.
 *
 * So this is the same exam chrome the section and the blind review already run
 * in — `OfficialDrillFrame` / `OfficialDrillToolbar` / `OfficialQuestionPane` /
 * `OfficialAnswerNavigator` — with every input inert. Nothing here writes.
 *
 * Three tabs, which is the whole idea:
 *   Clean   the question with no answer marked, the way it looked on test day
 *   Actual  what was chosen under the clock
 *   BR      the blind review answer, present only when a review was actually sat
 *
 * `Show answers` is off by default and reveals the correct answer together with
 * the per-choice explanations. Off-by-default matters: the most useful thing a
 * student can do with a finished section is re-read a question cold and catch
 * their own error before being told it.
 */

import * as React from 'react';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import OfficialDrillToolbar from '@/components/drill/official/OfficialDrillToolbar';
import OfficialQuestionPane from '@/components/drill/official/OfficialQuestionPane';
import OfficialAnswerNavigator from '@/components/drill/official/OfficialAnswerNavigator';
import { type InlineChoiceNotes } from '@/components/drill/official/InlineChoiceExplanation';
import { useLrExplanation, type LrStyleKey } from '@/hooks/useLrExplanation';
import ArgumentBreakdown from '@/components/drill/official/ArgumentBreakdown';
import { questionBank } from '@/lib/questionLoader';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { DrillSession, BlindReviewResult } from '@/types/drill';
import type { HighlightMode } from '@/lib/highlightUtils';
import { useQuestionHighlights } from '@/hooks/useQuestionHighlights';

export type ReviewTab = 'clean' | 'actual' | 'br';

/** All the walk reads from a sitting: the order, and what was picked. */
export interface ReviewWalkSession {
  questionQueue: DrillSession['questionQueue'];
  attempts: Map<string, { selectedAnswer?: string | null }>;
}

interface Props {
  session: ReviewWalkSession;
  /** Present only when a blind review was actually sat. Gates the BR tab. */
  brResults?: BlindReviewResult[] | null;
  onBack: () => void;
  /** Breadcrumb text for onBack. */
  backLabel?: string;
  /** Question to open on. Follows later changes, e.g. browser back. */
  initialIndex?: number;
  /** Told whenever the open question changes, so a page can keep it in its URL. */
  onIndexChange?: (index: number) => void;
  /**
   * 'drill' is the finished-drill review (7Sage's tester shape): every choice
   * has its own note toggle from the start, Show analysis sits under the
   * stimulus, and the switch reads "Show correct". 'section' (default) keeps
   * the timed-section behaviour, where notes arrive only with Show answers.
   */
  variant?: 'section' | 'drill';
  /** Extra header controls for the open question, e.g. Notes and Bookmark. */
  headerExtras?: (qid: string) => React.ReactNode;
}

/** Which tabs this section can offer. BR appears only if a review happened. */
export function reviewTabsFor(brResults?: BlindReviewResult[] | null): ReviewTab[] {
  const hasBr = Array.isArray(brResults) && brResults.length > 0;
  return hasBr ? ['clean', 'actual', 'br'] : ['clean', 'actual'];
}

const TAB_LABELS: Record<ReviewTab, string> = {
  clean: 'Clean',
  actual: 'Actual',
  br: 'BR',
};

export default function SectionReviewWalk({ session, brResults, onBack, backLabel = 'Section results', initialIndex, onIndexChange, variant = 'section', headerExtras }: Props) {
  const drillVariant = variant === 'drill';
  const [analysisOpen, setAnalysisOpen] = React.useState(false);
  const [analysisStyle, setAnalysisStyle] = React.useState<LrStyleKey | null>(null);
  const qids = session.questionQueue;
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex ?? 0);
  React.useEffect(() => {
    if (initialIndex !== undefined) setCurrentIndex(initialIndex);
  }, [initialIndex]);
  const onIndexChangeRef = React.useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  React.useEffect(() => {
    onIndexChangeRef.current?.(currentIndex);
  }, [currentIndex]);
  const [tab, setTab] = React.useState<ReviewTab>('clean');
  const [showAnswers, setShowAnswers] = React.useState(false);
  // Clean is for re-trying a question cold. A click marks a fresh pick here,
  // on this screen only: it is never written, so the record of the sitting
  // can't change.
  const [freshPicks, setFreshPicks] = React.useState<Record<string, string>>({});
  const [highlightMode, setHighlightMode] = React.useState<HighlightMode>('none');
  const questionHighlights = useQuestionHighlights();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [fontScale, setFontScale] = React.useState(1);

  const tabs = React.useMemo(() => reviewTabsFor(brResults), [brResults]);

  const currentQid = qids[currentIndex];
  const question = questionBank.getQuestion(currentQid);
  const attempt = session.attempts.get(currentQid);
  const brResult = brResults?.find((b) => b.qid === currentQid);

  const { data: explanation } = useLrExplanation(
    {
      pt: question?.pt ?? null,
      section: question?.section ?? null,
      questionNumber: question?.qnum ?? null,
    },
    // Only fetched once the student asks to see answers. A review walk taken
    // cold should not be quietly pulling the answer down in the background.
    showAnswers || drillVariant,
  );
  React.useEffect(() => { setAnalysisOpen(false); }, [currentQid]);

  /**
   * Per-letter tag, percentage and prose. Tags and percentages are real source
   * data and survive on questions with no authored prose, so a letter with a
   * percentage but no note still renders the percentage.
   */
  const inlineNotes = React.useMemo<InlineChoiceNotes | null>(() => {
    if (!explanation) return null;
    const style = explanation.styles[0] ?? null;
    const map: InlineChoiceNotes = {};
    for (const choice of explanation.choices) {
      map[choice.letter] = {
        tag: choice.tag,
        studentPercent: choice.studentPercent,
        note: style?.notesByLetter[choice.letter] ?? null,
      };
    }
    return map;
  }, [explanation]);

  // Which answer the pane shows. Clean marks nothing: the point of that tab is
  // the question without the memory of what you picked.
  const shownAnswer =
    tab === 'actual'
      ? attempt?.selectedAnswer || ''
      : tab === 'br'
        ? brResult?.brAnswer || ''
        : freshPicks[currentQid] ?? '';

  const answeredQids = React.useMemo(() => {
    const set = new Set<string>();
    for (const qid of qids) {
      if (session.attempts.get(qid)?.selectedAnswer) set.add(qid);
    }
    return set;
  }, [qids, session]);

  if (!question) return <div>Loading…</div>;

  const noop = () => {};

  return (
    <OfficialDrillFrame
      header={
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[14px]">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 flex-1 items-center gap-2 truncate text-[15px]"
          >
            <button
              type="button"
              onClick={onBack}
              className="font-semibold text-blue-700 transition-colors hover:text-blue-800"
            >
              {backLabel}
            </button>
            <span aria-hidden className="text-slate-300">
              /
            </span>
            <span className="font-semibold text-slate-900" aria-current="page">
              Review · Question {currentIndex + 1} of {qids.length}
            </span>
          </nav>

          {/* A switch, not a checkbox. A bare checkbox renders here as a solid
              dark square with no accent colour, so OFF reads as ON — the one
              thing this control must never do. */}
          {headerExtras && <div className="flex shrink-0 items-center gap-1">{headerExtras(currentQid)}</div>}
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-700">
            <Switch
              checked={showAnswers}
              onCheckedChange={setShowAnswers}
              aria-label={drillVariant ? 'Show correct' : 'Show answers'}
            />
            {drillVariant ? 'Show correct' : 'Show answers'}
          </label>
        </div>
      }
    >
      {/* The section's toolbar without the clock. Nothing here is timed. */}
      <OfficialDrillToolbar
        highlightMode={highlightMode}
        setHighlightMode={setHighlightMode}
        timerLabel=""
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        fontScale={fontScale}
        setFontScale={setFontScale}
      />

      <OfficialQuestionPane
        question={{
          qid: question.qid,
          qnum: question.qnum,
          stimulus: question.stimulus,
          questionStem: question.questionStem,
          answerChoices: question.answerChoices,
        }}
        displayNumber={currentIndex + 1}
        selectedAnswer={shownAnswer}
        eliminatedAnswers={new Set<string>()}
        isFlagged={false}
        answerRevealed={showAnswers}
        correctAnswer={question.correctAnswer}
        inlineNotes={showAnswers || drillVariant ? inlineNotes : null}
        choiceNoteExpanders={drillVariant}
        choiceNotesHiddenUntilOpen={drillVariant}
        belowStimulus={drillVariant ? (
          <ArgumentBreakdown
            data={explanation ?? null}
            activeStyle={analysisStyle}
            onStyleChange={setAnalysisStyle}
            fontScale={fontScale}
            open={analysisOpen}
            onToggle={() => setAnalysisOpen((v) => !v)}
          />
        ) : undefined}
        highlights={questionHighlights.highlightsFor(question.qid)}
        highlightMode={highlightMode}
        searchTerm={searchTerm}
        fontScale={fontScale}
        // Every input that touches the record is inert. This screen reads a
        // sitting that is already over; it must not be able to change what
        // the record says happened. Highlights are the one exception: they
        // are the student's own marks, live only on this screen, and are
        // never written anywhere.
        onAnswerSelect={(letter) => {
          if (tab !== 'clean') return;
          setFreshPicks((prev) => {
            const next = { ...prev };
            if (next[currentQid] === letter) delete next[currentQid];
            else next[currentQid] = letter;
            return next;
          });
        }}
        onEliminate={noop}
        onToggleFlag={noop}
        onTextSelection={(regions) =>
          questionHighlights.applySelection(question.qid, highlightMode, regions)
        }
        onHighlightClick={(id) => {
          if (highlightMode === 'erase') questionHighlights.removeHighlight(question.qid, id);
        }}
        aboveChoices={
          <div className="flex items-center gap-1 border-b border-slate-200">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold transition-colors',
                  tab === t
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
            <span className="ml-auto text-[13px] text-slate-500">
              {tab === 'clean'
                ? freshPicks[currentQid]
                  ? `Fresh pick: ${freshPicks[currentQid]} · not saved`
                  : 'Pick an answer to re-try it cold'
                : tab === 'actual'
                  ? attempt?.selectedAnswer
                    ? `You chose ${attempt.selectedAnswer} under the clock`
                    : 'You left this one blank'
                  : brResult?.brAnswer
                    ? `Blind review: ${brResult.brAnswer}`
                    : 'Not revisited in blind review'}
            </span>
          </div>
        }
      />

      <OfficialAnswerNavigator
        questionQueue={qids}
        currentIndex={currentIndex}
        attemptedQids={answeredQids}
        jumpEnabled
        showQuestionList
        prevDisabled={currentIndex === 0}
        nextDisabled={currentIndex >= qids.length - 1}
        onJumpTo={setCurrentIndex}
        onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
        onNext={() => setCurrentIndex((i) => Math.min(qids.length - 1, i + 1))}
      />
    </OfficialDrillFrame>
  );
}
