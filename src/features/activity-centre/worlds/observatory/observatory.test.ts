import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../content";
import { anchorsFor, matchesCredited, parseSignal, readAnswer } from "./observatory";

// Every figure this world draws is anchored to words in the statement, so the
// anchoring is the thing to pin: a figure drawn from a position I invented
// would teach a student to look at the wrong word.

const drill = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-relationship")!;
const signals = drill.items.map((i) => parseSignal(i)!);
const byOrder = (n: number) => signals.find((s) => s.order === n)!;

describe("comparison and grading regressions", () => {
  it("keeps valid clause recognition separate from eligibility for instant credit", () => {
    const cases = [
      [31, 'comparative, heavier; causal, which is why the foundry cast the alarm bell in the larger mould'],
      [38, 'conditional, only where the canopy is denser than sixty percent; comparative, denser than; causal, dries'],
      [5, `causal, ${drill.items.find((item) => item.order === 5)!.prompt}`],
    ] as const;
    for (const [order, answer] of cases) {
      const item = drill.items.find((candidate) => candidate.order === order)!;
      expect(matchesCredited(item, answer), answer).toBe(false);
      // The stage must not say a relationship is missing just because the
      // quotation needs a Coach judgment about how focused it is.
      expect(readAnswer(parseSignal(item)!, answer).missed, answer).toEqual([]);
    }
  });
  it("defers negated indicators and uncredited extra indicators instead of awarding instant credit", () => {
    const item = drill.items[0];
    for (const answer of ["conditional, only if is not the indicator", "conditional, only if and because"]) {
      expect(matchesCredited(item, answer), answer).toBe(false);
      expect(readAnswer(parseSignal(item)!, answer).drawn, answer).toEqual([]);
    }
    expect(matchesCredited(item, "conditional, only if (not causal)")).toBe(true);
  });
  it("leaves swapped type/indicator pairs to the Coach", () => {
    const item = drill.items.find((i) => i.order === 28)!;
    expect(matchesCredited(item, 'causal, "more evenly than"; comparative, "since"')).toBe(false);
    expect(matchesCredited(item, 'comparative, "more evenly than"; causal, "since"')).toBe(true);
    expect(readAnswer(parseSignal(item)!, 'causal, "more evenly than"; comparative, "since"').drawn).toEqual([]);
    const conflicting = 'comparative, more evenly than; causal, since; causal, more evenly than';
    expect(matchesCredited(item, conflicting)).toBe(false);
    expect(readAnswer(parseSignal(item)!, conflicting).quotedIndicators).toBe(false);
  });
  it("uses a pressure benchmark and teaches contextual comparisons", () => {
    const item = drill.items.find((i) => i.order === 47)!;
    expect(item.prompt).toContain("critical pressure threshold");
    expect(item.prompt).not.toContain("critical flux");
    expect(drill.instructions.coach?.rubric.join(" ")).toContain("recoverable from context");
  });
  it("explains the words and connections for every harder question", () => {
    for (const item of drill.items.filter((i) => i.order >= 33)) {
      const signal = parseSignal(item)!;
      expect(item.explanation.length, `item ${item.order}`).toBeGreaterThan(200);
      for (const r of signal.relations) {
        expect(r.indicators.some((i) => i.toLowerCase().split(/\s+|…/).filter(Boolean).every((word) => item.explanation.toLowerCase().includes(word))), `item ${item.order}: ${r.kind}`).toBe(true);
      }
    }
  });
});

