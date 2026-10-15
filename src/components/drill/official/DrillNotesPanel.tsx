import * as React from "react";
import { ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveDrillQid,
  subscribeActiveDrillQid,
} from "@/lib/drillNotepadBus";
import { readDrillNotes, writeDrillNotes } from "@/lib/drillNotesStorage";
import { questionBank } from "@/lib/questionLoader";
import DrillExplanationTab, {
  type DrillExplanationContext,
} from "@/components/drill/official/DrillExplanationTab";

/** Tabs available in the docked drill drawer. This is the runner's only panel:
 *  the dark Explanation and Menu sheets it replaced are gone. */
export type DrawerTab = "details" | "explanation" | "notes";

/** Question metadata rendered by the Details tab. Mirrors the LRQuestion fields
 *  we already have on the active question — no new content authoring. */
export interface DrillDetailsMeta {
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  reasoningType?: string[];
  questionFeatures?: string[];
  difficulty: number;
}

/** Find Similar, migrated here from the retired slide-out question menu. */
export interface DrillSimilarContext {
  qid?: string | null;
  qtype?: string | null;
  /** Omit to hide Find Similar entirely rather than show a dead row. */
  onJumpToQuestion?: (qid: string) => void;
}

interface Props {
  onClose?: () => void;
  /** Active question metadata for the Details tab. */
  meta?: DrillDetailsMeta | null;
  /** Controlled active tab. Falls back to internal state when omitted. */
  activeTab?: DrawerTab;
  onTabChange?: (tab: DrawerTab) => void;
  /** Explanation tab content. Omit to hide the tab (non-LR surfaces). */
  explanation?: DrillExplanationContext | null;
  /** Find Similar, rendered at the foot of Details. */
  similar?: DrillSimilarContext | null;
}

/**
 * Docked, premium per-question drawer for the Smart Drill runner. Slides in
 * from the right (the frame handles the push/width animation). Hosts three
 * tabs, in the order a student wants them: Details (read-only metadata plus
 * Find Similar) leads, because what this question IS is the first thing anyone
 * opening the drawer wants; then Explanation (the question-level breakdown and
 * style selector); then Notes (per-question, auto-saved to localStorage via the
 * drillNotepad bus), which is a writing surface you go to deliberately.
 *
 * This is the runner's only panel. Per-choice explanation content deliberately
 * does NOT live here — it renders inline under each answer choice.
 */
export default function DrillNotesPanel({
  onClose,
  meta,
  activeTab,
  onTabChange,
  explanation,
  similar,
}: Props) {
  const [internalTab, setInternalTab] = React.useState<DrawerTab>("details");
  const requestedTab = activeTab ?? internalTab;
  // The Explanation tab only exists on surfaces that supply its content. Fall
  // back to Details, the tab that is always available and always relevant.
  const tab: DrawerTab =
    requestedTab === "explanation" && !explanation ? "details" : requestedTab;
  const selectTab = (next: DrawerTab) => {
    if (onTabChange) onTabChange(next);
    else setInternalTab(next);
  };

  const tabs: { key: DrawerTab; label: string }[] = [
    { key: "details", label: "Details" },
    ...(explanation ? [{ key: "explanation" as const, label: "Explanation" }] : []),
    { key: "notes", label: "Notes" },
  ];

  return (
    <div
      role="dialog"
      aria-label="Question drawer"
      className="h-full w-[380px] max-w-[100vw] bg-white border-l border-slate-200 shadow-[-8px_0_24px_rgba(15,23,42,0.06)] flex flex-col"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {/* Header + close */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div role="tablist" aria-label="Drawer sections" className="flex items-center gap-5">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(t.key)}
                className={cn(
                  "relative pb-1.5 text-[15px] font-semibold transition-colors",
                  active ? "text-slate-900" : "text-slate-400 hover:text-slate-600",
                )}
              >
                {t.label}
                {active && (
                  <span aria-hidden className="absolute -bottom-0.5 left-0 h-[3px] w-7 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Close drawer"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition-colors -mr-1"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {tab === "details" && <DetailsTab meta={meta} similar={similar} />}
      {tab === "explanation" && explanation && <DrillExplanationTab {...explanation} />}
      {tab === "notes" && <NotesTab />}
    </div>
  );
}

// ─── Notes tab ─────────────────────────────────────────────────────────────

function NotesTab() {
  const [qid, setQid] = React.useState<string | null>(() => getActiveDrillQid());
  const [value, setValue] = React.useState("");
  const [saved, setSaved] = React.useState(true);

  // Follow the active question.
  React.useEffect(() => subscribeActiveDrillQid(setQid), []);

  // Load this question's notes when the qid changes.
  React.useEffect(() => {
    setValue(readDrillNotes(qid));
    setSaved(true);
  }, [qid]);

  const handleChange = (next: string) => {
    setValue(next);
    setSaved(false);
  };

  // Persist (debounced) after typing settles, then flip the status to "Saved".
  React.useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      writeDrillNotes(qid, value);
      setSaved(true);
    }, 400);
    return () => clearTimeout(t);
  }, [value, qid, saved]);

  return (
    <>
      {/* Helper copy */}
      <p className="px-5 pb-3 text-[13px] leading-relaxed text-slate-500 italic">
        Use this space to jot down any thoughts for this question. Your notes will be
        saved and visible the next time you review this question.
      </p>

      {/* Editor */}
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Notes for this question…"
        className={cn(
          "flex-1 w-full resize-none px-5 py-3 border-t border-slate-100",
          "text-slate-900 placeholder:text-slate-400 bg-white leading-relaxed",
          "focus:outline-none",
        )}
        style={{ fontSize: "15px" }}
      />

      {/* Auto-save status */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[12px] text-slate-400">
          {saved ? "Saved" : "Saving…"}
        </span>
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            saved ? "bg-emerald-400" : "bg-amber-400",
          )}
        />
      </div>
    </>
  );
}

