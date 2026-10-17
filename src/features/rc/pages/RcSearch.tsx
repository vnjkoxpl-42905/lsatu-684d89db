/**
 * `/rc/search` — find passages and questions across the whole RC bank by
 * keyword, passage tags (topic, format, framework, difficulty, PrepTest), and
 * question tags (family, type, feature, difficulty). Read-only: every result
 * opens the read-only preview, where starting a drill is an explicit button.
 * PrepTests above the builder's default window (149 and up) are held back until
 * the student includes them, or types an address that names one.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { loadAllIndexPassages, loadRcQuestionIndex } from '../lib/rcBank';
import {
  DEFAULT_RC_SEARCH_FILTERS,
  isReservedPreptest,
  rcSearchPreviewHref,
  runRcSearch,
  type RcSearchFilters,
  type RcSearchPassage,
} from '../lib/rcSearch';
import {
  RC_FEATURES,
  RC_FORMATS,
  RC_FRAMEWORKS,
  RC_PREPTEST_DEFAULT_MAX,
  RC_PREPTEST_MAX,
  RC_PREPTEST_MIN,
  RC_QUESTION_TYPES,
  RC_QUESTION_TYPE_FAMILIES,
  RC_TOPICS,
  type RcQuestionIndexEntry,
} from '../lib/rcTypes';
import '../rc.css';

const RESULT_LIMIT = 40;

const FEATURE_GROUPS: { label: string; names: string[] }[] = (() => {
  const groups = new Map<string, string[]>();
  for (const f of RC_FEATURES) {
    const key = f.group ?? 'Other';
    const list = groups.get(key);
    if (list) list.push(f.name);
    else groups.set(key, [f.name]);
  }
  return [...groups.entries()].map(([label, names]) => ({ label, names }));
})();

export default function RcSearch() {
  const navigate = useNavigate();

  const [passages, setPassages] = React.useState<RcSearchPassage[]>([]);
  const [questions, setQuestions] = React.useState<RcQuestionIndexEntry[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState('');
  const [filters, setFilters] = React.useState<RcSearchFilters>(DEFAULT_RC_SEARCH_FILTERS);
  const [passagePage, setPassagePage] = React.useState(0);
  const [questionPage, setQuestionPage] = React.useState(0);
  React.useEffect(() => {
    setPassagePage(0);
    setQuestionPage(0);
  }, [query, filters]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [allPassages, questionIndex] = await Promise.all([
          loadAllIndexPassages(),
          loadRcQuestionIndex(),
        ]);
        if (cancelled) return;
        setPassages(allPassages as RcSearchPassage[]);
        setQuestions(questionIndex.questions);
      } catch {
        if (!cancelled) setLoadError('The passage and question index could not be loaded.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const result = React.useMemo(
    () =>
      runRcSearch({
        passages,
        questions,
        query,
        filters,
        limit: RESULT_LIMIT,
        passageOffset: passagePage * RESULT_LIMIT,
        questionOffset: questionPage * RESULT_LIMIT,
      }),
    [passages, questions, query, filters, passagePage, questionPage],
  );

  const toggle = (
    key: 'topics' | 'formats' | 'frameworks' | 'families' | 'questionTypes' | 'features',
    value: string,
  ) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const toggleDifficulty = (key: 'passageDifficulties' | 'questionDifficulties', value: number) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  const open = (passageId: number, questionId: number | null) => {
    if (questionId == null) return;
    navigate(rcSearchPreviewHref(passageId, questionId));
  };

  const includeReserved = filters.preptestMax >= RC_PREPTEST_MAX;
  const setIncludeReserved = (include: boolean) =>
    setFilters((f) => ({ ...f, preptestMax: include ? RC_PREPTEST_MAX : RC_PREPTEST_DEFAULT_MAX }));

  return (
    <div className="rc-page">
      <h1>Search Reading Comprehension</h1>
      <p className="rc-page-sub">
        Find passages and questions across PrepTests {RC_PREPTEST_MIN}–{RC_PREPTEST_DEFAULT_MAX} by
        tag, feature, or keyword. PrepTests {RC_PREPTEST_DEFAULT_MAX + 1}–{RC_PREPTEST_MAX} are held
        back for timed sections; include them below, or type an address such as PT150 S1. Results
        open a preview first, and nothing starts until you press Start there.
      </p>

      {loadError && <p className="rc-page-sub">{loadError}</p>}

      {/* ---------------------------------------------------------- filters */}
      <div className="rc-card">
        <input
          type="text"
          className="rc-segment"
          style={{ width: '100%' }}
          placeholder="Search passage titles and question stems"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search passage titles and question stems"
        />

        <FilterGroup
          label="Topic"
          values={[...RC_TOPICS]}
          active={filters.topics}
          onToggle={(v) => toggle('topics', v)}
        />
        <FilterGroup
          label="Format"
          values={[...RC_FORMATS]}
          active={filters.formats}
          onToggle={(v) => toggle('formats', v)}
        />
        <FilterGroup
          label="Framework"
          values={[...RC_FRAMEWORKS]}
          active={filters.frameworks}
          onToggle={(v) => toggle('frameworks', v)}
        />

        <div className="rc-field-label" style={{ marginTop: 14 }}>
          Passage difficulty
        </div>
        <DifficultyRow
          active={filters.passageDifficulties}
          onToggle={(d) => toggleDifficulty('passageDifficulties', d)}
        />

        <div className="rc-field-label" style={{ marginTop: 14 }}>
          PrepTests
        </div>
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
          <label className="rc-field-hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={includeReserved}
              onChange={(e) => setIncludeReserved(e.target.checked)}
            />
            Include held-back PrepTests ({RC_PREPTEST_DEFAULT_MAX + 1}–{RC_PREPTEST_MAX})
          </label>
        </div>

        <FilterGroup
          label="Question family"
          values={[...RC_QUESTION_TYPE_FAMILIES]}
          active={filters.families}
          onToggle={(v) => toggle('families', v)}
        />
        <FilterGroup
          label="Question type"
          values={RC_QUESTION_TYPES.map((t) => t.name)}
          active={filters.questionTypes}
          onToggle={(v) => toggle('questionTypes', v)}
        />

        <div className="rc-field-label" style={{ marginTop: 14 }}>
          Question feature
        </div>
        {FEATURE_GROUPS.map((group) => (
          <div key={group.label} style={{ marginTop: 6 }}>
            <div className="rc-field-hint">{group.label}</div>
            <div className="rc-chip-row">
              {group.names.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`rc-chip${filters.features.includes(name) ? ' rc-active' : ''}`}
                  onClick={() => toggle('features', name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="rc-field-label" style={{ marginTop: 14 }}>
          Question difficulty
        </div>
        <DifficultyRow
          active={filters.questionDifficulties}
          onToggle={(d) => toggleDifficulty('questionDifficulties', d)}
        />

        <div className="rc-actions">
          <span className="rc-hero-meta">
            {result.totalPassages} passage{result.totalPassages === 1 ? '' : 's'} ·{' '}
            {result.totalQuestions} question{result.totalQuestions === 1 ? '' : 's'}
          </span>
          {result.hiddenReservedPassages > 0 && (
            <span className="rc-hero-meta" role="status">
              {result.hiddenReservedPassages} more in held-back PrepTests.{' '}
              <button type="button" className="rc-chip" onClick={() => setIncludeReserved(true)}>
                Include them
              </button>
            </span>
          )}
          <button
            type="button"
            className="rc-button"
            onClick={() => {
              setFilters(DEFAULT_RC_SEARCH_FILTERS);
              setQuery('');
            }}
          >
            Clear all
          </button>
          <button type="button" className="rc-button" onClick={() => navigate('/rc')}>
            Back to drills
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------- passages */}
      <h2 style={{ marginTop: 32 }}>Passages</h2>
      {result.passages.length === 0 && <p className="rc-empty">No passages match.</p>}
      {result.passages.length > 0 && (
        <div className="rc-card" style={{ maxHeight: 480, overflowY: 'auto' }}>
          <table className="rc-table">
            <thead>
              <tr>
                <th>PT</th>
                <th>S</th>
                <th>P</th>
                <th>Title</th>
                <th>Topic</th>
                <th>Framework</th>
                <th>Qs</th>
                <th>Difficulty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.passages.map(({ passage: p, matchedQuestionCount, previewQuestionId }) => (
                <tr key={p.passageId}>
                  <td>
                    {p.preptest}
                    {isReservedPreptest(p.preptest) && (
                      <span className="rc-status-chip" style={{ marginLeft: 4 }} title="Held back for timed sections">
                        Held back
                      </span>
                    )}
                  </td>
                  <td>{p.section}</td>
                  <td>{p.setNumber}</td>
                  <td>{p.title}</td>
                  <td>{p.topic && <span className="rc-status-chip">{p.topic}</span>}</td>
                  <td>
                    {p.frameworks.map((f) => (
                      <span key={f} className="rc-status-chip" style={{ marginRight: 4 }}>
                        {f}
                      </span>
                    ))}
                  </td>
                  <td>
                    {matchedQuestionCount === p.questionCount
                      ? p.questionCount
                      : `${matchedQuestionCount} / ${p.questionCount}`}
                  </td>
                  <td>{'•'.repeat(p.difficulty ?? 0)}</td>
                  <td>
                    <button
                      type="button"
                      className="rc-chip"
                      disabled={previewQuestionId == null}
                      aria-label={`Preview ${p.title ?? `passage ${p.setNumber}`}`}
                      onClick={() => open(p.passageId, previewQuestionId)}
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ResultPages label="passages" page={passagePage} total={result.totalPassages} onPage={setPassagePage} />

      {/* ---------------------------------------------------------- questions */}
      <h2 style={{ marginTop: 32 }}>Questions</h2>
      {result.questions.length === 0 && <p className="rc-empty">No questions match.</p>}
      {result.questions.length > 0 && (
        <div className="rc-card" style={{ maxHeight: 480, overflowY: 'auto' }}>
          <table className="rc-table">
            <thead>
              <tr>
                <th>PT</th>
                <th>S</th>
                <th>Q</th>
                <th>Stem</th>
                <th>Type</th>
                <th>Features</th>
                <th>Difficulty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.questions.map(({ question: q, passage: p, snippet }) => (
                <tr key={q.questionId}>
                  <td>
                    {q.preptest}
                    {isReservedPreptest(q.preptest) && (
                      <span className="rc-status-chip" style={{ marginLeft: 4 }} title="Held back for timed sections">
                        Held back
                      </span>
                    )}
                  </td>
                  <td>{q.section}</td>
                  <td>{q.position}</td>
                  <td style={{ maxWidth: 340 }}>
                    {snippet ? (
                      <>
                        {snippet.before}
                        <mark>{snippet.match}</mark>
                        {snippet.after}
                      </>
                    ) : (
                      (q.prompt ?? '—')
                    )}
                  </td>
                  <td>
                    {q.questionType}
                    <div className="rc-field-hint">{q.questionTypeFamily}</div>
                  </td>
                  <td>
                    {q.features.map((f) => (
                      <span key={f} className="rc-status-chip" style={{ marginRight: 4 }}>
                        {f}
                      </span>
                    ))}
                  </td>
                  <td>{'•'.repeat(q.difficulty ?? 0)}</td>
                  <td>
                    <button
                      type="button"
                      className="rc-chip"
                      aria-label={`Preview question ${q.position} of PrepTest ${q.preptest} section ${q.section}`}
                      onClick={() => open(p.passageId, q.questionId)}
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ResultPages label="questions" page={questionPage} total={result.totalQuestions} onPage={setQuestionPage} />
    </div>
  );
}

function ResultPages({ label, page, total, onPage }: {
  label: string; page: number; total: number; onPage: (page: number) => void;
}) {
  if (total <= RESULT_LIMIT) return null;
  return <nav className="rc-actions" aria-label={`${label} pages`}>
    <button type="button" className="rc-button" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous {label}</button>
    <span role="status">{page * RESULT_LIMIT + 1}–{Math.min((page + 1) * RESULT_LIMIT, total)} of {total} {label}</span>
    <button type="button" className="rc-button" disabled={(page + 1) * RESULT_LIMIT >= total} onClick={() => onPage(page + 1)}>Next {label}</button>
  </nav>;
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

function DifficultyRow({
  active,
  onToggle,
}: {
  active: number[];
  onToggle: (value: number) => void;
}) {
  return (
    <div className="rc-chip-row">
      {[1, 2, 3, 4, 5].map((d) => (
        <button
          key={d}
          type="button"
          className={`rc-chip${active.includes(d) ? ' rc-active' : ''}`}
          onClick={() => onToggle(d)}
        >
          {d}
        </button>
      ))}
    </div>
  );
}
