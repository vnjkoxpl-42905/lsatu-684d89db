import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoteProse, parseNote } from "./NoteProse";

const note = `This sounds strong. This looks like this: Motivate inventing → Financial reward ~Financial reward → ~Motivate Inventing

Her argument was essentially this:

~Patent → ~Financial → ~Inventions rights incentive`;

describe("NoteProse", () => {
  it("splits run-together chains and keeps the lead sentence as text", () => {
    const blocks = parseNote(note);
    expect(blocks.map((b) => b.kind)).toEqual(["text", "chain", "chain", "text", "chain"]);
    expect(blocks[1]).toEqual({ kind: "chain", terms: [{ text: "Motivate inventing", negated: false }, { text: "Financial reward", negated: false }] });
    expect(blocks[2]).toEqual({ kind: "chain", terms: [{ text: "Financial reward", negated: true }, { text: "Motivate Inventing", negated: true }] });
    expect(blocks[4].kind === "chain" && blocks[4].terms.every((t) => t.negated)).toBe(true);
  });

  it("draws a negated idea struck through, never with a tilde", () => {
    const { container } = render(<NoteProse note={note} />);
    expect(container.textContent).not.toContain("~");
    expect(container.querySelectorAll(".ct-neg").length).toBe(5);
    expect(screen.getByRole("img", { name: "not Patent leads to not Financial leads to not Inventions rights incentive" })).toBeInTheDocument();
  });

  it("leaves prose without arrows untouched", () => {
    expect(parseNote("Plain reason.\n\nSecond paragraph.")).toEqual([{ kind: "text", text: "Plain reason." }, { kind: "text", text: "Second paragraph." }]);
  });
});
