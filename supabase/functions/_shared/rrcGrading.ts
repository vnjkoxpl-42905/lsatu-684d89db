/**
 * The Read, Recall, Colour grader's judgement, as pure functions.
 *
 * Everything here is deterministic except the one model call the caller makes
 * with `buildJudgePrompt`, and that call's output comes straight back into
 * `parseJudgeVerdicts`. Nothing in this file touches the network, the database
 * or the clock, and it deliberately imports nothing at all: the grader runs in
 * a Deno edge function and the tests run in Vitest, and this is the code both
 * have to agree on.
 *
 * The decisions it implements:
 *
 * - Coverage is per STIMULUS, counted across everything she said about it,
 *   never per Chunk (ADR 0013). She may chunk differently from us and is not
 *   held to our line breaks.
 * - Full Coverage is not 100% (ADR 0018). A census of 71 of Joshua's own runs
 *   puts a correct one at a median of 95% and a 10th percentile of 86%, so the
 *   top band starts at 86 and the score is reported as a band.
 * - A Detail is one of three kinds and each is judged by a different question.
 *   Asking "did she say this?" of a discourse role marks it missed whenever she
 *   carried it structurally, which is a tenth of the key.
 */

export type DetailKind = "content" | "structure" | "modality";

export interface Detail {
  /** Reviewed aliases of one scoring fact; never inferred by the judge. */
  coverageGroup?: string;
  /** 1-based index within the stimulus, stable across the whole judgement. */
  n: number;
  text: string;
  kind: DetailKind;
  /**
   * Which authored line this Detail lives in, when the caller knows.
   *
   * Coverage is still per stimulus (ADR 0013) and this changes no score. It is
   * how a marked Detail finds its way back to the line she was rephrasing when
   * she should have carried it, so the Report Card can say "on line 2 you
   * dropped the quantifier" instead of handing her a list of 21.
   */
  line?: number;
}


export type Band = "at-the-standard" | "nearly-there" | "thin" | "lost-it";

/**
 * Where the bands cut.
 *
 * Only `atTheStandard` is measured: it is the 10th percentile of the 71-run
 * census, so nine correct runs in ten clear it. It is deliberately not the
 * minimum of that census, which is a stimulus whose recording is broken.
 *
 * The floor belongs to a JUDGE, not to the drill. ADR 0018 measured 86 by
 * hand and validated it on gemini-2.5-flash (p10 85). ADR 0035 re-ran the
 * same 71 runs through the live function on gemini-3.8-flash and measured
 * 82, with no decoy failures where 2.5 had four. When the judge's model moves,
 * `scripts/rrc-census.ts` is re-run and this number moves with it; a floor
 * measured on one model and applied by another is a guess.
 *
 * The other two are PROVISIONAL and marked so. The corpus holds only correct
 * runs, so it can say where good ends and cannot say where "nearly there"
 * stops being nearly. They keep ADR 0018's widths below the measured floor
 * and move once student runs exist.
 */
export const BAND_FLOOR = {
  atTheStandard: 82,
  nearlyThere: 68,
  thin: 51,
} as const;

export function bandFor(percent: number): Band {
  if (percent >= BAND_FLOOR.atTheStandard) return "at-the-standard";
  if (percent >= BAND_FLOOR.nearlyThere) return "nearly-there";
  if (percent >= BAND_FLOOR.thin) return "thin";
  return "lost-it";
}

/*
 * Kind, from the authored phrasing.
 *
 * A port of `system/scripts/activity-centre/classify_details.py`, run at grade
 * time rather than baked into the content. Same rules, same closed set; doing
 * it here means no reseed of 1,294 Details and one place to change when the
 * authoring vocabulary grows.
 *
 * The trap this exists to avoid: "This is about Sweden." and "This is the
 * conclusion." share an opening and are opposites. Anything keying on that
 * opening puts a topic fact in with the discourse roles, so the exceptions are
 * checked FIRST and the roles are an enumerated set rather than a pattern.
 */
const CONTENT_DESPITE_OPENING = /^this is (about|what|true of|after|conditional on) /;

