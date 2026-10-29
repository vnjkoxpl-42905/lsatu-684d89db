import { safeReviewHubReturn } from '@/lib/reviewHubReturn';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOwnedHardSentencesAttempt, type HardSentencesAttempt } from '@/components/review/hardSentencesReviewSource';
import SavedReviewEpisodePanel from '@/components/review/SavedReviewEpisodePanel';

export default function HardSentencesReviewDetail() {
  const { sourceKind, attemptKey } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const requested = params.get('returnTo');
  const returnTo = safeReviewHubReturn(requested) ?? '/review/to-review?reason=missed';
  const [saved, setSaved] = useState<{ scope: string; attempt: HardSentencesAttempt | null } | null>(null);
  const scope = `${user?.id ?? ''}:${sourceKind ?? ''}:${attemptKey ?? ''}`;
  const attempt = saved?.scope === scope ? saved.attempt : null;
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setSaved(null); setFailed(false); setLoading(true);
    if (!user?.id || !sourceKind || !attemptKey) { setLoading(false); return; }
    void fetchOwnedHardSentencesAttempt(user.id, sourceKind, attemptKey).then(row => { if (active) setSaved({ scope, attempt: row }); })
      .catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, sourceKind, attemptKey, scope, retry]);
  return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-7 sm:px-6">
    <Link className="inline-flex min-h-11 items-center underline" to={returnTo}>Back to Review</Link>
    {loading ? <p role="status">Loading saved Hard Sentences attempt…</p> : failed ? <div role="alert">
      <p>This saved attempt could not be loaded.</p><button className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Try again</button>
    </div> : !attempt ? <p role="status">This saved Hard Sentences miss is unavailable in your account.</p> : <>
      <header><p className="text-sm text-muted-foreground">Hard Sentences · Saved missed attempt</p>
        <h1 className="text-2xl font-semibold">{attempt.kind === 'cluster' ? 'Cluster decomposition' : 'Capstone'}</h1>
        <p>{attempt.item.id} · {new Date(attempt.at).toLocaleDateString()}</p></header>
      <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="Authored exercise">
        <h2 className="text-lg font-semibold">The exercise</h2>
        <p>{attempt.kind === 'cluster' ? attempt.item.sentence : attempt.item.stimulus}</p>
        {attempt.kind === 'capstone' && <><p>{attempt.item.prompt}</p><ul className="space-y-2">{attempt.item.choices.map(choice => <li key={choice.letter}>{choice.letter}. {choice.text}</li>)}</ul></>}
      </section>
      <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="Saved answer">
        <h2 className="text-lg font-semibold">Your saved answer</h2>
        {attempt.kind === 'capstone' ? <p>{attempt.answer}. {attempt.item.choices.find(choice => choice.letter === attempt.answer)?.text}</p>
          : attempt.answer === null ? <p>The exercise saved an incorrect outcome without an answer selection.</p>
          : attempt.answer === '' ? <p>No specifiers were lifted.</p>
          : <ul>{attempt.answer.split(',').map(id => <li key={id}>Lifted: {attempt.item.specifiers.find(specifier => specifier.id === id)?.text ?? `Unrecognized saved specifier (${id})`}</li>)}</ul>}
      </section>
      <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="Authored reasoning">
        <h2 className="text-lg font-semibold">How to reason through it</h2>
        {attempt.kind === 'cluster' ? <><p>Core: {attempt.item.core}</p><p>{attempt.item.coachNote}</p><ul className="space-y-2">{attempt.item.specifiers.map(specifier => <li key={specifier.id}><strong>{specifier.loadBearing ? 'Keep' : 'Lift'}: {specifier.text}.</strong> {specifier.rationale}</li>)}</ul></>
          : <ul className="space-y-3">{attempt.item.choices.map(choice => <li key={choice.letter}><strong>{choice.letter}: {choice.is_correct ? 'Correct' : 'Incorrect'}.</strong> {choice.rationale}</li>)}</ul>}
      </section>
      <p className="text-sm text-muted-foreground">This is one saved submission, not a verified first answer or Blind Review episode. Its original outcome was incorrect. The exercise wording and explanations come from current authored content. Viewing this page creates no attempt and records no new reveal.</p>
      {user?.id && <SavedReviewEpisodePanel ownerId={user.id} source={attempt.kind === 'cluster' ? 'intro_lr_attempts' : 'hs_capstone'} sourceId={attempt.key} requestedEpisodeId={params.get('episode')} />}
    </>}
  </main>;
}
