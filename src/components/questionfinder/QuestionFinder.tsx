"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
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
} from "./questionFinderSearch";
import { useQuestionFinderBanks } from "./useQuestionFinderBanks";
import "./questionFinder.css";

const PER_BANK_LIMIT = 6;

export interface QuestionFinderProps {
  /** Where a finished one-question attempt returns to. */
  returnTo: string;
  /** The host's surface. The panel follows it so the overlay never flashes a
   *  warm-paper card over the near-black Drill landing workspace. */
  tone?: "light" | "dark";
}

/**
 * The Question finder.
 *
 * A labelled field that opens a panel: type words to search question text, or
 * type a question address (PT90 S1 Q12) to go straight there. It searches both
 * banks and keeps the results in two groups, because a hit lands differently in
 * each — an LR hit opens that one question, an RC hit opens its whole passage.
 * See `docs/adr/0008-question-finder-lands-differently-by-bank.md`.
 *
 * It never builds a set. That is the Drill console's job, and the last row of
 * the panel is the door to it.
 */
export default function QuestionFinder({ returnTo, tone = "light" }: QuestionFinderProps) {
  const [open, setOpen] = React.useState(false);

  /* Cmd/Ctrl+K is an accelerator on top of a visible, labelled control — never
     the only way in. It is ignored while the student is typing somewhere else,
     so it cannot steal a keystroke from a real field. */
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (!open && (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)) return;
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
          label and the shortcut hint are what collapse on a phone; the control
          and its accessible name do not change. */}
      <button
        type="button"
        className="qf-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Find a question"
      >
        <Search className="qf-trigger-icon" size={15} strokeWidth={1.9} aria-hidden />
        <span className="qf-trigger-label" aria-hidden>
          Find a question
        </span>
        <span className="qf-trigger-kbd" aria-hidden>
          ⌘K
        </span>
      </button>

      {open && <FinderPanel returnTo={returnTo} tone={tone} onClose={() => setOpen(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

function FinderPanel({
  returnTo,
  tone,
  onClose,
}: {
  returnTo: string;
  tone: "light" | "dark";
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [browsing, setBrowsing] = React.useState(false);
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
      }),
    [banks.lr, banks.rcPassages, banks.rcQuestions, query],
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
                {/* The note is load-bearing, not decoration: an RC hit opens the
                    whole passage, and this is where that is said once rather
                    than being discovered after the click. */}
                <p className="qf-grouphead">
                  Reading Comprehension
                  <span className="qf-grouphead-note">opens the whole passage</span>
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
                        PT {hit.preptest} · S{hit.section} · P{hit.setNumber}
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
              aria-expanded={browsing}
              onClick={() => setBrowsing((value) => !value)}
            >
              <LayoutGrid className="qf-door-icon" size={15} strokeWidth={1.8} aria-hidden />
              <span className="qf-door-grow">Browse by test</span>
              <ChevronDown className="qf-door-chevron" size={15} strokeWidth={2} aria-hidden />
            </button>

            {browsing && (
              <BrowseByTest
                lr={banks.lr}
                rcPassages={banks.rcPassages}
                disabled={banks.loading}
                onPick={setQuery}
              />
            )}

            <button
              type="button"
              className="qf-door"
              onClick={() => {
                navigate("/classroom/drill?stage=type-drill");
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
 * Options are drawn from BOTH banks — selectors built from LR alone would
 * silently disagree with the RC results sitting beside them.
 */
function BrowseByTest({
  lr,
  rcPassages,
  disabled,
  onPick,
}: {
  lr: { pt: number; section: number; qnum: number }[];
  rcPassages: { preptest: number; section: number }[];
  disabled: boolean;
  onPick: (query: string) => void;
}) {
  const [pt, setPt] = React.useState("");
  const [section, setSection] = React.useState("");

  const pts = React.useMemo(() => {
    const all = new Set<number>();
    for (const question of lr) all.add(question.pt);
    for (const passage of rcPassages) all.add(passage.preptest);
    return [...all].sort((a, b) => b - a);
  }, [lr, rcPassages]);

  const sections = React.useMemo(() => {
    if (!pt) return [] as number[];
    const target = Number(pt);
    const all = new Set<number>();
    for (const question of lr) if (question.pt === target) all.add(question.section);
    for (const passage of rcPassages) if (passage.preptest === target) all.add(passage.section);
    return [...all].sort((a, b) => a - b);
  }, [lr, pt, rcPassages]);

  const qnums = React.useMemo(() => {
    if (!pt || !section) return [] as number[];
    const all = new Set<number>();
    for (const question of lr) {
      if (question.pt === Number(pt) && question.section === Number(section)) {
        all.add(question.qnum);
      }
    }
    return [...all].sort((a, b) => a - b);
  }, [lr, pt, section]);

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
          value=""
          disabled={disabled || !section || qnums.length === 0}
          onChange={(event) => pick(pt, section, event.target.value)}
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
    </div>
  );
}