const STRUCTURE = [
  /^this is (the|a|an) (conclusion|contrast|reason|reason given|result|example|additional point|additional reason|additional fact|additional premise|premise|second premise|first reason given|conditional claim|correction|other case|puzzle|definition|consequent|editorial)\.$/,
  // A possessive proper noun as well as a pronoun. PT134.S3 named its speakers
  // so the key would stop inventing their gender, and "This is Tanner's reason."
  // is the same discourse role as "This is his reason." Without this, fixing the
  // gender defect creates a kind defect: the role falls through to `content` and
  // the judge asks "did she say this?" of something that is not a claim.
  // An article too: a named speaker gives "Tanner's reason.", a speaker the
  // stimulus gives only a role gives "the legislator's conclusion.", and English
  // will not drop that "the". Same discourse role either way.
  /^this is (his|her|their|(?:the )?[a-z]+'s) (conclusion|reason|recommendation|example)\.$/,
  /^this is further support for the claim\.$/,
  /^this is (an example|the contrast)\.$/,
  /^this is a contrast (with|about) .*\.$/,
  /^this is despite something\.$/,
  /^(a|an|the) [a-z ]+ is speaking\.$/,
  /^(he|she|they) asks? a question\.$/,
  /^a definition of that follows\.$/,
  /^the word \w+ introduces it\.$/,
];

const MODALITY = [
  /^this is (hedged|marked|stated) as .*\.$/,
  /^this is stated with certainty\.$/,
  /^this is (usually|often|ultimately) (so|the case)\.$/,
  /^this is always true.*\.$/,
  /^this is (typically|almost always) so\.$/,
  /^this is true in most cases\.$/,
  /^this is treated as clear\.$/,
  /^this is an (average|estimate|overall figure)\.$/,
];

export function classifyDetail(text: string): DetailKind {
  const t = text.trim().toLowerCase();
  if (CONTENT_DESPITE_OPENING.test(t)) return "content";
  if (STRUCTURE.some((r) => r.test(t))) return "structure";
  if (MODALITY.some((r) => r.test(t))) return "modality";
  return "content";
}

/**
 * A Detail that opens like a discourse role and fell through to content.
 *
 * The classifier defaults to content, so an unrecognised structural phrasing is
 * mis-kinded silently. This is the only thing that surfaces it. Four of the
 * 1,294 authored Details trip it and all four are correctly content; a section
 * whose residue is growing has drifted from the authoring vocabulary.
 */
export function isKindResidue(text: string, kind: DetailKind): boolean {
  const t = text.trim().toLowerCase();
  return kind === "content" && t.startsWith("this is") && !CONTENT_DESPITE_OPENING.test(t);
}

export function toDetails(texts: string[]): Detail[] {
  return texts.map((text, i) => ({ n: i + 1, text, kind: classifyDetail(text) }));
}

/**
 * The same list, but each Detail remembers the line it was authored under.
 *
 * Flattened in authored order, exactly as `toDetails` over the flattened texts
 * would produce, so ids and scores are identical either way. The only addition
 * is the line number, which no score reads.
 */
// Assignment items are immutable snapshots. This reviewed identity-specific
// correction also reaches older snapshots that predate coverageGroup metadata.
// Match exact authored wording and question identity; never infer aliases.
const REVIEWED_COVERAGE_GROUPS: Record<string, Record<string, string>> = {
  PT102_S3_Q24: {
    "Sweden is one of them.": "country-sweden",
    "This is about Sweden.": "country-sweden",
  },
};

export function toDetailsByLine(lines: { details: { text: string; coverageGroup?: string }[] }[], itemSlug?: string): Detail[] {
  const out: Detail[] = [];
  lines.forEach((line, index) => {
    for (const d of line.details ?? []) {
      const coverageGroup = d.coverageGroup?.trim() ||
        (itemSlug ? REVIEWED_COVERAGE_GROUPS[itemSlug]?.[d.text] : undefined);
      out.push({ n: out.length + 1, text: d.text, kind: classifyDetail(d.text), line: index + 1,
        ...(coverageGroup ? { coverageGroup } : {}) });
    }
  });
  return out;
}

// --- The one model call ------------------------------------------------------

export interface JudgeEntry {
  coverageGroup?: string;
  /** Source-only reviewed rubric. Never inferred from this learner's response. */
  reviewedMaterial?: boolean;
  reviewedMaterialReason?: string;
  materialityKeyVersion?: string | null;
  materialityKeyStatus?: "reviewed" | "fallback";
  id: number;
  text: string;
  kind: DetailKind;
  /** Not sent to the model. A decoy must come back missed. */
  decoy: boolean;
  /** The authored line this Detail belongs to, when known. Never on a decoy. */
  line?: number;
}

/**
 * The list the judge is shown: the stimulus's own Details plus decoys.
 *
 * Decoys are Details belonging to a DIFFERENT stimulus in the same section, and
 * the only correct verdict on one is "missed". They are the per-run check on the
 * failure mode that matters, which is the judge reasoning "the stimulus says
 * this, so she must have meant it" and crediting her for words she never said.
 * That failure is invisible in the output -- it just looks like a good score --
 * so something has to be able to catch it in the run itself rather than in
 * aggregate.
 *
 * Interleaved deterministically rather than shuffled, so the same inputs give
 * the same prompt and a disagreement between two runs is the model's, not ours.
 */
export function buildJudgeEntries(details: Detail[], decoyTexts: string[]): JudgeEntry[] {
  const real = details.map((d) => ({ text: d.text, kind: d.kind, decoy: false, line: d.line,
    ...(d.coverageGroup ? { coverageGroup: d.coverageGroup } : {}) }));
  const decoys = decoyTexts.map((text) => ({ text, kind: classifyDetail(text), decoy: true }));

  if (decoys.length === 0) return real.map((e, i) => ({ id: i + 1, ...e }));

  // Spread them through the list instead of appending: a judge that sees two
  // odd items at the end can treat the tail as a different question.
  const step = Math.max(1, Math.floor(real.length / (decoys.length + 1)));
  const out: Omit<JudgeEntry, "id">[] = [];
  let next = 0;
  real.forEach((entry, i) => {
    out.push(entry);
    if (next < decoys.length && (i + 1) % step === 0) out.push(decoys[next++]);
  });
  while (next < decoys.length) out.push(decoys[next++]);
  return out.map((e, i) => ({ id: i + 1, ...e }));
}

/**
 * Which Details from another stimulus can serve as decoys.
 *
 * A decoy is a Detail she cannot have carried, so crediting one means the judge
 * invented words she never said. That only holds if the decoy is a fact about
 * the OTHER stimulus. A structural Detail -- "This is the reason given." -- is
 * a fact about arguments rather than about any stimulus, and almost any honest
 * retelling carries it. The trial run's single decoy failure was exactly that,
 * and it was ours: the integrity check reported the judge hallucinating when
 * the judge was right, which is the worst possible direction for a check whose
 * whole job is to be trusted.
 *
 * Modality is excluded for the same reason and is a weaker case: "This is
 * hedged." is about a claim, but the hedge it names is common enough across
 * stimuli to be carried honestly.
 *
 * Drawn across the whole stimulus rather than from its first chunk, which is
 * where the structural Details tend to live.
 */
export function pickDecoys(details: string[], howMany = 2): string[] {
  return details.filter((text) => classifyDetail(text) === "content").slice(0, howMany);
}

const KIND_RULE: Record<DetailKind, string> = {
  content:
    'CONTENT — a fact. Carried if she stated it, in any words, in any order. ' +
    'Synonyms and paraphrase count fully. A uniquely identified entity may be ' +
    'named by its role or context instead of its proper name. Equivalent ' +
    'quantity expressions count: "half" and "50 percent" mean the same. ' +
    'Deduct only a lost or changed claim, not a missing label. A different ' +
    'country, a missing meaningful quantity, all changed to most, and lost ' +
    'negation are real changes. Do not assume an unstated all from "the staff".',
  structure:
    'STRUCTURE — a discourse role, not words. Carried if the relationship is ' +
    'present in HOW she told it; she never has to name it. "This is a contrast." ' +
    'is carried by a "but", a "though", or "X is different from Y". "This is the ' +
    'conclusion." is carried by a "so" or "therefore" introducing that claim.',
  modality:
    'MODALITY — the strength of the claim. Carried if her qualifier survived. ' +
    'A flat assertion where the source hedged is NOT carried.',
};

/** Verbatim evidence windows; stable ids refer only to this learner transcript. */
export function buildEvidenceUnits(spoken: string): { id: number; text: string }[] {
  const words = spoken.trim().split(/\s+/).filter(Boolean);
  const units: { id: number; text: string }[] = [];
  let part: string[] = [];
  for (const word of words) {
    part.push(word);
    if (part.length >= 24 || /[.!?]["')\]]*$/.test(word)) {
      units.push({ id: units.length + 1, text: part.join(" ") });
      part = [];
    }
  }
  if (part.length) units.push({ id: units.length + 1, text: part.join(" ") });
  return units;
}

export function buildJudgePrompt(input: {
  stimulus: string;
  entries: JudgeEntry[];
  spoken: string;
  /**
   * An authored analytical takeaway. It is a valid example, not an exhaustive
   * list of sound stimulus-specific critiques or supported inferences.
   *
   * Coverage answers "did you hold it". The Read answers "did you understand
   * it", and it is the criterion the method is actually built around: the
   * briefing tells her "this is the part that gets checked", the coach rubric
   * says to score it, and the section spec makes it the drill's accuracy
   * criterion. Omit it and the run is judged on memory alone, exactly as it was.
   */
  theRead?: string | null;
  /**
   * One correct run of THIS stimulus, as a document: the verbatim read of each
   * chunk, then the recall of it in his own words.
   *
   * The judge had no example of good work. It carried a checklist of facts and
   * a one-line key for The Read, and was then asked whether her run was a flat
   * list, whether she engaged with the stimulus at all, and whether that
   * engagement was specific to it -- three judgments about quality made against
   * nothing but the model's own idea of quality. This is the standard those
   * three are measured against, and it is the standard a person set.
   *
   * It is emphatically NOT a target to match. A student who reproduced this
   * would be reciting, which is itself a failure the same prompt checks for.
   * The prompt says so at some length, because an exemplar dropped into a
   * grading context without that framing turns into an answer key, and every
   * run that differs from it starts looking wrong.
   */
  modelRun?: string | null;
  /**
   * Her run cut into the lines she was rephrasing, and her whole-stimulus
   * recall on its own.
   *
   * The drill is line by line -- read one line silently, look away, say that
   * line back -- and until now the judge saw the whole thing as one block of
   * text. It could say a fact was dropped; it could not say WHERE, which is the
   * only form of that feedback she can act on. The cut comes from the silence
   * before each spoken line (`rrcLines.ts`), so it is evidence about her run
   * and not a boundary she is scored against.
   */
  lines?: { n: number; text: string; spoken: string }[];
  /** What she said after the text disappeared. Part of `spoken` as well. */
  recall?: string | null;
}): string {
  const kinds = [...new Set(input.entries.map((e) => e.kind))]
    .map((k) => `- ${KIND_RULE[k]}`)
    .join("\n");
  const list = input.entries
    .map((e) => `${e.id}. [${e.kind}] ${e.text} Fixed rubric: ${e.reviewedMaterial === false ? "incidental" : "essential"}.${e.reviewedMaterialReason ? ` ${e.reviewedMaterialReason}` : ""}`)
    .join("\n");

  return `You are grading one stimulus of a memory drill.

The student read the stimulus one line at a time. She reads a line silently,
looks away from the screen, and says that line back out loud in her own words
from memory; then the next line, and so on. When every line is done the text
disappears and she restates the whole stimulus from memory. She never reads
aloud. Your job is to decide, for each numbered Detail, whether she carried it.

THE STIMULUS (context only — see the rule below):
"""
${input.stimulus}
"""

WHAT SHE SAID (this is your ONLY evidence):
"""
${input.spoken}
"""

STUDENT EVIDENCE UNITS (verbatim parts of WHAT SHE SAID, not new evidence):
${buildEvidenceUnits(input.spoken).map((unit) => `${unit.id}. ${unit.text}`).join("\n")}
${
    input.lines?.length
      ? `
HER RUN, LINE BY LINE (the same words, split by which line she had just read):
${input.lines
          .map((l) => `Line ${l.n}: ${l.text}\n  She said: ${l.spoken || "(nothing)"}`)
          .join("\n")}
${input.recall ? `\nHER FULL RECALL, text off screen:\n"""\n${input.recall}\n"""\n` : ""}
Judge each line by the same scale every time:
- strong: the line's important claims, qualifications and relationships are
  faithfully conveyed. Incidental description can be missing; record that in
  detail coverage rather than lowering this meaning judgment.
- partial: the main claim survives but a material supporting fact or
  qualification is missing or changed.
- thin: only a fragment of the line survives, or the claim came back with a
  different meaning.
- skipped: she said nothing for it, or nothing that belongs to it.
For every line that is not strong, say in one short sentence exactly what
important meaning was dropped or changed. For a strong
line the note may be empty. Then judge the full recall on the same scale. The
split is approximate -- if she clearly covered a line's content while talking
about a neighbouring line, do not mark it skipped.
`
      : ""
  }


HOW TO JUDGE EACH KIND:
${kinds}

RULES:
- Judge ONLY from what she said. NEVER mark a Detail carried because the
  stimulus contains it. The stimulus is there so you know what a Detail refers
  to, not as evidence that she said it. This is the most important rule here.
- Preserve who asserted each claim and what role it plays. A claim mentioned
  only as her hypothetical example, question, joke or rejected alternative is
  not evidence that she remembered it as the source's actual claim. Her Read
  may correctly use a hypothetical to challenge the argument; judge that
  separately from recalling the argument's own claims.
- Some of the Details below belong to a DIFFERENT stimulus and she cannot have
  carried them. Mark those not carried. Do not try to guess which.
- If unclear or garbled transcription prevents deciding whether a meaning was
  carried, put that Detail id in uncertain_details. Do not guess a deduction
  or credit. A clear omission is still a miss, not uncertainty. If speech is
  clear enough to establish the meaning, judge that meaning normally.
- Her transcript may contain mangled or clipped words. Judge the substance.
- Be fair as well as strict. Her own words, her own order and a plainer
  phrasing all count in full. Only a change of MEANING counts against her: a
  dropped specific, a lost qualifier, a claim made stronger or weaker than the
  source, a relationship that vanished. Never mark a Detail missed for style.
- Mark a Detail missed only for missing or changed MEANING. Before marking it
  missed, look for an equivalent claim anywhere in WHAT SHE SAID, including
  pronouns and relationships expressed without the source's labels. For example,
  "if music videos are art, TV created art" carries the conditional position;
  she need not also say "anyone with that view insists". "Safety committees
  reduced workplace injuries" carries both the committees' safety role and
  the injury outcome without separately naming each role again.
- Do not demand the source's wording or discourse labels. But never fill in a
  missing fact from the source or the correct run: changing Sweden to Norway,
  all to most, likely to certain, or reversing a conditional changes meaning.
- For each verdict return evidence_ids: the integer ids of the STUDENT EVIDENCE
  UNITS supporting the judgment. For a carried Detail select units expressing
  its meaning. For a miss select the closest relevant units and explain what
  changed in reason; if nothing relevant was said use []. Never invent or
  rewrite quotes. The server reconstructs the actual words from these ids.
- Materiality is FIXED by the source-only rubric printed beside each Detail,
  before this learner's response is seen. Copy essential as material:true and
  incidental as material:false, and explain the fixed rubric in material_reason.
  Do not change a Detail's importance because she carried it, omitted it or
  contradicted it. Every contradiction remains a factual miss in full detail
  coverage and feedback. Only the fixed essential Details affect operative
  meaning retained; an incidental factual error does not silently become an
  essential-meaning deduction. When no reviewed source rubric exists, every
  Detail is conservatively essential. Do not infer a new denominator.
  Determine carried truthfully even for incidental Details: incidental is not
  permission to fill a fact in from the source. In big_misses and next_time,
  prioritise actual missed essential meaning, not incidental descriptors.
- A reference such as "those buildings" identifies buildings, not their size,
  colour or quantity. Do not award an attribute solely because the prompt says
  the referenced objects have it. Any intrinsic or contextual implication must
  follow from what she actually said, without borrowing facts from the source.
- Several authored Details may describe the same underlying fact. Treat
  equivalent meanings consistently, and describe one underlying error only
  ONCE in big_misses and next_time. Do not invent another error because the
  same fact has two labels. Still return a verdict for every numbered Detail.

MEANING CALIBRATION (unrelated examples, not evidence for this student's run):
- Source: "A local clinic opens at noon and closes at six." Retelling: "That
  clinic shuts at six; it starts seeing people at twelve." Both times and the
  clinic's identity survive. Different order and equivalent wording are fine.
- Source: "The astronomer found an error in her own calculation." Retelling:
  "She spotted a mistake in the calculation she made." In context she uniquely
  identifies the astronomer; repeating the occupation is unnecessary.
- Source: "A red cart delivered the sealed packages before noon, so the
  delivery met the noon deadline." Retelling: "The cart brought the sealed
  packages before noon, so it was on time." Red was not carried, but its
  omission is incidental: the same delivery still met the same deadline.
  Calling the cart blue instead would contradict the source. Losing before
  noon or changing it to after noon would change the operative timing claim.
- Source: "Repeated pressure compressed the loose fibres into a firm mat."
  Retelling: "They kept pushing the fibres together until they made a solid
  mat." The mechanism is carried without repeating its technical wording.
  Judge the process she described, not whether she repeated a label for it.
- Source: "All the permits expired." Retelling: "Most permits expired."
  The universal claim changed. Do not award all from most.
- Source: "The council did not approve the plan." Retelling: "The council
  approved it." Negation changed the claim; this is a genuine error.
- Source: "If the alarm sounds, the doors lock." Retelling: "If the doors
  lock, the alarm sounds." The direction reversed; this is a genuine error.
Apply these principles to WHAT SHE SAID, not these examples' facts.

THE DETAILS:
${list}

${
    input.theRead
      ? `ONE AUTHORED READ (a valid example, not an exhaustive answer key):
"""
${input.theRead}
"""

Judge her Read, from what she said and nothing else:
- read_given: did she say anything analytical about what the argument is DOING
  -- its move, its flaw, what turns on it -- as opposed to retelling what it
  says? Retelling alone is not a Read.
- read_matches: is her analysis logically valid and specific to THIS stimulus?
  Accept the authored example OR a different sound analytical observation.
  There can be more than one genuine gap in an argument. A valid alternative
  is not wrong merely because the authored example identifies another gap.
  For a critique, identify the actual premise-to-conclusion link she challenges:
  her proposed possibility must be consistent with the stated premises and
  explain why they need not establish that conclusion. Reject a critique that
  contradicts an explicit premise, invents a claim the author never made, or
  raises a possibility unrelated to the support for the conclusion.
  For an inference, her claim must follow from the stated information; being
  merely possible is not enough. Retelling, a generic doubt, and an unsupported
  assertion do not pass. Judge her words, not facts supplied by the example.
  For instance, a causal conclusion drawn only from an association may be
  challenged by a common cause OR by the reverse causal direction, when each
  is consistent with the actual premises. These are different possible valid
  critiques, not facts to assume about this stimulus.
- read_reason: explain the specific valid link she identified, including when
  it differs from the example. If invalid, explain the logical problem rather
  than saying she failed to match the example. A missing Read cannot match.

`
      : ""
  }${
    input.modelRun
      ? `A CORRECT RUN of this same stimulus, for calibration:
"""
${input.modelRun}
"""

How to use it, and how not to:
- It sets the STANDARD, not the answer. It is one good run, not the only one.
  Her wording, her examples, her order and her emphasis can all differ from it
  completely and still be just as good.
- Use it for the whole-run judgments below: this is what "not a flat list" and
  "reacted to the stimulus" look like at the level expected here.
- Do NOT use it as evidence. A Detail is carried only if SHE said it. If it
  appears here and not in what she said, it is not carried. The verdicts above
  are decided from her words alone.
- Do NOT reward similarity to it or penalise difference from it. Matching its
  phrasing neither proves understanding nor proves reciting. Reciting is
  measured against the ORIGINAL STIMULUS, never against this correct run.

`
      : ""
  }Also judge the run as a whole:
- reciting: did she say the stimulus back close to word-for-word rather than
  retelling it? Full coverage reached by reciting is a failure.
- listing: did she deliver it as a flat run of facts rather than as a connected
  argument?
- coloured: did she react to the stimulus at all — a thought, doubt, example or
  joke — beyond retelling it?
- colour_specific: was that reaction specific to THIS stimulus rather than
  something that would fit any stimulus?
- big_misses: at most three short phrases naming the most important things she
  dropped, in plain words she can act on. Empty if she dropped nothing that
  matters.
- next_time: one or two sentences, addressed to her, saying the single most
  useful thing to do differently on a stimulus like this next time -- what to
  say out loud on purpose, which kind of word she keeps losing, or what her
  Read should have named. Concrete, about THIS run, no praise and no padding.
  Leave it EMPTY when there is nothing to fix: every Detail carried, the Read
  found, the run coloured and in her own words.

Reply with JSON only, no prose and no code fence:
{"verdicts":[{"id":1,"carried":true,"evidence_ids":[1],"reason":"","material":true,"material_reason":"This fact changes the claim."}],"uncertain_details":[],"reciting":false,"reciting_reason":"",
"listing":false,"listing_reason":"","coloured":true,"colour_specific":true,
"big_misses":[],"next_time":""${
    input.theRead ? ',\n"read_given":true,"read_matches":true,"read_reason":""' : ""
  }${
    input.lines?.length
      ? ',\n"lines":[{"n":1,"verdict":"strong","note":""}],\n"recall":{"verdict":"partial","note":""}'
      : ""
  }}
${
    input.lines?.length
      ? `\nEvery line verdict is one of: strong, partial, thin, skipped. Return one\nentry for every line from 1 to ${input.lines.length}.\n`
      : ""
  }
Return exactly one verdict for every id from 1 to ${input.entries.length}.`;
}


// --- Reading the answer ------------------------------------------------------

/** The same conditional output contract for gateway and direct judge calls.
 * Exact array lengths and id enums constrain shape; the audited parser still
 * checks missing/duplicate ids and evidence, which JSON Schema cannot prove.
 */
export function buildJudgeResponseSchema(input: {
  entries: Pick<JudgeEntry, "id">[];
  spoken?: string;
  theRead?: string | null;
  lines?: { n: number }[];
}): Record<string, unknown> {
  const ids = [...new Set(input.entries.map((entry) => entry.id))];
  if (!ids.length) throw new Error("judge response schema needs at least one Detail");
  const object = (properties: Record<string, unknown>) => ({
    type: "object", properties, required: Object.keys(properties), additionalProperties: false,
  });
  const text = { type: "string" };
  const flag = { type: "boolean" };
  const evidenceUnits = input.spoken === undefined ? undefined : buildEvidenceUnits(input.spoken);
  const evidenceProperties = evidenceUnits === undefined ? { evidence: text } : {
    // Keep nested generation constraints small. The server validates the ids
    // against the actual transcript units before reconstructing any quotation.
    evidence_ids: { type: "array", items: { type: "integer" } },
  };
  const verdict = object({
    id: { type: "integer" }, carried: flag, ...evidenceProperties, reason: text,
    material: flag, material_reason: text,
  });
  const properties: Record<string, unknown> = {
    // Integer enums and exact lengths are rejected by Gemini structured output
    // (400 INVALID_ARGUMENT); the audited parser enforces ids and counts.
    verdicts: { type: "array", items: verdict },
    uncertain_details: { type: "array", items: { type: "integer" } },
    reciting: flag, reciting_reason: text, listing: flag, listing_reason: text,
    coloured: flag, colour_specific: flag,
    big_misses: { type: "array", items: text }, next_time: text,
  };
  if (input.theRead) Object.assign(properties, { read_given: flag, read_matches: flag, read_reason: text });
  if (input.lines?.length) {
    const lineIds = [...new Set(input.lines.map((line) => line.n))];
    const assessment = { verdict: { type: "string", enum: ["strong", "partial", "thin", "skipped"] }, note: text };
    properties.lines = { type: "array", items: object({ n: { type: "integer" }, ...assessment }) };
    void lineIds;
    properties.recall = object(assessment);
  }
  return object(properties);
}

export interface JudgeReply {
  detailEvidence?: Record<number, { evidence: string; reason: string; material?: boolean; material_reason?: string }>;
  verdicts: Record<number, boolean>;
  reciting: boolean;
  recitingReason: string;
  listing: boolean;
  listingReason: string;
  coloured: boolean;
  colourSpecific: boolean;
  /**
   * The Read: whether she gave one at all, and whether it was the right move.
   *
   * Two flags rather than one, because they fail differently and the coaching
   * differs. No Read at all is a habit -- she stopped at the retelling. A Read
   * that missed the move is comprehension, and it is the number that predicts
   * a score.
   */
  readGiven: boolean;
  readMatches: boolean;
  readReason: string;
  /** Ids expected but absent from the reply. Counted as not carried. */
  missingIds: number[];
  /** At most three plain-words phrases naming what she dropped that mattered. */
  bigMisses: string[];
  /**
   * What to do differently next time, in one or two sentences to her.
   *
   * Empty when the judge found nothing to fix, and the Report Card then says
   * so instead of inventing advice. The one field on the card that asks for
   * something rather than describing what happened.
   */
  nextTime: string;
  /** Per-line judgement, keyed by line number. Absent when lines were not sent. */
  lineVerdicts: Record<number, { verdict: LineVerdict; note: string }>;
  /** The same judgement for the whole-stimulus recall, when it was sent. */
  recallVerdict?: { verdict: LineVerdict; note: string };
}

export type LineVerdict = "strong" | "partial" | "thin" | "skipped";

const LINE_VERDICTS: LineVerdict[] = ["strong", "partial", "thin", "skipped"];

function toLineVerdict(value: unknown): LineVerdict {
  const v = String(value ?? "").toLowerCase() as LineVerdict;
  // Anything unrecognised is "thin" rather than "strong": a judge that garbles
  // the field must not be able to award a line she may never have spoken.
  return LINE_VERDICTS.includes(v) ? v : "thin";
}


export class JudgeReplyError extends Error {}

/**
 * Pull the JSON out of whatever the model actually sent.
 *
 * Told not to use a code fence, models use one anyway, and some prepend a
 * sentence. Rather than trusting the instruction this finds the outermost
 * balanced object. A reply that is not parseable is an error and never a zero:
 * a grade of 0% and a grade we failed to read are different facts, and only one
 * of them is about her.
 */
export function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("{");
  if (start === -1) throw new JudgeReplyError("no JSON object in the reply");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch (e) {
        throw new JudgeReplyError(`unparseable JSON: ${(e as Error).message}`);
      }
    }
  }
  throw new JudgeReplyError("JSON object never closed");
}

