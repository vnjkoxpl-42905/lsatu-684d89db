import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { diagnose, differs, parseRouting } from "./routing";

// The yard names the student's error and plays a different correction for each
// one, so a misdiagnosis shows a student the wrong lesson about their own
// answer. These pin the three named partials and, just as importantly, pin the
// cases where the yard must decline to name anything.

const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;
const credited = parseRouting("If the generator is not refueled by dusk, then the beacon goes dark.")!;

describe("diagnose", () => {
  it("finds nothing when the student routed it the credited way", () => {
    expect(diagnose(credited, credited)).toBeNull();
  });

  it("calls a reversal when both clauses sat on the wrong tracks", () => {
    const student = { ifClause: credited.thenClause, thenClause: credited.ifClause };
    expect(diagnose(credited, student)).toEqual({ kind: "reversal", side: "both" });
  });

  it("calls a dropped negation when the tracks were right but a polarity was lost", () => {
    const student = {
      ifClause: { text: "the generator is refueled by dusk", negated: false },
      thenClause: credited.thenClause,
    };
    expect(diagnose(credited, student)).toEqual({ kind: "dropped-negation", side: "if" });
  });

  it("calls a trimmed condition when a clause lost its qualifier", () => {
    const full = parseRouting(
      "If the charts are accepted rather than merely submitted for review, then the audit closes.",
    )!;
    const student = {
      ifClause: { text: "the charts are accepted", negated: false },
      thenClause: full.thenClause,
    };
    expect(diagnose(full, student)).toEqual({ kind: "trimmed-condition", side: "if" });
  });

  it("declines to name a fault when the student's answer is nowhere near the item", () => {
    const unrelated = parseRouting("If the ferry is cancelled, then the market closes early.")!;
    expect(diagnose(credited, unrelated)).toBeNull();
  });

  it("declines to name a fault when there is no student routing to compare", () => {
    expect(diagnose(credited, null)).toBeNull();
  });

  it("never claims a fault against the bank's own credited answers", () => {
    for (const item of conditional.items) {
      const routing = parseRouting(item.credited_answers[0]);
      if (!routing) continue;
      expect(diagnose(routing, routing), `item ${item.order}`).toBeNull();
    }
  });
});

describe("differs", () => {
  it("ignores punctuation and casing so a clean answer is not shown back as different", () => {
    const student = {
      ifClause: { text: "The generator is not refueled by dusk", negated: true },
      thenClause: { text: "the beacon goes dark", negated: false },
    };
    expect(differs(credited, student)).toBe(false);
  });

  it("is true when a polarity was dropped, even with identical wording otherwise", () => {
    const student = { ...credited, ifClause: { ...credited.ifClause, negated: false } };
    expect(differs(credited, student)).toBe(true);
  });

  it("is false when there is nothing to compare", () => {
    expect(differs(credited, null)).toBe(false);
  });
});
