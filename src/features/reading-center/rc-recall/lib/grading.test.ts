import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { canonicalSource, parseRcAssessment, recallWindowTranscript, reusableRcTranscript, segmentRcSource, sourceUnits, validGradeRequest } from "../../../../../supabase/functions/_shared/rcRecallGrading";
import { segmentPassage } from "./segment";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
import { getRcGrades, gradeRcRecap } from "./grading";

const file = { preptest: 140, passages: [{ passageId: 15, preptest: 140, section: 4, text: "Passage A\n\nSome artists may disagree.\n\nPassage B\n\nOthers need evidence." }] };
const attempt = { mode: "rc_recall", preptest: 140, section: 4, passage_ids: [15] };
describe("RC grader authoritative scope", () => {
  it("matches client paragraph segmentation for every bank passage", () => {
    const dir = resolve("public/data/rc"); let count = 0;
    for (const name of readdirSync(dir).filter(n => /^RC-PT\d+\.json$/.test(n))) {
      const bank = JSON.parse(readFileSync(resolve(dir, name), "utf8"));
      for (const passage of bank.passages) {
        expect(segmentRcSource(passage.text), `${name} passage ${passage.passageId}`).toEqual(segmentPassage(passage.text).paragraphs.map(p => p.text)); count++;
      }
    }
    expect(count).toBeGreaterThan(100);
  });
  it("binds paragraph position to the saved single-passage selection", () => {
    expect(canonicalSource(file, attempt, { recap_key: "p1-para2-recall", passage_position: 1, kind: "recall" })).toEqual({ text: "Others need evidence.", passageId: 15, paragraphIndex: 1 });
    expect(() => canonicalSource(file, attempt, { recap_key: "p2-para2-recall", passage_position: 1, kind: "recall" })).toThrow();
    expect(() => canonicalSource(file, attempt, { recap_key: "p1-para9-recall", passage_position: 1, kind: "recall" })).toThrow();
    expect(() => canonicalSource(file, { ...attempt, section: 3 }, { recap_key: "p1-para1-recall", passage_position: 1, kind: "recall" })).toThrow();
    expect(() => canonicalSource(file, { ...attempt, passage_ids: [999] }, { recap_key: "p1-para1-recall", passage_position: 1, kind: "recall" })).toThrow();
  });
  it("uses every paragraph only for the explicit whole-passage recap", () => {
    expect(canonicalSource(file, attempt, { recap_key: "p1-passage-recap", passage_position: 1, kind: "passage_recap" }).text).toBe("Some artists may disagree.\n\nOthers need evidence.");
  });
  it("does not accept client source, transcript or object path", () => {
    const request = { attemptId: "85703227-ea03-4454-9bac-94c52903dd01" };
    expect(validGradeRequest(request)).toBe(true);
    for (const key of ["sourceText", "transcript", "path"]) expect(validGradeRequest({ ...request, [key]: "forged" })).toBe(false);
  });
});

