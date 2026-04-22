import * as React from "react";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank } from "@/lib/questionLoader";
import { cn } from "@/lib/utils";

/**
 * Multi-select question picker adapted from FoyerFindCard.
 * Test and Section remain single-select. Question tier is an "Add" action
 * that pushes the picked qid into the parent-held array. Selection order is
 * preserved. Each chip has a per-chip remove button.
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
      if (
        typeof q.pt !== "number" ||
        typeof q.section !== "number" ||
        typeof q.qnum !== "number"
      ) {
        skipped++;
        continue;
      }
      if (!map.has(q.pt)) map.set(q.pt, new Map());
      const sectionMap = map.get(q.pt)!;
      if (!sectionMap.has(q.section)) sectionMap.set(q.section, []);
      sectionMap.get(q.section)!.push(q.qnum);
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

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <span className={labelClass}>Test</span>
          <Select
            value={selectedPt}
            onValueChange={handlePtChange}
            disabled={isLoading}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue
                placeholder={isLoading ? "Loading questions..." : "Select a test"}
              />
            </SelectTrigger>
            <SelectContent>
              {ptOptions.map((pt) => (
                <SelectItem key={pt} value={String(pt)}>
                  PT {pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Section</span>
          <Select
            key={selectedPt}
            value={selectedSection}
            onValueChange={handleSectionChange}
            disabled={isLoading || !selectedPt}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className={labelClass}>Question</span>
          <Select
            key={`${selectedPt}-${selectedSection}`}
            value={selectedQnum}
            onValueChange={handleQnumChange}
            disabled={isLoading || !selectedSection}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select a question" />
            </SelectTrigger>
            <SelectContent>
              {qnumOptions.map((q) => (
                <SelectItem key={q} value={String(q)}>
                  Question {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
