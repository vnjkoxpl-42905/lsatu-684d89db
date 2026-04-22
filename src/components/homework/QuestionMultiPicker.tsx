import * as React from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank } from "@/lib/questionLoader";
import { cn } from "@/lib/utils";

/**
 * Multi-select question picker adapted from FoyerFindCard.
 * Test and Section remain single-select. Question tier is an "Add" action
 * that pushes the picked qid into the parent-held array. Selection order is
 * preserved. Each chip has a per-chip remove button.
 *
 * Implementation note: we use native <select> here deliberately. Radix
 * Select previously produced silent click-through failures on some
 * browser/PWA combinations where the trigger never reflected the picked
 * value. Native selects bypass portals, z-index, touch-event, and
 * controlled-component-race concerns entirely. Cosmetic polish traded for
 * bulletproof reliability. [QMP] logs retained to triage any future
 * regression.
 */

interface QuestionMultiPickerProps {
  value: string[];
  onChange: (qids: string[]) => void;
  className?: string;
}

export default function QuestionMultiPicker({
  value,
  onChange,
  className,
}: QuestionMultiPickerProps) {
  const { isLoading } = useQuestionBank();

  const [selectedPt, setSelectedPt] = React.useState<string>("");
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [selectedQnum, setSelectedQnum] = React.useState<string>("");

  const grouped = React.useMemo(() => {
    const map = new Map<number, Map<number, number[]>>();
    if (isLoading) return map;
    let skipped = 0;
    for (const q of questionBank.getAllQuestions()) {
      const pt = Number(q.pt);
      const section = Number(q.section);
      const qnum = Number(q.qnum);
      if (!Number.isFinite(pt) || !Number.isFinite(section) || !Number.isFinite(qnum)) {
        skipped++;
        continue;
      }
      if (!map.has(pt)) map.set(pt, new Map());
      const sectionMap = map.get(pt)!;
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section)!.push(qnum);
    }
    for (const sectionMap of map.values()) {
      for (const qnums of sectionMap.values()) {
        qnums.sort((a, b) => a - b);
      }
    }
    if (skipped > 0) {
      console.warn("[QuestionMultiPicker] skipped malformed questions", { skipped });
    }
    console.debug("[QMP] grouped built", {
      isLoading,
      skipped,
      ptCount: map.size,
      firstPt: map.keys().next().value,
      firstPtSections:
        map.size > 0
          ? Array.from(map.get(map.keys().next().value as number)?.keys() ?? [])
          : [],
    });
    return map;
  }, [isLoading]);

  const ptOptions = React.useMemo(
    () => Array.from(grouped.keys()).sort((a, b) => a - b),
    [grouped],
  );

  const sectionOptions = React.useMemo(() => {
    if (!selectedPt) return [] as number[];
    const sectionMap = grouped.get(Number(selectedPt));
    if (!sectionMap) return [] as number[];
    return Array.from(sectionMap.keys()).sort((a, b) => a - b);
  }, [grouped, selectedPt]);

  const qnumOptions = React.useMemo(() => {
    if (!selectedPt || !selectedSection) return [] as number[];
    return grouped.get(Number(selectedPt))?.get(Number(selectedSection)) ?? [];
  }, [grouped, selectedPt, selectedSection]);

  const handlePtChange = (v: string) => {
    console.debug("[QMP] handlePtChange", { v, prev: selectedPt });
    setSelectedPt(v);
    setSelectedSection("");
    setSelectedQnum("");
  };

  const handleSectionChange = (v: string) => {
    console.debug("[QMP] handleSectionChange", {
      v,
      prev: selectedSection,
      selectedPt,
      sectionOptionsLen: sectionOptions.length,
    });
    setSelectedSection(v);
    setSelectedQnum("");
  };

  const handleQnumChange = (v: string) => {
    console.debug("[QMP] handleQnumChange", {
      v,
      prev: selectedQnum,
      selectedPt,
      selectedSection,
      qnumOptionsLen: qnumOptions.length,
    });
    setSelectedQnum(v);
  };

  const resolvedQid = React.useMemo(() => {
    if (!selectedPt || !selectedSection || !selectedQnum) return null;
    return `PT${selectedPt}-S${selectedSection}-Q${selectedQnum}`;
  }, [selectedPt, selectedSection, selectedQnum]);

  const alreadyAdded = !!resolvedQid && value.includes(resolvedQid);
  const canAdd = !!resolvedQid && !alreadyAdded && !isLoading;

  const handleAdd = () => {
    console.debug("[QMP] handleAdd", {
      resolvedQid,
      alreadyAdded,
      canAdd,
      valueLen: value.length,
    });
    if (!resolvedQid || alreadyAdded) return;
    onChange([...value, resolvedQid]);
    setSelectedQnum(""); // leave Test/Section sticky for fast next-pick
  };

  const handleRemove = (qid: string) => {
    onChange(value.filter((q) => q !== qid));
  };

  const labelClass =
    "text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium";

  const selectClass =
    "w-full h-9 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm px-3 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <span className={labelClass}>Test</span>
          <div className="relative">
            <select
              value={selectedPt}
              onChange={(e) => handlePtChange(e.target.value)}
              disabled={isLoading}
              className={selectClass}
              aria-label="Select a test"
            >
              <option value="" disabled>
                {isLoading ? "Loading questions..." : "Select a test"}
              </option>
              {ptOptions.map((pt) => (
                <option key={pt} value={String(pt)}>
                  PT {pt}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Section</span>
          <div className="relative">
            <select
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              disabled={isLoading || !selectedPt}
              className={selectClass}
              aria-label="Select a section"
            >
              <option value="" disabled>
                Select a section
              </option>
              {sectionOptions.map((s) => (
                <option key={s} value={String(s)}>
                  Section {s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Question</span>
          <div className="relative">
            <select
              value={selectedQnum}
              onChange={(e) => handleQnumChange(e.target.value)}
              disabled={isLoading || !selectedSection}
              className={selectClass}
              aria-label="Select a question"
            >
              <option value="" disabled>
                Select a question
              </option>
              {qnumOptions.map((q) => (
                <option key={q} value={String(q)}>
                  Question {q}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!canAdd}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add question
        </Button>
        {alreadyAdded && (
          <span className="text-xs text-muted-foreground">Already added.</span>
        )}
      </div>

      <div className="space-y-2">
        <span className={labelClass}>
          Selected {value.length > 0 ? `(${value.length})` : ""}
        </span>
        {value.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No questions selected yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {value.map((qid, idx) => (
              <li
                key={qid}
                className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5"
              >
                <span className="text-sm font-mono text-zinc-200">
                  <span className="text-zinc-500 mr-2">{idx + 1}.</span>
                  {qid}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(qid)}
                  className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors"
                  aria-label={`Remove ${qid}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