// ─── Details tab ───────────────────────────────────────────────────────────

function DetailsTab({
  meta,
  similar,
}: {
  meta?: DrillDetailsMeta | null;
  similar?: DrillSimilarContext | null;
}) {
  if (!meta) {
    return (
      <p className="flex-1 px-5 py-6 text-[13px] text-slate-400 border-t border-slate-100">
        Question details are unavailable.
      </p>
    );
  }

  const difficulty = Math.max(0, Math.min(5, Math.round(meta.difficulty || 0)));

  return (
    <div className="flex-1 overflow-y-auto border-t border-slate-100 px-5 py-4 flex flex-col gap-5">
      {/* Identity grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="Practice test" value={`PT ${meta.pt}`} />
        <Field label="Section" value={String(meta.section)} />
        <Field label="Question" value={String(meta.qnum)} />
        <div>
          <FieldLabel>Difficulty</FieldLabel>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[14px] font-semibold text-slate-900">{difficulty} / 5</span>
            <span aria-hidden className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    n <= difficulty ? "bg-amber-400" : "bg-slate-200",
                  )}
                />
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* Question type */}
      <Section label="Question type">
        <Pill className="bg-amber-100 text-amber-800">{meta.qtype || "—"}</Pill>
      </Section>

      {/* Reasoning type */}
      {meta.reasoningType && meta.reasoningType.length > 0 && (
        <Section label="Reasoning type">
          <div className="flex flex-wrap gap-1.5">
            {meta.reasoningType.map((r) => (
              <Pill key={r} className="bg-violet-100 text-violet-800">{r}</Pill>
            ))}
          </div>
        </Section>
      )}

      {/* Question features */}
      {meta.questionFeatures && meta.questionFeatures.length > 0 && (
        <Section label="Question features">
          <div className="flex flex-wrap gap-1.5">
            {meta.questionFeatures.map((f) => (
              <Pill key={f} className="bg-slate-100 text-slate-600">{f}</Pill>
            ))}
          </div>
        </Section>
      )}

      {similar?.onJumpToQuestion && <FindSimilar {...similar} />}
    </div>
  );
}

// ─── Find Similar ──────────────────────────────────────────────────────────

/**
 * Other questions of the same type, drawn from the loaded bank so every row
 * goes somewhere real. Collapsed by default — Details is read first for the
 * question you are on, not for the next one.
 */
function FindSimilar({ qid, qtype, onJumpToQuestion }: DrillSimilarContext) {
  const [open, setOpen] = React.useState(false);

  const matches = React.useMemo(() => {
    if (!open || !qtype) return [];
    try {
      return questionBank
        .getAllQuestions()
        .filter((q) => q.qtype === qtype && q.qid !== qid)
        .slice(0, 25);
    } catch {
      return [];
    }
  }, [open, qtype, qid]);

  return (
    <Section label="Find similar">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded px-1 py-1.5 -mx-1 text-left text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Other {qtype || "similar"} questions
        <ChevronRight
          aria-hidden
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="mt-1">
          {matches.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-slate-400">
              No other questions of this type are loaded.
            </p>
          ) : (
            matches.map((q) => (
              <button
                key={q.qid}
                type="button"
                onClick={() => onJumpToQuestion?.(q.qid)}
                className="flex w-full items-center justify-between border-b border-slate-100 px-1 py-2 text-left text-[13px] text-slate-700 transition-colors last:border-0 hover:bg-slate-50"
              >
                <span className="tabular-nums">
                  PT{q.pt} · S{q.section} · Q{q.qnum}
                </span>
                <ChevronRight aria-hidden className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ))
          )}
        </div>
      )}
    </Section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wide text-slate-400">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-0.5 text-[14px] font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded px-2.5 py-1 text-[12px] font-medium", className)}>
      {children}
    </span>
  );
}
