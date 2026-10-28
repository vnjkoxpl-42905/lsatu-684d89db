import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { SpeedRound } from "./SpeedRound";
import { ForgeStatement } from "./ForgeStatement";
import { buildForgeTasks, buildSpeedRound, indicatorsUsed } from "./rounds";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-relationship")!;
const speed = buildSpeedRound(drill.items);
const forge = buildForgeTasks(drill.items);

describe("building the rounds", () => {
  it("never flashes the same indicator twice", () => {
    const seen = speed.map((f) => f.indicator.toLowerCase());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("does not let one answer run three deep", () => {
    for (let i = 0; i + 2 < speed.length; i += 1) {
      expect(new Set(speed.slice(i, i + 3).map((f) => f.kind)).size, `at ${i}`).toBeGreaterThan(1);
    }
  });

  it("weights the hard lexicon by leading with the later rungs", () => {
    const firstFew = speed.slice(0, 6).map((f) => f.rung);
    expect(Math.max(...firstFew)).toBeGreaterThanOrEqual(3);
  });

  it("keeps every flashed indicator attached to the statement it came from", () => {
    for (const f of speed) {
      expect(f.statement.length).toBeGreaterThan(10);
      expect(["conditional", "causal", "comparative"]).toContain(f.kind);
    }
  });

  it("builds a forge lexicon only from indicators the bank uses", () => {
    for (const t of forge) {
      expect(t.lexicon.length).toBeGreaterThan(0);
      for (const ind of t.lexicon) expect(ind).toBe(ind.toLowerCase());
    }
  });

  it("asks for each of the three types in turn", () => {
    expect(new Set(forge.slice(0, 3).map((t) => t.kind)).size).toBe(3);
  });

  it("finds the indicator a sentence reached for", () => {
    const conditional = forge.find((t) => t.kind === "conditional")!;
    const used = indicatorsUsed(conditional, "The gate opens only if the badge is valid.");
    expect(used.length).toBeGreaterThan(0);
  });

  it("finds none when the sentence used no indicator of that type", () => {
    const conditional = forge.find((t) => t.kind === "conditional")!;
    expect(indicatorsUsed(conditional, "The weather was pleasant yesterday.")).toEqual([]);
  });

  it("says so rather than inventing rounds when there is no bank", () => {
    expect(buildSpeedRound([])).toEqual([]);
    expect(buildForgeTasks([])).toEqual([]);
  });
});

describe("the Speed Round", () => {
  it("shows the indicator alone, with no statement to reason from", () => {
    const f = speed[0];
    const { getByTestId, queryByTestId } = render(<SpeedRound round={[f]} />);
    expect(getByTestId("ob-flash").textContent).toBe(f.indicator);
    expect(queryByTestId("ob-speed-verdict")).toBeNull();
  });

  it("credits the right call", () => {
    const f = speed[0];
    const { getByTestId } = render(<SpeedRound round={[f]} />);
    fireEvent.click(getByTestId(`ob-speed-${f.kind}`));
    expect(getByTestId("ob-speed-verdict").textContent).toContain("Called right");
  });

  it("names the truth and shows the statement after a miss", () => {
    const f = speed[0];
    const wrong = (["conditional", "causal", "comparative"] as const).find((k) => k !== f.kind)!;
    const { getByTestId } = render(<SpeedRound round={[f]} />);
    fireEvent.click(getByTestId(`ob-speed-${wrong}`));
    const verdict = getByTestId("ob-speed-verdict");
    expect(verdict.textContent).toContain("It is");
    expect(verdict.textContent).toContain(f.statement.slice(0, 20));
  });

  it("will not take a second call", () => {
    const f = speed[0];
    const { getByTestId } = render(<SpeedRound round={[f]} />);
    fireEvent.click(getByTestId(`ob-speed-${f.kind}`));
    const other = (["conditional", "causal", "comparative"] as const).find((k) => k !== f.kind)!;
    expect(getByTestId(`ob-speed-${other}`)).toBeDisabled();
  });

  it("says there is nothing to call rather than rendering an empty round", () => {
    const { getByTestId } = render(<SpeedRound round={[]} />);
    expect(getByTestId("speed-round-empty").textContent).toContain("nothing here to call");
  });
});

describe("Forge a Statement", () => {
  it("asks for a named relationship", () => {
    const { getByTestId } = render(<ForgeStatement tasks={[forge[0]]} />);
    expect(getByTestId("ob-forge-task").textContent).toContain(forge[0].kind);
  });

  it("will not submit an empty statement", () => {
    const { getByTestId } = render(<ForgeStatement tasks={[forge[0]]} />);
    expect(getByTestId("ob-forge-submit")).toBeDisabled();
  });

  it("names the indicator the student built on", () => {
    const conditional = forge.find((t) => t.kind === "conditional")!;
    const { getByTestId } = render(<ForgeStatement tasks={[conditional]} />);
    fireEvent.change(getByTestId("ob-forge-input"), {
      target: { value: "The gate opens only if the badge is valid." },
    });
    fireEvent.click(getByTestId("ob-forge-submit"));
    expect(getByTestId("ob-forge-verdict").textContent).toContain("Indicator found");
  });

  /**
   * The honesty rule for this wing: it reports what it can see and refuses the
   * rest. It must never tell a student their sentence is good.
   */
  it("does not claim the statement is good, only that it found an indicator", () => {
    const conditional = forge.find((t) => t.kind === "conditional")!;
    const { getByTestId } = render(<ForgeStatement tasks={[conditional]} />);
    fireEvent.change(getByTestId("ob-forge-input"), {
      target: { value: "The gate opens only if the badge is valid." },
    });
    fireEvent.click(getByTestId("ob-forge-submit"));
    const verdict = getByTestId("ob-forge-verdict").textContent!;
    expect(verdict).toContain("not something the observatory can see");
    expect(verdict).not.toMatch(/\bcorrect\b|\bwell done\b|\bgood statement\b/i);
  });

  it("says it found nothing without calling the sentence wrong", () => {
    const conditional = forge.find((t) => t.kind === "conditional")!;
    const { getByTestId } = render(<ForgeStatement tasks={[conditional]} />);
    fireEvent.change(getByTestId("ob-forge-input"), {
      target: { value: "The weather was pleasant yesterday." },
    });
    fireEvent.click(getByTestId("ob-forge-submit"));
    const verdict = getByTestId("ob-forge-verdict").textContent!;
    expect(verdict).toContain("No indicator found");
    expect(verdict).toContain("does not make it wrong");
  });

  it("files the student's own statements into the log", () => {
    const { getByTestId } = render(<ForgeStatement tasks={forge.slice(0, 2)} />);
    fireEvent.change(getByTestId("ob-forge-input"), {
      target: { value: "A kiln fires unevenly whenever the vent sticks." },
    });
    fireEvent.click(getByTestId("ob-forge-submit"));
    fireEvent.click(getByTestId("ob-forge-next"));
    expect(getByTestId("ob-forge-log").textContent).toContain("A kiln fires unevenly");
  });

  it("says there is nothing to forge rather than rendering an empty wing", () => {
    const { getByTestId } = render(<ForgeStatement tasks={[]} />);
    expect(getByTestId("forge-empty").textContent).toContain("nothing here to forge");
  });
});
