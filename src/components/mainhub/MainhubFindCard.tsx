import * as React from "react";
import { ArrowRight, Shuffle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank } from "@/lib/questionLoader";

interface MainhubFindCardProps {
  onOpen: (qid: string) => void;
  onClose: () => void;
}

const labelClass =
  "text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium";

export default function MainhubFindCard({ onOpen, onClose }: MainhubFindCardProps) {
  const { isLoading, error } = useQuestionBank();

  const [selectedPt, setSelectedPt] = React.useState<string>("");
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [selectedQnum, setSelectedQnum] = React.useState<string>("");
  const [retryTick, setRetryTick] = React.useState(0);
  const [retrying, setRetrying] = React.useState(false);

  const grouped = React.useMemo(() => {
    void retryTick; // ensure recompute after a manual retry
    const map = new Map<number, Map<number, number[]>>();
    if (isLoading) return map;
    for (const q of questionBank.getAllQuestions()) {
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
    return map;
    // retryTick triggers a recompute after a manual retry.
  }, [isLoading, retryTick]);

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
    setSelectedPt(v);
    setSelectedSection("");
    setSelectedQnum("");
  };

  const handleSectionChange = (v: string) => {
    setSelectedSection(v);
    setSelectedQnum("");
  };

  const buildQid = (pt: number, section: number, qnum: number) =>
    `PT${pt}-S${section}-Q${qnum}`;

  const resolvedQid = React.useMemo(() => {
    if (!selectedPt || !selectedSection || !selectedQnum) return null;
    return buildQid(
      Number(selectedPt),
      Number(selectedSection),
      Number(selectedQnum),
    );
  }, [selectedPt, selectedSection, selectedQnum]);

  const canOpen = !!resolvedQid && !isLoading;
  const canRandom = !!selectedPt && !isLoading;

  const handleOpen = () => {
    if (!resolvedQid) return;
    onOpen(resolvedQid);
    onClose();
  };

  const handleRandom = () => {
    if (!selectedPt) return;
    const pt = Number(selectedPt);
    const sectionMap = grouped.get(pt);
    if (!sectionMap) return;
    let pool: Array<{ pt: number; section: number; qnum: number }> = [];
    if (selectedSection) {
      const section = Number(selectedSection);
      const qnums = sectionMap.get(section) ?? [];
      pool = qnums.map((qnum) => ({ pt, section, qnum }));
    } else {
      for (const [section, qnums] of sectionMap.entries()) {
        for (const qnum of qnums) pool.push({ pt, section, qnum });
      }
    }
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    onOpen(buildQid(pick.pt, pick.section, pick.qnum));
    onClose();
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await questionBank.load();
    } catch {
      /* swallow — UI already in error state */
    }
    setRetrying(false);
    setRetryTick((t) => t + 1);
  };

  const breadcrumb = React.useMemo(() => {
    if (!selectedPt) return "Find a specific question";
    const parts = [`PT ${selectedPt}`];
    if (selectedSection) parts.push(`Section ${selectedSection}`);
    if (selectedQnum) parts.push(`Q ${selectedQnum}`);
    return parts.join(" / ");
  }, [selectedPt, selectedSection, selectedQnum]);

  const showEmptyState = !isLoading && ptOptions.length === 0;

  if (showEmptyState) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="text-sm font-semibold text-foreground">
          No practice tests loaded yet
        </div>
        <p className="text-xs text-muted-foreground max-w-[280px]">
          {error
            ? "We hit an error fetching the question bank. Try again?"
            : "The question bank looks empty. Reload to fetch it."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={retrying}
          className="gap-2"
        >
          {retrying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Retry
        </Button>
      </div>
    );
  }

  const sectionPlaceholder = selectedPt ? "Section" : "Pick a test first";
  const qnumPlaceholder = selectedSection ? "Question" : "Pick a section first";

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === "Enter" && canOpen) {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={labelClass}>Find</span>
        <span className="text-xs text-foreground/80 truncate font-medium tracking-tight">
          {breadcrumb}
        </span>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <span className={labelClass}>Test</span>
          <Select
            value={selectedPt}
            onValueChange={handlePtChange}
            disabled={isLoading}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={isLoading ? "Loading…" : "Practice Test"} />
            </SelectTrigger>
            <SelectContent className="max-h-[260px]">
              {ptOptions.map((pt) => (
                <SelectItem key={pt} value={String(pt)}>
                  PT {pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <span className={labelClass}>Section</span>
          <Select
            value={selectedSection}
            onValueChange={handleSectionChange}
            disabled={isLoading || !selectedPt}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={sectionPlaceholder} />
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

        <div className="space-y-1">
          <span className={labelClass}>Question</span>
          <Select
            value={selectedQnum}
            onValueChange={setSelectedQnum}
            disabled={isLoading || !selectedSection}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={qnumPlaceholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[260px]">
              {qnumOptions.map((q) => (
                <SelectItem key={q} value={String(q)}>
                  Question {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pt-1">
        <Button
          size="sm"
          className="w-full"
          disabled={!canOpen}
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
        >
          Go to question
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={!canRandom}
          onClick={(e) => {
            e.stopPropagation();
            handleRandom();
          }}
        >
          <Shuffle className="w-3.5 h-3.5 mr-1" />
          Random question
        </Button>
      </div>
    </div>
  );
}
