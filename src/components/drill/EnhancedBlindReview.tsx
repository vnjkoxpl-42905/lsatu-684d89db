import * as React from 'react';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import OfficialDrillToolbar from '@/components/drill/official/OfficialDrillToolbar';
import OfficialQuestionPane from '@/components/drill/official/OfficialQuestionPane';
import OfficialAnswerNavigator from '@/components/drill/official/OfficialAnswerNavigator';
import { questionBank } from '@/lib/questionLoader';
import { cn } from '@/lib/utils';
import { QuestionTimer } from '@/lib/questionTimer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { DrillSession, BlindReviewResult } from '@/types/drill';
import type { HighlightMode } from '@/lib/highlightUtils';
import { useQuestionHighlights } from '@/hooks/useQuestionHighlights';

interface EnhancedBlindReviewProps {
  session: DrillSession;
  /**
   * Every question in the section, in order. Blind review is a second pass over
   * the WHOLE section, not over a shortlist: a pass containing only the
   * questions we suspect tells the student which ones they got wrong, which is
   * the one thing a blind review must not do.
   */
  reviewQids: string[];
  onComplete: (results: BlindReviewResult[]) => void;
  onBack: () => void;
}

export function EnhancedBlindReview({
  session,
  reviewQids,
  onComplete,
  onBack,
}: EnhancedBlindReviewProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [brAnswers, setBrAnswers] = React.useState<Map<string, string>>(new Map());
  const [brRationales, setBrRationales] = React.useState<Map<string, string>>(new Map());
  const [eliminatedAnswers, setEliminatedAnswers] = React.useState<Map<string, Set<string>>>(new Map());
  const [highlightMode, setHighlightMode] = React.useState<HighlightMode>('none');
  // Same highlight behaviour as the section itself, including on the choices.
  const questionHighlights = useQuestionHighlights();
  const [flaggedQuestions, setFlaggedQuestions] = React.useState<Set<string>>(new Set());
  const [jumpToInput, setJumpToInput] = React.useState('');
  /**
   * Which answer is on screen. `br` is the live second pass; `actual` is a
   * read-only look at what was chosen under the clock. Both are kept per
   * question, so the student can see what they are changing away from without
   * losing it. Resets to `br` on every question, because the review is the job.
   */
  const [answerTab, setAnswerTab] = React.useState<'actual' | 'br'>('br');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [fontScale, setFontScale] = React.useState(1);
  const timerRef = React.useRef(new QuestionTimer());
  const [longPressTimer, setLongPressTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);

  const currentQid = reviewQids[currentIndex];
  const currentQuestion = questionBank.getQuestion(currentQid);
  const previousAttempt = session.attempts.get(currentQid);
  const progress = ((currentIndex + 1) / reviewQids.length) * 100;

  const currentAnswer = brAnswers.get(currentQid) || '';
  const currentRationale = brRationales.get(currentQid) || '';

  // Load flagged questions on mount
  React.useEffect(() => {
    const loadFlaggedQuestions = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('flagged_questions')
          .select('qid')
          .eq('user_id', user.id)
          .in('qid', reviewQids);
        
        if (data) {
          setFlaggedQuestions(new Set(data.map(d => d.qid)));
        }
      } catch (err) {
        console.error('Error loading flagged questions:', err);
      }
    };
    
    loadFlaggedQuestions();
  }, [user, reviewQids]);

  // Start timing when question changes
  React.useEffect(() => {
    timerRef.current.start(currentQid);
    
    return () => {
      timerRef.current.pause();
    };
  }, [currentIndex, currentQid]);

  const handleAnswerSelect = (answer: string) => {
    // Toggle behavior: clicking same answer deselects it
    const newAnswer = brAnswers.get(currentQid) === answer ? '' : answer;
    setBrAnswers(new Map(brAnswers.set(currentQid, newAnswer)));
    timerRef.current.recordAnswer(currentQid, newAnswer);
  };

  const handleRationaleChange = (rationale: string) => {
    setBrRationales(new Map(brRationales.set(currentQid, rationale)));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      timerRef.current.pause();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < reviewQids.length - 1) {
      timerRef.current.pause();
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleJumpTo = () => {
    const num = parseInt(jumpToInput);
    if (num >= 1 && num <= reviewQids.length) {
      timerRef.current.pause();
      setCurrentIndex(num - 1);
      setJumpToInput('');
    }
  };

  const handleFinish = () => {
    timerRef.current.pause();
    
    const results: BlindReviewResult[] = reviewQids.map(qid => {
      const question = questionBank.getQuestion(qid);
      const previousAttempt = session.attempts.get(qid);
      const brAnswer = brAnswers.get(qid) || '';
      const brRationale = brRationales.get(qid) || '';
      const metrics = timerRef.current.getMetrics(qid);
      
      if (!question) return null;

      // Handle unanswered questions (no previous attempt)
      const preAnswer = previousAttempt?.selectedAnswer || '';
      const preCorrect = previousAttempt?.correct || false;

      // Untouched means the student read it again and let their answer stand,
      // so the question keeps the result it already had. Scoring it as wrong
      // because review collected no new letter is what made a blind review
      // read as a collapse rather than a second look.
      const brTouched = brAnswer !== '';

      return {
        qid,
        preAnswer,
        brAnswer,
        brRationale,
        brTimeMs: metrics.totalTimeMs,
        brTouched,
        brChanged: brTouched && brAnswer !== preAnswer,
        correct: brTouched ? brAnswer === question.correctAnswer : preCorrect,
        preCorrect,
        switchCount: metrics.answerSwitchCount,
        revisitCount: metrics.revisitCount,
      };
    }).filter(Boolean) as BlindReviewResult[];

    onComplete(results);
  };

  const handleEliminateAnswer = (answer: string) => {
    const qidEliminated = eliminatedAnswers.get(currentQid) || new Set<string>();
    const newQidEliminated = new Set(qidEliminated);
    
    if (newQidEliminated.has(answer)) {
      newQidEliminated.delete(answer);
    } else {
      newQidEliminated.add(answer);
      // Deselect if currently selected
      if (brAnswers.get(currentQid) === answer) {
        setBrAnswers(new Map(brAnswers.set(currentQid, '')));
        timerRef.current.recordAnswer(currentQid, '');
      }
    }
    
    setEliminatedAnswers(new Map(eliminatedAnswers.set(currentQid, newQidEliminated)));
  };

  const handleToggleFlag = async () => {
    if (!user || !currentQuestion) return;
    
    const isCurrentlyFlagged = flaggedQuestions.has(currentQid);
    
    // Check the returned { error } (supabase-js never throws on a DB failure)
    // and only update local flag state after a confirmed write; toast on error.
    try {
      if (isCurrentlyFlagged) {
        const { error } = await supabase
          .from('flagged_questions')
          .delete()
          .eq('qid', currentQid)
          .eq('user_id', user.id);
        if (error) throw error;

        setFlaggedQuestions(prev => {
          const next = new Set(prev);
          next.delete(currentQid);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('flagged_questions')
          .insert({
            qid: currentQid,
            user_id: user.id,
            pt: currentQuestion.pt,
            section: currentQuestion.section,
            qnum: currentQuestion.qnum,
            qtype: currentQuestion.qtype,
            level: currentQuestion.difficulty,
            class_id: user.user_metadata?.class_id || user.id,
          });
        if (error) throw error;

        setFlaggedQuestions(prev => new Set([...prev, currentQid]));
      }
    } catch (err) {
      console.error('Error toggling flag:', err);
      toast.error('Could not update flag');
    }
  };

  // The review is the job, so every question opens on the BR pass. Landing on
  // Actual would put a read-only screen in front of the work.
  React.useEffect(() => {
    setAnswerTab('br');
  }, [currentIndex]);

  const handleUndo = questionHighlights.undo;

  const handleLongPressStart = (answer: string) => {
    const timer = setTimeout(() => {
      handleEliminateAnswer(answer);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  if (!currentQuestion) {
    return <div>Loading...</div>;
  }

  const currentEliminated = eliminatedAnswers.get(currentQid) || new Set<string>();
  const isFlagged = flaggedQuestions.has(currentQid);
  const readOnly = answerTab === 'actual';

  const attemptedQids = new Set<string>();
  for (const qid of reviewQids) {
    if ((brAnswers.get(qid) || '') !== '') attemptedQids.add(qid);
  }

  return (
    <OfficialDrillFrame
      header={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 w-full text-[14px]">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 min-w-0 flex-1 truncate text-[15px]">
            <button
              type="button"
              onClick={onBack}
              className="text-blue-700 hover:text-blue-800 font-semibold transition-colors"
            >
              Section complete
            </button>
            <span aria-hidden className="text-slate-300">/</span>
            <span className="text-[#7f1d1d] font-semibold" aria-current="page">
              Blind Review · Question {currentIndex + 1} of {reviewQids.length}
            </span>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFinish}
              className="rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-blue-900 px-3 sm:px-5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors"
            >
              Submit blind review
            </button>
          </div>
        </div>
      }
    >
      {/* Same toolbar as the section, minus the clock. A blind review is
          untimed, so there is no timer to show and none is passed. */}
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
          qid: currentQuestion.qid,
          qnum: currentQuestion.qnum,
          stimulus: currentQuestion.stimulus,
          questionStem: currentQuestion.questionStem,
          answerChoices: currentQuestion.answerChoices,
        }}
        displayNumber={currentIndex + 1}
        selectedAnswer={readOnly ? previousAttempt?.selectedAnswer || '' : currentAnswer}
        eliminatedAnswers={readOnly ? new Set<string>() : currentEliminated}
        isFlagged={isFlagged}
        highlights={questionHighlights.highlightsFor(currentQid)}
        highlightMode={highlightMode}
        searchTerm={searchTerm}
        fontScale={fontScale}
        onAnswerSelect={(key) => !readOnly && handleAnswerSelect(key)}
        onEliminate={(key) => !readOnly && handleEliminateAnswer(key)}
        onToggleFlag={handleToggleFlag}
        onTextSelection={(regions) =>
          questionHighlights.applySelection(currentQid, highlightMode, regions)
        }
        onHighlightClick={(id) => {
          if (highlightMode === 'erase') questionHighlights.removeHighlight(currentQid, id);
        }}
        aboveChoices={
          <div className="flex items-center gap-1 border-b border-slate-200">
            {(['actual', 'br'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={answerTab === tab}
                onClick={() => setAnswerTab(tab)}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-[14px] font-semibold transition-colors',
                  answerTab === tab
                    ? 'border-[#7f1d1d] text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900',
                )}
              >
                {tab === 'actual' ? 'Actual' : 'BR'}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-3 text-[13px] text-slate-500">
              <span>
                {readOnly
                  ? previousAttempt?.selectedAnswer
                    ? `You chose ${previousAttempt.selectedAnswer} under the clock`
                    : 'You left this one blank'
                  : currentAnswer
                    ? `Reviewed answer: ${currentAnswer}`
                    : 'No change yet'}
              </span>
            </span>
          </div>
        }
      />

      {/* Why this answer. The second pass is only worth reading back if she
          says what changed her mind, so the box rides directly under the
          choices. Read-only when looking at the timed attempt. */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white">
        <label
          htmlFor="br-rationale"
          className="block text-[13px] font-semibold text-slate-700 mb-1.5"
        >
          Your rationale
        </label>
        <input
          id="br-rationale"
          type="text"
          value={readOnly ? '' : currentRationale}
          disabled={readOnly}
          onChange={(e) => handleRationaleChange(e.target.value)}
          placeholder="Why this answer?"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7f1d1d]/30 disabled:bg-slate-50 disabled:text-slate-400"
        />
      </div>



      <OfficialAnswerNavigator
        questionQueue={reviewQids}
        currentIndex={currentIndex}
        attemptedQids={attemptedQids}
        jumpEnabled
        showQuestionList
        prevDisabled={currentIndex === 0}
        nextDisabled={currentIndex >= reviewQids.length - 1}
        onJumpTo={(idx) => {
          timerRef.current.pause();
          setCurrentIndex(idx);
        }}
        onPrev={handlePrevious}
        onNext={handleNext}
      />
    </OfficialDrillFrame>
  );
}
