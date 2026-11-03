// Address of one Logical Reasoning question: PrepTest, section, question number.
// The same triple a student types into the question finder ("PT151 S4 Q10"),
// so a link in a note and a search land on the same question.

export interface LrAddress {
  pt: number;
  section: number;
  qnum: number;
}

function wholeNumber(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,3}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 ? n : null;
}

/** Reads the three route params. Returns null when any of them is not a plain positive integer. */
export function parseLrAddress(params: { pt?: string; section?: string; qnum?: string }): LrAddress | null {
  const pt = wholeNumber(params.pt);
  const section = wholeNumber(params.section);
  const qnum = wholeNumber(params.qnum);
  if (pt === null || section === null || qnum === null) return null;
  return { pt, section, qnum };
}

/** Free text a person types: "PT151 S4 Q10", "151.4.10", "pt 151 section 4 question 10". */
export function readLrAddressText(text: string): LrAddress | null {
  const m = text.match(
    /^\s*(?:p(?:t|reptest)?\s*)?(\d{1,3})\D+(?:s(?:ec(?:tion)?)?\s*)?(\d{1,2})\D+(?:q(?:uestion)?\s*)?(\d{1,3})\s*$/i,
  );
  return m ? parseLrAddress({ pt: m[1], section: m[2], qnum: m[3] }) : null;
}

export function lrQuestionPath({ pt, section, qnum }: LrAddress): string {
  return `/question/lr/${pt}/${section}/${qnum}`;
}

/** The public section file that holds this question. Same naming the bank loader uses. */
export function lrSectionFile({ pt, section }: Pick<LrAddress, "pt" | "section">): string {
  return `/data/PT${pt}-S${section}-LR.json`;
}

export function lrAddressLabel({ pt, section, qnum }: LrAddress): string {
  return `PT${pt} Section ${section} Question ${qnum}`;
}