/** Reconstruct quotations from validated unit ids, never model-written text. */
export function normalizeJudgeEvidence(raw: string, spoken: string): string {
  const obj = extractJson(raw) as Record<string, unknown>;
  if (!Array.isArray(obj.verdicts)) return JSON.stringify(obj);
  const units = new Map(buildEvidenceUnits(spoken).map((unit) => [unit.id, unit.text]));
  for (const row of obj.verdicts) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    if (r.evidence_ids === undefined) continue;
    if (!Array.isArray(r.evidence_ids) || r.evidence_ids.some((id) =>
      typeof id !== "number" || !Number.isInteger(id) || !units.has(id)) ||
      new Set(r.evidence_ids).size !== r.evidence_ids.length) {
      throw new JudgeReplyError(`Detail ${r.id} has invalid student evidence ids`);
    }
    r.evidence = r.evidence_ids.map((id) => units.get(id as number)!).join("\n");
  }
  return JSON.stringify(obj);
}

export function parseJudgeReply(raw: string, expectedIds: number[], spoken?: string): JudgeReply {
  const obj = extractJson(spoken === undefined ? raw : normalizeJudgeEvidence(raw, spoken)) as Record<string, unknown>;
  const rows = obj.verdicts;
  if (!Array.isArray(rows)) throw new JudgeReplyError("reply has no verdicts array");
  if (spoken !== undefined && obj.uncertain_details !== undefined) {
    const uncertain = obj.uncertain_details;
    if (!Array.isArray(uncertain) || uncertain.some((id) =>
      typeof id !== "number" || !Number.isInteger(id) || !expectedIds.includes(id))) {
      throw new JudgeReplyError("malformed uncertain_details");
    }
    if (uncertain.length) {
      throw new JudgeReplyError(`transcript meaning is uncertain for Details ${uncertain.join(", ")}`);
    }
  }

  const verdicts: Record<number, boolean> = {};
  const detailEvidence: NonNullable<JudgeReply["detailEvidence"]> = {};
  const normalizeEvidence = (text: string) => text.normalize("NFKC").toLowerCase()
    .replace(/[\u2018\u2019]/g, "'").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const studentWords = spoken === undefined ? undefined : ` ${normalizeEvidence(spoken)} `;
  for (const row of rows) {
    if (studentWords !== undefined && (row === null || typeof row !== "object" || Array.isArray(row))) {
      throw new JudgeReplyError("verdict row is not an object");
    }
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "number" ? r.id : Number(r.id);
    if (!Number.isFinite(id)) continue;
    if (studentWords !== undefined && expectedIds.includes(id)) {
      if (id in verdicts) throw new JudgeReplyError(`Detail ${id} has duplicate verdicts`);
      if (typeof r.carried !== "boolean") throw new JudgeReplyError(`Detail ${id} has no boolean verdict`);
      if (typeof r.evidence !== "string" || typeof r.reason !== "string") {
        throw new JudgeReplyError(`Detail ${id} has no evidence audit`);
      }
      const evidence = normalizeEvidence(r.evidence);
      if (r.carried === true && !evidence) {
        throw new JudgeReplyError(`Detail ${id} was credited without student evidence`);
      }
      if (evidence && r.evidence_ids === undefined && !studentWords.includes(` ${evidence} `)) {
        throw new JudgeReplyError(`Detail ${id} quotes words outside the student's transcript`);
      }
      if (r.carried !== true && !r.reason.trim()) {
        throw new JudgeReplyError(`Detail ${id} was deducted without a meaning explanation`);
      }
      if (r.material !== undefined && typeof r.material !== "boolean") {
        throw new JudgeReplyError(`Detail ${id} has invalid material classification`);
      }
      if (r.evidence_ids !== undefined && (typeof r.material !== "boolean" || typeof r.material_reason !== "string")) {
        throw new JudgeReplyError(`Detail ${id} has no material audit`);
      }
      if (r.material === false && (typeof r.material_reason !== "string" || !r.material_reason.trim())) {
        throw new JudgeReplyError(`Detail ${id} was called incidental without an explanation`);
      }
    }
    if (expectedIds.includes(id) && typeof r.evidence === "string" && typeof r.reason === "string") {
      detailEvidence[id] = { evidence: r.evidence, reason: r.reason,
        material: r.material !== false,
        ...(typeof r.material_reason === "string" ? { material_reason: r.material_reason } : {}) };
    }
    verdicts[id] = r.carried === true;
  }
  const missingIds = expectedIds.filter((id) => !(id in verdicts));
  if (studentWords !== undefined && missingIds.length) {
    throw new JudgeReplyError(`missing verdicts for Details ${missingIds.join(", ")}`);
  }
  const flag = (k: string) => obj[k] === true;
  const reason = (k: string) => (typeof obj[k] === "string" ? (obj[k] as string) : "");

  const lineVerdicts: Record<number, { verdict: LineVerdict; note: string }> = {};
  if (Array.isArray(obj.lines)) {
    for (const row of obj.lines as Record<string, unknown>[]) {
      const n = Number(row?.n);
      if (!Number.isFinite(n)) continue;
      lineVerdicts[n] = {
        verdict: toLineVerdict(row.verdict),
        note: typeof row.note === "string" ? row.note : "",
      };
    }
  }
  const recallRow = obj.recall as Record<string, unknown> | undefined;

  return {
    verdicts,
    detailEvidence,
    reciting: flag("reciting"),
    recitingReason: reason("reciting_reason"),
    listing: flag("listing"),
    listingReason: reason("listing_reason"),
    // Absent is treated as "no colour" rather than as colour, so a judge that
    // forgets the field cannot silently award it.
    coloured: flag("coloured"),
    colourSpecific: flag("colour_specific"),
    // Absent is "no Read", for the same reason as colour: a judge that forgets
    // the field must not be able to award it, and a stimulus judged before The
    // Read was graded at all is honestly reported as not having one.
    readGiven: flag("read_given"),
    readMatches: flag("read_matches"),
    readReason: reason("read_reason"),
    missingIds,
    bigMisses: Array.isArray(obj.big_misses)
      ? (obj.big_misses as unknown[])
          .filter((m): m is string => typeof m === "string" && m.trim() !== "")
          .slice(0, 3)
      : [],
    nextTime: reason("next_time").trim(),
    lineVerdicts,
    recallVerdict: recallRow
      ? { verdict: toLineVerdict(recallRow.verdict), note: typeof recallRow.note === "string" ? recallRow.note : "" }
      : undefined,
  };
}


