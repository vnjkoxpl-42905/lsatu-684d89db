import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import { SectionRunner } from "./SectionRunner";

// The section runner, driven the way she drives it: one key, pressed twice per
// stimulus, start to finish.
//
// Everything asserted here is a rule the design states negatively, and each one
// fails silently rather than loudly if it breaks: a stimulus that stays on
// screen through its Recall, a verdict shown mid-run, or a write inside the
// loop all look like a working screen. She runs twenty unbroken minutes with
// nothing checking on her, so these are asserted rather than trusted.

type Row = Record<string, unknown>;
const insert = vi.fn((_rows: Row[]) => Promise.resolve({ error: null }));
const upload = vi.fn(() => Promise.resolve({ error: null }));
/** The assignment close: `.update(patch).eq("id", id)`. */
const update = vi.fn((_patch: Row) => Promise.resolve({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: (rows: Row[]) => insert(rows),
      update: (patch: Row) => ({ eq: () => update(patch) }),
    }),
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

/** One stimulus, so a full run is two presses. */
const ONE = { ...pt105, items: [pt105.items[0]] };
/** Two, for the rules about what never comes back. */
const TWO = { ...pt105, items: pt105.items.slice(0, 2) };
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

beforeEach(() => {
  insert.mockClear();
  upload.mockClear();
  update.mockClear();
});

describe("what she sees while working", () => {
  it("puts the whole stimulus on screen from the first frame", () => {
    renderRun();
    // Full stimulus, no cursor, no rail: she reads, recalls and colours in
    // whatever units she likes, and the screen does not mark where she is.
    for (const chunk of CHUNKS) {
      expect(screen.getByText(chunk.text)).toBeInTheDocument();
    }
  });

  it("marks no chunk as current, done, or upcoming", () => {
    renderRun();
    // A place marker would be the chunk cursor coming back as styling. The
    // grain is hers, so no chunk is treated differently from any other.
    const marked = document.querySelectorAll(
      ".is-reading, .is-speaking, .is-done, .is-upcoming",
    );
    expect(marked).toHaveLength(0);
  });

  it("never tells her she read aloud, and never shows a clock", () => {
    renderRun();
    expect(screen.getByText(/say it back/i)).toBeInTheDocument();
    // No clock on screen, for the same reason v1 has none: a running clock in
    // view is what produces the rushed reading this drill exists to treat.
    expect(document.body.textContent).not.toMatch(/\d+:\d\d/);
  });
});

describe("The Recall", () => {
  it("removes the text on the first press, entirely", () => {
    renderRun();
    space();
    // The text vanishes and she says the whole argument back from memory.
    // Truly gone, not hidden: a chunk left in the DOM would be read back to a
    // student using a screen reader, which defeats the drill for her exactly.
    for (const chunk of CHUNKS) {
      expect(document.body.textContent).not.toContain(chunk.text);
    }
    expect(screen.getByText(/from memory/i)).toBeInTheDocument();
  });

  it("does not bring a finished stimulus back", () => {
    render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
      />,
    );
    space();
    space();
    // Nothing is revisitable until the Report Card. The second press loads the
    // next stimulus; the first is gone for good.
    for (const chunk of TWO.items[1].chunks) {
      expect(screen.getByText(chunk.text)).toBeInTheDocument();
    }
    for (const chunk of TWO.items[0].chunks) {
      expect(document.body.textContent).not.toContain(chunk.text);
    }
  });
});

describe("what she never sees", () => {
  it("judges nothing and shows no verdict at any point in the run", () => {
    renderRun();
    for (let i = 0; i < 2; i++) {
      // A live verdict trains her to vet before speaking, which is the exact
      // habit colouring exists to break.
      expect(document.body.textContent).not.toMatch(/correct|incorrect|missed|score|you said/i);
      space();
    }
  });

  it("shows her no Detail list, which is the answer key", () => {
    renderRun();
    const details = CHUNKS.flatMap((c) => c.details.map((d) => d.text));
    for (let i = 0; i < 2; i++) {
      for (const detail of details) {
        expect(screen.queryByText(detail)).toBeNull();
      }
      space();
    }
  });

  it("shows her no captured takeaway, which stays unused on purpose", () => {
    renderRun();
    // The captured key is wired to nothing (ADR 0012). Rendering it would be
    // the accidental version of turning the takeaway back on.
    for (let i = 0; i < 2; i++) {
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
    space();
    expect(insert).not.toHaveBeenCalled();
  });

  it("marks the assignment completed at the end", async () => {
    renderRun();
    space();
    space();

    // Left out, every RRC section ever run stayed `in_progress` for ever: this
    // branch never called the completion the free-text path calls, so the
    // Classroom's answer to "did she do it" was permanently no.
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const patch = update.mock.calls[0][0];
    expect(patch.status).toBe("completed");
    expect(patch.completed_at).toEqual(expect.any(String));
  });

  it("closes the run without claiming a score", async () => {
    renderRun();
    space();
    space();

    // Coverage is produced afterwards by the grader and lives in its own table
    // (ADR 0019). Writing any scoring column here -- even a null score -- would
    // be a claim that something judged this run, when nothing has.
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const patch = update.mock.calls[0][0];
    for (const column of [
      "score",
      "score_numerator",
      "score_judged",
      "score_total",
      "scoring_version",
    ]) {
      expect(patch).not.toHaveProperty(column);
    }
  });

  it("still closes the run when the rows could not be written", async () => {
    insert.mockImplementationOnce(() => Promise.resolve({ error: { message: "nope" } }));
    renderRun();
    space();
    space();

    // `status` answers "did she do the work", and she did. A failure to store
    // our evidence of it is ours, and must not leave her run looking abandoned.
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0].status).toBe("completed");
  });

  it("writes one row per stimulus once, at the end, and finishes", async () => {
    const { onComplete } = renderRun();
    space();
    space();

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
    // The record is stimulus-grained, like everything else: time working, time
    // recalling, and nothing per chunk, because no chunk boundary was observed.
    expect(typeof rrc.working_seconds).toBe("number");
    expect(typeof rrc.recall_seconds).toBe("number");
    expect("chunk_seconds" in rrc).toBe(false);
    expect("the_read_seconds" in rrc).toBe(false);

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(screen.getByText(/section finished/i)).toBeInTheDocument();
  });

  it("scores a student with extra time against her own goal", async () => {
    renderRun({ accommodation: "accommodation_70" });
    space();
    space();
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
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
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
  });
});
