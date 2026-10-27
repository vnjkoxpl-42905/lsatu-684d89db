import { useEffect, useRef, useState } from 'react';
import { GROUPS, GROUP_LABEL, INDICATOR_POOL, type GroupId } from './content';
import { Diagram, Tok } from './Notation';
import { PRACTICE_CARDS, PRACTICE_DIAGRAMS, PRACTICE_REVISION, diagramMatches, englishRule, negateSideText } from './practiceContent';
import { freshRun, rateCard, restoreRun, validRatings, type PracticeRun, type Rating } from './practiceState';
import './conditional-refresher.css';

export interface ConditionalSkillActivityProps {
  kind: 'sort' | 'translate-cards' | 'diagram'; groups: GroupId[];
  stage: 'translate' | 'contrapositive'; review: 'all' | 'needs'; storageScope: string;
  itemId?: string; embedded?: boolean; allowCompound?: boolean;
}
const sortedGroups = (groups: GroupId[]) => GROUPS.map(g => g.id).filter(id => groups.includes(id));
export function ConditionalSkillActivity(props: ConditionalSkillActivityProps) {
  const groups = sortedGroups(props.groups);
  const groupValid = groups.length && props.groups.every(id => GROUPS.some(group => group.id === id));
  const diagrams = PRACTICE_DIAGRAMS.filter(item => groups.includes(item.group) && (props.allowCompound !== false || !item.connectors?.length));
  const cards = PRACTICE_CARDS.filter(card => card.groups.every(group => groups.includes(group)));
  const indicators = INDICATOR_POOL.filter(item => groups.includes(item.group)).map(item => ({ ...item, id: `${item.group}:${item.word}` }));
  const ids = props.kind === 'sort' ? indicators.map(i => i.id) : props.kind === 'diagram' ? diagrams.map(i => i.id) : cards.map(i => i.id);
  const valid = groupValid && !!props.storageScope && ['sort', 'translate-cards', 'diagram'].includes(props.kind)
    && ['translate', 'contrapositive'].includes(props.stage) && ['all', 'needs'].includes(props.review)
    && (props.kind !== 'sort' || groups.length >= 2) && (!props.itemId || ids.includes(props.itemId));
  if (!valid) return <section className="cir-card"><p>This practice is unavailable with these settings. Choose a permitted topic and activity.</p></section>;
  const fingerprint = JSON.stringify([PRACTICE_REVISION, props.kind, groups, props.stage, props.review, ids, props.itemId ?? null]);
  return <ActivityRun key={`${props.storageScope}:${fingerprint}`} {...props} groups={groups} ids={ids} fingerprint={fingerprint} />;
}