describe("parsing the bank", () => {
  it("turns every one of the 48 items into a signal", () => {
    expect(drill.items.length).toBe(48);
    expect(signals.every(Boolean)).toBe(true);
  });

  it("reads the multi-relationship form", () => {
    // Item 27: conditional, "Only if"; causal, "because" and "accelerates"
    const s = byOrder(27);
    expect(s.relations.length).toBe(2);
    expect(s.relations.map((r) => r.kind)).toEqual(["conditional", "causal"]);
    expect(s.relations[1].indicators.length).toBe(2);
  });

  it("normalizes the badge's 'comparison' onto the bank's 'comparative'", () => {
    for (const s of signals) {
      for (const r of s.relations) {
        expect(["conditional", "causal", "comparative"]).toContain(r.kind);
      }
    }
  });

  it("agrees with the count the bank declares on every item", () => {
    // Item 40 used to declare four and list three, with a teaching note pasted
    // into its answer key. Both were fixed in the content; this holds the line.
    for (const s of signals) expect(s.declared, `item ${s.order}`).toBe(s.relations.length);
  });

  it("keeps notes and stray full stops out of every answer key", () => {
    for (const item of drill.items) {
      for (const answer of item.credited_answers) {
        expect(answer, `item ${item.order}`).not.toMatch(/[A-Za-z]\."/);
        expect(answer.split(";").every((g) => /^\s*(conditional|causal|comparative)\s*,/i.test(g)), `item ${item.order}`).toBe(true);
      }
    }
  });

  it("shows students no production notes in the explanations", () => {
    for (const item of drill.items) {
      expect(item.explanation, `item ${item.order}`).not.toMatch(/\bseed\b|\bPair [A-D]\b|\bthe Coach\b|\bhis own\b|\bin the bank\b|\bstatement\b/i);
    }
  });

  it("reads a rung off every item", () => {
    for (const s of signals) expect(s.rung, `item ${s.order}`).toBeGreaterThanOrEqual(1);
  });
});

describe("anchoring the figures", () => {
  /**
   * The property the whole world rests on. Every figure is drawn between
   * anchors, so an indicator with no anchor is a figure with no position.
   */
  it("anchors every indicator to real words in its own statement", () => {
    let total = 0;
    for (const s of signals) {
      for (const r of s.relations) {
        total += r.indicators.length;
        expect(r.anchors.length, `item ${s.order}: ${r.indicators.join(", ")}`).toBeGreaterThan(0);
      }
    }
    expect(total).toBe(109);
  });

  it("anchors every offset inside its own statement", () => {
    for (const s of signals) {
      for (const r of s.relations) {
        for (const a of r.anchors) {
          expect(a.start).toBeGreaterThanOrEqual(0);
          expect(a.end).toBeLessThanOrEqual(s.statement.length);
          expect(s.statement.slice(a.start, a.end).toLowerCase()).toBe(a.text.toLowerCase());
        }
      }
    }
  });

  it("anchors a contiguous indicator as one anchor, not two", () => {
    const a = anchorsFor("only if", "A vent opens only if the temperature exceeds 28 degrees.");
    expect(a.length).toBe(1);
    expect(a[0].text.toLowerCase()).toBe("only if");
  });

  it("splits a comparative the statement separates", () => {
    const a = anchorsFor("more … than", "Only if the curve is more recent than the sample.");
    expect(a.length).toBe(2);
    expect(a.map((x) => x.text.toLowerCase())).toEqual(["more", "than"]);
  });

  it("ignores a trailing period in the authored quote", () => {
    const a = anchorsFor("lags.", "The reading lags behind the reference cell.");
    expect(a.length).toBe(1);
    expect(a[0].text.toLowerCase()).toBe("lags");
  });

  it("does not anchor a figure to a bare preposition", () => {
    const a = anchorsFor("closer to … than to", "The value sits closer to one curve than to the other.");
    expect(a.every((x) => x.text.toLowerCase() !== "to")).toBe(true);
  });

  it("keeps anchors in the order they appear in the statement", () => {
    for (const s of signals) {
      for (const r of s.relations) {
        const starts = r.anchors.map((a) => a.start);
        expect([...starts].sort((x, y) => x - y)).toEqual(starts);
      }
    }
  });
});

describe("reading the answer", () => {
  const single = signals.find((s) => s.relations.length === 1)!;
  const multi = byOrder(27);

  it("credits the type and the quoted indicator", () => {
    const r = readAnswer(single, single.relations[0].kind + ', "' + single.relations[0].indicators[0] + '"');
    expect(r.found).toEqual([single.relations[0].kind]);
    expect(r.quotedIndicators).toBe(true);
    expect(r.missed).toEqual([]);
  });

  it("marks the type found but the indicator missing when only the type is given", () => {
    const r = readAnswer(single, single.relations[0].kind);
    expect(r.found).toEqual([single.relations[0].kind]);
    expect(r.quotedIndicators).toBe(false);
  });

  it("names a relationship the statement does not carry as invented", () => {
    const absent = (["conditional", "causal", "comparative"] as const).find(
      (k) => !single.relations.some((r) => r.kind === k),
    )!;
    const r = readAnswer(single, absent);
    expect(r.invented).toContain(absent);
    expect(r.drawn).not.toContain(absent);
  });

  it("lists what a partial answer missed on a multi-relationship item", () => {
    const r = readAnswer(multi, 'conditional, "Only if"');
    expect(r.found).toEqual(["conditional"]);
    expect(r.missed).toEqual(["causal"]);
  });

  it("does not draw a correctly named type without its indicator", () => {
    const r = readAnswer(multi, "conditional and comparative");
    expect(r.drawn).toEqual([]);
    expect(r.invented).toEqual(["comparative"]);
  });

  /**
   * The dial says "Comparison", so students write it. The reader used to know
   * only "comparative" and told a right answer its figure was still undrawn.
   */
  it("reads the names students actually use for each type", () => {
    const comparative = byOrder(9);
    for (const answer of ["comparison, louder than", "Comparisons: louder than", "comparative, louder than"]) {
      expect(readAnswer(comparative, answer).missed, answer).toEqual([]);
    }
    const causal = byOrder(6);
    for (const answer of ["causation: destroyed", "cause and effect, destroyed", "causal, destroyed"]) {
      expect(readAnswer(causal, answer).missed, answer).toEqual([]);
    }
    const conditional = byOrder(1);
    for (const answer of ["Necessary condition: only if", "if-then, only if", "if/then rule, only if", "a requirement, only if"]) {
      expect(readAnswer(conditional, answer).missed, answer).toEqual([]);
    }
  });

  it("does not hear 'because' as naming a cause", () => {
    expect(readAnswer(byOrder(1), "conditional, because of only if").invented).toEqual([]);
  });

  /**
   * Ruling a type out is the discrimination this drill trains. Counting the
   * ruled-out word as a claim drew a ghost for the mistake the student avoided.
   */
  it("does not count a type the student explicitly ruled out", () => {
    expect(readAnswer(byOrder(15), "conditional, requires (not causal)").invented).toEqual([]);
    expect(readAnswer(byOrder(1), "Conditional. It isn't causal. Only if").invented).toEqual([]);
    expect(readAnswer(byOrder(22), "causal, yield. Not a comparison").invented).toEqual([]);
    expect(readAnswer(byOrder(22), "causal, yield, rather than comparative").invented).toEqual([]);
  });

  it("still counts a type named after a ruled-out one", () => {
    const r = readAnswer(byOrder(1), "not causal, conditional: only if");
    expect(r.found).toEqual(["conditional"]);
    expect(r.invented).toEqual([]);
  });

  it("finds nothing in an answer that names no type", () => {
    const r = readAnswer(single, "not sure what this one is");
    expect(r.found).toEqual([]);
    expect(r.drawn).toEqual([]);
    expect(r.missed.length).toBeGreaterThan(0);
  });
});

describe("instant grading", () => {
  const item = (n: number) => drill.items.find((i) => i.order === n)!;

  it("accepts every credited answer as written", () => {
    for (const i of drill.items) expect(matchesCredited(i, i.credited_answers[0]), `item ${i.order}`).toBe(true);
  });

  it("accepts the game format without quotes, and the names students use", () => {
    expect(matchesCredited(item(1), "conditional, only if")).toBe(true);
    expect(matchesCredited(item(1), "Conditional - only-if")).toBe(true);
    expect(matchesCredited(item(1), "necessary condition: ONLY IF")).toBe(true);
    expect(matchesCredited(item(9), "comparison, louder than")).toBe(true);
    expect(matchesCredited(item(6), "causation: destroyed")).toBe(true);
    expect(matchesCredited(item(15), "conditional, requires (not causal)")).toBe(true);
    expect(matchesCredited(item(27), "conditional only if; causal because")).toBe(true);
    expect(matchesCredited(item(29), "conditional only when, comparative lower than, causal expands")).toBe(true);
  });

  /** False never means wrong. These all go to the Coach for a real judgment. */
  it("leaves anything short of the key to the Coach", () => {
    expect(matchesCredited(item(1), "conditional")).toBe(false); // type alone
    expect(matchesCredited(item(1), "only if")).toBe(false); // words alone
    expect(matchesCredited(item(1), "causal, only if")).toBe(false); // wrong type
    expect(matchesCredited(item(1), "conditional and causal, only if")).toBe(false); // invented type
    expect(matchesCredited(item(29), "conditional, only when")).toBe(false); // one of three
    expect(matchesCredited(item(29), "conditional only when, comparative lower than, causal")).toBe(false); // causal unquoted
    expect(matchesCredited(item(15), "causal, requires")).toBe(false);
    expect(matchesCredited(item(1), "")).toBe(false);
  });

  it("does not hear 'only if' as the 'if' an item is keyed on", () => {
    expect(matchesCredited(item(2), "conditional, only if")).toBe(false);
    expect(matchesCredited(item(2), "conditional, if")).toBe(true);
  });

  it("needs both halves of a split indicator", () => {
    expect(matchesCredited(item(48), "conditional Only if; comparative more; causal produces")).toBe(false);
    expect(matchesCredited(item(48), "conditional Only if; comparative more ... than; causal produces")).toBe(true);
  });
});

describe("every credited answer reads clean", () => {
  it("finds every relationship and no invented one, on all 48", () => {
    for (const s of signals) {
      const item = drill.items.find((i) => i.order === s.order)!;
      const r = readAnswer(s, item.credited_answers[0]);
      expect(r.invented, `item ${s.order}`).toEqual([]);
      expect(r.missed, `item ${s.order}`).toEqual([]);
      expect(r.quotedIndicators, `item ${s.order}`).toBe(true);
    }
  });
});


describe("split quotations and local pair vocabulary", () => {
  const item = (order: number) => drill.items.find((i) => i.order === order)!;
  const pairs = (order: number, comparison: string) => item(order).answer_key!.relationships.map((r) =>
    `${r.type}, "${r.type === "comparative" ? comparison : r.indicators[0]}"`).join("; ");

  it.each([
    [11, "less time than"], [11, "less ... than"], [25, "stronger ... than"],
    [25, "stronger on the eastern array than"], [34, "harder stone than"],
    [39, "closer ... than"], [39, "closer to ... than"], [39, "closer to ... than to"],
    [39, "closer to the C3 range than to"], [40, "thicker oxide layer than"],
    [43, "faster at ambient temperature than"], [48, "more regionally appropriate than"], [48, "more ... than"],
  ])("Q%s confirms the valid split or exact span %s in both paths", (order, quote) => {
    const answer = pairs(order, quote);
    expect(matchesCredited(item(order), answer)).toBe(true);
    const reading = readAnswer(byOrder(order), answer);
    expect(reading.drawn).toContain("comparative");
    expect(reading.missed).toEqual([]);
    // The stage must credit a comparison even when other pairs remain missing.
    expect(readAnswer(byOrder(order), `comparison, "${quote}"`).drawn).toEqual(["comparative"]);
  });

  it.each([
    [11, "less"], [25, "stronger"], [25, "than ... stronger"],
    [25, "stronger invented words than"], [25, "stronger on the western than"],
    [39, "closer to"], [39, "than to ... closer to"], [40, "thicker oxide than"],
    [43, "faster at an invented temperature than"], [48, "more"], [48, "than ... more"],
  ])("Q%s refers missing/reversed/invented span %s to Coach", (order, quote) => {
    expect(matchesCredited(item(order), pairs(order, quote))).toBe(false);
    expect(readAnswer(byOrder(order), `comparison, "${quote}"`).drawn).toEqual([]);
  });

  it("binds comma-separated synonyms to their own indicator", () => {
    for (const condition of ["condition", "conditions", "requirement", "requirements", "necessary condition",
      "sufficient conditions", "if-then", "if/then rule", "conditional", "conditionally", "conditionals"]) {
      for (const cause of ["causal", "cause", "causes", "caused", "cause and effect", "causation", "causally", "causality"]) {
        const answer = `${condition}, only if, ${cause}, because`;
        expect(matchesCredited(item(27), answer), answer).toBe(true);
        expect(readAnswer(byOrder(27), answer).missed, answer).toEqual([]);
        expect(matchesCredited(item(27), `${condition}, because, ${cause}, only if`)).toBe(false);
      }
    }
    for (const comparison of ["comparative", "comparatively", "comparison", "comparisons", "compare", "compares", "comparing", "compared"])
      expect(matchesCredited(item(29), `condition, only when, ${comparison}, lower than, cause, expands`)).toBe(true);
  });

  it("rejects extra types and contradictory duplicate pairs even with a valid wider span", () => {
    const answer = pairs(40, "thicker oxide layer than");
    expect(matchesCredited(item(40), `${answer}; comparison, provided`)).toBe(false);
    expect(readAnswer(byOrder(40), `${answer}; comparison, provided`).drawn).not.toContain("comparative");
    expect(matchesCredited(item(25), 'comparison, "stronger on the eastern array than"; conditions, on')).toBe(false);
  });
});


describe("split endpoints quoted apart", () => {
  it.each([
    [11, '"less" and "than"'], [25, '"stronger", "than"'], [25, '"stronger" and "than"'],
    [39, '"closer to" and "than to"'], [40, '"thicker", "than"'],
    [43, '"faster" and "than"'], [48, '"more" and "than"'], [48, '"more", "than"'],
  ])("Q%s accepts only the ordered keyed endpoints %s", (order, quotation) => {
    const item = drill.items.find((i) => i.order === order)!;
    const answer = item.answer_key!.relationships.map((r) =>
      `${r.type}, ${r.type === "comparative" ? quotation : `"${r.indicators[0]}"`}`).join("; ");
    expect(matchesCredited(item, answer)).toBe(true);
    expect(readAnswer(parseSignal(item)!, `comparison, ${quotation}`).drawn).toEqual(["comparative"]);
  });
  it.each(['"than" and "more"', '"more", "because", "than"', '"more" and arbitrary prose and "than"',
    '"more" and "than" and "because"', '"more" and "than" is not the indicator'])(
    "refers non-keyed or reversed endpoint sequences to Coach: %s", (quotation) => {
      const item = drill.items.find((i) => i.order === 48)!;
      const answer = `conditional, only if; comparative, ${quotation}; causal, produces`;
      expect(matchesCredited(item, answer)).toBe(false);
      expect(readAnswer(parseSignal(item)!, answer).drawn).not.toContain("comparative");
    },
  );
});
