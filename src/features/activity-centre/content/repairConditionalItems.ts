import bank from "./conditional-rephrase.json";
import type { ActivityItem } from "../api/types";

/** Presentation correction for the four known defective seed items. Never
 * writes assignment snapshots or applies an order-only patch to custom items. */
export function repairConditionalItem(item: ActivityItem): ActivityItem {
  const prefixes: Record<number, string> = {
    47: "A juror may review the exhibit log",
    48: "The observatory grants dark-sky certification",
    57: "The only expeditions cleared for the ice shelf",
    62: "A confirmed match in the pollen record",
  };
  const prefix = prefixes[item.order];
  if (!prefix || !item.prompt.startsWith(prefix)) return item;
  const corrected = bank.items.find((candidate) => candidate.order === item.order)!;
  return { ...item, prompt: corrected.prompt, credited_answers: corrected.credited_answers, explanation: corrected.explanation };
}
