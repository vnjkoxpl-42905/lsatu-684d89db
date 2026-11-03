import * as React from "react";
import { ArrowRight, CornerDownLeft, History, PenTool, Search } from "lucide-react";
import {
  rcHitHref,
  runFinderSearch,
  type FinderHit,
  type FinderSnippet,
} from "@/components/questionfinder/questionFinderSearch";
import { useFinderAddressIndex } from "@/components/questionfinder/useFinderAddressIndex";
import { useQuestionFinderBanks } from "@/components/questionfinder/useQuestionFinderBanks";
import { lrQuestionPath } from "@/lib/lrQuestionAddress";
import { filterStudents, type TeacherStudentRow } from "./teacherHomeModel";
import {
  hitLabel,
  landingFor,
  loadRecents,
  readQuery,
  rememberQuestion,
  sectionOptions,
  type RecentQuestion,
} from "./questionLookup";

const TOOLS = [
  { label: "Whiteboard", hint: "Teach from the full-screen board", route: "/teacher/whiteboard" },
  { label: "Assign work", hint: "Choose a student and their next task", route: "/teacher/library/assignments" },
  { label: "Inbox", hint: "Student messages", route: "/teacher/inbox" },
  { label: "All students", hint: "Notes, work and access", route: "/teacher/students" },
  { label: "Payments and history", hint: "Decisions and the 90-day ledger", route: "/teacher/today" },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

const hitRoute = (hit: FinderHit) =>
  hit.bank === "lr"
    ? lrQuestionPath({ pt: hit.pt, section: hit.section, qnum: hit.qnum })
    : rcHitHref(hit);

function Marked({ snippet, fallback }: { snippet: FinderSnippet | null; fallback: string }) {
  if (!snippet) return <>{fallback}</>;
  return (
    <>
      {snippet.before}
      <mark>{snippet.match}</mark>
      {snippet.after}
    </>
  );
}

function Row({
  icon,
  title,
  detail,
  tag,
  isDefault,
  onClick,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  tag?: string;
  isDefault?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="home-desk-quick-row"
      data-default={isDefault || undefined}
      onClick={onClick}
    >
      {icon}
      <span className="home-desk-quick-main">
        <b>
          {title}
          {tag ? <em>{tag}</em> : null}
        </b>
        {detail ? <small>{detail}</small> : null}
      </span>
      {isDefault ? <CornerDownLeft size={14} aria-hidden="true" className="home-desk-quick-enter" /> : null}
    </button>
  );
}

/**
 * One field that goes anywhere. It reads what is typed as an address, a phrase from a
 * question, a student or a tool, and answers in place:
 *
 * - "151" lists that PrepTest's real sections, with kind and size.
 * - "151 4" lists that section's real question numbers; typing more narrows them.
 * - "151 4 10" resolves to the question, with its stem, and Enter opens it.
 * - Words search the question text of both banks; names find students.
 * - Empty, it offers the last questions opened and the places Home reaches.
 *
 * The first result is always the one Enter takes, and it is marked. Results are plain
 * buttons in labelled groups; the arrow keys move through them and typing from any of them
 * returns to the field, so the mouse is never required and never in the way.
 */
export function QuickAccess({
  students,
  rosterReady,
  onOpen,
  onEditAccess,
}: {
  students: TeacherStudentRow[];
  rosterReady: boolean;
  onOpen: (route: string) => void;
  onEditAccess?: (studentId: string, trigger: HTMLButtonElement) => void;
}) {
  const [text, setText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [wantBanks, setWantBanks] = React.useState(false);
  const [recents, setRecents] = React.useState<RecentQuestion[]>(loadRecents);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsId = React.useId();

  // The address index is tiny and loads on first touch; the question text banks are large and
  // load only once a phrase or a full address needs them.
  const index = useFinderAddressIndex(touched);
  const indexReady = !index.loading && !index.failed && index.tests.length > 0;
  const deferred = React.useDeferredValue(text);
  const reading = React.useMemo(
    () => readQuery(deferred, index.tests, indexReady),
    [deferred, index.tests, indexReady],
  );
  React.useEffect(() => {
    if (wantBanks) return;
    if (
      (reading.kind === "phrase" && reading.phrase.length >= 3) ||
      (reading.kind === "address" && reading.landing)
    ) {
      setWantBanks(true);
    }
  }, [reading, wantBanks]);
  const banks = useQuestionFinderBanks(wantBanks, "all");
  const lrByAddress = React.useMemo(
    () => new Map(banks.lr.map((q) => [`${q.pt}-${q.section}-${q.qnum}`, q])),
    [banks.lr],
  );
  const results = React.useMemo(
    () =>
      reading.kind === "phrase" && (banks.lr.length || banks.rcPassages.length)
        ? runFinderSearch({
            query: reading.phrase,
            lr: banks.lr,
            rcPassages: banks.rcPassages,
            rcQuestions: banks.rcQuestions,
            limit: 5,
            rcLimit: 3,
          })
        : null,
    [reading, banks.lr, banks.rcPassages, banks.rcQuestions],
  );

  const phrase = reading.kind === "phrase" ? reading.phrase : "";
  const studentMatches = phrase ? filterStudents(students, phrase).slice(0, 3) : [];
  const toolMatches = TOOLS.filter(
    (tool) => !phrase || tool.label.toLowerCase().includes(phrase.toLowerCase()),
  );
  const lrHits = results?.lr ?? [];
  const rcHits = results?.rc ?? [];

  const landingStem = React.useMemo(() => {
    if (reading.kind !== "address" || !reading.landing || reading.landing.kind !== "lr") return null;
    const q = lrByAddress.get(`${reading.spoken.pt}-${reading.spoken.section}-${reading.landing.qnum}`);
    return q ? { qtype: q.qtype, stem: q.questionStem } : null;
  }, [reading, lrByAddress]);

  const defaultRoute =
    reading.kind === "address"
      ? reading.landing?.route
      : reading.kind === "phrase"
        ? studentMatches[0]?.route ??
          (lrHits[0] ? hitRoute(lrHits[0]) : undefined) ??
          (rcHits[0] ? hitRoute(rcHits[0]) : undefined) ??
          toolMatches[0]?.route
        : undefined;

  const clear = () => {
    setText("");
    setOpen(false);
  };
  const go = (route: string, remember?: RecentQuestion) => {
    if (remember) setRecents(rememberQuestion(remember));
    clear();
    inputRef.current?.blur();
    onOpen(route);
  };
  const focusables = () =>
    Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>(
        `[data-qa-results="${CSS.escape(resultsId)}"] button`,
      ) ?? [],
    );
  const fillAddress = (next: string) => {
    setText(next);
    setOpen(true);
    inputRef.current?.focus();
  };

  // "/" or Ctrl/Cmd+K reaches the field from anywhere on Home, unless the teacher is typing.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const slash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      const palette = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (!slash && !palette) return;
      const el = event.target as HTMLElement | null;
      if (slash && el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const questionRow = (hit: FinderHit, isDefault: boolean) => {
    const route = hitRoute(hit);
    const label = hitLabel(hit);
    const detail = hit.bank === "lr" ? hit.qtype : hit.title ?? hit.topic ?? "Reading Comprehension";
    return (
      <li key={hit.key}>
        <Row
          title={label}
          tag={hit.bank === "lr" ? "LR" : "RC"}
          detail={
            <>
              {detail}
              {hit.snippet ? (
                <>
                  {" · "}
                  <Marked snippet={hit.snippet} fallback="" />
                </>
              ) : null}
            </>
          }
          isDefault={isDefault}
          onClick={() => go(route, { route, label, detail })}
        />
      </li>
    );
  };

  const address = reading.kind === "address" ? reading : null;
  const showSectionChips = !!address && !!address.test && !address.section;
  const showProblemSections = !!address?.problem && !!address.test && !address.section;
  const tipOnly = reading.kind === "empty" && !recents.length;

  return (
    <div
      ref={rootRef}
      className="home-desk-quick"
      onBlur={(event) => {
        const next = event.relatedTarget as HTMLElement | null;
        // Focus moving into a dialog opened from a result keeps the results, so closing the
        // dialog can hand focus back to the row that opened it.
        if (next?.closest?.('[role="dialog"]')) return;
        if (!rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <div className="home-desk-quick-field">
        <Search size={17} aria-hidden="true" />
        <input
          id="home-quick-access"
          ref={inputRef}
          type="search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Find a student, question or tool"
          aria-controls={resultsId}
          aria-expanded={open}
          placeholder="Find a question, student or tool"
          value={text}
          onFocus={() => {
            setTouched(true);
            setOpen(true);
          }}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && defaultRoute) {
              const landing = address?.landing;
              go(
                defaultRoute,
                landing
                  ? { route: landing.route, label: landing.label, detail: landingStem?.qtype }
                  : undefined,
              );
            }
            if (event.key === "Escape") clear();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              focusables()[0]?.focus();
            }
          }}
        />
        {text ? null : <kbd aria-hidden="true">/</kbd>}
      </div>
      {open ? (
        <div
          id={resultsId}
          className="home-desk-quick-panel"
          data-qa-results={resultsId}
          onKeyDown={(event) => {
            const list = focusables();
            const at = list.indexOf(document.activeElement as HTMLButtonElement);
            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
              if (at < 0) return;
              event.preventDefault();
              list[Math.min(list.length - 1, at + 1)]?.focus();
            } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
              event.preventDefault();
              if (at <= 0) inputRef.current?.focus();
              else list[at - 1]?.focus();
            } else if (event.key === "Escape") {
              clear();
              inputRef.current?.focus();
            } else if (
              at >= 0 &&
              (event.key === "Backspace" ||
                (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey))
            ) {
              // Typing from a result goes back to the field instead of being lost.
              inputRef.current?.focus();
            }
          }}
        >
          {reading.kind === "empty" ? (
            <>
              {recents.length ? (
                <section aria-label="Recent questions">
                  <h3>Recent</h3>
                  <ul>
                    {recents.map((r) => (
                      <li key={r.route}>
                        <Row
                          icon={<History size={15} aria-hidden="true" />}
                          title={r.label}
                          detail={r.detail}
                          onClick={() => go(r.route, r)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <p className="home-desk-quick-tip">
                Try <b>PT151 S4 Q10</b>, a phrase from a question, or a student’s name.
              </p>
            </>
          ) : null}

          {address ? (
            <>
              {address.landing ? (
                <section aria-label="Question">
                  <h3>Question</h3>
                  <ul>
                    <li>
                      <Row
                        title={address.landing.label}
                        tag={address.landing.kind === "rc" ? "RC" : "LR"}
                        detail={
                          landingStem ? (
                            <>
                              {landingStem.qtype}
                              {" · "}
                              {landingStem.stem}
                            </>
                          ) : (
                            "Open the question with its explanation"
                          )
                        }
                        isDefault
                        onClick={() =>
                          go(address.landing!.route, {
                            route: address.landing!.route,
                            label: address.landing!.label,
                            detail: landingStem?.qtype,
                          })
                        }
                      />
                    </li>
                  </ul>
                </section>
              ) : null}
              {address.problem ? (
                <p className="home-desk-quick-problem" role="status">
                  {address.problem}
                </p>
              ) : null}
              {!address.indexed && index.loading ? (
                <p className="home-desk-empty" role="status">Loading PrepTests…</p>
              ) : null}
              {(showSectionChips || showProblemSections) && address.test ? (
                <section aria-label={`Sections in PT${address.spoken.pt}`}>
                  <h3>PrepTest {address.spoken.pt}</h3>
                  <div className="home-desk-quick-chips">
                    {sectionOptions(address.test).map((s) => (
                      <button
                        key={s.section}
                        type="button"
                        className="home-desk-quick-chip home-desk-quick-chip-wide"
                        onClick={() => fillAddress(`PT${address.spoken.pt} S${s.section} `)}
                      >
                        <b>S{s.section}</b>
                        <small>
                          {s.kind === "lr" ? "LR" : "RC"} · {s.questions}
                        </small>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {address.section && address.numbers.length ? (
                <section
                  aria-label={`Questions in PT${address.spoken.pt} Section ${address.spoken.section}`}
                >
                  <h3>
                    PT{address.spoken.pt} · Section {address.spoken.section}
                    {address.spoken.pnum ? ` · Passage ${address.spoken.pnum}` : ""}
                  </h3>
                  <div className="home-desk-quick-chips">
                    {address.numbers.map((option) => {
                      const landing = landingFor(address.spoken.pt, address.spoken.section!, option);
                      return (
                        <button
                          key={`${option.passage?.id ?? "q"}-${option.qnum}`}
                          type="button"
                          className="home-desk-quick-chip"
                          data-exact={address.landing?.qnum === option.qnum || undefined}
                          aria-label={`Question ${option.qnum}`}
                          onClick={() =>
                            go(landing.route, { route: landing.route, label: landing.label })
                          }
                        >
                          {option.qnum}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {reading.kind === "phrase" ? (
            <>
              {studentMatches.length || !rosterReady ? (
                <section aria-label="Students">
                  <h3>Students</h3>
                  {!rosterReady ? (
                    <p className="home-desk-empty" role="status">Loading students…</p>
                  ) : (
                    <ul aria-label="Matching students">
                      {studentMatches.map((student, i) => (
                        <li key={student.id}>
                          <Row
                            icon={<span className="home-desk-avatar" aria-hidden="true">{initials(student.name)}</span>}
                            title={student.name}
                            detail={student.activityLabel}
                            isDefault={i === 0 && defaultRoute === student.route}
                            onClick={() => go(student.route)}
                          />
                          {onEditAccess ? (
                            <button
                              type="button"
                              className="home-desk-quick-side"
                              onClick={(event) => onEditAccess(student.id, event.currentTarget)}
                            >
                              Edit access
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
              {lrHits.length || rcHits.length ? (
                <section aria-label="Questions">
                  <h3>Questions</h3>
                  <ul>
                    {lrHits.map((hit, i) =>
                      questionRow(hit, !studentMatches.length && i === 0),
                    )}
                    {rcHits.map((hit, i) =>
                      questionRow(hit, !studentMatches.length && !lrHits.length && i === 0),
                    )}
                  </ul>
                </section>
              ) : wantBanks && banks.loading && phrase.length >= 3 ? (
                <p className="home-desk-empty" role="status">Searching questions…</p>
              ) : null}
              {toolMatches.length && phrase ? (
                <section aria-label="Tools">
                  <h3>Tools</h3>
                  <ul>
                    {toolMatches.map((tool, i) => (
                      <li key={tool.route}>
                        <Row
                          icon={
                            tool.label === "Whiteboard" ? (
                              <PenTool size={15} aria-hidden="true" />
                            ) : (
                              <ArrowRight size={15} aria-hidden="true" />
                            )
                          }
                          title={tool.label}
                          detail={tool.hint}
                          isDefault={
                            i === 0 &&
                            !studentMatches.length &&
                            !lrHits.length &&
                            !rcHits.length
                          }
                          onClick={() => go(tool.route)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {!studentMatches.length &&
              rosterReady &&
              !lrHits.length &&
              !rcHits.length &&
              !toolMatches.length &&
              !(banks.loading && phrase.length >= 3) ? (
                <p className="home-desk-empty" role="status">
                  Nothing matches “{phrase}”.
                </p>
              ) : null}
            </>
          ) : null}

          {reading.kind === "empty" || tipOnly ? (
            <section aria-label="Tools">
              <h3>Jump to</h3>
              <ul>
                {TOOLS.map((tool) => (
                  <li key={tool.route}>
                    <Row
                      icon={
                        tool.label === "Whiteboard" ? (
                          <PenTool size={15} aria-hidden="true" />
                        ) : (
                          <ArrowRight size={15} aria-hidden="true" />
                        )
                      }
                      title={tool.label}
                      detail={tool.hint}
                      onClick={() => go(tool.route)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="home-desk-quick-keys" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>esc</kbd> clear</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
