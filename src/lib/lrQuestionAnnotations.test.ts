import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { annotationStimulus, lrAnnotationFor } from "./lrQuestionAnnotations";
import { normalizeQuestionTextFields } from "./questionLoader";

interface Row {
  questionNumber: number;
  stimulus: string;
  answerChoices: Record<string, string>;
  correctAnswer: string;
}

function row(pt: number, section: number, qnum: number): Row {
  const file = resolve(__dirname, `../../public/data/PT${pt}-S${section}-LR.json`);
  const rows = normalizeQuestionTextFields(JSON.parse(readFileSync(file, "utf8")) as Row[]);
  const found = rows.find((q) => q.questionNumber === qnum);
  if (!found) throw new Error(`PT${pt} S${section} Q${qnum} not in the bank`);
  return found;
}

describe("lrAnnotationFor", () => {
  it("has no entry for a question nobody annotated", () => {
    expect(lrAnnotationFor({ pt: 151, section: 4, qnum: 1 })).toBeNull();
  });

  it.each([10, 16])("PT151 Section 4 Question %i: every marked sentence is in the real stimulus", (qnum) => {
    const annotation = lrAnnotationFor({ pt: 151, section: 4, qnum });
    expect(annotation).not.toBeNull();
    const question = row(151, 4, qnum);
    const stimulus = annotationStimulus(question.stimulus);
    for (const sentence of annotation!.sentences) {
      expect(stimulus.indexOf(sentence.text)).toBeGreaterThanOrEqual(0);
      expect(sentence.note.length).toBeGreaterThan(0);
    }
  });

  it.each([10, 16])("PT151 Section 4 Question %i: verdicts name real choices and credit the right one", (qnum) => {
    const annotation = lrAnnotationFor({ pt: 151, section: 4, qnum })!;
    const question = row(151, 4, qnum);
    for (const letter of Object.keys(annotation.verdicts)) {
      expect(Object.keys(question.answerChoices)).toContain(letter);
    }
    expect(annotation.verdicts[question.correctAnswer]).toBeDefined();
  });

  it("carries no em or en dashes", () => {
    for (const qnum of [10, 16]) {
      expect(JSON.stringify(lrAnnotationFor({ pt: 151, section: 4, qnum }))).not.toMatch(/[–—]/);
    }
  });
});
