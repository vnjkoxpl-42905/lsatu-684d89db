import type { ComponentProps } from "react";
import type { ItemFormat } from "../api/types";
import type { PaperDiagramChoice } from "../worlds/switchyard/diagramChoices";
import { AnswerPanel } from "./AnswerPanel";
import { PaperDiagramPanel } from "./PaperDiagramPanel";

/**
 * Format-polymorphic right-column renderer. Negation Station uses the
 * `free-text` renderer (AnswerPanel). `mcq` and `variation` are stubbed for
 * later Activities so the player itself never needs to change to add a format.
 */
interface ItemPromptProps extends ComponentProps<typeof AnswerPanel> {
  format: ItemFormat;
  paperChoices?: PaperDiagramChoice[];
  diagramSeconds?: number;
  paperDeadline?: string;
  phaseLabel?: string;
  paperReady?: boolean;
  onPaperReady?: () => void;
}

export function ItemPrompt({ format, paperChoices, ...answerProps }: ItemPromptProps) {
  if (paperChoices?.length) {
    return <PaperDiagramPanel {...answerProps} choices={paperChoices} />;
  }

  switch (format) {
    case "free-text":
      return <AnswerPanel {...answerProps} />;
    case "mcq":
    case "variation":
    default:
      return (
        <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-border bg-card p-9 text-sm text-muted-foreground">
          This item format is coming soon.
        </div>
      );
  }
}
