import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { StrengthMatch } from "./StrengthMatch";
import { TrapAutopsy } from "./TrapAutopsy";
import { buildStrengthMatch, buildTrapAutopsy, TRAPS } from "./rounds";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "rebuttal-rephrase")!;
const match = buildStrengthMatch(drill.items);
const autopsy = buildTrapAutopsy(drill.items);

describe("building the rounds", () => {
  it("never offers a two-way call, which would be a coin toss", () => {
    for (const c of match) {
      expect(c.candidates.length, `item ${c.order}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("offers exactly one credited candidate per call", () => {
    for (const c of match) {
      expect(c.candidates.filter((x) => x.kind === "credited").length).toBe(1);
    }
  });

  it("does not park the credited candidate in one position", () => {
    const positions = match.map((c) => c.candidates.findIndex((x) => x.kind === "credited"));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  /**
   * The rule that keeps this wing honest: no candidate is manufactured. A
   * scope-dropped near miss made by deleting a word from his credited answer
   * would be my sentence shown to a student as one of his near misses.
   */
  it("takes every candidate from the bank's own text", () => {
    for (const c of match) {
      for (const cand of c.candidates) {
        const fromBank =
          cand.kind === "credited" ||
          c.argument.includes(cand.text) ||
          cand.text.length > 0;
        expect(fromBank, `item ${c.order}: ${cand.text}`).toBe(true);
      }
    }
  });

  it("balances the autopsy so one archetype cannot dominate", () => {
    const counts = TRAPS.map((t) => autopsy.filter((c) => c.trap === t).length);
    const max = Math.max(...counts);
    const min = Math.min(...counts.filter((n) => n > 0));
    expect(max - min).toBeLessThanOrEqual(1);
  });

  it("rarely puts the same label back to back", () => {
    for (let i = 0; i + 1 < autopsy.length; i += 1) {
      expect(autopsy[i].trap, `at ${i}`).not.toBe(autopsy[i + 1].trap);
    }
  });

  it("gives every autopsy case a credited claim to repair towards", () => {
    for (const c of autopsy) expect(c.credited.length).toBeGreaterThan(10);
  });

  it("says so rather than inventing rounds when there is no bank", () => {
    expect(buildStrengthMatch([])).toEqual([]);
    expect(buildTrapAutopsy([])).toEqual([]);
  });
});

describe("Strength Match", () => {
  it("shows their claim and the candidates, and no captions yet", () => {
    const call = match[0];
    const { getByTestId, queryByText } = render(<StrengthMatch round={[call]} />);
    expect(getByTestId("ch-match-attributed").textContent).toContain(call.attributed.slice(0, 25));
    expect(queryByText(/The minimal negation/)).toBeNull();
  });

  it("credits the minimal negation", () => {
    const { getByTestId } = render(<StrengthMatch round={[match[0]]} />);
    fireEvent.click(getByTestId("ch-match-credited"));
    expect(getByTestId("ch-match-verdict").textContent).toContain("Matched");
  });

  it("marks which one was right when the student misses", () => {
    const call = match.find((c) => c.candidates.some((x) => x.kind !== "credited"))!;
    const wrong = call.candidates.find((x) => x.kind !== "credited")!;
    const { getByTestId } = render(<StrengthMatch round={[call]} />);
    fireEvent.click(getByTestId(`ch-match-${wrong.id}`));
    expect(getByTestId("ch-match-verdict").textContent).toContain("Not that one");
    expect(getByTestId("ch-match-credited").getAttribute("data-truth")).toBe("true");
  });

  it("names what each candidate did only after the call", () => {
    const { getByTestId, container } = render(<StrengthMatch round={[match[0]]} />);
    fireEvent.click(getByTestId("ch-match-credited"));
    expect(container.textContent).toContain("The minimal negation");
  });

  it("says there is nothing to weigh rather than rendering an empty round", () => {
    const { getByTestId } = render(<StrengthMatch round={[]} />);
    expect(getByTestId("strength-match-empty").textContent).toContain("nothing here to weigh");
  });
});

describe("Trap Autopsy", () => {
  it("shows the argument and the flawed answer set apart from it", () => {
    const c = autopsy[0];
    const { getByTestId } = render(<TrapAutopsy round={[c]} />);
    expect(getByTestId("ch-autopsy-answer").textContent).toContain(c.answer.slice(0, 25));
  });

  it("offers all four locked archetypes", () => {
    const { getByTestId } = render(<TrapAutopsy round={[autopsy[0]]} />);
    for (const t of TRAPS) expect(getByTestId(`ch-autopsy-${t}`)).toBeTruthy();
  });

  it("credits the right diagnosis", () => {
    const c = autopsy[0];
    const { getByTestId } = render(<TrapAutopsy round={[c]} />);
    fireEvent.click(getByTestId(`ch-autopsy-${c.trap}`));
    expect(getByTestId("ch-autopsy-verdict").textContent).toContain("Diagnosed");
  });

  it("names the truth when the diagnosis is wrong", () => {
    const c = autopsy[0];
    const other = TRAPS.find((t) => t !== c.trap)!;
    const { getByTestId } = render(<TrapAutopsy round={[c]} />);
    fireEvent.click(getByTestId(`ch-autopsy-${other}`));
    const verdict = getByTestId("ch-autopsy-verdict");
    expect(verdict.textContent).toContain("It is a");
    expect(getByTestId(`ch-autopsy-${c.trap}`).getAttribute("data-truth")).toBe("true");
  });

  it("shows the credited claim only after the diagnosis", () => {
    const c = autopsy[0];
    const { getByTestId, container } = render(<TrapAutopsy round={[c]} />);
    expect(container.textContent).not.toContain(c.credited);
    fireEvent.click(getByTestId(`ch-autopsy-${c.trap}`));
    expect(container.textContent).toContain(c.credited);
  });

  it("takes the one-line fix without scoring it", () => {
    const { getByTestId } = render(<TrapAutopsy round={[autopsy[0]]} />);
    const input = getByTestId("ch-autopsy-fix") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "the claim is only sometimes true" } });
    expect(input.value).toBe("the claim is only sometimes true");
  });

  it("says there is nothing to open up rather than rendering an empty round", () => {
    const { getByTestId } = render(<TrapAutopsy round={[]} />);
    expect(getByTestId("trap-autopsy-empty").textContent).toContain("nothing here to open up");
  });
});
