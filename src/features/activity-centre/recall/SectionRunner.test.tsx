import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import { SectionRunner } from "./SectionRunner";

// The section runner, driven the way she drives it: one key, start to finish.
//
// Everything asserted here is a rule the spec states negatively, and each one
// fails silently rather than loudly if it breaks: a chunk that reflows, a
// verdict shown mid-run, or a write inside the loop all look like a working
// screen. She runs twenty unbroken minutes with nothing checking on her, so
// these are asserted rather than trusted.

type Row = Record<string, unknown>;
const insert = vi.fn((_rows: Row[]) => Promise.resolve({ error: null }));
const upload = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: (rows: Row[]) => insert(rows) }),
    storage: { from: () => ({ upload: () => upload() }) },
  },
}));

/**
 * jsdom has no `navigator.mediaDevices`, so the recorder takes its own
 * refused-microphone path and captures nothing. That is the case worth having
 * as the default here: the drill has to run to the end and still write its
 * timings when there is no microphone, because she may well be recording on a
 * handheld instead.
 */

/** One stimulus, so a full run is short enough to drive press by press. */
const ONE = { ...pt105, items: [pt105.items[0]] };
const CHUNKS = ONE.items[0].chunks;

function renderRun(overrides: Partial<Parameters<typeof SectionRunner>[0]> = {}) {
  const onComplete = vi.fn();
  render(
    <SectionRunner
      assignmentId="a1"
      studentId="s1"
      items={ONE.items}
      sourceSection={ONE.source_section}
      timeGoalMinutes={ONE.time_goal_minutes}
      onComplete={onComplete}
      {...overrides}
    />,
  );
  return { onComplete };
}

const space = () => fireEvent.keyDown(document, { code: "Space" });

/** The rendered chunk spans, in document order. */
function chunkSpans(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".ac-section-chunk"));
}

function stateOf(el: HTMLElement): string {
  return (
    Array.from(el.classList)
      .find((c) => c.startsWith("is-"))
      ?.slice(3) ?? "none"
  );
}

beforeEach(() => {
  insert.mockClear();
  upload.mockClear();
});

describe("what she sees", () => {
  it("puts the whole stimulus on screen from the first frame", () => {
    renderRun();
    // She can see how much is left against the clock without reading ahead,
    // which is the entire reason a section shows everything and v1 shows one.
    expect(chunkSpans()).toHaveLength(CHUNKS.length);
    for (const chunk of CHUNKS) {
      expect(screen.getByText(chunk.text)).toBeInTheDocument();
    }
  });

  it("blurs what she has not reached and blanks only what she is recalling", () => {
    renderRun();
    expect(chunkSpans().map(stateOf)).toEqual([
      "reading",
      ...CHUNKS.slice(1).map(() => "blurred"),
    ]);

    space();
    // Blank and blurred are different instructions and must never look alike:
    // blurred is present but unreadable, blank is read and being said back.
    expect(chunkSpans().map(stateOf)).toEqual([
      "blank",
      ...CHUNKS.slice(1).map(() => "blurred"),
    ]);

    space();
    expect(chunkSpans().map(stateOf)).toEqual([
      "done",
      "reading",
      ...CHUNKS.slice(2).map(() => "blurred"),
    ]);
  });

  it("keeps every chunk in the DOM the whole time, so the layout cannot reflow", () => {
    renderRun();
    // Text jumping is the failure that loses her place mid-section. The blank
    // is the real text turned transparent, so the box stays the real box; a
    // chunk leaving the DOM would be the version of this that reflows.
    for (let i = 0; i < CHUNKS.length * 2; i++) {
      expect(chunkSpans(), `after ${i} presses`).toHaveLength(CHUNKS.length);
      space();
    }
  });

  it("hides the blanked chunk from screen readers without removing it", () => {
    renderRun();
    space();
    const inner = chunkSpans()[0].querySelector("[aria-hidden]");
    expect(inner?.getAttribute("aria-hidden")).toBe("true");
    // Still there, still holding its box.
    expect(chunkSpans()[0].textContent).toContain(CHUNKS[0].text);
  });

  it("brings the whole stimulus back sharp for The Read", () => {
    renderRun();
    for (let i = 0; i < CHUNKS.length * 2; i++) space();
    expect(chunkSpans().map(stateOf).every((s) => s === "done")).toBe(true);
    expect(screen.getByText(/give your read/i)).toBeInTheDocument();
  });

  it("never tells her she read aloud, and never shows a clock", () => {
    renderRun();
    // She reads silently; only the recall, the colour and The Read are spoken.
    expect(screen.getByText(/read it silently/i)).toBeInTheDocument();
    space();
    expect(screen.getByText(/say it back/i)).toBeInTheDocument();
    // No clock on screen, for the same reason v1 has none: a running clock in
    // view is what produces the rushed reading this drill exists to treat.
    expect(document.body.textContent).not.toMatch(/\d+:\d\d/);
  });
});

