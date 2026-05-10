import * as React from "react";
import { ArrowRight } from "lucide-react";
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

interface FoyerFindCardProps {
  onOpen: (qid: string) => void;
  onClose: () => void;
}

export default function FoyerFindCard({ onOpen, onClose }: FoyerFindCardProps) {
  const { isLoading } = useQuestionBank();

  const [selectedPt, setSelectedPt] = React.useState<string>("");
  const [selectedSection, setSelectedSection] = React.useState<string>("");
  const [selectedQnum, setSelectedQnum] = React.useState<string>("");

  const grouped = React.useMemo(() => {
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
    setSelectedPt(v);
    setSelectedSection("");
    setSelectedQnum("");
  };

  const handleSectionChange = (v: string) => {
    setSelectedSection(v);
    setSelectedQnum("");
  };

  const resolvedQid = React.useMemo(() => {
    if (!selectedPt || !selectedSection || !selectedQnum) return null;
    const match = questionBank
      .getAllQuestions()
      .find(
        (q) =>
          q.pt === Number(selectedPt) &&
          q.section === Number(selectedSection) &&
          q.qnum === Number(selectedQnum),
      );
    return match?.qid ?? null;
  }, [selectedPt, selectedSection, selectedQnum]);

  const canOpen = !!resolvedQid && !isLoading;

  const handleOpen = () => {
    if (!resolvedQid) return;
    onOpen(resolvedQid);
    onClose();
  };

  return (
    <div className="space-y-2">
      <Select value={selectedPt} onValueChange={handlePtChange} disabled={isLoading}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={isLoading ? "Loading…" : "Test"} />
        </SelectTrigger>
        <SelectContent>
          {ptOptions.map((pt) => (
            <SelectItem key={pt} value={String(pt)}>
              PT {pt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedSection}
        onValueChange={handleSectionChange}
        disabled={isLoading || !selectedPt}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Section" />
        </SelectTrigger>
        <SelectContent>
          {sectionOptions.map((s) => (
            <SelectItem key={s} value={String(s)}>
              Section {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedQnum}
        onValueChange={setSelectedQnum}
        disabled={isLoading || !selectedSection}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Question" />
        </SelectTrigger>
        <SelectContent>
          {qnumOptions.map((q) => (
            <SelectItem key={q} value={String(q)}>
              Question {q}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        className="w-full mt-1"
        disabled={!canOpen}
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
      >
        Open
        <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    </div>
  );
}
