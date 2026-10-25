import { render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ActivityIntro } from "./ActivityIntro";
import { SEED_ACTIVITIES } from "../content";
import sectionInstructions from "../content/read-recall-colour-section.instructions.json";
import type { ActivityInstructions } from "../api/types";

/**
 * The briefing these tests draw is the one Read, Recall, Colour actually
 * ships: six sections and a closer, read on the door and on every section
 * page. It used to come from the base Activity in SEED_ACTIVITIES, which was
 * the only seeded Activity carrying a briefing at all. That Activity is gone
 * -- the drill runs as a whole section now -- so the fixture moved to the
 * file the surfaces read, which is the copy a student is actually shown.
 */
const briefed = sectionInstructions as unknown as ActivityInstructions;

/**
 * The Activity with a task and NO worked example.
 *
 * This shape shipped broken. The brief is absolutely positioned into the hero's
 * empty right half, and the orb cluster is the only thing giving the hero the
 * height to hold it. No worked example means no orbs, so the hero collapsed to
 * the title row and the brief printed on top of the title. Read, Recall, Colour
 * and Dumb it Down are both that shape.
 *
 * It was invisible because the dev harness that exists to catch the intro's
 * content-shaped failures filtered its list to `instructions.worked_example`,
 * so the one shape that broke was the one shape it could not draw.
 *
 * jsdom has no layout, so these assert the contract the CSS keys off rather
 * than the pixels: `data-orbs` must report what actually rendered.
 */

const withoutExample: ActivityInstructions = {
  tagline: "Read it once. Then tell it back with nothing on the screen.",
  task: "Say the chunk back from memory, out loud, in your own words.",
  rules: ["Read the chunk once. When you tap Got it, it disappears."],
  answer_label: "What you said",
};

const withExample: ActivityInstructions = {
  ...withoutExample,
  worked_example: {
    statement: "Investors hesitated, wary of the market's capricious mood swings.",
    credited_answers: ["Capricious probably means unpredictable."],
    explanation: "The sentence supplies the meaning.",
  },
};

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

function hero(container: HTMLElement) {
  return container.querySelector(".act-hero");
}

describe("ActivityIntro without a worked example", () => {
  it("reports no orbs, so the brief is never pinned into a hero that has no lower half", () => {
    const { container } = render(
      <ActivityIntro
        title="Read, Recall, Colour"
        subtitle="Read a chunk, lose it, and tell it back"
        instructions={withoutExample}
        itemCount={1}
        onStart={() => {}}
      />,
    );
    expect(hero(container)).toHaveAttribute("data-orbs", "false");
    expect(container.querySelector(".act-orbs")).toBeNull();
    // The brief still renders. It moves, it does not disappear.
    expect(container.querySelector(".act-brief")).not.toBeNull();
  });

  it("still reports orbs when the Activity does have a worked example", () => {
    const { container } = render(
      <ActivityIntro
        title="Vocab Rehab"
        subtitle="Work out the word from the sentence around it"
        instructions={withExample}
        itemCount={51}
        onStart={() => {}}
      />,
    );
    expect(hero(container)).toHaveAttribute("data-orbs", "true");
    expect(container.querySelector(".act-orbs")).not.toBeNull();
  });

  it("every seeded Activity's rendered orb state matches its own content", () => {
    // The guard against a future Activity being authored into the broken shape
    // without anyone drawing it.
    for (const a of SEED_ACTIVITIES) {
      const { container, unmount } = render(
        <ActivityIntro
          title={a.title}
          subtitle={a.subtitle}
          instructions={a.instructions}
          itemCount={a.items.length}
          format={a.item_format}
          onStart={() => {}}
        />,
      );
      if (a.title === "Spot the Relationship") {
        expect(container.querySelector('[data-testid="relationship-intro"]')).not.toBeNull();
        expect(container.querySelector(".act-orbs")).toBeNull();
      } else {
        expect(hero(container)).toHaveAttribute(
          "data-orbs",
          a.instructions.worked_example ? "true" : "false",
        );
      }
      unmount();
    }
  });
});

describe("the line describing the sitting", () => {
  it("does not promise a spoken Activity tries or a credited answer", () => {
    render(
      <ActivityIntro
        title="Read, Recall, Colour"
        subtitle="Read a chunk, lose it, and tell it back"
        instructions={withoutExample}
        itemCount={1}
        maxAttempts={2}
        format="spoken-recall"
        onStart={() => {}}
      />,
    );
    const how = screen.getByText(/read and told back a chunk at a time/i);
    expect(how.textContent).not.toMatch(/credited answer/i);
    expect(how.textContent).not.toMatch(/tries each/i);
    // "1 questions" was the old output for any single-item Activity.
    expect(how.textContent).not.toMatch(/\bquestions?\b/i);
  });

  it("keeps the typed Activity's line, and counts one question as singular", () => {
    const { container } = render(
      <ActivityIntro
        title="Dumb it Down"
        subtitle="Compress the paragraph"
        instructions={withoutExample}
        itemCount={1}
        maxAttempts={2}
        format="free-text"
        onStart={() => {}}
      />,
    );
    const how = container.querySelector(".act-how")!;
    expect(how.textContent).toMatch(/^1 question\./);
    expect(how.textContent).toMatch(/2 tries each/);
  });

  it("pluralizes above one", () => {
    const { container } = render(
      <ActivityIntro
        title="Vocab Rehab"
        subtitle="Work out the word"
        instructions={withExample}
        itemCount={51}
        maxAttempts={2}
        format="free-text"
        onStart={() => {}}
      />,
    );
    expect(container.querySelector(".act-how")!.textContent).toMatch(/^51 questions\./);
  });
});

describe("the breakdown", () => {
  it("renders every section of an Activity that has one", () => {
    const briefing = briefed.briefing!;
    expect(briefing.sections.length).toBeGreaterThan(0);

    const { container } = render(
      <ActivityIntro
        title="Read, Recall, Colour"
        subtitle="A whole section, out loud"
        instructions={briefed}
        itemCount={22}
        format="spoken-recall"
        onStart={() => {}}
      />,
    );
    expect(container.querySelectorAll(".act-briefing-section")).toHaveLength(
      briefing.sections.length,
    );
    for (const section of briefing.sections) {
      expect(screen.getByText(section.heading)).toBeInTheDocument();
    }
    if (briefing.closer) {
      expect(screen.getByText(briefing.closer)).toBeInTheDocument();
    }
  });

  it("is absent, not empty, on an Activity without one", () => {
    const { container } = render(
      <ActivityIntro
        title="Vocab Rehab"
        subtitle="Work out the word"
        instructions={withExample}
        itemCount={51}
        onStart={() => {}}
      />,
    );
    expect(container.querySelector(".act-briefing")).toBeNull();
  });

  it("carries no em dash, which Joshua never types", () => {
    // Student-facing copy. An em dash reads as machine-written and costs trust.
    const prose = JSON.stringify(briefed.briefing);
    expect(prose).not.toMatch(/[—–]/);
  });
});
