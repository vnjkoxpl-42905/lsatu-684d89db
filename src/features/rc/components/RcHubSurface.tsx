import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadAllIndexPassages, loadPassages } from '../lib/rcBank';
import { RcMarkdown } from './RcMarkdown';
import {
  RC_ADAPTIVE_LABEL,
  passageStatus,
  selectPassages,
  type RcIndexPassageWithPt,
  type RcSelectionFilters,
  type RcStatusFilter,
} from '../lib/rcAdaptive';
import {
  createSession,
  deleteSession,
  getQuestionHistory,
  getSessionAttempts,
  listSessions,
} from '../api/rcProgress';
import {
  RC_FORMATS,
  RC_FRAMEWORKS,
  RC_PREPTEST_DEFAULT_MAX,
  RC_PREPTEST_MAX,
  RC_PREPTEST_MIN,
  RC_STANDARD_SECONDS_PER_PASSAGE,
  RC_TOPICS,
  type RcDrillConfig,
  type RcDrillSession,
  type RcQuestionHistory,
  type RcRevealMode,
  type RcPassage,
} from '../lib/rcTypes';
import '../rc.css';

const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

const REVEAL_OPTIONS: { id: RcRevealMode; label: string; caption: string }[] = [
  {
    id: 'per_passage',
    label: 'After each passage',
    caption: 'Finish a passage, then walk through it',
  },
  { id: 'end_of_set', label: 'At the end', caption: 'Test conditions, review at the end' },
  {
    id: 'per_question',
    label: 'After each question',
    caption: 'Check yourself question by question',
  },
];

const STATUS_OPTIONS: { id: RcStatusFilter; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'fresh', label: 'Fresh' },
  { id: 'incorrect_before', label: 'Incorrect before' },
  { id: 'incorrect_last', label: 'Incorrect on last try' },
];

const DEFAULT_FILTERS: RcSelectionFilters = {
  topics: [],
  formats: [],
  frameworks: [],
  families: [],
  difficulties: [],
  status: 'fresh',
  preptestMin: RC_PREPTEST_MIN,
  preptestMax: RC_PREPTEST_DEFAULT_MAX,
};

export interface RcHubSurfaceProps {
  /**
   * Mounted inside the drill hub's observatory surface rather than standing on
   * its own at /rc. Drops the page title and the search chip — the hub's hero
   * and practice bay already say where you are — and hands styling to the dark
   * `.rc-embedded` override layer.
   */
  embedded?: boolean;
  /** The drill history. Off when the hub's practice bay is already showing it. */
  showHistory?: boolean;
  /** Renders a Cancel control. Present when the surface is a launcher stage. */
  onCancel?: () => void;
}

/**
 * Only same-origin paths are honoured as a return target. A `returnTo` comes
 * off the query string, so an absolute or protocol-relative one would turn an
 * assignment link into an open redirect.
 */
function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

/**
 * The Reading Comprehension builder: passages, timing, reveal, filters,
 * hand-pick, and Start. One component, two mounts — the standalone /rc page and
 * the drill hub's RC section — so the two can never drift into two products
 * the way RcSearch and the LR picker did.
 */
