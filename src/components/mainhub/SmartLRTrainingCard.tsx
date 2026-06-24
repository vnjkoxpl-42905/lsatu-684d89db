import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Loader2, Play, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank } from "@/lib/questionLoader";
import type { TypeDrillConfig } from "@/types/drill";
import { cn } from "@/lib/utils";
import {
  filterSmartLRQuestionMatches,
  type SmartLRQuestionMatch,
} from "@/components/mainhub/smartLRQuestionSearch";

const AUTO = "auto";

type Option = { value: string; label: string; triggerLabel?: string };

function SelectorDropdown({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : undefined}
          className={cn(
            "flex h-12 min-w-0 flex-col justify-center rounded-2xl border border-slate-200 bg-white/70 px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors",
            disabled ? "cursor-default opacity-60" : "cursor-pointer hover:border-slate-300",
          )}
        >
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
            {label}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-1 text-sm font-semibold text-slate-700">
            <span className="truncate">{current?.triggerLabel ?? current?.label ?? "Auto"}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[220px] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
      >
        <ScrollArea className="h-[280px] pr-1">
          <div className="flex flex-col">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                    selected
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected && <Check className="h-4 w-4 text-slate-500" aria-hidden />}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default function SmartLRTrainingCard() {
  const navigate = useNavigate();
  const { manifest, isLoading } = useQuestionBank();

  const [pt, setPt] = useState<string>(AUTO);
  const [section, setSection] = useState<string>(AUTO);
  const [qnum, setQnum] = useState<string>(AUTO);
  const [searchQuery, setSearchQuery] = useState("");

  const allQuestions = useMemo(
    () => (manifest ? questionBank.getAllQuestions() : []),
    [manifest],
  );

  const pts = useMemo(
    () =>
      Array.from(new Set(allQuestions.map((q) => q.pt))).sort((a, b) => b - a),
    [allQuestions],
  );

  const sections = useMemo(() => {
    if (pt === AUTO) return [] as number[];
    return Array.from(
      new Set(
        allQuestions
          .filter((q) => String(q.pt) === pt)
          .map((q) => q.section),
      ),
    ).sort((a, b) => a - b);
  }, [allQuestions, pt]);

  const qnums = useMemo(() => {
    if (pt === AUTO || section === AUTO) return [] as number[];
    return Array.from(
      new Set(
        allQuestions
          .filter((q) => String(q.pt) === pt && String(q.section) === section)
          .map((q) => q.qnum),
      ),
    ).sort((a, b) => a - b);
  }, [allQuestions, pt, section]);

  const searchMatches = useMemo(
    () =>
      filterSmartLRQuestionMatches(
        allQuestions,
        searchQuery,
        {
          pt: pt !== AUTO ? Number(pt) : undefined,
          section: section !== AUTO ? Number(section) : undefined,
          qnum: qnum !== AUTO ? Number(qnum) : undefined,
        },
        6,
      ),
    [allQuestions, pt, section, qnum, searchQuery],
  );

  const exactSelectedQuestion = useMemo(() => {
    if (pt === AUTO || section === AUTO || qnum === AUTO) return null;
    return (
      allQuestions.find(
        (q) =>
          String(q.pt) === pt &&
          String(q.section) === section &&
          String(q.qnum) === qnum,
      ) ?? null
    );
  }, [allQuestions, pt, section, qnum]);

  const [pendingNav, setPendingNav] = useState<null | (() => void)>(null);

  // Wait for question bank to be ready before navigating to /drill, so we
  // don't flash the "Preparing your drill…" gate on the next route.
  useEffect(() => {
    if (pendingNav && !isLoading) {
      pendingNav();
      setPendingNav(null);
    }
  }, [pendingNav, isLoading]);

  const openQuestion = (qid: string) => {
    navigate(`/drill?mode=type-drill&qids=${encodeURIComponent(qid)}&present=smart`);
  };

  const launchTargetQuestion = searchMatches[0]?.question ?? exactSelectedQuestion;

  const startSmartDrill = () => {
    const run = () => {
      if (launchTargetQuestion) {
        openQuestion(launchTargetQuestion.qid);
        return;
      }

      if (pt !== AUTO) {
        const config: TypeDrillConfig = {
          qtypes: [],
          difficulties: [],
          pts: [Number(pt)],
          sections: section !== AUTO ? [Number(section)] : [],
          count: 20,
        };
        navigate("/drill", { state: { mode: "type-drill", config, present: "smart" } });
        return;
      }

      navigate("/drill", { state: { mode: "adaptive" } });
    };

    if (isLoading) {
      setPendingNav(() => run);
      return;
    }
    run();
  };

  const isPreparing = pendingNav !== null;

  const ptOptions: Option[] = [
    { value: AUTO, label: "Auto" },
    ...pts.map((n) => ({ value: String(n), label: `PrepTest ${n}`, triggerLabel: `PT ${n}` })),
  ];
  const sectionOptions: Option[] = [
    { value: AUTO, label: "Auto" },
    ...sections.map((n) => ({ value: String(n), label: `Section ${n}`, triggerLabel: `S${n}` })),
  ];
  const qnumOptions: Option[] = [
    { value: AUTO, label: "Auto" },
    ...qnums.map((n) => ({ value: String(n), label: `Question ${n}`, triggerLabel: `Q${n}` })),
  ];

  const queryIsActive = searchQuery.trim().length > 0;
  const showNoMatches = queryIsActive && !isLoading && searchMatches.length === 0;
  const actionLabel = launchTargetQuestion
    ? `Open PT ${launchTargetQuestion.pt} S${launchTargetQuestion.section} Q${launchTargetQuestion.qnum}`
    : "Start Smart LR Drill";

  return (
    <section
      aria-label="Smart LR Training"
      className="group relative w-full overflow-hidden rounded-[32px] border border-slate-200/50 bg-[#fbfcff] px-5 py-6 text-slate-900 shadow-[0_15px_40px_rgba(15,23,42,0.04)]"
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          startSmartDrill();
        }
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/80"
      />

      <div className="relative mb-4 flex items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Smart LR
          </span>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Find a question
          </h2>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-2xl font-bold text-slate-400">
          0
        </div>
      </div>

      <div className="relative mb-4 grid grid-cols-3 gap-2.5" aria-label="Training selectors">
        <SelectorDropdown
          label="Practice Test"
          value={pt}
          options={ptOptions}
          disabled={isLoading || pts.length === 0}
          onChange={(v) => {
            setPt(v);
            setSection(AUTO);
            setQnum(AUTO);
          }}
        />
        <SelectorDropdown
          label="Section"
          value={section}
          options={sectionOptions}
          disabled={pt === AUTO}
          onChange={(v) => {
            setSection(v);
            setQnum(AUTO);
          }}
        />
        <SelectorDropdown
          label="Question"
          value={qnum}
          options={qnumOptions}
          disabled={section === AUTO}
          onChange={setQnum}
        />
      </div>

      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          disabled={isLoading}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search question text..."
          aria-label="Search question text"
          className="h-14 w-full rounded-2xl border border-sky-300 bg-white/80 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:opacity-60"
        />
      </div>

      <div className="relative mb-4 min-h-[86px]" aria-live="polite">
        {searchMatches.length > 0 && (
          <div className="space-y-2">
            {searchMatches.map((match) => (
              <QuestionResultRow
                key={match.question.qid}
                match={match}
                onOpen={() => openQuestion(match.question.qid)}
              />
            ))}
          </div>
        )}

        {!queryIsActive && exactSelectedQuestion && (
          <QuestionResultRow
            match={{
              question: exactSelectedQuestion,
              snippet: {
                before: exactSelectedQuestion.questionStem,
                match: "",
                after: "",
              },
            }}
            selected
            onOpen={() => openQuestion(exactSelectedQuestion.qid)}
          />
        )}

        {showNoMatches && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-medium text-slate-500">
            No matching questions
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={startSmartDrill}
        disabled={isPreparing}
        className="relative h-12 min-h-12 w-full rounded-2xl border border-slate-950 bg-slate-950 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition-transform duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-90"
        aria-label={actionLabel}
      >
        {isPreparing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Preparing drill...
          </>
        ) : (
          <>
            {launchTargetQuestion ? (
              <ArrowRight className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {actionLabel}
          </>
        )}
      </Button>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent"
      />
    </section>
  );
}

function QuestionResultRow({
  match,
  selected = false,
  onOpen,
}: {
  match: SmartLRQuestionMatch;
  selected?: boolean;
  onOpen: () => void;
}) {
  const { question, snippet } = match;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block w-full rounded-2xl border bg-white/80 px-4 py-3 text-left transition-colors",
        selected ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200 hover:border-slate-300",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800">
        <span>
          PT {question.pt} · S{question.section} · Q{question.qnum}
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          LR
        </span>
      </div>
      <p className="line-clamp-2 text-sm leading-5 text-slate-600">
        {snippet.before}
        {snippet.match ? (
          <mark className="rounded bg-amber-100 px-0.5 text-amber-800">
            {snippet.match}
          </mark>
        ) : null}
        {snippet.after}
      </p>
    </button>
  );
}
