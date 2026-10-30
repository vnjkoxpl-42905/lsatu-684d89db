import { useEffect, useId, useRef, useState } from 'react';
import { createRcExposureRequest, isRcExposureRequest, recordRcPassageExposure, type RcExposureRequest } from '../api/rcExposure';
import type { RcPassage } from '../lib/rcTypes';
import { RcMarkdown } from './RcMarkdown';

type PreviewProps = { actorId: string | null; passage: RcPassage; index: number; alreadyRevealed?: boolean; presentation?: 'default' | 'folio'; onExposed(id: number): void };
export function RcExposurePreview(props: PreviewProps) {
  return <ScopedExposurePreview key={JSON.stringify([props.actorId, props.passage.passageId])} {...props} />;
}
function ScopedExposurePreview({ actorId, passage, index, alreadyRevealed = false, presentation = 'default', onExposed }: PreviewProps) {
  const readingId = useId();
  const [revealed, setRevealed] = useState(alreadyRevealed);
  const [expanded, setExpanded] = useState(alreadyRevealed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<RcExposureRequest | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const reveal = async () => {
    if (!actorId || busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    const key = `lsatu:rc-builder-exposure:v1:${encodeURIComponent(actorId)}:${passage.passageId}`;
    try {
      if (!request.current) {
        const raw = sessionStorage.getItem(key); const retained = raw ? JSON.parse(raw) : null;
        if (retained && (!isRcExposureRequest(retained) || retained.actorId !== actorId || retained.passageId !== passage.passageId || retained.source !== 'builder-preview')) throw new Error('The retained passage reveal could not be verified.');
        request.current = retained ?? createRcExposureRequest(actorId, passage.passageId, 'builder-preview');
      }
      sessionStorage.setItem(key, JSON.stringify(request.current));
      await recordRcPassageExposure(request.current!);
      if (!mounted.current) return;
      sessionStorage.removeItem(key); request.current = null;
      setRevealed(true); setExpanded(true); onExposed(passage.passageId);
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Exposure did not save. Retry before revealing text.'); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  if (presentation === 'folio') return <section className="rc-folio-passage" aria-label={`Preview passage ${index + 1}`}>
    <header className="rc-folio-passage-head"><span className="rc-folio-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div className="rc-folio-copy">
      <p className="rc-folio-reference">PT {passage.preptest} · Section {passage.section} · Passage {passage.setNumber}</p>
      <h3>{passage.title || 'Untitled passage'}</h3>
      <p className="rc-folio-metadata">{passage.topic || 'Topic not recorded'} · {passage.format || 'Format not recorded'} · {passage.difficulty == null ? 'Difficulty not recorded' : `Difficulty ${passage.difficulty}${passage.difficulty >= 1 && passage.difficulty <= 5 ? '/5' : ''}`} · {passage.questions.length} {passage.questions.length === 1 ? 'question' : 'questions'}</p>
      {!revealed ? <button type="button" className="rc-folio-preview-action" aria-controls={readingId} aria-expanded={false} aria-label={busy ? 'Recording exposure…' : error ? 'Retry passage text reveal' : 'Reveal passage and questions · records exposure'} disabled={!actorId || busy} onClick={() => void reveal()}>{busy ? 'Recording exposure…' : error ? 'Retry passage text reveal' : 'Reveal text · records exposure'}</button> : <button type="button" className="rc-folio-preview-action" aria-controls={readingId} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide passage preview' : 'Show passage preview'}</button>}
      <p className="rc-folio-preview-help">Revealing text records exposure. Answers and explanations stay hidden.</p>
    </div></header>
    {error && <p className="rc-folio-exposure-error" role="alert">{error}</p>}
    <div id={readingId} hidden={!revealed || !expanded}>{revealed && expanded && <div className="rc-folio-reading"><section className="rc-folio-reading-passage" aria-label={`Passage ${index + 1} text`}><p className="rc-folio-reading-label">Passage text</p><RcMarkdown>{passage.text}</RcMarkdown></section><section className="rc-folio-reading-questions" aria-label={`Passage ${index + 1} questions`}><p className="rc-folio-reading-label">Questions</p>{passage.questions.map(question => <article className="rc-folio-question" key={question.questionId}><h4>Question {question.position}</h4><RcMarkdown>{question.prompt}</RcMarkdown>{question.choices.map(choice => <div key={choice.letter} className="rc-folio-choice"><strong>{choice.letter}.</strong><RcMarkdown>{choice.text}</RcMarkdown></div>)}</article>)}</section></div>}</div>
  </section>;
  return <section className="rc-review-passage" aria-label={`Preview passage ${index + 1}`}>
    <h3><span className="rc-review-passage-number">{index + 1}.</span> {passage.title || 'Untitled passage'}</h3><p className="rc-review-passage-reference">PT {passage.preptest} · Section {passage.section} · Passage {passage.setNumber}</p>
    <p className="rc-review-passage-metadata">{passage.topic || 'Topic not recorded'} · {passage.format || 'Format not recorded'} · {passage.difficulty == null ? 'Difficulty not recorded' : `Difficulty ${passage.difficulty}`} · {passage.questions.length} questions</p>
    {!revealed && <button type="button" className="rc-chip rc-reveal-text-action min-h-11" aria-label={busy ? 'Recording exposure…' : error ? 'Retry passage text reveal' : 'Reveal passage and questions · records exposure'} disabled={!actorId || busy} onClick={() => void reveal()}>{busy ? 'Recording exposure…' : error ? 'Retry passage text reveal' : 'Reveal text · records exposure'}</button>}
    {error && <p role="alert">{error}</p>}
    {revealed && <div style={{ maxHeight: 560, overflowY: 'auto', padding: '12px 4px' }}>
      <RcMarkdown>{passage.text}</RcMarkdown>
      {passage.questions.map(question => <div key={question.questionId} style={{ marginTop: 24 }}>
        <strong>Question {question.position}</strong><RcMarkdown>{question.prompt}</RcMarkdown>
        {question.choices.map(choice => <div key={choice.letter} className="mt-2 flex gap-2"><strong>{choice.letter}.</strong><RcMarkdown>{choice.text}</RcMarkdown></div>)}
      </div>)}
    </div>}
  </section>;
}
