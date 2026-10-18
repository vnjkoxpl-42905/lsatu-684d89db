import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RcExplanationBlocks } from './RcExplanationBlocks';
import type { RcLetter, RcQuestion } from '../lib/rcTypes';

/**
 * The verdict banner and authored walkthrough shown once a question is revealed.
 * The per-choice rows live with the choices themselves (RcChoiceDisclosure), so
 * this covers everything above them.
 *
 * A question with no authored prose gets the tutor fallback and nothing else.
 * Nothing here is ever invented to fill a gap.
 */

interface Props {
  question: RcQuestion;
  firstPick: RcLetter | null;
  /** An acknowledged second answer, including when the student kept their choice. */
  secondPick?: RcLetter | null;
  sourceLabel?: string;
  actorId?: string | null;
}

export function RcReviewLayer({ question, firstPick, secondPick, sourceLabel, actorId }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const askJoshua = () => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('sessionId');
    if (!actorId || !sessionId) { navigate('/inbox'); return; }
    const returnTo = `/rc/drill?${new URLSearchParams({ sessionId, review: '1', q: String(question.questionId) })}`;
    const text = `I have a question about ${sourceLabel ?? `RC question ${question.position}`}.
\nSource session: ${sessionId}\nReturn to this question: ${returnTo}
\nQuestion: ${question.prompt?.slice(0, 2200) || 'The question text is not available.'}
\nMy first answer: ${firstPick ?? 'skipped'}${secondPick ? `\nMy review answer: ${secondPick}` : ''}
\nMy question:`;
    navigate('/inbox', { state: { questionContext: { actorId, text: text.slice(0, 4000), returnTo } } });
  };
  const blocks = question.explanationBlocks ?? [];
  const latestPick = secondPick ?? firstPick;
  const gotItRight = latestPick === question.correctAnswer;

  // Tag-only questions carry a record but no prose. If there is nothing authored
  // anywhere, say so plainly rather than rendering an empty shell.
  const hasChoiceProse = question.choices.some((c) => c.explanation || c.tag);
  const hasAnything = blocks.length > 0 || hasChoiceProse;

  return (
    <div className="rc-review">
      <div className={`rc-verdict${gotItRight ? ' rc-verdict-right' : ' rc-verdict-wrong'}`}>
        <strong>{gotItRight ? 'Correct' : 'Not quite'}</strong>
        <span className="rc-verdict-detail">
          Credited answer {question.correctAnswer}
          {latestPick ? ` · you chose ${latestPick}` : ' · you skipped this one'}
        </span>
        {secondPick && (
          <span className="rc-verdict-detail">
            <span className="rc-tag-chip rc-tag-outline">First answer {firstPick ?? 'skipped'}</span>
            <span className="rc-tag-chip rc-tag-outline">Review answer {secondPick}</span>
          </span>
        )}
      </div>

      {hasAnything ? (
        <RcExplanationBlocks
          blocks={blocks}
          openFirst={!gotItRight}
          resetKey={question.questionId}
        />
      ) : (
        <div className="rc-tutor-fallback">
          <p>No written walkthrough for this one yet. Ask the tutor and we'll work it together.</p>
          <button type="button" className="rc-button" onClick={askJoshua}>
            Ask Joshua about this question
          </button>
        </div>
      )}
    </div>
  );
}

export default RcReviewLayer;
