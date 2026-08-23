import { describe, expect, it } from "vitest";
import conditionalRephrase from "./conditional-rephrase.json";
import type { ActivityItem } from "../api/types";

// Conditional Rephrase is the longest Activity in the library at sixty-two
// questions, and a student works it straight through in order. Two properties
// have to hold for that to be a teaching sequence rather than a pile: it climbs
// once, and it varies the indicator word and where the indicator sits, so no
// stretch of it drills the same word in the same seat.
//
// It held neither. Thirty-six items climbed a four-level ladder and the next
// twenty-six started again at the bottom, and the level labels ("Level 3: 'The
// only' vs 'only,' and the verb indicators") were drawn on screen as the
// student's Question Type chip. These pin the repair.

const items = conditionalRephrase.items as ActivityItem[];
const instructions = conditionalRephrase.instructions;
const LOADED = [
  "Compound condition",
  "Stacked negatives",
  "Contrast inside the condition",
  "Requirement word under jargon",
  "Two conditionals in one sentence",
];

/** The indicator a Question Type names, e.g. "Requirement word: unless" -> "unless". */
function indicatorOf(category: string | undefined): string | null {
  if (!category) return null;
  const at = category.indexOf(": ");
  return at === -1 ? null : category.slice(at + 2);
}

function words(prompt: string): number {
  return prompt.trim().split(/\s+/).length;
}

function meanWords(slice: ActivityItem[]): number {
  return slice.reduce((n, i) => n + words(i.prompt), 0) / slice.length;
}

describe("the Conditional Rephrase ladder", () => {
  it("opens on plainly marked single conditions", () => {
    for (const item of items.slice(0, 8)) {
      expect(item.category, `item ${item.order}`).toMatch(/^(Trigger|Requirement) word: /);
      // Nothing compound, contrasting or embedded this early.
      expect(item.prompt, `item ${item.order}`).not.toMatch(/\bboth\b|rather than/i);
    }
  });

  it("keeps everything loaded to the last quarter", () => {
    const firstLoaded = items.findIndex((i) => LOADED.some((l) => i.category?.startsWith(l)));
    expect(firstLoaded).toBeGreaterThanOrEqual(Math.floor(items.length * 0.75));
    // And it does not stop climbing before the end.
    expect(items[items.length - 1].category).toBe("Two conditionals in one sentence");
  });

  it("gets longer and heavier as it climbs", () => {
    const q = Math.floor(items.length / 4);
    const first = meanWords(items.slice(0, q));
    const last = meanWords(items.slice(-q));
    expect(last).toBeGreaterThan(first * 1.3);
    // Monotone across quarters, so no stretch drops back to the bottom.
    const quarters = [0, 1, 2, 3].map((n) =>
      meanWords(items.slice(n * q, n === 3 ? items.length : (n + 1) * q)),
    );
    for (let n = 1; n < quarters.length; n += 1) {
      expect(quarters[n], `quarter ${n + 1} is not below quarter ${n}`).toBeGreaterThanOrEqual(
        quarters[n - 1],
      );
    }
  });

  it("spreads the indicator words rather than pooling them", () => {
    const named = items.map((i) => indicatorOf(i.category)).filter(Boolean) as string[];
    expect(new Set(named).size).toBeGreaterThanOrEqual(35);

    // A run of the same indicator is only ever the deliberate seat drill, where
    // one rule is shown three times in three positions on purpose.
    const all = items.map((i) => indicatorOf(i.category));
    let run = 1;
    for (let n = 1; n < all.length; n += 1) {
      run = all[n] && all[n] === all[n - 1] ? run + 1 : 1;
      expect(run, `items around ${items[n].order} repeat "${all[n]}"`).toBeLessThanOrEqual(3);
      if (run === 3) {
        expect(items[n].category).toMatch(/^Same rule, new seat: /);
      }
    }
  });

  it("puts the indicator in more than one seat", () => {
    const opens = items.filter((i) => {
      const word = indicatorOf(i.category)?.split(" ")[0];
      return word ? i.prompt.toLowerCase().startsWith(word.toLowerCase()) : false;
    });
    const buried = items.filter((i) => {
      const word = indicatorOf(i.category)?.split(" ")[0];
      if (!word) return false;
      const at = i.prompt.toLowerCase().indexOf(word.toLowerCase());
      return at > 0;
    });
    expect(opens.length, "indicators opening the sentence").toBeGreaterThanOrEqual(12);
    expect(buried.length, "indicators inside the sentence").toBeGreaterThanOrEqual(12);
  });
});

describe("what a Conditional Rephrase student is shown", () => {
  it("never names an authoring level in the Question Type chip", () => {
    for (const item of items) {
      expect(item.category, `item ${item.order}`).not.toMatch(/\blevel\s*\d/i);
      expect(item.category, `item ${item.order}`).not.toMatch(/\bbank\b|\bseed\b|\bfull load\b/i);
    }
  });

  it("never leaks an author-side note into the revealed explanation", () => {
    for (const item of items) {
      const e = item.explanation;
      // The explanation is rendered verbatim under the credited answer.
      expect(e, `item ${item.order}`).not.toMatch(/\b(his|her|he|she)\b/i);
      expect(e, `item ${item.order}`).not.toMatch(/\blevel\s*\d|\bthe bank\b|\bseed\b|Chain Yard/i);
      // Cross-references by number break the moment the ladder is re-ordered.
      expect(e, `item ${item.order}`).not.toMatch(/\bitem\s+\d+/i);
      // Instructions written at the Coach, not at the student.
      expect(e, `item ${item.order}`).not.toMatch(/\bflag it\b/i);
    }
  });

  it("keeps the quoted indicator the Switchyard lights on the board", () => {
    for (const item of items) {
      expect(item.explanation, `item ${item.order}`).toMatch(/"[^"]{2,24}"/);
    }
  });

  it("writes every credited answer as an answer a student could have given", () => {
    for (const item of items) {
      expect(item.credited_answers.length, `item ${item.order}`).toBe(2);
      for (const answer of item.credited_answers) {
        expect(answer.trim().length, `item ${item.order}`).toBeGreaterThan(12);
      }
      // The first is always the if-then form, which is what the yard parses.
      expect(item.credited_answers[0], `item ${item.order}`).toMatch(/^if .+, then .+/i);
    }
  });

  // Slot 1 is the contrapositive, not an alternative phrasing, so the generic
  // "Also accepted" told the student the thing the task asked for was optional.
  it("calls the second credited answer what it actually is", () => {
    expect(instructions.credited_secondary_label).toBe("Contrapositive");
  });

  // Finding C. The task demanded the contrapositive while the rubric credited
  // either direction on its own, so a student following the instruction to the
  // letter and a student ignoring half of it were graded identically. The
  // rubric is what has actually been grading, and it is the only reading under
  // which items 46, 47 and 48 cohere, so the task is the field that was wrong.
  it("asks for something the rubric will actually credit", () => {
    expect(instructions.coach.rubric[0]).toMatch(/either direction is credited/i);
    expect(instructions.task).not.toMatch(/then give me the contrapositive/i);
    expect(instructions.task).toMatch(/if \[sufficient\], then \[necessary\]/i);
    expect(instructions.task).toMatch(/contrapositive counts too/i);
  });

  it("tells the student their own wording is fine, which the rubric already assumed", () => {
    expect(instructions.coach.rubric[3]).toMatch(/wording is free/i);
    expect(instructions.task).toMatch(/in your own words/i);
  });

  it("does not re-demand the contrapositive in the answer box", () => {
    expect(instructions.answer_placeholder).not.toMatch(/contrapositive/i);
  });
});
