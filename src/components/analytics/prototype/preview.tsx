import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Home,
  Library,
  Menu,
  MessageCircle,
  NotebookPen,
  X,
} from "lucide-react";
import ProgressPrototype, { type ProgressView } from "./ProgressPrototype";
import { useProgressWindow } from "@/hooks/useProgressWindow";
import { DEMO_AS_OF, getDemoData } from "./fixture";
import liveFixture from "@/lib/__fixtures__/progress-live-20261028.json";
import {
  adaptLrAttempts,
  adaptLrSections,
  adaptRcAttempts,
  completedPracticeTestIds,
  type GradedQuestionAnswer,
  type LrAttemptSourceRow,
  type LrSectionSourceRow,
  type RcAttemptSourceRow,
  type RcSessionSourceRow,
} from "@/lib/firstAnswerProgress";
import "@/index.css";
import "./progress-preview.css";

function Preview() {
  const [state, setState] = useState<
    | "populated"
    | "empty"
    | "sparse"
    | "partial"
    | "loading"
    | "error"
    | "checking"
    | "stale"
    | "withheld"
  >(
    () =>
      (new URLSearchParams(location.search).get("state") as never) ||
      "populated",
  );
  const [menu, setMenu] = useState(false);
  const actual =
    new URLSearchParams(location.search).get("source") === "actual";
  const [asOf, setAsOf] = useState(actual ? liveFixture.asOf : DEMO_AS_OF);
  const [dark, setDark] = useState(
    () => new URLSearchParams(location.search).get("theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark]);
  const [params] = useSearchParams();
  const [window, setWindow] = useProgressWindow();
  const production = params.get("production") === "1";
  const view: ProgressView = ["overview", "types", "history"].includes(
    params.get("view") ?? "",
  )
    ? (params.get("view") as ProgressView)
    : "overview";
  const data = getDemoData(
    state === "checking" || state === "stale" || state === "withheld"
      ? "populated"
      : state,
  );
  if (actual) {
    const owner = "00000000-0000-4000-8000-000000000002";
    const runs = completedPracticeTestIds(liveFixture.practiceTests, owner);
    const answers: GradedQuestionAnswer[] = [
      ...adaptLrAttempts(liveFixture.lrAttempts as LrAttemptSourceRow[], owner),
      ...adaptLrSections(
        liveFixture.lrSections as unknown as LrSectionSourceRow[],
        owner,
        runs,
      ),
      ...adaptRcAttempts(
        liveFixture.rcAttempts as RcAttemptSourceRow[],
        liveFixture.rcSessions as RcSessionSourceRow[],
        owner,
        runs,
      ),
    ];
    data.answers =
      state === "empty"
        ? []
        : state === "sparse"
          ? answers.filter((row) => row.area === "LR").slice(0, 2)
          : answers;
    if (state === "withheld")
      data.answers = data.answers.map((row) =>
        row.area === "RC"
          ? { ...row, correct: null, resultVisibility: "withheld" }
          : row,
      );
  }
  const demoRefresh = () => {
    setState("populated");
    setAsOf((current) => new Date(Date.parse(current) + 1).toISOString());
  };
  return (
    <div
      className={`pp-preview-shell${production ? " is-production-preview" : ""}`}
    >
      <aside className={`pp-preview-sidebar ${menu ? "is-open" : ""}`}>
        <div className="pp-brand">
          <span>LS</span>LSAT U
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p>Your classroom</p>
        <nav aria-label="Preview classroom context">
          {[
            { label: "Home", icon: Home },
            { label: "My Work", icon: ClipboardList },
            { label: "Practice", icon: NotebookPen },
            { label: "Review", icon: BookOpen },
            { label: "Progress", icon: BarChart3 },
            { label: "Library", icon: Library },
          ].map(({ label, icon: Icon }) => (
            <span
              key={label}
              className={label === "Progress" ? "is-active" : ""}
              aria-current={label === "Progress" ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </span>
          ))}
        </nav>
        <div className="pp-sidebar-bottom">
          <MessageCircle size={18} />
          <span>
            Demonstration workspace
            <small>Preview navigation is contextual</small>
          </span>
        </div>
      </aside>
      <main className="pp-preview-main">
        <header className="pp-preview-header">
          <div>
            <button
              type="button"
              className="pp-menu"
              aria-label="Open navigation"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <h1>Review</h1>
            <p>
              {production
                ? actual
                  ? "Source-derived evidence preview · frozen snapshot"
                  : "Production layout preview · demonstration data"
                : "Your practice, with the questions behind it."}
            </p>
          </div>
          <button
            type="button"
            className="pp-text-action"
            onClick={() => setDark((value) => !value)}
          >
            {dark ? "Light theme" : "Dark theme"}
          </button>
          <label className="pp-demo-state">
            Demo state
            <select
              aria-label="Demonstration state"
              value={state}
              onChange={(event) => setState(event.target.value as typeof state)}
            >
              <option value="populated">Populated</option>
              <option value="empty">Empty</option>
              <option value="sparse">Small sample</option>
              <option value="partial">Partial sources</option>
              <option value="loading">Loading</option>
              <option value="error">Error</option>
              <option value="checking">Checking</option>
              <option value="stale">Refresh failed</option>
              <option value="withheld">Withheld RC outcomes</option>
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </label>
        </header>
        {production && (
          <nav className="pp-preview-sections" aria-label="Progress sections">
            {(["overview", "history", "types"] as const).map((section) => (
              <Link
                key={section}
                aria-current={section === view ? "page" : undefined}
                to={`?production=1&source=${actual ? "actual" : "demo"}&view=${section}&window=${window}&theme=${dark ? "dark" : "light"}`}
              >
                {section === "types"
                  ? "Question types"
                  : section === "overview"
                    ? "Progress"
                    : "History"}
              </Link>
            ))}
          </nav>
        )}
        <ProgressPrototype
          reviewAccess={{
            actorId: "00000000-0000-4000-8000-000000000002",
            ownerId: "00000000-0000-4000-8000-000000000002",
            resolved: true,
            analytics: true,
          }}
          answers={data.answers}
          coverage={data.coverage}
          asOf={asOf}
          demo
          production={production}
          view={view}
          window={window}
          onWindowChange={setWindow}
          checkedAt={Date.parse(asOf)}
          fetching={state === "checking"}
          refreshError={
            state === "stale"
              ? "We could not refresh your saved answers."
              : null
          }
          onRefresh={demoRefresh}
          loading={state === "loading"}
          error={
            state === "error"
              ? "Demonstration: saved answer sources could not be loaded."
              : null
          }
          onRetry={() => setState("populated")}
        />
      </main>
    </div>
  );
}

if (import.meta.env.DEV)
  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <Preview />
    </BrowserRouter>,
  );
else
  document.getElementById("root")!.textContent =
    "Development preview unavailable.";
