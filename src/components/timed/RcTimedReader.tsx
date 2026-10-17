import * as React from 'react';
import { RcExamPane, rcTypeStyles } from '@/features/rc/components/RcExamPane';
import { RcPassagePane } from '@/features/rc/components/RcPassagePane';
import { RcQuestionPane } from '@/features/rc/components/RcQuestionPane';
import type { RcSessionItem } from '@/features/rc/lib/rcSession';
import type { RcHighlight, RcHighlightColor, RcHighlightMode } from '@/features/rc/lib/rcTypes';
import type { HighlightMode } from '@/lib/highlightUtils';
import type { TimedChildAnswer } from '@/lib/timedChildController';
import type { TimedLetter } from '@/lib/timedWorkClient';
import '@/features/rc/rc.css';
import '@/features/rc/player.css';

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
  item, answer, blocked, annotationsDisabled = false, fontScale, find, marker, color, onColorChange, passageOnly, marks, onMarksChange,
  scrollTop, onScrollTop, onSelect, onToggleElimination, onToggleFlag,
}: RcTimedReaderProps) {
  const type = rcTypeStyles(fontScale, 0);
  const marksBlocked = blocked || annotationsDisabled;
  const addMark = (target: RcHighlight['target'], start: number, end: number, c: RcHighlightColor, annotation: 'highlight' | 'underline') =>
    !marksBlocked && onMarksChange([...marks, { target, start, end, color: c, kind: annotation }]);
  return <RcExamPane schemeClassName="" passageOnly={passageOnly}
    passage={<RcPassagePane annotationsDisabled={marksBlocked} passage={item.passage} highlights={marks} color={color} onColorChange={onColorChange} highlightMode={marker as RcHighlightMode}
      findQuery={find} findIndex={0} onFindCount={() => undefined} scrollTop={scrollTop} onScroll={onScrollTop} textStyle={type.passage} passageOnly={passageOnly}
      onAddHighlight={(start, end, c, annotation) => addMark('passage', start, end, c, annotation)}
      onRemoveHighlight={offset => !marksBlocked && onMarksChange(marks.filter(value => value.target !== 'passage' || offset < value.start || offset >= value.end))}
      onRemoveRange={(start, end) => !marksBlocked && onMarksChange(marks.filter(value => value.target !== 'passage' || value.end <= start || value.start >= end))} />}
    question={<RcQuestionPane annotationsDisabled={marksBlocked} item={item} selected={answer.selected} eliminations={answer.eliminations} flagged={answer.flagged} revealed={false}
      reattemptMode={false} reattemptPick={null} interactionDisabled={blocked} onSelect={onSelect} onToggleElimination={onToggleElimination}
      onToggleFlag={onToggleFlag} onSkipToAnswer={() => undefined} type={type} highlights={marks} color={color} onColorChange={onColorChange}
      highlightMode={marker as RcHighlightMode} onAddHighlight={addMark}
      onRemoveHighlight={(target, offset) => !marksBlocked && onMarksChange(marks.filter(value => value.target !== target || offset < value.start || offset >= value.end))}
      onRemoveRange={(target, start, end) => !marksBlocked && onMarksChange(marks.filter(value => value.target !== target || value.end <= start || value.start >= end))} />} />;
}
