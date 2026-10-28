import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { loadPassage } from '../lib/rcBank';
import { createSession, getSession } from '../api/rcProgress';
import { createRcExposureRequest, isRcExposureRequest, recordRcPassageExposure, type RcExposureRequest } from '../api/rcExposure';
import { RcMarkdown } from '../components/RcMarkdown';
import { rcTypeStyles } from '../components/RcExamPane';
import { safeRcReturnTo } from '../lib/rcReturnTo';
import type { RcDrillConfig, RcDrillSession, RcPassage } from '../lib/rcTypes';

const CONFIG: RcDrillConfig = { reveal: 'per_passage', timing: { mode: 'unlimited' }, source: 'manual' };
const FALLBACK = '/practice/drills?section=rc';
type Pending = { id: string; actorId: string; passageId: number; questionId: number | null; back: string };
const pendingKey = (actor: string) => `lsatu:rc-preview-launch:v1:${actor}`;

/** Metadata first. Explicit text reveal records exposure; Start creates the drill. */
export default function RcQuestionPreview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const actor = React.useRef(user?.id);
  actor.current = user?.id;
  const passageId = Number(params.get('passage'));
  const questionParam = params.get('q');
  const questionId = questionParam === null ? null : Number(questionParam);
  const addressValid = Number.isSafeInteger(passageId) && passageId > 0 && (questionId === null || (Number.isSafeInteger(questionId) && questionId > 0));
  const back = safeRcReturnTo(params.get('returnTo')) ?? FALLBACK;
  const context = React.useRef('');
  // Raw q distinguishes an absent question from an invalid value (NaN would stringify as null).
  context.current = JSON.stringify([user?.id, passageId, questionParam, back]);
  const [passage, setPassage] = React.useState<RcPassage | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [retry, setRetry] = React.useState(0);
  const [starting, setStarting] = React.useState(false);
  const busy = React.useRef(false);
  const mounted = React.useRef(true);
  const pending = React.useRef<Pending | null>(null);
  const exposure = React.useRef<RcExposureRequest | null>(null);
  const revealingRef = React.useRef(false);
  const [revealing, setRevealing] = React.useState(false);
  const [revealError, setRevealError] = React.useState('');
  const [revealedContext, setRevealedContext] = React.useState('');
  const textRevealed = revealedContext === context.current;
  React.useEffect(() => { exposure.current = null; setRevealError(''); }, [user?.id, passageId, questionParam, back]);
  React.useEffect(() => { pending.current = null; }, [user?.id, passageId, questionParam, back]);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setPassage(null); setError('');
    if (!addressValid) {
      setError('That question address is invalid.'); setLoading(false); return;
    }
    loadPassage(passageId).then((loaded) => {
      if (cancelled) return;
      if (!loaded || loaded.passageId !== passageId) throw new Error('That passage could not be found.');
      if (loaded.questions.length === 0) throw new Error('That passage has no available questions.');
      if (questionId !== null && !loaded.questions.some((q) => q.questionId === questionId)) throw new Error('That question is not in this passage.');
      setPassage(loaded);
    }).catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'The preview could not load.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [passageId, questionId, questionParam, addressValid, retry]);
  const currentPassage = addressValid && passage?.passageId === passageId && passage.questions.length > 0 && (questionId === null || passage.questions.some((q) => q.questionId === questionId));
  const start = async () => {
    if (!passage || !currentPassage || busy.current) return;
    busy.current = true; setStarting(true); setError('');
    const launchContext = context.current;
    try {
      if (!user) throw new Error('Sign in to start a drill.');
      const raw = sessionStorage.getItem(pendingKey(user.id));
      if (!pending.current && raw) {
        const saved = JSON.parse(raw) as Pending;
        if (typeof saved.id !== 'string' || saved.actorId !== user.id || saved.passageId !== passageId || saved.questionId !== questionId || safeRcReturnTo(saved.back) !== saved.back) {
          throw new Error('A different passage launch is awaiting confirmation. Return to that preview before starting another drill.');
        }
        pending.current = saved;
      }
      const request = pending.current ?? { id: crypto.randomUUID(), actorId: user.id, passageId, questionId, back };
      if (request.actorId !== actor.current) throw new Error('The signed-in account changed.');
      pending.current = request;
      sessionStorage.setItem(pendingKey(request.actorId), JSON.stringify(request));
      const verifyActor = () => {
        if (actor.current !== request.actorId) throw new Error('The signed-in account changed.');
        if (context.current !== launchContext) throw new Error('The preview changed. The original launch is retained for confirmation.');
      };
      let saved: RcDrillSession | null;
      try { saved = await getSession(request.id, request.actorId); }
      catch { throw new Error('We could not confirm the launch. Retry this exact drill.'); }
      verifyActor();
      if (!mounted.current) return;
      if (!saved) {
        try { saved = await createSession(CONFIG, [request.passageId], { id: request.id, actorId: request.actorId }); }
        catch (err) {
          try { saved = await getSession(request.id, request.actorId); }
          catch { throw new Error('We could not confirm the launch. Retry this exact drill.'); }
          if (!saved) throw err;
        }
      }
      verifyActor();
      if (!mounted.current) return;
      if (saved.id !== request.id || saved.userId !== request.actorId || saved.passageIds.length !== 1 || saved.passageIds[0] !== request.passageId || saved.config.reveal !== CONFIG.reveal || saved.config.source !== CONFIG.source || saved.config.timing.mode !== 'unlimited' || saved.config.practiceTestRunId || saved.config.timedSectionSittingId) throw new Error('The saved drill does not match this launch. Retry before starting another.');
      sessionStorage.removeItem(pendingKey(request.actorId)); pending.current = null;
      const query = new URLSearchParams({ sessionId: saved.id });
      if (request.questionId !== null) query.set('q', String(request.questionId));
      query.set('returnTo', request.back);
      navigate(`/rc/drill?${query}`);
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : 'The drill could not start.'); }
    finally { busy.current = false; if (mounted.current) setStarting(false); }
  };
  const revealText = async () => {
    if (!user?.id || !passage || !currentPassage || revealingRef.current) return;
    revealingRef.current = true; setRevealing(true); setRevealError('');
    const revealContext = context.current;
    const key = `lsatu:rc-preview-exposure:v1:${encodeURIComponent(user.id)}:${passageId}`;
    try {
      if (!exposure.current) {
        const raw = sessionStorage.getItem(key);
        const saved = raw ? JSON.parse(raw) : null;
        if (saved && (!isRcExposureRequest(saved) || saved.actorId !== user.id || saved.passageId !== passageId || saved.source !== 'preview')) throw new Error('The retained passage reveal could not be verified.');
        exposure.current = saved ?? createRcExposureRequest(user.id, passageId, 'preview');
      }
      const request = exposure.current!;
      sessionStorage.setItem(key, JSON.stringify(request));
      await recordRcPassageExposure(request);
      if (!mounted.current || context.current !== revealContext || actor.current !== request.actorId) return;
      sessionStorage.removeItem(key); exposure.current = null;
      setRevealedContext(revealContext);
    } catch (err) {
      if (mounted.current && context.current === revealContext) setRevealError(err instanceof Error ? err.message : 'The passage reveal could not be saved. Retry before viewing the text.');
    } finally {
      revealingRef.current = false;
      if (mounted.current) setRevealing(false);
    }
  };
  const question = passage?.questions.find((q) => q.questionId === questionId);
  const type = rcTypeStyles(1, 0);
  return <main className="mx-auto max-w-7xl p-4 sm:p-6">
    <button type="button" className="min-h-11 rounded-md border px-4 py-2 focus-visible:outline focus-visible:outline-2" disabled={starting} onClick={() => navigate(back, { replace: true })}>{back.startsWith('/practice') ? 'Back to Practice' : 'Back'}</button>
    <h1 className="mt-4 text-2xl font-semibold">{questionId === null ? 'Passage preview' : 'Question preview'}</h1>
    <p>Metadata preview. Answers and explanations are hidden. Revealing text records that you have seen this passage.</p>
    {loading && <p role="status">Loading preview…</p>}
    {error && <div role="alert">{error} {!passage && <button type="button" onClick={() => setRetry((n) => n + 1)}>Retry</button>}</div>}
    {passage && currentPassage && <>
      <h2 className="my-4 font-semibold">PT {passage.preptest} · Section {passage.section} · Passage {passage.setNumber}{question ? ` · Question ${question.position}` : ''}</h2>
      <p>{passage.title ?? 'Untitled passage'} · {passage.topic ?? 'Topic not recorded'} · {passage.format ?? 'Format not recorded'} · {passage.difficulty == null ? 'Difficulty not recorded' : `Difficulty ${passage.difficulty}`} · {passage.questions.length} questions</p>
      {!textRevealed && <div className="my-4"><p>{question ? 'The passage, question stem, and choices stay hidden until you reveal them.' : 'The passage text stays hidden until you reveal it. Questions, answers and explanations stay hidden.'}</p>
        <button type="button" className="min-h-11 rounded border px-4 py-2" disabled={!user || revealing} onClick={() => void revealText()}>{revealing ? 'Recording exposure…' : revealError ? 'Retry text reveal' : question ? 'Reveal passage and question' : 'Reveal passage'}</button>
        {!user && <p>Sign in to reveal text and keep your exposure history accurate.</p>}
      </div>}
      {revealError && <p role="alert">{revealError}</p>}
      {textRevealed && <>
      <div className={question ? 'grid gap-8 lg:grid-cols-2' : 'max-w-3xl'}>
        <section aria-label="Passage" style={type.passage}><RcMarkdown className="[&_p]:mb-4">{passage.text}</RcMarkdown></section>
        {question && <section aria-label={`Question ${question.position}`} style={type.question}><RcMarkdown>{question.prompt}</RcMarkdown>
          <ol className="mt-4 space-y-4">{question.choices.map((choice) => <li key={choice.letter} className="flex gap-3"><span className="font-semibold">{choice.letter}.</span><RcMarkdown>{choice.text}</RcMarkdown></li>)}</ol>
        </section>}
      </div>
      </>}
      <div className="mt-8"><p>Start includes 1 passage and all {passage.questions.length} questions. Untimed. Answers after each passage.</p>
        <button type="button" className="mt-3 min-h-11 rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 disabled:opacity-50" disabled={starting || !user} onClick={() => void start()}>{starting ? 'Starting…' : pending.current ? 'Retry passage drill' : 'Start passage drill'}</button>
      </div>
    </>}
  </main>;
}
