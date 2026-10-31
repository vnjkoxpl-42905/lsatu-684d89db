import * as React from 'react';
import { RcExamPane, rcTypeStyles } from '@/features/rc/components/RcExamPane';
import { RcPassagePane } from '@/features/rc/components/RcPassagePane';
import { RcQuestionPane } from '@/features/rc/components/RcQuestionPane';
import { addRcTimedMark } from './rcTimedReaderStorage';
import type { RcSessionItem } from '@/features/rc/lib/rcSession';
import type { RcHighlight, RcHighlightColor, RcHighlightMode } from '@/features/rc/lib/rcTypes';
import type { HighlightMode } from '@/lib/highlightUtils';
import type { TimedChildAnswer } from '@/lib/timedChildController';
import type { TimedLetter } from '@/lib/timedWorkClient';
import '@/features/rc/rc.css';
import '@/features/rc/player.css';
import './RcTimedReader.css';

/**
 * The Reading Comprehension reader used inside protected, timed sittings:
 * the split passage/question view with marks, find and passage-only mode.
 * Full PrepTests and standalone timed sections share it so the two cannot
 * drift. It never reveals answers or explanations: `revealed` is fixed false.
 * Marks are the student's own and live outside the account's answer record.
 */
export interface RcTimedReaderProps {
  item: RcSessionItem;
  answer: TimedChildAnswer;
  /** True while the section is saving, paused, expired or otherwise not accepting input. */
  blocked: boolean;
  annotationsDisabled?: boolean;
  fontScale: number;
  extraLeading?: number;
  schemeClassName?: string;
  paragraphFocus?: boolean;
  find: string;
  marker: HighlightMode;
  color: RcHighlightColor;
  onColorChange: (color: RcHighlightColor) => void;
  passageOnly: boolean;
  /** Marks for this item's passage. */
  marks: RcHighlight[];
  onMarksChange: (next: RcHighlight[]) => void;
  scrollTop: number;
  onScrollTop: (top: number) => void;
  onSelect: (letter: TimedLetter) => void;
  onToggleElimination: (letter: TimedLetter) => void;
  onToggleFlag: () => void;
}

export function RcTimedReader({
  item, answer, blocked, annotationsDisabled = false, fontScale, extraLeading = 0, schemeClassName = '', paragraphFocus = false, find, marker, color, onColorChange, passageOnly, marks, onMarksChange,
  scrollTop, onScrollTop, onSelect, onToggleElimination, onToggleFlag,
}: RcTimedReaderProps) {
  const type = rcTypeStyles(fontScale, extraLeading);
  const container = React.useRef<HTMLDivElement>(null);
  const [compact, setCompact] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 900);
  const [compactPane, setCompactPane] = React.useState<'passage' | 'question'>('passage');
  const [findCount, setFindCount] = React.useState(0);
  const [findIndex, setFindIndex] = React.useState(0);
  React.useEffect(() => { setFindIndex(0); if (find.trim().length >= 2) setCompactPane('passage'); }, [find, item.passage.passageId]);
  React.useEffect(() => {
    const element = container.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => { const width = entries[0]?.contentRect.width; if (width > 0) setCompact(width < 900); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const marksBlocked = blocked || annotationsDisabled;
  const addMark = (target: RcHighlight['target'], start: number, end: number, c: RcHighlightColor, annotation: 'highlight' | 'underline') =>
    !marksBlocked && onMarksChange(addRcTimedMark(marks, { target, start, end, color: c, kind: annotation }));
  const passage = <RcPassagePane annotationsDisabled={marksBlocked} paragraphFocus={paragraphFocus} passage={item.passage} highlights={marks} color={color} onColorChange={onColorChange} highlightMode={marker as RcHighlightMode}
      findQuery={find} findIndex={findIndex} onFindCount={setFindCount} scrollTop={scrollTop} onScroll={onScrollTop} textStyle={type.passage} passageOnly={passageOnly}
      onAddHighlight={(start, end, c, annotation) => addMark('passage', start, end, c, annotation)}
      onRemoveHighlight={offset => !marksBlocked && onMarksChange(marks.filter(value => value.target !== 'passage' || offset < value.start || offset >= value.end))}
      onRemoveRange={(start, end) => !marksBlocked && onMarksChange(marks.filter(value => value.target !== 'passage' || value.end <= start || value.start >= end))} />;
  const question = <RcQuestionPane annotationsDisabled={marksBlocked} item={item} selected={answer.selected} eliminations={answer.eliminations} flagged={answer.flagged} revealed={false}
      reattemptMode={false} reattemptPick={null} interactionDisabled={blocked} onSelect={onSelect} onToggleElimination={onToggleElimination}
      onToggleFlag={onToggleFlag} onSkipToAnswer={() => undefined} type={type} highlights={marks} color={color} onColorChange={onColorChange}
      highlightMode={marker as RcHighlightMode} onAddHighlight={addMark}
      onRemoveHighlight={(target, offset) => !marksBlocked && onMarksChange(marks.filter(value => value.target !== target || offset < value.start || offset >= value.end))}
      onRemoveRange={(target, start, end) => !marksBlocked && onMarksChange(marks.filter(value => value.target !== target || value.end <= start || value.start >= end))} />;
  const singlePane = passageOnly || compact;
  return <div ref={container} className="rc-timed-reader flex min-h-0 flex-1 flex-col" data-pane-layout={singlePane ? 'single' : 'split'}>
    {find.trim().length >= 2 && <div className="flex flex-wrap items-center gap-2 border-b p-2">
      <span role="status" aria-live="polite">{findCount ? Math.min(findIndex + 1, findCount) : 0}/{findCount}{findCount === 0 ? ' · No matches' : ''}</span>
      <button type="button" className="min-h-11 rounded border px-3" disabled={!findCount} onClick={() => { setCompactPane('passage'); setFindIndex(index => (index - 1 + findCount) % findCount); }}>Previous match</button>
      <button type="button" className="min-h-11 rounded border px-3" disabled={!findCount} onClick={() => { setCompactPane('passage'); setFindIndex(index => (index + 1) % findCount); }}>Next match</button>
    </div>}
    {compact && !passageOnly && <div className="flex gap-2 border-b p-2" role="group" aria-label="Reader pane">
      <button type="button" aria-pressed={compactPane === 'passage'} className="min-h-11 rounded border px-3" onClick={() => setCompactPane('passage')}>Passage</button>
      <button type="button" aria-pressed={compactPane === 'question'} className="min-h-11 rounded border px-3" onClick={() => setCompactPane('question')}>Questions</button>
    </div>}
    <RcExamPane schemeClassName={schemeClassName} passageOnly={singlePane}
      passage={compact && !passageOnly && compactPane === 'question' ? question : passage}
      question={question} />
  </div>;
}
