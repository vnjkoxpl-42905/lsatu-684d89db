/**
 * Sections a student can sit in RC Recall.
 *
 * Unlike the drill section builder, a section is eligible here when it has
 * exactly four passages at Positions 1-4 with text that can be segmented. Having
 * no drillable questions does not exclude it: this activity never asks one.
 */
import type { RcIndexPassage, RcPassage } from "@/features/rc/lib/rcTypes";
import { isSegmentable, segmentPassage, type SegmentedPassage, type SegmentationVersion } from "./segment";

export type RecallIndexPassage = RcIndexPassage & { preptest: number };

export interface RecallSection {
  preptest: number;
  section: number;
  /** Passage ids in published order, Position 1-4. */
  passageIds: number[];
  /** Published positions, retained when practising one passage from the section. */
  passagePositions?: number[];
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

export function sectionLabel(s: Pick<RecallSection, "preptest" | "section"> & { passage_ids?: number[]; passageIds?: number[] }): string {
  const ids = s.passage_ids ?? s.passageIds;
  return `PT${s.preptest} · Section ${s.section}${ids?.length === 1 ? " · One passage" : ""}`;
}

/** Select one published passage or all four without renumbering source content. */
export function selectRecallPractice(section: RecallSection, count: 1 | 4, position = 1): RecallSection {
  if (section.passageIds.length !== 4 || !Number.isInteger(position) || position < 1 || position > 4) {
    throw new SectionIntegrityError("Choose a complete section and a passage from 1 to 4.");
  }
  return { ...section, passageIds: count === 4 ? [...section.passageIds] : [section.passageIds[position - 1]],
    passagePositions: count === 4 ? [1, 2, 3, 4] : [position] };
}

/** Reconstruct the exact saved selection against the current published bank. */
export function restoreRecallPractice(section: RecallSection, ids: number[]): RecallSection {
  if (ids.length === 4 && ids.every((id, i) => section.passageIds[i] === id)) return selectRecallPractice(section, 4);
  if (ids.length === 1) {
    const position = section.passageIds.indexOf(ids[0]);
    if (position >= 0) return selectRecallPractice(section, 1, position + 1);
  }
  throw new SectionIntegrityError("The saved passages no longer match this section.");
}

export class SectionIntegrityError extends Error {}

/**
 * Check that what loaded is exactly the requested section, in order. A missing,
 * reordered or empty passage fails visibly; it is never dropped to shorten the
 * section.
 */
export function verifyLoadedSection(section: RecallSection, loaded: RcPassage[], version: SegmentationVersion = 1): { passages: RcPassage[]; segmented: SegmentedPassage[] } {
  if (![1, 4].includes(section.passageIds.length)) throw new SectionIntegrityError("Choose one passage or a complete four-passage section.");
  if (loaded.length !== section.passageIds.length) {
    throw new SectionIntegrityError(`Expected ${section.passageIds.length} passages but loaded ${loaded.length}.`);
  }
  section.passageIds.forEach((id, i) => {
    if (loaded[i]?.passageId !== id) throw new SectionIntegrityError(`Passage ${i + 1} did not match the section.`);
    const position = section.passagePositions?.[i] ?? i + 1;
    if (loaded[i].setNumber !== position) throw new SectionIntegrityError(`Passage ${i + 1} is out of order.`);
    if (!isSegmentable(loaded[i].text)) throw new SectionIntegrityError(`Passage ${i + 1} has no text to recall.`);
  });
  return { passages: loaded, segmented: loaded.map((p) => segmentPassage(p.text, version, { preptest: section.preptest, passageId: p.passageId })) };
}
