import { useEffect, useRef, useState } from 'react';
import { createRcExposureRequest, isRcExposureRequest, recordRcPassageExposure, type RcExposureRequest } from '../api/rcExposure';
import type { RcPassage } from '../lib/rcTypes';
import { RcMarkdown } from './RcMarkdown';

export function RcExposurePreview({ actorId, passage, index, alreadyRevealed = false, onExposed }: { actorId: string | null; passage: RcPassage; index: number; alreadyRevealed?: boolean; onExposed(id: number): void }) {
  const [revealed, setRevealed] = useState(alreadyRevealed);
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
      setRevealed(true); onExposed(passage.passageId);
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Exposure did not save. Retry before revealing text.'); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  return <section className="mt-4 rounded border p-3" aria-label={`Preview passage ${index + 1}`}>
    <h3>{index + 1}. PT {passage.preptest} · S{passage.section} · P{passage.setNumber} · {passage.title || 'Untitled passage'}</h3>
    <p>{passage.topic || 'Topic not recorded'} · {passage.format || 'Format not recorded'} · {passage.difficulty == null ? 'Difficulty not recorded' : `Difficulty ${passage.difficulty}`} · {passage.questions.length} questions</p>
    {!revealed && <button type="button" className="rc-chip min-h-11" disabled={!actorId || busy} onClick={() => void reveal()}>{busy ? 'Recording exposure…' : error ? 'Retry passage text reveal' : 'Reveal passage and questions · records exposure'}</button>}
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
