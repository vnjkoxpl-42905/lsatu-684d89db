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
  lrHitHref,
  rcHitHref,
  runFinderSearch,
  type FinderHit,
  type FinderSnippet,
  type QuestionFinderBank,
} from "./questionFinderSearch";
import { useQuestionFinderBanks } from "./useQuestionFinderBanks";
import "./questionFinder.css";

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
}

/**
 * The Question finder.
 *
 * A labelled field that opens a panel: type words to search question text, or
 * type a question address (PT90 S1 Q12) to go straight there. It can search
 * both banks or follow the Drill hub's active bank. LR and RC question hits
 * both open the exact question; RC passage matches open the matching passage.
 * See `docs/adr/0008-question-finder-lands-differently-by-bank.md`.
 *
 * It never builds a set. That is the Drill console's job, and the last row of
 * the panel is the door to it.
 */
export default function QuestionFinder({ returnTo, tone = "light", bank }: QuestionFinderProps) {
  const [open, setOpen] = React.useState(false);

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
        setOpen(true);
        return;
      }

      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      if (!open && typing) return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Find a question"
        /* The shortcuts are declared, not drawn. Joshua removed the visible
           badge on 2026-09-08; assistive tech and a hover tooltip can still
           carry them. */
        aria-keyshortcuts="Meta+K Control+K /"
        title="Find a question (Ctrl K, or /)"
      >
        <Search className="qf-trigger-icon" size={15} strokeWidth={1.9} aria-hidden />
        <span className="qf-trigger-label" aria-hidden>
          Find a question
        </span>
      </button>

      {open && <FinderPanel returnTo={returnTo} tone={tone} bank={bank} onClose={() => setOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

function FinderPanel({
  returnTo,
  tone,
  bank,
  onClose,
}: {
  returnTo: string;
  tone: "light" | "dark";
  bank?: QuestionFinderBank;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  /* Seeded from the host, not locked to it: the Drill hub opens the finder on
     its own side of the switch, and the student can still cross to the other. */
  const [view, setView] = React.useState<QuestionFinderBank | "all">(bank ?? "all");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Mounting the panel IS the request for the banks; nothing loads before it.
  const banks = useQuestionFinderBanks(true);

  const results = React.useMemo(
    () =>
      runFinderSearch({
        query,
        lr: banks.lr,
        rcPassages: banks.rcPassages,
        rcQuestions: banks.rcQuestions,
        limit: PER_BANK_LIMIT,
        bank: view === "all" ? undefined : view,
      }),
    [view, banks.lr, banks.rcPassages, banks.rcQuestions, query],
  );

  const hits = React.useMemo<FinderHit[]>(
    () => [...results.lr, ...results.rc],
    [results.lr, results.rc],
  );

  React.useEffect(() => setActive(0), [query]);

  /* Focus in, focus back out. The trigger must get focus again on close or a
     keyboard student is returned to the top of the document. */
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const openHit = React.useCallback(
    (hit: FinderHit) => {
      navigate(hit.bank === "lr" ? lrHitHref(hit, returnTo) : rcHitHref(hit));
      onClose();
    },
    [navigate, onClose, returnTo],
  );

  /* The go arrow is the selectors' Enter. It opens the best hit for whatever
     address is currently built, so picking a test and pressing it lands on that
     test's first question rather than telling the student to pick two more
     things first. It is disabled when the address resolves to nothing, so it
     never promises a jump it cannot make. */
  const canGo = results.address !== null && hits.length > 0;
  const openTop = React.useCallback(() => {
    const hit = hits[0];
    if (hit) openHit(hit);
  }, [hits, openHit]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      // Escape clears a query before it closes the panel — the same two-step the
      // old drill console used, so a mistyped search is one key from fixed.
      if (query) setQuery("");
      else onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (hits.length ? (index + 1) % hits.length : 0));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (hits.length ? (index - 1 + hits.length) % hits.length : 0));
      return;
    }
    if (event.key === "Enter") {
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
            <h2 className="qf-title">Question Finder</h2>
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
                  onClick={() => setView(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* The three selectors lead now, rather than hiding behind a
                disclosure. Picking a test is the fastest way in for a student
                holding a printed section, and it was one click too deep. */}
            <BrowseByTest
              lr={banks.lr}
              rcPassages={banks.rcPassages}
              rcQuestions={banks.rcQuestions}
              bank={view === "all" ? undefined : view}
              disabled={banks.loading}
              onPick={setQuery}
              onGo={openTop}
              canGo={canGo}
            />

          <div className="qf-inputrow">
            <Search className="qf-inputrow-icon" size={18} strokeWidth={1.9} aria-hidden />
            <input
              ref={inputRef}
              className="qf-input"
              type="text"
              value={query}
              spellCheck={false}
              autoComplete="off"
              placeholder="Search question text, or type PT90 S1 Q12"
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

            {!banks.loading && banks.error && <p className="qf-state">{banks.error}</p>}

            {!banks.loading && !banks.error && !hasQuery && (
              <div className="qf-hint">
                <span>Type a phrase you remember, or an address like</span>
                <code>PT90 S1 Q12</code>
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
                {/* An RC result always opens its matching passage and targets
                    the exact question when the result came from question text. */}
                <p className="qf-grouphead">
                  Reading Comprehension
                  <span className="qf-grouphead-note">opens the matching passage</span>
                  <i aria-hidden />
                </p>
                {results.rc.map((hit, index) => {
                  const position = results.lr.length + index;
                  return (
                    <button
                      key={hit.key}
                      type="button"
                      className="qf-row"
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
                        <Snippet snippet={hit.snippet} />
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
              </div>
            )}

            {/* One bank down is a real result set minus half. Say which half is
                missing rather than quietly returning less. */}
            {!banks.loading && !banks.error && banks.lrFailed && (
              <p className="qf-warn">Logical Reasoning questions could not be loaded.</p>
            )}
            {!banks.loading && !banks.error && banks.rcFailed && (
              <p className="qf-warn">Reading Comprehension passages could not be loaded.</p>
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
              open
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
  lr,
  rcPassages,
  rcQuestions,
  bank,
  disabled,
  onPick,
  onGo,
  canGo,
}: {
  lr: { pt: number; section: number; qnum: number }[];
  rcPassages: { preptest: number; section: number }[];
  rcQuestions: { preptest: number; section: number; qnum: number }[];
  bank?: QuestionFinderBank;
  disabled: boolean;
  onPick: (query: string) => void;
  onGo: () => void;
  canGo: boolean;
}) {
  const [pt, setPt] = React.useState("");
  const [section, setSection] = React.useState("");
  /* The question keeps its choice like the other two. It used to reset itself
     after every pick, which read as the selector forgetting what was asked
     for — and left the row saying "PT 159 · Section 1 · Question" while the
     field below it said Q5. */
  const [qnum, setQnum] = React.useState("");

  const pts = React.useMemo(() => {
    const all = new Set<number>();
    if (bank !== "rc") for (const question of lr) all.add(question.pt);
    if (bank !== "lr") for (const passage of rcPassages) all.add(passage.preptest);
    return [...all].sort((a, b) => b - a);
  }, [bank, lr, rcPassages]);

  const sections = React.useMemo(() => {
    if (!pt) return [] as number[];
    const target = Number(pt);
    const all = new Set<number>();
    if (bank !== "rc") {
      for (const question of lr) if (question.pt === target) all.add(question.section);
    }
    if (bank !== "lr") {
      for (const passage of rcPassages) if (passage.preptest === target) all.add(passage.section);
    }
    return [...all].sort((a, b) => a - b);
  }, [bank, lr, pt, rcPassages]);

  const qnums = React.useMemo(() => {
    if (!pt || !section) return [] as number[];
    const all = new Set<number>();
    if (bank !== "rc") {
      for (const question of lr) {
        if (question.pt === Number(pt) && question.section === Number(section)) {
          all.add(question.qnum);
        }
      }
    }
    if (bank !== "lr") {
      for (const question of rcQuestions) {
        if (question.preptest === Number(pt) && question.section === Number(section)) {
          all.add(question.qnum);
        }
      }
    }
    return [...all].sort((a, b) => a - b);
  }, [bank, lr, pt, rcQuestions, section]);

  const pick = (nextPt: string, nextSection: string, nextQnum: string) => {
    if (!nextPt) return onPick("");
    let query = `PT${nextPt}`;
    if (nextSection) query += ` S${nextSection}`;
    if (nextSection && nextQnum) query += ` Q${nextQnum}`;
    onPick(query);
  };

  return (
    <div className="qf-browse">
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
            pick(event.target.value, "", "");
          }}
        >
          <option value="">{disabled ? "Loading…" : "PrepTest"}</option>
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

      <label className="qf-field">
        <span className="qf-field-label">Question</span>
        <select
          className="qf-select"
          value={qnum}
          disabled={disabled || !section || qnums.length === 0}
          onChange={(event) => {
            setQnum(event.target.value);
            pick(pt, section, event.target.value);
          }}
        >
          <option value="">
            {!section
              ? "Pick a section"
              : qnums.length === 0
                ? "Passages only"
                : "Question"}
          </option>
          {qnums.map((value) => (
            <option key={value} value={value}>
              Question {value}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="qf-go"
        onClick={onGo}
        disabled={!canGo}
        aria-label="Open the selected question"
      >
        <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
