"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CornerDownLeft,
  LayoutGrid,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  formatQuestionAddress,
  runFinderSearch,
  type FinderHit,
  type FinderSnippet,
  type QuestionFinderBank,
  type QuestionAddress,
} from "./questionFinderSearch";
import { useQuestionFinderBanks } from "./useQuestionFinderBanks";
import { useFinderAddressIndex, type FinderAddressTest } from "./useFinderAddressIndex";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import "./questionFinder.css";
import { safeRcReturnTo } from "@/features/rc/lib/rcReturnTo";

const PER_BANK_LIMIT = 6;

/* The bank switch, as a segmented control rather than a hidden filter.
   LSAT Lab puts "Modern | Legacy" here, which splits its bank by PrepTest
   numbering. Ours is PT101-159 end to end — every question is modern — so a
   Legacy tab would be a control that returns nothing every time it is pressed.
   The switch that is real here is the one between the two banks. */
const BANK_TABS: { value: QuestionFinderBank | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lr", label: "LR" },
  { value: "rc", label: "RC" },
];

export interface QuestionFinderProps {
  /** Where a finished one-question attempt returns to. */
  returnTo: string;
  /** The host's surface. The panel follows it so the overlay never flashes a
   *  warm-paper card over the near-black Drill landing workspace. */
  tone?: "light" | "dark";
  /** Restricts results to the active side of the LR/RC hub switch. */
  bank?: QuestionFinderBank;
  triggerLabel?: string;
}

/**
 * The Question finder.
 *
 * A labelled field that opens a panel: type words to search question text, or
 * type a question address (PT90 S1 Q12) to locate it. It can search both banks
 * or follow the Drill hub's active bank. Selecting a result retains its address;
 * opening remains unavailable until safe preview is implemented.
 * See `docs/adr/0008-question-finder-lands-differently-by-bank.md`.
 *
 * It never builds a set. That is the Drill console's job, and the last row of
 * the panel is the door to it.
 */
export interface QuestionFinderHandle {
  open: () => void;
}

const QuestionFinder = React.forwardRef<QuestionFinderHandle, QuestionFinderProps>(function QuestionFinder({ returnTo, tone = "light", bank, triggerLabel = "Find a question" }, ref) {
  const [open, setOpen] = React.useState(false);
  const [openedReturnTo, setOpenedReturnTo] = React.useState(returnTo);
  const openFinder = React.useCallback(() => {
    if (!open) setOpenedReturnTo(returnTo);
    setOpen(true);
  }, [open, returnTo]);
  React.useImperativeHandle(ref, () => ({ open: openFinder }), [openFinder]);

  /* Cmd/Ctrl+K is an accelerator on top of a visible, labelled control — never
     the only way in. It is ignored while the student is typing somewhere else,
     so it cannot steal a keystroke from a real field.

     "/" opens it too, the convention everywhere else a search box lives behind
     a key. It only opens, it does not toggle: "/" while the panel is open is a
     character someone is trying to type. */
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable === true;

      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (open || typing) return;
        event.preventDefault();
        openFinder();
        return;
      }

      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      if (!open && typing) return;
      event.preventDefault();
      if (open) setOpen(false);
      else openFinder();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openFinder]);

  return (
    <div className="qf" data-tone={tone}>
      {/* ONE trigger, not one per breakpoint. Two buttons behind a CSS
          display swap would both stay in the accessibility tree, and a screen
          reader would announce "Find a question" twice on every visit. The
          label is what collapses on a phone; the control and its accessible
          name do not change. The shortcut still works but is not advertised
          on the trigger: Joshua's call, 2026-09-08. */}
      <button
        type="button"
        className="qf-trigger"
        onClick={openFinder}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={triggerLabel}
        /* The shortcuts are declared, not drawn. Joshua removed the visible
           badge on 2026-09-08; assistive tech and a hover tooltip can still
           carry them. */
        aria-keyshortcuts="Meta+K Control+K /"
        title="Find a question (Ctrl K, or /)"
      >
        <Search className="qf-trigger-icon" size={15} strokeWidth={1.9} aria-hidden />
        <span className="qf-trigger-label" aria-hidden>
          {triggerLabel}
        </span>
      </button>

      <FinderPanel returnTo={openedReturnTo} open={open} tone={tone} bank={bank} onClose={() => setOpen(false)} />
    </div>
  );
});

export default QuestionFinder;

/* ------------------------------------------------------------------ panel */

