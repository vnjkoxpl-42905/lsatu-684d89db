import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { ReverseLoom } from "./ReverseLoom";
import { DecodeBench } from "./DecodeBench";
import { buildDecodeBench, buildReverseLoom, foundPhrase, termsReached } from "./rounds";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-callback")!;
const reverse = buildReverseLoom(drill.items);
const bench = buildDecodeBench(drill.items);

describe("building the rounds", () => {
  it("gives every reverse call a real idea and a real phrase", () => {
    expect(reverse.length).toBeGreaterThan(0);
    for (const r of reverse) {
      expect(r.idea.length, `item ${r.order}`).toBeGreaterThan(15);
      expect(r.caller).toContain(r.phrase);
    }
  });

  it("hands the lower sheet over unmarked, since the marking is the answer", () => {
    for (const r of reverse) expect(r.caller).not.toContain("**");
  });

  /**
   * Only the four Q4 items carry an authored decode, because Q4 is the rung
   * whose point is a vocabulary decode. The bench runs four rather than
   * inventing sixteen so the round looks fuller.
   */
  it("builds the bench only from phrases the bank decodes itself", () => {
    expect(bench.length).toBe(4);
    for (const card of bench) {
      expect(card.decode.length).toBeGreaterThan(20);
      expect(card.terms.length).toBeGreaterThan(0);
    }
  });

  it("strips the bank's emphasis marks off the decode", () => {
    for (const card of bench) expect(card.decode).not.toContain("*");
  });

  it("accepts a quoted phrase and rejects an unrelated one", () => {
    const r = reverse[0];
    expect(foundPhrase(r, r.phrase)).toBe(true);
    expect(foundPhrase(r, `I think it is "${r.phrase}"`)).toBe(true);
    expect(foundPhrase(r, "something about the weather")).toBe(false);
    expect(foundPhrase(r, "")).toBe(false);
  });

  it("finds which decode terms an answer engaged with", () => {
    const card = bench[0];
    expect(termsReached(card, `something about ${card.terms[0]}`)).toContain(card.terms[0]);
    expect(termsReached(card, "no idea at all")).toEqual([]);
  });

  it("says so rather than inventing rounds when there is no bank", () => {
    expect(buildReverseLoom([])).toEqual([]);
    expect(buildDecodeBench([])).toEqual([]);
  });
});

describe("The Reverse Loom", () => {
  it("shows the idea and the unmarked sheet", () => {
    const r = reverse[0];
    const { getByTestId } = render(<ReverseLoom round={[r]} />);
    expect(getByTestId("lo-reverse-idea").textContent).toContain(r.idea.slice(0, 25));
    expect(getByTestId("lo-reverse-caller").textContent).toContain(r.phrase);
  });

  it("will not submit an empty answer", () => {
    const { getByTestId } = render(<ReverseLoom round={[reverse[0]]} />);
    expect(getByTestId("lo-reverse-submit")).toBeDisabled();
  });

  it("credits the quoted phrase", () => {
    const r = reverse[0];
    const { getByTestId } = render(<ReverseLoom round={[r]} />);
    fireEvent.change(getByTestId("lo-reverse-input"), { target: { value: r.phrase } });
    fireEvent.click(getByTestId("lo-reverse-submit"));
    expect(getByTestId("lo-reverse-verdict").textContent).toContain("Traced");
  });

  it("shows the phrase after a miss rather than leaving it hidden", () => {
    const r = reverse[0];
    const { getByTestId } = render(<ReverseLoom round={[r]} />);
    fireEvent.change(getByTestId("lo-reverse-input"), { target: { value: "the wrong bit" } });
    fireEvent.click(getByTestId("lo-reverse-submit"));
    const verdict = getByTestId("lo-reverse-verdict");
    expect(verdict.textContent).toContain("Not that one");
    expect(verdict.textContent).toContain(r.phrase);
  });

  it("says there is nothing to trace rather than rendering an empty wing", () => {
    const { getByTestId } = render(<ReverseLoom round={[]} />);
    expect(getByTestId("reverse-loom-empty").textContent).toContain("nothing here to trace");
  });
});

describe("The Decode Bench", () => {
  it("shows the phrase with no passage behind it", () => {
    const card = bench[0];
    const { getByTestId, queryByTestId } = render(<DecodeBench cards={[card]} />);
    expect(getByTestId("lo-decode-phrase").textContent).toBe(card.phrase);
    expect(queryByTestId("lo-sheet-source")).toBeNull();
  });

  it("keeps the authored decode hidden until the student has tried", () => {
    const card = bench[0];
    const { container } = render(<DecodeBench cards={[card]} />);
    expect(container.textContent).not.toContain(card.decode);
  });

  it("reveals the authored decode after an attempt", () => {
    const card = bench[0];
    const { getByTestId } = render(<DecodeBench cards={[card]} />);
    fireEvent.change(getByTestId("lo-decode-input"), { target: { value: "a guess" } });
    fireEvent.click(getByTestId("lo-decode-reveal"));
    expect(getByTestId("lo-decode-verdict").textContent).toContain(card.decode);
  });

  /**
   * The honesty rule for this bench: it reports which terms the student
   * engaged with and refuses to grade their wording.
   */
  it("does not judge the student's wording right or wrong", () => {
    const card = bench[0];
    const { getByTestId } = render(<DecodeBench cards={[card]} />);
    fireEvent.change(getByTestId("lo-decode-input"), { target: { value: "a guess" } });
    fireEvent.click(getByTestId("lo-decode-reveal"));
    const verdict = getByTestId("lo-decode-verdict").textContent!;
    expect(verdict).toContain("not something the bench can judge");
    expect(verdict).not.toMatch(/\bcorrect\b|\bwrong\b|\bwell done\b/i);
  });

  it("names the terms the student actually worked on", () => {
    const card = bench[0];
    const { getByTestId } = render(<DecodeBench cards={[card]} />);
    fireEvent.change(getByTestId("lo-decode-input"), {
      target: { value: `I think ${card.terms[0]} means something about it` },
    });
    fireEvent.click(getByTestId("lo-decode-reveal"));
    expect(getByTestId("lo-decode-verdict").textContent).toContain(card.terms[0]);
  });

  it("says there is nothing to take apart rather than rendering an empty bench", () => {
    const { getByTestId } = render(<DecodeBench cards={[]} />);
    expect(getByTestId("decode-bench-empty").textContent).toContain("nothing here to take apart");
  });
});