// --- The score ---------------------------------------------------------------

export interface LineGrade {
  n: number;
  /** The line as authored. */
  text: string;
  /** What she said for it. Empty means she said nothing there. */
  spoken: string;
  startMs?: number;
  endMs?: number;
  verdict: LineVerdict;
  note: string;
  /** Details authored under this line that she carried, and those she did not. */
  carried: string[];
  dropped: string[];
}

export interface StimulusGrade {
  meaning_key_version?: string | null;
  meaning_key_status?: "reviewed" | "fallback";
  /** Meaning is a separate metric; factual coverage and its band stay intact. */
  meaning_percent?: number | null;
  meaning_carried?: number;
  meaning_total?: number;
  incidental_misses?: string[];
  /** Student-only quotations and explanations returned by this judge call. */
  detail_evidence?: Record<number, { text: string; carried: boolean; evidence: string; reason: string;
    material?: boolean; material_reason?: string }>;
  carried: number;
  total: number;
  /** Whole-number percent over the stimulus's OWN Details. */
  percent: number;
  band: Band;
  missed: string[];
  /** Decoys the judge said she carried. Any at all discredits the run. */
  decoysCarried: string[];
  /** Details the judge never returned a verdict for. Counted as not carried. */
  unjudged: string[];
  reciting: boolean;
  listing: boolean;
  coloured: boolean;
  colourSpecific: boolean;
  /** Did she give a Read at all, and was it the right move. */
  readGiven: boolean;
  readMatches: boolean;
  readReason: string;
  /**
   * Line-by-line feedback, in authored order. Empty when the run could not be
   * cut into lines. Reporting only -- `percent` above is untouched by it.
   */
  lines: LineGrade[];
  /** The whole-stimulus recall she gave after the text disappeared. */
  recall?: { verdict: LineVerdict; note: string };
  /** At most three plain-words phrases naming what she dropped that mattered. */
  bigMisses: string[];
  /** What to do differently next time. Empty when there is nothing to fix. */
  nextTime: string;
}