describe("what she never sees", () => {
  it("judges nothing and shows no verdict at any point in the run", () => {
    renderRun();
    for (let i = 0; i < CHUNKS.length * 2 + 1; i++) {
      // A live verdict trains her to vet before speaking, which is the exact
      // habit colouring exists to break.
      expect(document.body.textContent).not.toMatch(/correct|incorrect|missed|score|you said/i);
      space();
    }
  });

  it("shows her no detail list, which is the answer key", () => {
    renderRun();
    const details = CHUNKS.flatMap((c) => c.details.map((d) => d.text));
    for (let i = 0; i < CHUNKS.length * 2; i++) {
      for (const detail of details) {
        expect(screen.queryByText(detail)).toBeNull();
      }
      space();
    }
  });

  it("shows her no captured Read before she has given her own", () => {
    renderRun();
    for (let i = 0; i < CHUNKS.length * 2; i++) {
      expect(screen.queryByText(ONE.items[0].the_read)).toBeNull();
      space();
    }
  });
});

describe("writing it down", () => {
  it("writes nothing until the section is over", () => {
    renderRun();
    // A dropped connection must not be able to stall her mid-section, so there
    // is no network call inside the loop at all.
    for (let i = 0; i < CHUNKS.length * 2; i++) {
      expect(insert).not.toHaveBeenCalled();
      space();
    }
  });

  it("writes one row per stimulus once, at the end, and finishes", async () => {
    const { onComplete } = renderRun();
    for (let i = 0; i < CHUNKS.length * 2 + 1; i++) space();

    // The write waits on the recorder being stopped and its file put away, so
    // it lands a tick after the last press rather than during it.
    await vi.waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    const rows = insert.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0].assignment_id).toBe("a1");
    expect(rows[0].item_order).toBe(ONE.items[0].order);
    // Nothing was transcribed, and an empty string here would record silence
    // where the truth is "not captured".
    expect(rows[0].response_text).toBeNull();

    const rrc = rows[0].rrc as Record<string, unknown>;
    expect(rrc.mode).toBe("section");
    expect(rrc.source_section).toBe("PT105.S2");
    expect(rrc.slug).toBe(ONE.items[0].slug);
    expect(rrc.accommodation).toBe("standard");
    expect(rrc.goal_minutes).toBe(ONE.time_goal_minutes.standard);
    expect((rrc.chunk_seconds as unknown[]).length).toBe(CHUNKS.length);

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.getByText(/section finished/i)).toBeInTheDocument();
  });

  it("scores a student with extra time against her own goal", async () => {
    renderRun({ accommodation: "accommodation_70" });
    for (let i = 0; i < CHUNKS.length * 2 + 1; i++) space();
    await vi.waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    const rrc = insert.mock.calls[0][0][0].rrc as Record<string, unknown>;
    // Grading her against the standard goal would score her accommodation as a
    // failure, which is the whole reason the goal is three numbers.
    expect(rrc.accommodation).toBe("accommodation_70");
    expect(rrc.goal_minutes).toBe(ONE.time_goal_minutes.accommodation_70);
  });

  it("writes nothing for a section she abandoned halfway", () => {
    const { unmount } = render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={ONE.items}
        sourceSection={ONE.source_section}
        timeGoalMinutes={ONE.time_goal_minutes}
      />,
    );
    space();
    space();
    unmount();
    // A section is the unit of work. Half a section is not a partial score; it
    // is not a run.
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("a snapshot that is not a section", () => {
  it("says so instead of rendering a blank screen", () => {
    render(
      <SectionRunner assignmentId="a1" studentId="s1" items={[]} sourceSection={null} timeGoalMinutes={null} />,
    );
    expect(screen.getByText(/could not be read/i)).toBeInTheDocument();
    expect(chunkSpans()).toHaveLength(0);
  });
});
