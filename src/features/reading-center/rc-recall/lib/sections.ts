/**
 * Sections a student can sit in RC Recall.
 *
 * Unlike the drill section builder, a section is eligible here when it has
 * exactly four passages at Positions 1-4 with text that can be segmented. Having
 * no drillable questions does not exclude it: this activity never asks one.
 */
import type { RcIndexPassage, RcPassage } from "@/features/rc/lib/rcTypes";
import { isSegmentable, segmentPassage, type SegmentedPassage } from "./segment";

export type RecallIndexPassage = RcIndexPassage & { preptest: number };

export interface RecallSection {
  preptest: number;
  section: number;
  /** Passage ids in published order, Position 1-4. */
  passageIds: number[];
}

export const RECALL_SECTION_PASSAGE_COUNT = 4;

/**
 * The index does not carry passage text, so eligibility from the index alone
 * cannot see empty bodies. `textOk` lets a caller that has loaded a PrepTest
 * mark passages whose text cannot be segmented; the load-time check in
 * `verifyLoadedSection` is the guard that always runs.
 */
export function buildRecallSections(
  passages: RecallIndexPassage[],
  textOk: (passageId: number) => boolean = () => true,
): RecallSection[] {
  const groups = new Map<string, RecallIndexPassage[]>();
  for (const p of passages) {
    const key = `${p.preptest}:${p.section}`;
    const list = groups.get(key);
    if (list) list.push(p); else groups.set(key, [p]);
  }
  const sections: RecallSection[] = [];
  for (const group of groups.values()) {
    if (group.length !== RECALL_SECTION_PASSAGE_COUNT) continue;
    const ordered = [...group].sort((a, b) => a.setNumber - b.setNumber);
    if (!ordered.every((p, i) => p.setNumber === i + 1)) continue;
    // The index carries the opening words of each passage; empty means no text.
    if (!ordered.every((p) => p.firstWords?.trim() && textOk(p.passageId))) continue;
    sections.push({ preptest: ordered[0].preptest, section: ordered[0].section, passageIds: ordered.map((p) => p.passageId) });
  }
  return sections.sort((a, b) => a.preptest - b.preptest || a.section - b.section);
}

export function sectionLabel(s: Pick<RecallSection, "preptest" | "section">): string {
  return `PT${s.preptest} · Section ${s.section}`;
}

export class SectionIntegrityError extends Error {}

/**
 * Check that what loaded is exactly the requested section, in order. A missing,
 * reordered or empty passage fails visibly; it is never dropped to shorten the
 * section.
 */
export function verifyLoadedSection(section: RecallSection, loaded: RcPassage[]): { passages: RcPassage[]; segmented: SegmentedPassage[] } {
  if (loaded.length !== section.passageIds.length) {
    throw new SectionIntegrityError(`Expected ${section.passageIds.length} passages but loaded ${loaded.length}.`);
  }
  section.passageIds.forEach((id, i) => {
    if (loaded[i]?.passageId !== id) throw new SectionIntegrityError(`Passage ${i + 1} did not match the section.`);
    if (loaded[i].setNumber !== i + 1) throw new SectionIntegrityError(`Passage ${i + 1} is out of order.`);
    if (!isSegmentable(loaded[i].text)) throw new SectionIntegrityError(`Passage ${i + 1} has no text to recall.`);
  });
  return { passages: loaded, segmented: loaded.map((p) => segmentPassage(p.text)) };
}
