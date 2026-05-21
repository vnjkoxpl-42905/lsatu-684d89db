import { useMemo, useState } from "react";
import { ChevronDown, Flame, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank } from "@/lib/questionLoader";
import type { TypeDrillConfig } from "@/types/drill";

const AUTO = "auto";

export default function SmartLRTrainingCard() {
  const navigate = useNavigate();
  const { manifest, isLoading } = useQuestionBank();

  const [pt, setPt] = useState<string>(AUTO);
  const [section, setSection] = useState<string>(AUTO);
  const [qnum, setQnum] = useState<string>(AUTO);

  const allQuestions = useMemo(
    () => (manifest ? questionBank.getAllQuestions() : []),
    [manifest],
  );

  const pts = useMemo(
    () =>
      Array.from(new Set(allQuestions.map((q) => q.pt))).sort((a, b) => a - b),
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

  const startSmartDrill = () => {
    // Specific question selected → deep link by qid
    if (pt !== AUTO && section !== AUTO && qnum !== AUTO) {
      const q = allQuestions.find(
        (x) =>
          String(x.pt) === pt &&
          String(x.section) === section &&
          String(x.qnum) === qnum,
      );
      if (q) {
        navigate(`/drill?mode=type-drill&qids=${encodeURIComponent(q.qid)}`);
        return;
      }
    }

    // Filtered drill (PT, or PT+Section)
    if (pt !== AUTO) {
      const config: TypeDrillConfig = {
        qtypes: [],
        difficulties: [],
        pts: [Number(pt)],
        sections: section !== AUTO ? [Number(section)] : [],
        count: 20,
      };
      navigate("/drill", { state: { mode: "type-drill", config } });
      return;
    }

    // Pure adaptive
    navigate("/drill", { state: { mode: "adaptive" } });
  };

  const selectors: Array<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
    disabled: boolean;
  }> = [
    {
      label: "Practice Test",
      value: pt,
      onChange: (v) => {
        setPt(v);
        setSection(AUTO);
        setQnum(AUTO);
      },
      options: [
        { value: AUTO, label: "Auto" },
        ...pts.map((n) => ({ value: String(n), label: `PT ${n}` })),
      ],
      disabled: isLoading || pts.length === 0,
    },
    {
      label: "Section",
      value: section,
      onChange: (v) => {
        setSection(v);
        setQnum(AUTO);
      },
      options: [
        { value: AUTO, label: "Auto" },
        ...sections.map((n) => ({ value: String(n), label: `Section ${n}` })),
      ],
      disabled: pt === AUTO,
    },
    {
      label: "Question",
      value: qnum,
      onChange: setQnum,
      options: [
        { value: AUTO, label: "Auto" },
        ...qnums.map((n) => ({ value: String(n), label: `Q${n}` })),
      ],
      disabled: section === AUTO,
    },
  ];

  return (
    <section
      aria-label="Smart LR Training"
      className="group relative w-full overflow-hidden rounded-[32px] border border-slate-200/50 bg-[#fbfcff] px-6 py-8 text-slate-900 shadow-[0_15px_40px_rgba(15,23,42,0.04)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-white/80"
      />

      <div className="relative mb-6 flex flex-col items-center">
        <div
          className="relative h-[160px] w-[220px] flex items-center justify-center"
          role="img"
          aria-label="Smart LR Score 0"
        >
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 160" aria-hidden>
            <path
              d="M 35 130 A 65 65 0 1 1 165 130"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
              strokeLinecap="round"
              className="opacity-70"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pt-2">
            <span className="text-[76px] font-bold tracking-tight text-slate-400/90 leading-none">
              0
            </span>
          </div>
        </div>

        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400/90 mt-1">
          Smart LR Score
        </span>

        <div className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500/90">
          <Flame className="h-4 w-4 text-orange-500 fill-orange-500/10" aria-hidden />
          <span>Streak -- days</span>
        </div>
      </div>

      <div className="relative mb-4 grid grid-cols-3 gap-2.5" aria-label="Training selectors">
        {selectors.map((s) => (
          <label
            key={s.label}
            className={`relative flex h-12 min-w-0 flex-col justify-center rounded-2xl border border-slate-200 bg-white/70 px-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors ${
              s.disabled ? "opacity-60" : "hover:border-slate-300"
            }`}
          >
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
              {s.label}
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-1 text-sm font-semibold text-slate-600">
              <span className="truncate">
                {s.options.find((o) => o.value === s.value)?.label ?? "Auto"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            </span>
            <select
              value={s.value}
              disabled={s.disabled}
              onChange={(e) => s.onChange(e.target.value)}
              aria-label={s.label}
              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <Button
        type="button"
        onClick={startSmartDrill}
        className="relative h-12 min-h-12 w-full rounded-2xl border border-slate-950 bg-slate-950 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition-transform duration-200 hover:bg-slate-800 active:scale-[0.98]"
      >
        <Play className="h-4 w-4" aria-hidden />
        Start Smart LR Drill
      </Button>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-slate-300/40 to-transparent"
      />
    </section>
  );
}
