/**
 * A timed section carries everything its briefing needs on the classroom item
 * itself. Reading it here means Home can raise the instructions in place rather
 * than sending the student to a page whose only job was to hold them.
 *
 * The authored `content_html` on the item stays where it is: it is what the
 * emailed copy and the direct link render. This is the same assignment said in
 * the fewest words that still bind, for the moment just before the clock.
 */
export interface SectionBriefing {
  /** Minutes on the clock. Accommodated timings land here exactly. */
  minutes: number;
  /** "Logical Reasoning", "Reading Comprehension", "Logic Games". */
  sectionName: string;
  /** Where Enter goes. Already carries the sealed flag and the return path. */
  href: string;
  /** Sealed runs withhold every answer and explanation for the whole sitting. */
  sealed: boolean;
}

const SECTION_NAMES: Record<string, string> = {
  lr: "Logical Reasoning",
  rc: "Reading Comprehension",
  lg: "Logic Games",
};

/**
 * Null for anything that is not a timed section, which is most work. Callers
 * treat null as "this opens the ordinary way", so a malformed row degrades to
 * the old navigation rather than to a briefing with holes in it.
 */
export function readSectionBriefing(metadata: unknown): SectionBriefing | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;
  if (meta.kind !== "timed_section") return null;

  const minutes = typeof meta.minutes === "number" ? meta.minutes : null;
  const href = typeof meta.href === "string" ? meta.href : null;
  if (!minutes || minutes <= 0 || !href) return null;

  const sectionKind = typeof meta.section_kind === "string" ? meta.section_kind : "";
  return {
    minutes,
    sectionName: SECTION_NAMES[sectionKind] ?? "Timed Section",
    href,
    sealed: meta.sealed === true,
  };
}