function FinderPanel({
  returnTo,
  open,
  tone,
  bank,
  onClose,
}: {
  returnTo: string;
  open: boolean;
  tone: "light" | "dark";
  bank?: QuestionFinderBank;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [rcLimit, setRcLimit] = React.useState(PER_BANK_LIMIT);
  /* Seeded from the host, not locked to it: the Drill hub opens the finder on
     its own side of the switch, and the student can still cross to the other. */
  const [view, setView] = React.useState<QuestionFinderBank | "all">(bank ?? "all");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Mounting the panel IS the request for the banks; nothing loads before it.
  const banks = useQuestionFinderBanks(open, view);
  const addressIndex = useFinderAddressIndex(open);
  React.useEffect(() => {
    setView(bank ?? "all");
    setQuery("");
  }, [bank]);

  const results = React.useMemo(
    () =>
      runFinderSearch({
        query,
        lr: banks.lr,
        rcPassages: banks.rcPassages,
        rcQuestions: banks.rcQuestions,
        limit: PER_BANK_LIMIT,
        rcLimit,
        bank: view === "all" ? undefined : view,
      }),
    [view, banks.lr, banks.rcPassages, banks.rcQuestions, query, rcLimit],
  );

  const hits = React.useMemo<FinderHit[]>(
    () => [...results.lr, ...results.rc],
    [results.lr, results.rc],
  );

  React.useEffect(() => { setActive(0); setRcLimit(PER_BANK_LIMIT); }, [query, view]);
  React.useEffect(() => setActive(index => Math.min(index, Math.max(0, hits.length - 1))), [hits.length, rcLimit]);

  /* Focus in, focus back out. The trigger must get focus again on close or a
     keyboard student is returned to the top of the document. */
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  const selectedTarget = React.useMemo(() => {
    const address = results.address;
    if (!address?.section || view === "lr" || (view === 'all' && results.exact)) return null;
    const section = addressIndex.tests.find((test) => test.pt === address.pt)?.sections.find((entry) => entry.section === address.section);
    const passages = (section?.rc ?? []).filter(passage => passage.questions.length > 0 && (address.pnum === undefined || passage.position === address.pnum));
    if (address.qnum === undefined) return address.pnum !== undefined && passages.length === 1 ? { passageId: passages[0].id, questionId: null } : null;
    const matches = passages.flatMap((passage) => passage.questions.filter((q) => q.number === address.qnum).map((q) => ({ passageId: passage.id, questionId: q.id })));
    return matches.length === 1 ? matches[0] : null;
  }, [results.address, results.exact, addressIndex.tests, view]);
  const openSelected = () => {
    if (!selectedTarget || addressIndex.loading || addressIndex.failed) return;
    const params = new URLSearchParams({ passage: String(selectedTarget.passageId) });
    if (selectedTarget.questionId !== null) params.set('q', String(selectedTarget.questionId));
    params.set('returnTo', safeRcReturnTo(returnTo) ?? '/practice/drills?section=rc');
    onClose();
    navigate(`/rc/preview?${params}`);
  };

  const openHit = React.useCallback((hit: FinderHit) => {
    setView(hit.bank);
    setQuery(hit.bank === "lr" ? `PT${hit.pt} S${hit.section} Q${hit.qnum}` : `PT${hit.preptest} S${hit.section}${hit.qnum ? ` Q${hit.qnum}` : ` P${hit.setNumber}`}`);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    // Select menus own their keys, including Escape. Portaled Radix events
    // still bubble through React to this dialog.
    const target = event.target as HTMLElement;
    if (event.defaultPrevented || target.closest('select, [role="combobox"], [role="listbox"]')) return;
    if (event.key === "Escape") {
      event.preventDefault();
      // Escape clears a query before it closes the panel — the same two-step the
      // old drill console used, so a mistyped search is one key from fixed.
      if (query) setQuery("");
      else onClose();
      return;
    }
    if (event.target === inputRef.current && event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (hits.length ? (index + 1) % hits.length : 0));
      return;
    }
    if (event.target === inputRef.current && event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (hits.length ? (index - 1 + hits.length) % hits.length : 0));
      return;
    }
    if (event.target === inputRef.current && event.key === "Enter") {
      const hit = hits[active];
      if (hit) {
        event.preventDefault();
        openHit(hit);
      }
      return;
    }
    if (event.key === "Tab") {
      // A modal that leaks focus to the page behind it is not modal. Cycle
      // within the panel rather than trapping the student on one control.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, input, select, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  // Keep the highlighted row in view when it moves by keyboard.
  React.useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    // Optional call, not optional chain on the element: jsdom has no
    // scrollIntoView, and keyboard navigation must not depend on it existing.
    row?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const hasQuery = query.trim().length > 0;
  const showNoResults = hasQuery && !banks.loading && hits.length === 0;

  if (!open) return null;
  const panel = (
    <div className="qf" data-tone={tone}>
      <div className="qf-portal">
        <div className="qf-scrim" onClick={onClose} aria-hidden />
        <div
          className="qf-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Find a question"
          onKeyDown={onKeyDown}
        >
          {/* The panel names itself and carries its own close, the way LSAT
              Lab's does. The scrim still closes it; a titled dialog just
              should not depend on the student knowing that. */}
          <div className="qf-head">
            <h2 className="qf-title">{view === 'rc' ? 'Find a passage or question' : 'Question Finder'}</h2>
            <button
              type="button"
              className="qf-close"
              onClick={onClose}
              aria-label="Close the question finder"
            >
              <X size={17} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="qf-controls">
            <div className="qf-banks" role="group" aria-label="Which bank to search">
              {BANK_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className="qf-bank"
                  data-on={view === tab.value}
                  aria-pressed={view === tab.value}
                  onClick={() => {
                    if (view !== tab.value) {
                      setView(tab.value);
                      setQuery("");
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* The three selectors lead now, rather than hiding behind a
                disclosure. Picking a test is the fastest way in for a student
                holding a printed section, and it was one click too deep. */}
            <BrowseByTest
              tone={tone}
              bank={view === "all" ? undefined : view}
              loading={addressIndex.loading}
              failed={addressIndex.failed}
              onPick={setQuery}
              tests={addressIndex.tests}
              selectedAddress={results.address}
              canOpen={!!selectedTarget}
              passageOnly={selectedTarget?.questionId === null}
              onOpen={openSelected}
            />
            {addressIndex.failed && <p className="qf-warn" role="alert">Question addresses could not be loaded. <button type="button" onClick={addressIndex.retry}>Retry</button></p>}

          <div className="qf-inputrow">
            <Search className="qf-inputrow-icon" size={18} strokeWidth={1.9} aria-hidden />
            <input
              ref={inputRef}
              className="qf-input"
              type="text"
              value={query}
              spellCheck={false}
              autoComplete="off"
              placeholder={view === 'rc' ? 'Search passage titles, question text, or PT140 S4 P2' : 'Search question text, or type PT90 S1 Q12'}
              aria-label="Search question text, or type a question address"
              onChange={(event) => setQuery(event.target.value)}
            />
            {results.address && (
              <span className="qf-address">{formatQuestionAddress(results.address)}</span>
            )}
            {hasQuery && (
              <button
                type="button"
                className="qf-clear"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            )}
          </div>

          </div>

          <div className="qf-body" ref={listRef}>
            {banks.loading && (
              <p className="qf-state">
                <Loader2
                  className="inline-block animate-spin align-[-2px]"
                  size={14}
                  aria-hidden
                />{" "}
                Loading questions…
              </p>
            )}

            {!banks.loading && banks.error && <p className="qf-state" role="alert">{banks.error} <button type="button" onClick={banks.retry}>Retry</button></p>}

            {!banks.loading && !banks.error && !hasQuery && (
              <div className="qf-hint">
                <span>Type a phrase you remember, or an address like</span>
                <code>{view === 'rc' ? 'PT140 S4 P2 or PT140 S4 Q7' : 'PT90 S1 Q12'}</code>
              </div>
            )}

            {!banks.loading && showNoResults && (
              <p className="qf-state">
                {results.address
                  ? `No question at ${formatQuestionAddress(results.address)}.`
                  : "Nothing matched that."}
              </p>
            )}

            {results.lr.length > 0 && (
              <div className="qf-group">
                <p className="qf-grouphead">
                  Logical Reasoning
                  <i aria-hidden />
                </p>
                {results.lr.map((hit, index) => (
                  <button
                    key={hit.key}
                    type="button"
                    className="qf-row"
                    data-active={index === active}
                    onMouseMove={() => setActive(index)}
                    onClick={() => openHit(hit)}
                  >
                    <span className="qf-addr">
                      PT {hit.pt} · S{hit.section} · Q{hit.qnum}
                    </span>
                    <span className="qf-row-text">
                      <Snippet snippet={hit.snippet} fallback={hit.stem} />
                    </span>
                    <span className="qf-row-meta">
                      <span className="qf-tag">{hit.qtype}</span>
                      <ArrowRight className="qf-row-go" size={14} strokeWidth={2} aria-hidden />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {results.rc.length > 0 && (
              <div className="qf-group">
                <p className="qf-grouphead">
                  Reading Comprehension
                  <span className="qf-grouphead-note">select to retain this address</span>
                  <i aria-hidden />
                </p>
                {results.rc.map((hit, index) => {
                  const position = results.lr.length + index;
                  return (
                    <button
                      key={hit.key}
                      type="button"
                      className="qf-row qf-row-rc"
                      data-active={position === active}
                      onMouseMove={() => setActive(position)}
                      onClick={() => openHit(hit)}
                    >
                      <span className="qf-addr">
                        PT {hit.preptest} · S{hit.section} · {hit.qnum ? `Q${hit.qnum}` : `P${hit.setNumber}`}
                      </span>
                      <span className="qf-row-text">
                        <span className="qf-row-title">
                          {hit.title ?? hit.topic ?? `Passage ${hit.setNumber}`}
                        </span>
                        <span className="qf-snippet">Open Preview to reveal passage and question text.</span>
                      </span>
                      <span className="qf-row-meta">
                        <span className="qf-count">
                          {hit.questionCount} {hit.questionCount === 1 ? "question" : "questions"}
                        </span>
                        <ArrowRight className="qf-row-go" size={14} strokeWidth={2} aria-hidden />
                      </span>
                    </button>
                  );
                })}
                {hasQuery && <div className="qf-more-results"><p role="status">Showing {results.rc.length} of {results.rcTotal} RC results.</p>{results.rc.length < results.rcTotal && rcLimit < 60 ? <button type="button" onClick={() => { setRcLimit(value => Math.min(60, value + PER_BANK_LIMIT)); setActive(0); }}>Show more RC results</button> : results.rcTotal > 60 ? <p>Showing the first 60 results. Refine your search to find a specific passage or question.</p> : null}</div>}
              </div>
            )}

            {/* One bank down is a real result set minus half. Say which half is
                missing rather than quietly returning less. */}
            {!banks.loading && !banks.error && banks.lrFailed && (
              <p className="qf-warn" role="alert">Logical Reasoning questions could not be loaded. <button type="button" onClick={banks.retry}>Retry</button></p>
            )}
            {!banks.loading && !banks.error && banks.rcFailed && (
              <p className="qf-warn" role="alert">Reading Comprehension passages could not be loaded. <button type="button" onClick={banks.retry}>Retry</button></p>
            )}
          </div>

          <div className="qf-doors">
            <button
              type="button"
              className="qf-door"
              onClick={() => {
                navigate(`/classroom/drill?section=${bank ?? "lr"}&stage=type-drill`);
                onClose();
              }}
            >
              <LayoutGrid className="qf-door-icon" size={15} strokeWidth={1.8} aria-hidden />
              <span className="qf-door-grow">Build a set</span>
              <ArrowRight size={14} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="qf-legend" aria-hidden>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> move
            </span>
            <span>
              <kbd>
                <CornerDownLeft size={9} strokeWidth={2.4} />
              </kbd>{" "}
              select
            </span>
            <span>
              <kbd>esc</kbd> {query ? "clear" : "close"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

/* --------------------------------------------------------------- snippet */

function Snippet({
  snippet,
  fallback,
}: {
  snippet: FinderSnippet | null;
  fallback?: string;
}) {
  if (!snippet) {
    return fallback ? <span className="qf-snippet">{fallback}</span> : null;
  }
  return (
    <span className="qf-snippet">
      {snippet.before}
      <mark>{snippet.match}</mark>
      {snippet.after}
    </span>
  );
}

/* --------------------------------------------------------- browse by test */

/**
 * The selectors, as a query builder rather than a second resolver.
 *
 * Picking PrepTest 90 writes "PT90" into the same input the student could have
 * typed, so browsing and typing converge on one code path and one result list.
 * On the hub, options follow its active LR/RC switch. Elsewhere both banks are
 * available. Either way browsing and typing use the same resolver.
 */
function BrowseByTest({
  tone,
  bank,
  loading,
  failed,
  onPick,
  tests,
  selectedAddress,
  canOpen,
  passageOnly,
  onOpen,
}: {
  tone: "light" | "dark";
  bank?: QuestionFinderBank;
  loading: boolean;
  failed: boolean;
  onPick: (query: string) => void;
  tests: FinderAddressTest[];
  selectedAddress: QuestionAddress | null;
  canOpen: boolean;
  passageOnly: boolean;
  onOpen: () => void;
}) {
  /* Still disabled on either state; only the words differ. "Loading…" on a
     request that already failed sends the student to wait for nothing. */
  const disabled = loading || failed;
  const [pt, setPt] = React.useState("");
  const [section, setSection] = React.useState("");
  /* The question keeps its choice like the other two. It used to reset itself
     after every pick, which read as the selector forgetting what was asked
     for — and left the row saying "PT 159 · Section 1 · Question" while the
     field below it said Q5. */
  const [qnum, setQnum] = React.useState("");
  const [pnum, setPnum] = React.useState('');

  const pts = tests.filter((test) => !bank || test.sections.some((entry) => bank === "rc" ? entry.rc.some(passage => passage.questions.length > 0) : entry.lr.length > 0)).map((test) => test.pt).sort((a, b) => b - a);

  const sections = React.useMemo(() => {
    if (!pt) return [] as number[];
    const entries = tests.find((test) => test.pt === Number(pt))?.sections ?? [];
    return entries.filter((entry) => !bank || (bank === "rc" ? entry.rc.some(passage => passage.questions.length > 0) : entry.lr.length > 0)).map((entry) => entry.section);
  }, [bank, tests, pt]);

  const qnums = React.useMemo(() => {
    if (!pt || !section) return [] as number[];
    const entry = tests.find((test) => test.pt === Number(pt))?.sections.find((candidate) => candidate.section === Number(section));
    return entry?.lr.length ? entry.lr : (entry?.rc ?? []).filter(passage => !pnum || passage.position === Number(pnum)).flatMap((passage) => passage.questions.map((question) => question.number));
  }, [tests, pt, section, pnum]);
  const pick = React.useCallback((nextPt: string, nextSection: string, nextQnum: string, nextPnum = '') => {
    if (!nextPt) return onPick("");
    let query = `PT${nextPt}`;
    if (nextSection) query += ` S${nextSection}`;
    if (nextSection && nextPnum) query += ` P${nextPnum}`;
    if (nextSection && nextQnum) query += ` Q${nextQnum}`;
    onPick(query);
  }, [onPick]);
  React.useEffect(() => {
    if (bank === "rc" && selectedAddress?.pt === Number(pt) && sections.length === 1 && !section) {
      setSection(String(sections[0]));
      pick(pt, String(sections[0]), selectedAddress.qnum === undefined ? '' : String(selectedAddress.qnum));
    }
  }, [bank, selectedAddress, sections, section, pt, pick]);
  React.useEffect(() => {
    setPt("");
    setSection("");
    setQnum("");
    setPnum('');
  }, [bank]);
  React.useEffect(() => {
    if (disabled) return;
    const test = tests.find((entry) => entry.pt === selectedAddress?.pt);
    const validSections = test?.sections.filter((entry) => !bank || (bank === "rc" ? entry.rc.some(passage => passage.questions.length > 0) : entry.lr.length > 0)) ?? [];
    const entry = validSections.find((entry) => entry.section === selectedAddress?.section);
    const matchingPassages = (entry?.rc ?? []).filter(passage => selectedAddress?.pnum === undefined || passage.position === selectedAddress.pnum);
    const numbers = entry ? (bank === "rc" ? matchingPassages.flatMap((passage) => passage.questions.map((question) => question.number)) : bank === "lr" ? entry.lr : [...entry.lr, ...matchingPassages.flatMap((passage) => passage.questions.map((question) => question.number))]) : [];
    setPt(validSections.length ? String(test.pt) : "");
    setSection(entry ? String(entry.section) : "");
    setQnum(numbers.includes(selectedAddress?.qnum) ? String(selectedAddress.qnum) : "");
    setPnum(entry?.rc.some(passage => passage.questions.length > 0 && passage.position === selectedAddress?.pnum) ? String(selectedAddress.pnum) : '');
  }, [selectedAddress, bank, tests, disabled]);
  const rcGroups = (tests.find((test) => test.pt === Number(pt))?.sections.find((entry) => entry.section === Number(section))?.rc ?? []).filter(passage => passage.questions.length > 0 && (!pnum || passage.position === Number(pnum)));
  const rcPassages = (tests.find((test) => test.pt === Number(pt))?.sections.find((entry) => entry.section === Number(section))?.rc ?? []).filter(passage => passage.questions.length > 0);

  return (
    <div className="qf-browse" data-rc={bank === 'rc' || undefined}>
      <label className="qf-field">
        <span className="qf-field-label">Test</span>
        <select
          className="qf-select"
          value={pt}
          disabled={disabled}
          onChange={(event) => {
            setPt(event.target.value);
            setSection("");
            setQnum("");
            setPnum('');
            pick(event.target.value, "", "");
          }}
        >
          <option value="">{loading ? "Loading…" : failed ? "Couldn't load tests" : "PrepTest"}</option>
          {pts.map((value) => (
            <option key={value} value={value}>
              PT {value}
            </option>
          ))}
        </select>
      </label>

      <label className="qf-field">
        <span className="qf-field-label">Section</span>
        <select
          className="qf-select"
          value={section}
          disabled={disabled || !pt}
          onChange={(event) => {
            setSection(event.target.value);
            setQnum("");
            setPnum('');
            pick(pt, event.target.value, "");
          }}
        >
          <option value="">{pt ? "Section" : "Pick a test"}</option>
          {sections.map((value) => (
            <option key={value} value={value}>
              Section {value}
            </option>
          ))}
        </select>
      </label>

      {bank === 'rc' && <label className="qf-field"><span className="qf-field-label">Passage</span><select className="qf-select" value={pnum} disabled={disabled || !section || rcPassages.length === 0} onChange={event => { setPnum(event.target.value); setQnum(''); pick(pt, section, '', event.target.value); }}><option value="">{section ? 'Choose a passage' : 'Pick a section'}</option>{rcPassages.map(passage => <option key={passage.id} value={String(passage.position)}>Passage {passage.position}{passage.title ? ` · ${passage.title}` : ''}</option>)}</select></label>}
      <label className="qf-field">
        <span className="qf-field-label">{bank === 'rc' ? 'Question (optional)' : 'Question'}</span>
        <Select
          value={qnum}
          disabled={disabled || !section || qnums.length === 0}
          onValueChange={(value) => { const next = value === '__passage__' ? '' : value; setQnum(next); pick(pt, section, next, pnum); }}
        >
          <SelectTrigger className="qf-select-radix" aria-label="Question">
            <SelectValue placeholder={!section ? "Pick a section" : qnums.length === 0 ? "No questions" : bank === 'rc' && pnum ? 'Whole passage' : 'Question'} />
          </SelectTrigger>
          <SelectContent className="qf qf-question-menu" data-tone={tone} position="popper" side="bottom" align="start">
            {bank === 'rc' && pnum && <SelectItem value="__passage__">Whole passage</SelectItem>}
            {rcGroups.length ? rcGroups.map((passage, index) => {
              const numbers = passage.questions.map((question) => question.number);
              const range = numbers.length ? `Questions ${numbers[0]}–${numbers[numbers.length - 1]}` : "No questions";
              return <React.Fragment key={passage.id}>
                {index > 0 && <SelectSeparator className="qf-passage-separator" />}
                <SelectGroup>
                  <SelectLabel className="qf-passage-label">
                    <span>Passage {passage.position} · {range}</span>
                    {passage.title && <span className="qf-passage-title">{passage.title}</span>}
                  </SelectLabel>
                  {passage.questions.map((question) => <SelectItem key={question.id} value={String(question.number)} aria-label={`PT ${pt} Section ${section} Question ${question.number}, Passage ${passage.position}${passage.title ? `, ${passage.title}` : ""}`}>
                    Question {question.number}
                  </SelectItem>)}
                </SelectGroup>
              </React.Fragment>;
            }) : qnums.map((value) => <SelectItem key={value} value={String(value)} aria-label={`PT ${pt} Section ${section} Question ${value}`}>Question {value}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>

      <button
        type="button"
        className="qf-go"
        disabled={disabled || !canOpen}
        onClick={onOpen}
        title={canOpen ? `Open a read-only ${passageOnly ? 'passage' : 'question'} preview` : "Choose an RC passage or an exact question. LR preview is not available yet."}
      >
        {passageOnly ? 'Open passage' : 'Open question'}
      </button>
    </div>
  );
}