function ActivityRun({ kind, groups, stage, review, storageScope, itemId, ids, fingerprint, allowCompound }: ConditionalSkillActivityProps & { ids: string[]; fingerprint: string }) {
  const key = `lsatu.conditional-skill.v2:${encodeURIComponent(storageScope)}:${kind}:${groups.join(',')}:${stage}:${review}:${itemId ?? 'round'}`;
  const ratingKey = `lsatu.conditional-skill.ratings.v3:${encodeURIComponent(storageScope)}:${kind}`;
  const ratingIds = kind === 'translate-cards' ? PRACTICE_CARDS.map(card => card.id) : ids;
  const readRatings = () => {
    const raw = localStorage.getItem(ratingKey);
    if (raw !== null) return validRatings(JSON.parse(raw), ratingIds);
    // Known same-actor former keys only. Without timestamps, retain any review
    // mark conservatively; an explicit new rating becomes authoritative.
    const legacy: Record<string, Rating> = {};
    for (let mask = 1; mask < 16; mask++) for (const oldStage of ['translate', 'contrapositive']) {
      const oldGroups = GROUPS.filter((_, index) => mask & (1 << index)).map(group => group.id);
      const old = validRatings(JSON.parse(localStorage.getItem(`lsatu.conditional-skill.ratings.v2:${encodeURIComponent(storageScope)}:${kind}:${oldGroups.join(',')}:${oldStage}`) ?? '{}'), ratingIds);
      for (const [id, rating] of Object.entries(old)) if (!legacy[id] || legacy[id] === 'got' || rating === 'again') legacy[id] = rating;
    }
    return legacy;
  };
  const sameEligibleRatings = (a: Record<string, Rating>, b: Record<string, Rating>) => ids.every(id => a[id] === b[id]);
  const sectionRef = useRef<HTMLElement>(null);
  const previousPosition = useRef<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [ratingSaveError, setRatingSaveError] = useState(false);
  const [freshNotice, setFreshNotice] = useState(false);
  const [run, setRun] = useState<PracticeRun>(() => {
    let ratings: Record<string, Rating> = {};
    try {
      ratings = readRatings();
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = restoreRun(JSON.parse(raw), ids, fingerprint);
        if (saved && validDraft(saved, kind) && (review !== 'needs' || sameEligibleRatings(saved.ratings, ratings))) return { ...saved, ratings };
      }
    } catch { /* The effect reports storage failures; malformed records start fresh. */ }
    const eligible = itemId ? [itemId] : review === 'needs' ? ids.filter(id => ratings[id] === 'again' || ratings[id] === 'needs') : ids;
    return freshRun(eligible, fingerprint, ratings);
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const saved = restoreRun(JSON.parse(raw), ids, fingerprint); if (!saved || !validDraft(saved, kind)) setFreshNotice(true); }
    } catch { setFreshNotice(true); }
  }, [key]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(run)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [run, key]);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const positionChanged = previousPosition.current !== null && previousPosition.current !== run.index;
    previousPosition.current = run.index;
    const target = positionChanged ? section.querySelector<HTMLElement>('.cir-prompt, .cir-comparison h2, h2')
      : run.feedback === 'correct' || run.feedback === 'reveal' ? section.querySelector<HTMLElement>('[data-continue]')
      : section.querySelector<HTMLElement>('[data-rate-card]');
    if (target) { if (positionChanged) target.tabIndex = -1; target.focus(); }
  }, [run.index, run.step, run.feedback]);
  const patch = (value: Partial<PracticeRun>) => setRun(current => ({ ...current, ...value }));
  const restart = (all = false) => {
    let ratings = { ...run.ratings };
    try { ratings = { ...ratings, ...readRatings() }; } catch { /* In-memory review remains available. */ }
    const eligible = itemId ? [itemId] : review === 'needs' && !all ? ids.filter(id => ratings[id] === 'again' || ratings[id] === 'needs') : ids;
    setRun(freshRun(eligible, fingerprint, ratings, run.attempt + 1));
  };
  const recordRating = (rating: Rating) => {
    let ratings = { ...run.ratings };
    try { ratings = { ...ratings, ...readRatings() }; } catch { /* Keep in-memory marks when storage cannot be read. */ }
    ratings[run.queue[run.index]] = rating;
    try { localStorage.setItem(ratingKey, JSON.stringify(validRatings(ratings, ratingIds))); setRatingSaveError(false); }
    catch { setRatingSaveError(true); }
    setRun(rateCard({ ...run, ratings }, rating));
  };
  const next = () => patch({ index: run.index + 1, step: 1, left: [], right: [], side: 'left', feedback: 'none' });
  const currentId = run.queue[run.index];
  const finished = run.index >= run.queue.length;
  const firstCorrect = Object.values(run.results).filter(result => result.firstCorrect).length;
  const resolved = Object.values(run.results).filter(result => result.resolved).length;
  const assessed = Object.keys(run.results).length;
  const check = (correct: boolean) => {
    const old = run.results[currentId];
    patch({ feedback: correct ? 'correct' : 'hint', results: { ...run.results, [currentId]: { tries: (old?.tries ?? 0) + 1, firstCorrect: old ? old.firstCorrect : correct, resolved: old?.resolved || correct } } });
  };
  const reveal = () => patch({ feedback: 'reveal', results: { ...run.results, [currentId]: { tries: run.results[currentId]?.tries ?? 0, firstCorrect: run.results[currentId]?.firstCorrect ?? false, resolved: true } } });
  return <section ref={sectionRef} className="cir-card cir-skill-activity" aria-label={kind === 'sort' ? 'Sort indicators' : kind === 'diagram' ? 'Build a diagram' : 'Sentence cards'}>
    <p className="cir-meta">{groups.map(group => `Group ${group.slice(1)}`).join(' · ')} · {stage === 'translate' ? 'Translation' : 'Translation and contrapositive'}</p>
    <p className="cir-save" role="status">{saveError || ratingSaveError ? 'This browser could not save your work. Keep this page open to continue.' : 'Your place is saved in this browser.'}</p>
    {freshNotice && <p>A fresh round has started because the saved round no longer matches this activity.</p>}
    <div className="cir-bar" role="progressbar" aria-label="Round progress" aria-valuemin={0} aria-valuemax={run.queue.length || 1} aria-valuenow={run.index}><span style={{ width: `${run.queue.length ? run.index / run.queue.length * 100 : 0}%` }} /></div>
    {finished ? <>
      <h2>{run.queue.length ? 'Round finished' : 'No cards need practice yet'}</h2>
      {kind === 'translate-cards' ? <p>Your ratings guide future review. They are self-reports, not a mastery score.</p> : <p>{firstCorrect} correct on the first attempt out of {assessed} attempted. {resolved} resolved, including revealed answers.</p>}
      <div className="cir-actions"><button className="cir-btn" onClick={() => restart(!run.queue.length)}>{run.queue.length ? 'Start a new round' : 'Practice all cards'}</button></div>
    </> : <>
      <p className="cir-meta">{kind === 'translate-cards' ? 'Card' : 'Item'} {run.index + 1} of {run.queue.length} · Round {run.attempt}</p>
      {kind === 'sort' && (() => {
        const item = INDICATOR_POOL.find(i => `${i.group}:${i.word}` === currentId)!;
        const shown = run.feedback === 'correct' || run.feedback === 'reveal';
        return <><p className="cir-prompt">{item.word}</p><p>Which group does this indicator belong to?</p><div className="cir-choices">{groups.map(group => <button key={group} className="cir-choice" disabled={shown} onClick={() => check(group === item.group)}>{GROUP_LABEL[group]}</button>)}</div>
          <div role="status" aria-live="polite" aria-atomic="true">{run.feedback === 'hint' && <p>Think about what the word does: does it introduce IF, introduce THEN, or ask you to negate an idea?</p>}{shown && <p>{GROUP_LABEL[item.group]}. {GROUPS.find(g => g.id === item.group)?.rule ?? GROUPS.find(g => g.id === item.group)?.steps?.join(' ')}</p>}</div>
          <div className="cir-actions">{run.feedback === 'hint' && <button className="cir-btn ghost" onClick={reveal}>Show answer</button>}{shown && <button className="cir-btn" data-continue onClick={next}>Next</button>}</div></>;
      })()}
      {kind === 'translate-cards' && (() => {
        const card = PRACTICE_CARDS.find(c => c.id === currentId)!;
        const translation = card.kind === 'translation';
        const contrast = card.kind === 'contrast';
        const revealStep = translation ? stage === 'contrapositive' ? 4 : 3 : 2;
        return <>{contrast ? <div className="cir-comparison" aria-label="Compare these statements"><p>{card.rows[0].label}</p><span>vs</span><p>{card.rows[1].label}</p><h2>Do they say the same thing?</h2></div> : <p className="cir-prompt">{card.front}</p>}
          <p>{translation ? 'Write the diagram before you continue.' : contrast ? 'Diagram both statements. Explain what changes between them.' : 'Answer the question before you reveal the explanation.'}</p>
          {translation && run.step >= 2 && <p>Read your diagram in ordinary English. Keep the subject, every negative and any time boundary.</p>}
          {translation && stage === 'contrapositive' && run.step >= 3 && <p>Now reverse and negate the conditions. Read that contrapositive in English too.</p>}
          {run.step < revealStep ? <button className="cir-btn" onClick={() => patch({ step: run.step + 1 })}>{!translation ? 'Show answer' : run.step === 1 ? 'I have the diagram' : run.step === 2 ? 'I said it in English' : 'Show answer'}</button> : <>
            <div className="cir-reveal">{card.rows.map(row => <div className="cir-answer" key={row.label}><h3>{row.label}</h3><Diagram left={row.left} right={row.right} /><p>{row.english}</p>{stage === 'contrapositive' && <><p>Contrapositive</p><Diagram left={negateSideText(row.right)} right={negateSideText(row.left)} /><p>{row.contraEnglish}</p></>}</div>)}<p>{card.note}</p></div>
            <p className="cir-meta">Choose what to review next. Again adds at most one retry later in this round.</p>
            <div className="cir-actions">{(['again', 'needs', 'got'] as Rating[]).map(rating => <button key={rating} data-rate-card={rating === 'again' ? 'true' : undefined} className={`cir-btn${rating === 'got' ? '' : ' ghost'}`} onClick={() => recordRating(rating)}>{rating === 'again' ? 'Again' : rating === 'needs' ? 'Needs work' : 'Got it'}</button>)}</div>
          </>}</>;
      })()}
      {kind === 'diagram' && (() => {
        const item = PRACTICE_DIAGRAMS.find(i => i.id === currentId)!;
        const shown = run.feedback === 'correct' || run.feedback === 'reveal';
        const tokens = [...item.names.flatMap(name => [name, `/${name}`]), ...(item.connectors?.length ? stage === 'contrapositive' ? ['+', 'or'] : item.connectors : [])];
        const push = (token: string) => patch({ [run.side]: [...run[run.side], token], feedback: 'none' });
        return <><p className="cir-prompt">{item.prompt}</p><p>{stage === 'contrapositive' ? 'Build the rule or its contrapositive.' : 'Build the original rule.'}</p>
          <dl className="cir-meaning-legend">{item.names.map(name => <div key={name}><dt>{name}</dt><dd>{item.meanings[name].yes}. Crossed out: {item.meanings[name].no}.</dd></div>)}</dl>
          <div className="cir-build"><button className="cir-slot" disabled={shown} aria-label="Build IF condition" aria-pressed={run.side === 'left'} onClick={() => patch({ side: 'left' })}><b>IF</b>{run.left.map((token, n) => <Tok key={n} text={token} />)}</button><span aria-hidden="true">→</span><button className="cir-slot" disabled={shown} aria-label="Build THEN condition" aria-pressed={run.side === 'right'} onClick={() => patch({ side: 'right' })}><b>THEN</b>{run.right.map((token, n) => <Tok key={n} text={token} />)}</button></div>
          <p className="cir-meta">Adding to {run.side === 'left' ? 'IF' : 'THEN'}. Choose a condition or connector.</p>
          <div className="cir-palette">{tokens.map(token => <button className="cir-token" key={token} disabled={shown || run[run.side].length >= 11} aria-label={`Add ${token.startsWith('/') ? `not ${token.slice(1)}` : token}`} onClick={() => push(token)}><Tok text={token} /></button>)}<button className="cir-token" disabled={shown || !run[run.side].length} onClick={() => patch({ [run.side]: run[run.side].slice(0, -1), feedback: 'none' })}>Undo</button></div>
          <div className="cir-actions">{!shown && <button className="cir-btn" disabled={!run.left.length || !run.right.length} onClick={() => check(diagramMatches(item, run.left.join(' '), run.right.join(' '), stage === 'contrapositive'))}>Check answer</button>}{run.feedback === 'hint' && <button className="cir-btn ghost" onClick={reveal}>Show answer</button>}{shown && <button className="cir-btn" data-continue onClick={next}>Next</button>}</div>
          <div role="status" aria-live="polite" aria-atomic="true">{run.feedback === 'hint' && <p>Keep your arrangement and check the indicator. Check which complete condition guarantees the other and keep existing negatives.{stage === 'contrapositive' && <> If you reverse the arrow, negate both conditions.{allowCompound !== false && ' Switch AND with OR when negating a compound condition.'}</>}</p>}{shown && <><p>{run.feedback === 'correct' ? 'That follows the rule.' : 'Compare this answer with your arrangement.'}</p><Diagram left={item.left} right={item.right} /><p>{englishRule(item, item.left, item.right)}</p>{stage === 'contrapositive' && <><Diagram left={negateSideText(item.right)} right={negateSideText(item.left)} /><p>{englishRule(item, negateSideText(item.right), negateSideText(item.left))}</p></>}</>}</div></>;
      })()}
      <div className="cir-actions cir-round-controls"><button className="cir-btn ghost" onClick={() => restart()}>Restart round</button></div>
    </>}
  </section>;
}
export default ConditionalSkillActivity;

function validDraft(run: PracticeRun, kind: ConditionalSkillActivityProps['kind']) {
  if (kind !== 'diagram') return run.left.length === 0 && run.right.length === 0;
  if (run.index === run.queue.length) return true;
  const item = PRACTICE_DIAGRAMS.find(candidate => candidate.id === run.queue[run.index]);
  if (!item) return false;
  const allowed = new Set([...item.names.flatMap(name => [name, `/${name}`]), ...(item.connectors?.length ? ['+', 'or'] : [])]);
  return [...run.left, ...run.right].every(token => allowed.has(token));
}
