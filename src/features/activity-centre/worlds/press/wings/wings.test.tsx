import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_ACTIVITIES } from "../../../content";
import { IdeaCensus } from "./IdeaCensus";
import { SlugJudge } from "./SlugJudge";
import { buildIdeaCensus, buildSlugJudge } from "./rounds";

const drill = SEED_ACTIVITIES.find((a) => a.slug === "dumb-it-down")!;
const census = buildIdeaCensus(drill.items);
const judge = buildSlugJudge(drill.items);

describe("the Idea Census", () => {
  it("keeps the paragraph on screen, since the call is made against it", () => {
    const page = census[0];
    const { getByTestId } = render(<IdeaCensus pages={[page]} />);
    expect(getByTestId("idea-census").textContent).toContain(page.monolith.slice(0, 40));
  });

  it("credits calling an authored idea a survivor", () => {
    const page = census[0];
    const idea = page.candidates.find((c) => c.kind === "idea")!;
    const { getByTestId } = render(
      <IdeaCensus pages={[{ ...page, candidates: [idea] }]} />,
    );
    fireEvent.click(getByTestId("pr-census-yes"));
    expect(getByTestId("pr-census-verdict").textContent).toContain("Called right");
  });

  it("marks a trap as something that does not have to survive", () => {
    const page = census[0];
    const trap = page.candidates.find((c) => c.kind === "trap")!;
    const { getByTestId } = render(
      <IdeaCensus pages={[{ ...page, candidates: [trap] }]} />,
    );
    fireEvent.click(getByTestId("pr-census-yes"));
    const verdict = getByTestId("pr-census-verdict").textContent ?? "";
    expect(verdict).toContain("It does not");
    expect(verdict).toContain(trap.why);
  });

  it("shows the authored reason whether the call was right or wrong", () => {
    const page = census[0];
    const foreign = page.candidates.find((c) => c.kind === "foreign")!;
    const { getByTestId } = render(
      <IdeaCensus pages={[{ ...page, candidates: [foreign] }]} />,
    );
    fireEvent.click(getByTestId("pr-census-no"));
    expect(getByTestId("pr-census-verdict").textContent).toContain(foreign.why);
  });

  it("will not take a second call on the same candidate", () => {
    const page = { ...census[0], candidates: census[0].candidates.slice(0, 1) };
    const { getByTestId } = render(<IdeaCensus pages={[page]} />);
    fireEvent.click(getByTestId("pr-census-yes"));
    expect(getByTestId("pr-census-no")).toBeDisabled();
  });

  it("tallies the page against its own length, not against a guess", () => {
    const page = { ...census[0], candidates: census[0].candidates.slice(0, 2) };
    const { getByTestId, container } = render(<IdeaCensus pages={[page]} />);
    for (let i = 0; i < 2; i += 1) {
      // Always answer "must survive", so the tally must equal the survivors.
      fireEvent.click(getByTestId("pr-census-yes"));
      fireEvent.click(getByTestId("pr-census-next"));
    }
    const survivors = page.candidates.filter((c) => c.survives).length;
    expect(container.textContent).toContain(`${survivors} of 2 called right`);
  });

  it("says there is nothing to count rather than rendering an empty bench", () => {
    const { getByTestId } = render(<IdeaCensus pages={[]} />);
    expect(getByTestId("idea-census-empty").textContent).toContain("nothing here to count");
  });
});

describe("the Slug Judge", () => {
  it("holds the thin and hollow staging back until the call is made", () => {
    const call = judge[0];
    const { getByTestId } = render(<SlugJudge calls={[call]} />);
    // Before the pick, no choice carries a tone, so shape cannot answer it.
    for (const kind of ["credited", "narrow", "topic"] as const) {
      expect(getByTestId(`pr-judge-${kind}`).getAttribute("data-tone")).toBeNull();
    }
    fireEvent.click(getByTestId("pr-judge-credited"));
    expect(getByTestId("pr-judge-narrow").getAttribute("data-tone")).toBe("narrow");
    expect(getByTestId("pr-judge-topic").getAttribute("data-tone")).toBe("topic");
  });

  it("credits the credited slug", () => {
    const { getByTestId } = render(<SlugJudge calls={[judge[0]]} />);
    fireEvent.click(getByTestId("pr-judge-credited"));
    expect(getByTestId("pr-judge-verdict").textContent).toContain("Judged right");
  });

  it("names what is wrong with a trap when one is picked", () => {
    const { getByTestId } = render(<SlugJudge calls={[judge[0]]} />);
    fireEvent.click(getByTestId("pr-judge-narrow"));
    expect(getByTestId("pr-judge-verdict").textContent).toContain("Not that one");
    expect(getByTestId("pr-judge-narrow").textContent).toContain("too small");
  });

  it("marks which one was right even when the student missed it", () => {
    const { getByTestId } = render(<SlugJudge calls={[judge[0]]} />);
    fireEvent.click(getByTestId("pr-judge-topic"));
    expect(getByTestId("pr-judge-credited").getAttribute("data-truth")).toBe("true");
  });

  it("shows the checklist unticked, because nobody judged the student's own words", () => {
    const call = judge[0];
    const { getByTestId } = render(<SlugJudge calls={[call]} />);
    fireEvent.click(getByTestId("pr-judge-credited"));
    const verdict = getByTestId("pr-judge-verdict");
    expect(verdict.textContent).toContain(call.ideas[0].text);
    expect(verdict.querySelectorAll('[data-state="kept"]').length).toBe(0);
  });

  it("says there is nothing to judge rather than rendering an empty round", () => {
    const { getByTestId } = render(<SlugJudge calls={[]} />);
    expect(getByTestId("slug-judge-empty").textContent).toContain("nothing here to judge");
  });
});