export function gradeStimulus(
  entries: JudgeEntry[],
  reply: JudgeReply,
  /** Her run cut into lines, when it could be. Feedback only, never scored. */
  lineSpans: { n: number; text: string; spoken: string; startMs?: number; endMs?: number }[] = [],
): StimulusGrade {
  // Semantic aliases require an explicit, reviewed coverageGroup. Otherwise only
  // equivalent wording (apart from case/spacing) on the SAME line is deduped.
  // Identical generic labels on different lines may name different claims.
  const seen = new Map<string, JudgeEntry>();
  const own = entries.filter((e) => {
    if (e.decoy) return false;
    if (!e.coverageGroup && e.line === undefined) return true;
    const key = e.coverageGroup
      ? `reviewed-group:${e.coverageGroup}`
      : `exact:${e.line}:${e.text.trim().toLowerCase().replace(/\s+/g, " ")}`;
    const previous = seen.get(key);
    if (previous) {
      if (reply.verdicts[previous.id] !== reply.verdicts[e.id]) {
        throw new JudgeReplyError("equivalent Details received conflicting verdicts");
      }
      return false;
    }
    seen.set(key, e);
    return true;
  });
  const carriedEntries = own.filter((e) => reply.verdicts[e.id] === true);
  const total = own.length;
  // Guard the empty stimulus rather than dividing by zero into NaN, which
  // renders as a blank band and looks like a rendering bug.
  const percent = total === 0 ? 0 : Math.round((carriedEntries.length / total) * 100);
  const isMaterial = (entry: JudgeEntry) => {
    const aliases = entry.coverageGroup
      ? entries.filter((e) => !e.decoy && e.coverageGroup === entry.coverageGroup)
      : [entry];
    // Only reviewed source metadata can change the denominator. Model audit
    // fields, absent legacy data and conflicting aliases cannot lower it.
    return aliases.some((e) => e.reviewedMaterial !== false);
  };
  const materialEntries = own.filter(isMaterial);
  const meaningCarried = materialEntries.filter((e) => reply.verdicts[e.id] === true).length;

  const lines: LineGrade[] = lineSpans.map((span) => {
    const forLine = own.filter((e) => e.line === span.n);
    const judged = reply.lineVerdicts[span.n];
    return {
      n: span.n,
      text: span.text,
      spoken: span.spoken,
      startMs: span.startMs,
      endMs: span.endMs,
      // She said nothing here, so it is a skip whatever the judge called it.
      verdict: span.spoken.trim() === "" ? "skipped" : (judged?.verdict ?? "thin"),
      note: judged?.note ?? "",
      carried: forLine.filter((e) => reply.verdicts[e.id] === true).map((e) => e.text),
      dropped: forLine.filter((e) => reply.verdicts[e.id] !== true).map((e) => e.text),
    };
  });

  return {
    meaning_key_version: own.length && own.every(e => e.materialityKeyStatus === "reviewed" && e.materialityKeyVersion === own[0].materialityKeyVersion)
      ? own[0].materialityKeyVersion ?? null : null,
    meaning_key_status: own.length && own.every(e => e.materialityKeyStatus === "reviewed") ? "reviewed" : "fallback",
    meaning_percent: materialEntries.length ? Math.round(meaningCarried / materialEntries.length * 100) : null,
    meaning_carried: meaningCarried,
    meaning_total: materialEntries.length,
    incidental_misses: own.filter((e) => !isMaterial(e) && reply.verdicts[e.id] !== true).map((e) => e.text),
    detail_evidence: Object.fromEntries(entries.filter((e) => !e.decoy && reply.detailEvidence?.[e.id])
      .map((e) => [e.id, { text: e.text, carried: reply.verdicts[e.id] === true,
        ...reply.detailEvidence![e.id],
        model_material: reply.detailEvidence![e.id].material,
        model_material_reason: reply.detailEvidence![e.id].material_reason,
        material: isMaterial(e),
        material_reason: e.reviewedMaterialReason ?? "No reviewed source-only key; conservatively essential." }])),
    carried: carriedEntries.length,
    total,
    percent,
    band: bandFor(percent),
    missed: own.filter((e) => reply.verdicts[e.id] !== true).map((e) => e.text),
    decoysCarried: entries.filter((e) => e.decoy && reply.verdicts[e.id] === true).map((e) => e.text),
    unjudged: own.filter((e) => reply.missingIds.includes(e.id)).map((e) => e.text),
    reciting: reply.reciting,
    listing: reply.listing,
    coloured: reply.coloured,
    colourSpecific: reply.colourSpecific,
    readGiven: reply.readGiven,
    // A Read that was never given cannot have matched. Enforced here rather
    // than trusted, so a judge answering both true cannot invent one.
    readMatches: reply.readGiven && reply.readMatches,
    readReason: reply.readReason,
    lines,
    recall: reply.recallVerdict,
    bigMisses: reply.bigMisses,
    nextTime: reply.nextTime ?? "",
  };

}