describe("RC semantic feedback evidence", () => {
  const source = "Some artists may disagree.", transcript = "All artists disagree.";
  const assessment = { summary: "The qualification changed.", details: [{ sourceId: "s1", recallQuote: "All artists", status: "changed", explanation: "Some became all, and a possibility became a certainty." }], relationships: [], nextStep: "Keep both the quantity and the possibility when recalling." };
  it("accepts a grounded diagnosis without an invented score", () => {
    const parsed = parseRcAssessment(JSON.stringify(assessment), source, transcript);
    expect(parsed.details[0].status).toBe("changed");
    expect(parsed.details[0].sourceQuote).toBe(source);
    expect(parsed.coverage).toEqual({ earned: 0, possible: 2, percent: 0, label: "Meaning points" });
    expect(parsed).not.toHaveProperty("score");
  });
  it("rejects invented source and learner quotations", () => {
    expect(() => parseRcAssessment(JSON.stringify({ ...assessment, details: [{ ...assessment.details[0], sourceId: "invented" }] }), source, transcript)).toThrow("ungrounded_source_evidence");
    expect(() => parseRcAssessment(JSON.stringify({ ...assessment, details: [{ ...assessment.details[0], recallQuote: "Some artists" }] }), source, transcript)).toThrow("ungrounded_recall_evidence");
  });
  it("does not manufacture a learner quotation for missing information", () => {
    expect(() => parseRcAssessment(JSON.stringify({ ...assessment, details: [{ ...assessment.details[0], status: "missing" }] }), source, transcript)).toThrow("invalid_missing_evidence");
    expect(parseRcAssessment(JSON.stringify({ ...assessment, details: [{ ...assessment.details[0], status: "missing", recallQuote: "" }] }), source, transcript).details[0].recallQuote).toBe("");
  });
  it("refuses an empty idea breakdown", () => {
    expect(() => parseRcAssessment(JSON.stringify({ ...assessment, details: [] }), source, transcript)).toThrow("empty_assessment");
  });
  it("requires each fixed unit once and computes partial points itself", () => {
    const two = "Some artists may disagree. Others need evidence.";
    const entry = { ...assessment.details[0], status: "partial", recallQuote: "All artists" };
    expect(() => parseRcAssessment(JSON.stringify({ ...assessment, details: [entry] }), two, transcript)).toThrow("incomplete_rubric");
    expect(() => parseRcAssessment(JSON.stringify({ ...assessment, details: [entry, entry] }), two, transcript)).toThrow("incomplete_rubric");
    const parsed = parseRcAssessment(JSON.stringify({ ...assessment, coverage: { percent: 100 }, details: [entry, { ...entry, sourceId: "s2", status: "missing", recallQuote: "" }] }), two, transcript);
    expect(parsed.coverage).toEqual({ earned: 1, possible: 4, percent: 25, label: "Meaning points" });
    expect(() => parseRcAssessment(JSON.stringify({ ...assessment, details: [{ ...entry, status: "uncertain" }] }), source, transcript)).toThrow("uncertain_assessment");
  });
  it("keeps abbreviations, initials and decimals inside complete source units", () => {
    const text = "Dr. A. Smith measured 3.1 units in Washington, D.C. during 2004. Some values may change.";
    expect(sourceUnits(text)).toEqual([{ id: "s1", text: "Dr. A. Smith measured 3.1 units in Washington, D.C. during 2004." }, { id: "s2", text: "Some values may change." }]);
  });
  it("reuses trusted older-version ASR only for the same source and audio", () => {
    const old = { recap_id: "recap", grader_version: 1, updated_at: "2026-10-18", audio_hash: "audio", source_hash: "source", asr_engine: "deepgram/nova-3", transcript: "This is the preserved transcript.", asr_words: [] };
    expect(reusableRcTranscript([old], "recap", "audio", "source")?.text).toBe(old.transcript);
    expect(reusableRcTranscript([old], "recap", "different", "source")).toBeNull();
    expect(reusableRcTranscript([old], "other-recap", "audio", "source")).toBeNull();
  });
  it("excludes spoken reading/checking and crossing words from a continuous recall window", () => {
    const word = (text: string, start: number, end: number) => ({ word: text, start, end, confidence: 0.99 });
    const words = [word("reading", 0, 1), word("boundary", 1.9, 2.1), word("Some", 2.2, 2.5), word("artists", 2.5, 3), word("may", 3, 3.3), word("disagree.", 3.3, 3.8), word("checking", 4.1, 4.5)];
    expect(recallWindowTranscript(words, 2000, 4000, 5000).text).toBe("Some artists may disagree.");
    expect(() => recallWindowTranscript(words, 2000, 6000, 5000)).toThrow("invalid_recap_scope");
    expect(() => recallWindowTranscript(words.map(w => ({ ...w, confidence: 0.1 })), 2000, 4000, 5000)).toThrow("no_speech");
  });
});

describe("RC grader client calls", () => {
  it("status requests never ask to grade a recording", async () => {
    invoke.mockResolvedValue({ data: { attemptId: "attempt", items: [] }, error: null });
    await getRcGrades("attempt");
    expect(invoke).toHaveBeenLastCalledWith("rc-recall-grade", { body: { attemptId: "attempt" } });
    await gradeRcRecap("attempt", "recap");
    expect(invoke).toHaveBeenLastCalledWith("rc-recall-grade", { body: { attemptId: "attempt", recapId: "recap" } });
  });
  it("does not display an unconfirmed response as a grade", async () => {
    invoke.mockResolvedValue({ data: { attemptId: "someone-else", items: [] }, error: null });
    await expect(getRcGrades("attempt")).rejects.toThrow("could not be confirmed");
  });
});