export function RcHubSurface({ embedded = false, showHistory = true, onCancel }: RcHubSurfaceProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [passages, setPassages] = React.useState<RcIndexPassageWithPt[]>([]);
  const [history, setHistory] = React.useState<RcQuestionHistory>(new Map());
  const [sessions, setSessions] = React.useState<RcDrillSession[]>([]);
  const [scores, setScores] = React.useState<Map<string, { correct: number; total: number }>>(
    new Map(),
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [count, setCount] = React.useState(1);
  const [timing, setTiming] = React.useState<'untimed' | 'standard' | 'custom'>('untimed');
  const [customSeconds, setCustomSeconds] = React.useState(RC_STANDARD_SECONDS_PER_PASSAGE);
  const [reveal, setReveal] = React.useState<RcRevealMode>('per_passage');
  const [filters, setFilters] = React.useState<RcSelectionFilters>(DEFAULT_FILTERS);
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const [handPickOpen, setHandPickOpen] = React.useState(false);
  const [handPicked, setHandPicked] = React.useState<number[]>([]);
  const [search, setSearch] = React.useState('');
  const [starting, setStarting] = React.useState(false);
  const [autoStart, setAutoStart] = React.useState(false);
  const [inspecting, setInspecting] = React.useState(false);
  const [selectedSet, setSelectedSet] = React.useState<{
    key: string;
    ids: number[];
    passages: RcPassage[];
  } | null>(null);
  const inspectRequest = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await loadAllIndexPassages();
        if (!cancelled) setPassages(all as RcIndexPassageWithPt[]);
      } catch {
        if (!cancelled) setLoadError('The passage list could not be loaded.');
      }
      try {
        /* Question history drives the adaptive filters and is always needed.
           The session list is only for the history block, which the embedded
           builder does not draw — and the RC practice bay mounts
           RcSessionHistory for it anyway, so loading it here would fetch the
           same rows twice plus one attempts query per completed drill. */
        const [h, s] = await Promise.all([
          getQuestionHistory(),
          showHistory ? listSessions() : Promise.resolve([] as RcDrillSession[]),
        ]);
        if (!cancelled) {
          setHistory(h);
          setSessions(s);
        }
        // Scores for the completed drills, counting first attempts only so the
        // history row and the results page can never disagree.
        const done = showHistory ? s.filter((x) => x.status === 'completed') : [];
        const pairs = await Promise.all(
          done.map(async (x) => {
            const rows = (await getSessionAttempts(x.id)).filter((a) => a.isFirstAttempt);
            return [
              x.id,
              { correct: rows.filter((a) => a.isCorrect === true).length, total: rows.length },
            ] as const;
          }),
        );
        if (!cancelled) setScores(new Map(pairs));
      } catch {
        // A student with no history yet is the normal first-run case.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------------------------------- assignment deep link */

  // Keyed on the query string, not a one-shot flag: arriving at /rc with new
  // params from an already-mounted /rc does not remount this route, so a plain
  // "have I run yet" ref would ignore the second link.
  const appliedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = params.toString();
    if (appliedFor.current === key || passages.length === 0) return;
    appliedFor.current = key;
    setNotice(null);

    const ids = params.get('passages');
    const revealParam = params.get('reveal');
    const timingParam = params.get('timing');
    const countParam = Number(params.get('count'));

    // An assignment link fully describes the drill, so anything it leaves out
    // falls back to the builder default rather than to whatever was on screen.
    setReveal(
      revealParam && REVEAL_OPTIONS.some((o) => o.id === revealParam)
        ? (revealParam as RcRevealMode)
        : 'per_passage',
    );
    // A link may name its own per-passage budget — that is how a Full Section
    // asks for the accommodations paces, which are multiples of the standard
    // 8:45 and so cannot be spelled by `timing=standard` alone. Bounded because
    // this arrives from a URL: below a minute is unusable, above an hour a
    // passage is not a clock anyone set on purpose.
    const secondsParam = Number(params.get('secondsPerPassage'));
    if (Number.isFinite(secondsParam) && secondsParam >= 60 && secondsParam <= 3600) {
      setTiming('custom');
      setCustomSeconds(Math.round(secondsParam));
    } else {
      setTiming(timingParam === 'standard' ? 'standard' : 'untimed');
    }

    // The quick-build tile on the drill home sends a passage count and asks the
    // hub to go straight in, so a student who has already made their choices
    // does not land on a builder and press Start a second time.
    if (Number.isFinite(countParam) && countParam >= 1) {
      setCount(Math.min(8, Math.round(countParam)));
    }
    setAutoStart(params.get('start') === '1');

    if (ids) {
      const wanted = ids
        .split(',')
        .map((n) => Number(n.trim()))
        .filter((n) => Number.isFinite(n));
      const known = wanted.filter((id) => passages.some((p) => p.passageId === id));
      if (known.length !== wanted.length) {
        setNotice('That passage could not be found. Build a drill below instead.');
      }
      setHandPicked(known);
      setHandPickOpen(known.length > 0);
      setCount(known.length > 0 ? known.length : 1);
    } else {
      /* A link that names no passages is asking for an adaptive set, and a
         hand-pick left over from the PREVIOUS link would be started instead of
         it — a non-empty selection wins over the count and filters below. The
         reveal and timing above already reset for exactly this reason; the
         selection has to reset with them. */
      setHandPicked([]);
      setHandPickOpen(false);
    }
  }, [params, passages]);

  /* ------------------------------------------------------------ selection */

  const questionIdsByPassage = React.useMemo(() => {
    const map = new Map<number, number[]>();
    for (const p of passages) map.set(p.passageId, p.questionIds ?? []);
    return map;
  }, [passages]);

  const statusOf = React.useCallback(
    (p: RcIndexPassageWithPt) =>
      passageStatus(p, questionIdsByPassage.get(p.passageId) ?? [], history),
    [questionIdsByPassage, history],
  );

  const preview = React.useMemo(
    () =>
      selectPassages({
        pool: passages,
        questionIdsByPassage,
        filters,
        history,
        count,
        seed: 1,
      }),
    [passages, questionIdsByPassage, filters, history, count],
  );

  const drillablePassages = passages.filter((p) => p.questionCount > 0);

  const secondsPerPassage =
    timing === 'standard'
      ? RC_STANDARD_SECONDS_PER_PASSAGE
      : timing === 'custom'
        ? customSeconds
        : 0;

  const ptRun = params.get('ptRun');
  const ptLeg = params.get('ptLeg');
  const practiceTestLegIndex = ptRun && ptLeg !== null && /^\d+$/.test(ptLeg)
    ? Number(ptLeg)
    : undefined;
  const config: RcDrillConfig = {
    reveal,
    timing:
      timing === 'untimed'
        ? { mode: 'unlimited' }
        : { mode: 'per_passage_budget', secondsPerPassage },
    source: handPicked.length > 0 ? 'manual' : 'adaptive',
    practiceTestRunId: practiceTestLegIndex !== undefined ? ptRun ?? undefined : undefined,
    practiceTestLegIndex,
  };

  // A change to any launch setting makes an inspected set stale. The same IDs
  // are used for both the read-only inspection and the eventual session.
  const selectionKey = JSON.stringify({ count, timing, customSeconds, reveal, filters, handPicked, query: params.toString() });
  const selectionKeyRef = React.useRef(selectionKey);
  selectionKeyRef.current = selectionKey;
  const activeSet = selectedSet?.key === selectionKey ? selectedSet : null;

  const inspectSet = async () => {
    const request = ++inspectRequest.current;
    const key = selectionKey;
    setSelectedSet(null);
    setInspecting(true);
    setNotice(null);
    try {
      const ids = handPicked.length > 0
        ? [...handPicked]
        : selectPassages({
            pool: passages,
            questionIdsByPassage,
            filters,
            history,
            count,
            seed: Date.now() % 2147483647,
          }).selected.map((p) => p.passageId);
      if (ids.length === 0) {
        setNotice('No passages match those filters. Loosen one and try again.');
        return;
      }
      const full = await loadPassages(ids);
      if (request !== inspectRequest.current || key !== selectionKeyRef.current) return;
      if (full.length !== ids.length || full.some((passage, index) => passage.passageId !== ids[index])) {
        setNotice('Some passages could not be loaded. Try inspecting the set again.');
        return;
      }
      setSelectedSet({ key, ids, passages: full });
    } catch {
      if (request === inspectRequest.current && key === selectionKeyRef.current) {
        setNotice('The selected passages could not be loaded. Try again.');
      }
    } finally {
      if (request === inspectRequest.current) setInspecting(false);
    }
  };

  /**
   * `replace` is for the autostart path only. A link carrying `start=1` puts
   * the builder on the history stack with that param still in the URL, so Back
   * from the drill re-mounts the builder, re-reads the param, and creates a
   * SECOND session. Replacing the entry takes that URL off the stack.
   */
  const start = async (options?: { replace?: boolean }) => {
    setStarting(true);
    try {
      const chosen = options?.replace
        ? handPicked.length > 0
          ? handPicked
          : selectPassages({
              pool: passages,
              questionIdsByPassage,
              filters,
              history,
              count,
              seed: Date.now() % 2147483647,
            }).selected.map((p) => p.passageId)
        : activeSet?.ids ?? [];

      if (!options?.replace && !activeSet) {
        setNotice('Inspect a set before starting it.');
        setStarting(false);
        return;
      }

      if (chosen.length === 0) {
        setNotice('No passages match those filters. Loosen one and try again.');
        setStarting(false);
        return;
      }
      const session = await createSession(config, chosen);
      // A link that said where to go afterwards keeps saying it: the practice
      // test hands off its RC leg this way and needs the student back.
      const back = safeReturnTo(params.get('returnTo'));
      const testLeg = config.practiceTestRunId && config.practiceTestLegIndex !== undefined
        ? '&ptRun=' + encodeURIComponent(config.practiceTestRunId) +
          '&ptLeg=' + encodeURIComponent(String(config.practiceTestLegIndex))
        : '';
      navigate(
        '/rc/drill?sessionId=' + session.id + testLeg +
          (back ? '&returnTo=' + encodeURIComponent(back) : ''),
        { replace: options?.replace },
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'The drill could not be started.');
      setStarting(false);
    }
  };

  // Runs a tick after the link has been applied, so it starts on the count and
  // timing the link asked for rather than on the builder defaults.
  React.useEffect(() => {
    if (!autoStart || passages.length === 0 || starting) return;
    setAutoStart(false);
    void start({ replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, passages, starting]);

  const toggle = (key: 'topics' | 'formats' | 'frameworks', value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const toggleDifficulty = (value: number) =>
    setFilters((f) => ({
      ...f,
      difficulties: f.difficulties.includes(value)
        ? f.difficulties.filter((v) => v !== value)
        : [...f.difficulties, value],
    }));

  const handPickRows = drillablePassages.filter((p) => {
    if (search.trim() && !(p.title ?? '').toLowerCase().includes(search.trim().toLowerCase()))
      return false;
    return matches(p);
  });

  function matches(p: RcIndexPassageWithPt) {
    const status = statusOf(p);
    if (p.preptest < filters.preptestMin || p.preptest > filters.preptestMax) return false;
    if (filters.topics.length && (!p.topic || !filters.topics.includes(p.topic))) return false;
    if (filters.formats.length && (!p.format || !filters.formats.includes(p.format))) return false;
    if (filters.frameworks.length && !p.frameworks.some((f) => filters.frameworks.includes(f)))
      return false;
    if (filters.difficulties.length && (p.difficulty == null || !filters.difficulties.includes(p.difficulty)))
      return false;
    if (filters.status === 'fresh' && status.attempted) return false;
    if (filters.status === 'incorrect_before' && !status.everIncorrect) return false;
    if (filters.status === 'incorrect_last' && !status.incorrectOnLastTake) return false;
    return true;
  }

  const pickedQuestionCount = handPicked.reduce(
    (n, id) => n + (passages.find((p) => p.passageId === id)?.questionCount ?? 0),
    0,
  );

  const removeSession = async (id: string) => {
    const ok = window.confirm(
      'Delete this drill? Its answers and timings are deleted with it, and that cannot be undone.',
    );
    if (!ok) return;
    await deleteSession(id);
    setSessions(await listSessions());
  };

  return (
    /* Keeps `rc-page` when embedded: that class is where the observatory token
       ladder is declared (classroom.css), so dropping it would strip every ink,
       surface and hairline value out from under the builder. `rc-embedded`
       removes only the page-level frame — full-height, background, padding,
       centred column — which the drill hub's launcher already provides. */
    <div className={embedded ? 'rc-page rc-embedded' : 'rc-page'}>
      {!embedded && (
        <>
          <h1>Reading Comprehension</h1>
          <p className="rc-page-sub">Drill full passages the way they appear on the test.</p>
          <div className="rc-chip-row" style={{ marginTop: 12 }}>
            <button type="button" className="rc-chip" onClick={() => navigate('/rc/search')}>
              Search passages &amp; questions
            </button>
          </div>
        </>
      )}
      {embedded && onCancel && (
        <div className="rc-actions" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>Build a reading drill</h2>
          <button type="button" className="rc-chip" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}

      {loadError && <p className="rc-page-sub">{loadError}</p>}
      {notice && <p className="rc-page-sub">{notice}</p>}

      {/* ------------------------------------------------------- build card */}
      <div className="rc-card">
        {/* Embedded, the launcher header above is the title. Two headings, one
            saying "Build a reading drill" and one saying "Build a drill", read
            as a nesting mistake. */}
        {!embedded && <h2>Build a drill</h2>}

        <div className="rc-field">
          <div className="rc-field-label">Passages</div>
          <div className="rc-stepper">
            <button type="button" aria-label="Fewer passages" onClick={() => setCount((c) => Math.max(1, c - 1))}>
              −
            </button>
            <span className="rc-stepper-value">{count}</span>
            <button type="button" aria-label="More passages" onClick={() => setCount((c) => Math.min(8, c + 1))}>
              +
            </button>
          </div>
        </div>

        <div className="rc-field">
          <div className="rc-field-label">Timing</div>
          <div className="rc-segmented">
            <button
              type="button"
              className={`rc-segment${timing === 'untimed' ? ' rc-active' : ''}`}
              onClick={() => setTiming('untimed')}
            >
              Untimed
            </button>
            <button
              type="button"
              className={`rc-segment${timing === 'standard' ? ' rc-active' : ''}`}
              onClick={() => setTiming('standard')}
            >
              Standard pace
              <span className="rc-segment-caption">8:45 per passage</span>
            </button>
            <button
              type="button"
              className={`rc-segment${timing === 'custom' ? ' rc-active' : ''}`}
              onClick={() => setTiming('custom')}
            >
              Custom
            </button>
            {timing === 'custom' && (
              <input
                type="text"
                aria-label="Minutes and seconds per passage"
                className="rc-segment"
                defaultValue={mmss(customSeconds)}
                onBlur={(e) => {
                  const [m, s] = e.target.value.split(':').map((n) => Number(n));
                  if (Number.isFinite(m)) setCustomSeconds(m * 60 + (Number.isFinite(s) ? s : 0));
                }}
              />
            )}
          </div>
          {timing !== 'untimed' && (
            <div className="rc-field-hint">
              ≈ {mmss(secondsPerPassage * count)} for {count} passage{count === 1 ? '' : 's'}
            </div>
          )}
        </div>

        <div className="rc-field">
          <div className="rc-field-label">Reveal answers</div>
          <div className="rc-segmented">
            {REVEAL_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`rc-segment${reveal === option.id ? ' rc-active' : ''}`}
                onClick={() => setReveal(option.id)}
              >
                {option.label}
                <span className="rc-segment-caption">{option.caption}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rc-field">
          <div className="rc-field-label">
            Choosing from {preview.poolSize} of {drillablePassages.length} passages
          </div>
          <div className="rc-field-hint">{RC_ADAPTIVE_LABEL}</div>
          {preview.shortfallMessage && (
            <div className="rc-field-hint">{preview.shortfallMessage}</div>
          )}
          <div className="rc-chip-row" style={{ marginTop: 10 }}>
            <button type="button" className="rc-chip" onClick={() => setCustomizeOpen((v) => !v)}>
              {customizeOpen ? 'Hide options' : 'Customize'}
            </button>
            <button type="button" className="rc-chip" onClick={() => setHandPickOpen((v) => !v)}>
              {handPickOpen ? 'Hide passage list' : 'Hand-pick passages'}
            </button>
          </div>
        </div>

        {customizeOpen && (
          <div className="rc-field">
            <FilterGroup label="Topic" values={[...RC_TOPICS]} active={filters.topics} onToggle={(v) => toggle('topics', v)} />
            <FilterGroup label="Format" values={[...RC_FORMATS]} active={filters.formats} onToggle={(v) => toggle('formats', v)} />
            <FilterGroup label="Framework" values={[...RC_FRAMEWORKS]} active={filters.frameworks} onToggle={(v) => toggle('frameworks', v)} />

            <div className="rc-field-label" style={{ marginTop: 14 }}>Passage difficulty</div>
            <div className="rc-chip-row">
              <button
                type="button"
                className={`rc-chip${filters.difficulties.length === 0 ? ' rc-active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, difficulties: [] }))}
              >
                Adaptive
              </button>
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`rc-chip${filters.difficulties.includes(d) ? ' rc-active' : ''}`}
                  onClick={() => toggleDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="rc-field-label" style={{ marginTop: 14 }}>Status</div>
            <div className="rc-chip-row">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`rc-chip${filters.status === option.id ? ' rc-active' : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, status: option.id }))}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="rc-field-label" style={{ marginTop: 14 }}>PrepTests</div>
            <div className="rc-chip-row" style={{ alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                aria-label="Earliest PrepTest"
                min={RC_PREPTEST_MIN}
                max={RC_PREPTEST_MAX}
                value={filters.preptestMin}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    preptestMin: Math.min(Number(e.target.value), f.preptestMax),
                  }))
                }
              />
              <input
                type="range"
                aria-label="Latest PrepTest"
                min={RC_PREPTEST_MIN}
                max={RC_PREPTEST_MAX}
                value={filters.preptestMax}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    preptestMax: Math.max(Number(e.target.value), f.preptestMin),
                  }))
                }
              />
              <span>
                {filters.preptestMin}–{filters.preptestMax}
              </span>
            </div>
            <div className="rc-field-hint">
              Newest tests are held back by default so they stay fresh for timed sections
            </div>
          </div>
        )}

        <div className="rc-actions" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="rc-button rc-button-primary"
            disabled={starting || inspecting || (activeSet === null && passages.length === 0)}
            onClick={() => void (activeSet ? start() : inspectSet())}
          >
            {starting ? 'Starting…' : inspecting ? 'Loading set…' : activeSet ? 'Start this drill' : 'Inspect set'}
          </button>
          {activeSet && <button type="button" className="rc-button" onClick={() => void inspectSet()}>Choose another set</button>}
        </div>
      </div>

      {activeSet && (
        <section className="rc-card" aria-label="Selected reading set">
          <h2>Selected reading set</h2>
          <p className="rc-field-hint">These exact passages and questions will appear in your drill. Answers and explanations are hidden.</p>
          {activeSet.passages.map((passage, index) => (
            <details key={passage.passageId} style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer' }}>
                {index + 1}. PT {passage.preptest} · {passage.title || `Passage ${passage.setNumber}`} · {passage.questions.length} questions
              </summary>
              <div style={{ maxHeight: 560, overflowY: 'auto', padding: '12px 4px' }}>
                <RcMarkdown>{passage.text}</RcMarkdown>
                {passage.questions.map((question) => (
                  <div key={question.questionId} style={{ marginTop: 24 }}>
                    <strong>Question {question.position}</strong>
                    <RcMarkdown>{question.prompt}</RcMarkdown>
                    <div>
                      {question.choices.map((choice) => <div key={choice.letter} style={{ display: 'flex', gap: 8, marginTop: 8 }}><strong>{choice.letter}.</strong><RcMarkdown>{choice.text}</RcMarkdown></div>)}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </section>
      )}

      {/* -------------------------------------------------------- hand-pick */}
      {handPickOpen && (
        <div className="rc-card">
          <h2>Choose your passages</h2>
          <input
            type="text"
            className="rc-segment"
            style={{ width: '100%', marginBottom: 12 }}
            placeholder="Search titles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ maxHeight: 420, overflowX: 'auto', overflowY: 'auto' }}>
            <table className="rc-table">
              <thead>
                <tr>
                  <th>PT</th>
                  <th>S</th>
                  <th>P</th>
                  <th>Title</th>
                  <th>Opening</th>
                  <th>Topic</th>
                  <th>Format</th>
                  <th>Qs</th>
                  <th>Difficulty</th>
                  <th>Your status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {handPickRows.slice(0, 200).map((p) => {
                  const status = statusOf(p);
                  const picked = handPicked.includes(p.passageId);
                  return (
                    <tr key={p.passageId}>
                      <td>{p.preptest}</td>
                      <td>{p.section}</td>
                      <td>{p.setNumber}</td>
                      <td>{p.title}</td>
                      <td style={{ opacity: 0.55, maxWidth: 220 }}>{p.firstWords}</td>
                      <td>{p.topic && <span className="rc-status-chip">{p.topic}</span>}</td>
                      <td>{p.format && <span className="rc-status-chip">{p.format}</span>}</td>
                      <td>{p.questionCount}</td>
                      <td>{'•'.repeat(p.difficulty ?? 0)}</td>
                      <td>
                        {!status.attempted
                          ? '—'
                          : status.missed > 0
                            ? `${status.missed} missed`
                            : 'done'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`rc-chip${picked ? ' rc-active' : ''}`}
                          onClick={() =>
                            setHandPicked((prev) =>
                              prev.includes(p.passageId)
                                ? prev.filter((id) => id !== p.passageId)
                                : [...prev, p.passageId],
                            )
                          }
                        >
                          {picked ? 'Remove' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="rc-actions">
            <span className="rc-hero-meta">
              {handPicked.length} passage{handPicked.length === 1 ? '' : 's'} ·{' '}
              {pickedQuestionCount} question{pickedQuestionCount === 1 ? '' : 's'} selected
            </span>
            <button
              type="button"
              className="rc-button rc-button-primary"
              disabled={handPicked.length === 0 || starting || inspecting}
              onClick={() => void (activeSet ? start() : inspectSet())}
            >
              {activeSet ? 'Start this drill' : 'Inspect set'}
            </button>
            {handPicked.length > 0 && (
              <button type="button" className="rc-button" onClick={() => setHandPicked([])}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- history */}
      {showHistory && <h2 style={{ marginTop: 32 }}>Your drills</h2>}
      {showHistory && sessions.length === 0 && <p className="rc-empty">No drills yet.</p>}
      {showHistory && sessions.map((s) => (
        <div
          key={s.id}
          className={`rc-session-row${s.excludedFromAnalytics ? ' rc-session-excluded' : ''}`}
        >
          <span>
            {s.passageIds.length} passage{s.passageIds.length === 1 ? '' : 's'} ·{' '}
            {s.config.timing.mode === 'unlimited' ? 'untimed' : 'timed'} ·{' '}
            {REVEAL_OPTIONS.find((o) => o.id === s.config.reveal)?.label.toLowerCase()}
          </span>
          <span className="rc-status-chip">
            {s.status === 'in_progress' ? 'in progress' : s.status}
          </span>
          {scores.has(s.id) && (
            <span>
              {scores.get(s.id)!.correct} / {scores.get(s.id)!.total}
            </span>
          )}
          {s.excludedFromAnalytics && <span className="rc-status-chip">excluded</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {s.status === 'in_progress' ? (
              <button
                type="button"
                className="rc-chip"
                onClick={() => navigate('/rc/drill?sessionId=' + s.id)}
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                className="rc-chip"
                onClick={() => navigate('/rc/results/' + s.id)}
              >
                Results
              </button>
            )}
            <button type="button" className="rc-chip" onClick={() => removeSession(s.id)}>
              Delete
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

function FilterGroup({
  label,
  values,
  active,
  onToggle,
}: {
  label: string;
  values: string[];
  active: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <>
      <div className="rc-field-label" style={{ marginTop: 14 }}>
        {label}
      </div>
      <div className="rc-chip-row">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className={`rc-chip${active.includes(value) ? ' rc-active' : ''}`}
            onClick={() => onToggle(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </>
  );
}
