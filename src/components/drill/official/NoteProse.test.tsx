import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoteProse, parseNote } from "./NoteProse";

const note = `This sounds strong. This looks like this: Motivate inventing → Financial reward ~Financial reward → ~Motivate Inventing

Her argument was essentially this:

~Patent → ~Financial → ~Inventions rights incentive`;

describe("NoteProse", () => {
  it("splits run-together chains and keeps the lead sentence as text", () => {
    const blocks = parseNote(note);
    // The rule and its contrapositive stay in one card, one row each.
    expect(blocks.map((b) => b.kind)).toEqual(["text", "chains", "text", "chains"]);
    expect(blocks[1]).toEqual({ kind: "chains", chains: [
      [{ text: "Motivate inventing", negated: false }, { text: "Financial reward", negated: false }],
      [{ text: "Financial reward", negated: true }, { text: "Motivate Inventing", negated: true }],
    ] });
    expect(blocks[3].kind === "chains" && blocks[3].chains[0].every((t) => t.negated)).toBe(true);
  });

  it("draws a negated idea struck through, never with a tilde", () => {
    const { container } = render(<NoteProse note={note} />);
    expect(container.textContent).not.toContain("~");
    expect(container.querySelectorAll(".ct-neg").length).toBe(5);
    expect(screen.getByRole("img", { name: "not Patent leads to not Financial leads to not Inventions rights incentive" })).toBeInTheDocument();
  });

  it("keeps each chain on one unbroken row", () => {
    const { container } = render(<NoteProse note={note} />);
    expect(container.querySelectorAll(".note-chain").length).toBe(2);
    expect(container.querySelectorAll(".note-chain__row").length).toBe(3);
  });

  it("leaves prose without arrows untouched", () => {
    expect(parseNote("Plain reason.\n\nSecond paragraph.")).toEqual([{ kind: "text", text: "Plain reason." }, { kind: "text", text: "Second paragraph." }]);
  });
});
