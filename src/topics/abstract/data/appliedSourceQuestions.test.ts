import { expect, it } from "vitest";
import { APPLIED_SOURCE_QUESTIONS } from "./appliedSourceQuestions";
import { ANSWER_CHOICE_ITEMS } from "./answerChoiceDrill";
import { getModule } from "./modules";
import { computeMastery } from "../lib/mastery";
import type { ModuleProgressRow } from "../types";
it("keeps three distinct original full questions and all five original choices", () => {
  expect(APPLIED_SOURCE_QUESTIONS.map(q => q.id)).toEqual(["source_pt103_s1_q18", "source_pt139_s1_q23", "source_pt118_s4_q12"]);
  expect(APPLIED_SOURCE_QUESTIONS.map(q => q.correctOptionIndex)).toEqual([2, 0, 0]);
  for (const q of APPLIED_SOURCE_QUESTIONS) {
    expect(q.options).toHaveLength(5);
    expect(q.stimulus.length).toBeGreaterThan(250);
    expect(q.question.length).toBeGreaterThan(30);
    expect(ANSWER_CHOICE_ITEMS.some(choice => choice.stemText === q.options[0].text)).toBe(false);
  }
  expect(APPLIED_SOURCE_QUESTIONS[0].options[2].text).toBe("arguing that the principle derived by the politician, if applied in the limiting case, leads to an absurdly false conclusion");
  expect(APPLIED_SOURCE_QUESTIONS[1].stimulus).toContain("might instead");
  expect(APPLIED_SOURCE_QUESTIONS[2].stimulus).toContain("unsigned letter");
});
it("requires one newly identified practice per later module without legacy quiz or mastery", () => {
  for (const [index, id] of (["m5", "m6", "m7"] as const).entries()) {
    expect(getModule(id)?.quizSource).toBeNull();
    expect(getModule(id)?.drillIds).toEqual([APPLIED_SOURCE_QUESTIONS[index].id]);
    expect(computeMastery({moduleId:id, quizTotal:15, quizScore:15, drillComplete:true, drillTotal:1, drillCorrect:1} as ModuleProgressRow)).toBe("none");
  }
});