/**
 * Run `worker` over every item, at most `limit` of them in flight.
 *
 * A section is 22 stimuli and each one costs a judge call. Run end to end that
 * is 22 round trips in series, which on the trial run exceeded the edge
 * function's wall clock and returned 504 -- so the student's whole run produced
 * no Report Card, having already been recorded, uploaded and transcribed
 * correctly. Run at once it is one round trip's worth of waiting.
 *
 * Bounded rather than unbounded because the judge is a rate-limited API and a
 * section is not the only thing that might be grading; 429s at the provider
 * would trade one failure mode for another.
 *
 * Results come back in the order of `items`, not the order they finished. The
 * caller writes them into a Report Card the student reads top to bottom, and a
 * section whose stimuli arrive shuffled is worse than a slow one.
 *
 * Nothing here touches the network itself -- the worker does -- so this stays
 * on the pure side of the file.
 */
export async function mapWithConcurrency<In, Out>(
  items: In[],
  limit: number,
  worker: (item: In, index: number) => Promise<Out>,
): Promise<Out[]> {
  const results = new Array<Out>(items.length);
  let next = 0;

  const runner = async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  };

  // `limit` runners share one cursor, so a slow item holds up only its own
  // runner rather than a whole batch. Never more runners than items.
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runner),
  );
  return results;
}
