import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import { SectionRunner } from "./SectionRunner";

/**
 * Stepping away from a section, and coming back to the same one.
 *
 * A section is twenty-five unbroken minutes, scored whole, and the only way out
 * of one was the way that throws it away. On 2026-09-08 a student sat at
 * stimulus 18 of 22, past the half-hour, and asked for the thing that did not
 * exist: a way to stop for a moment. Her two options were to spend the
 * interruption on the clock or to lose the twenty-five minutes, and she took a
 * screenshot instead of either.
 *
 * Every rule below fails silently if it breaks, which is why they are asserted
 * rather than trusted:
 *
 * - a paused stimulus she can still read is untimed reading time on a timed
 *   drill, and nothing on screen would say so;
 * - a clock that keeps running through a break charges her for it;
 * - a recorder that keeps running while the clock stops puts the break in the
 *   file and nowhere in the index, so every segment after it names the wrong
 *   stretch of audio -- a wrong grade that looks like a right one.
 */

type Row = Record<string, unknown>;
const upsert = vi.fn((_rows: Row[]) => Promise.resolve({ error: null }));
const attemptRows = { data: [] as Row[], error: null as unknown };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: (rows: Row[]) => upsert(rows),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      select: () => ({
        eq: () => ({
          eq: () => ({ order: () => ({ limit: () => Promise.resolve(attemptRows) }) }),
        }),
      }),
    }),
    storage: { from: () => ({ upload: () => Promise.resolve({ error: null }) }) },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  },
}));

/** A recorder that pauses, which is what every browser that has one does. */
class FakeRecorder {
  static isTypeSupported = () => true;
  static instances: FakeRecorder[] = [];
  /** Set to make `pause()` a no-op, the way a browser is allowed to. */
  static refusesToPause = false;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state = "inactive";
  constructor(
    _stream: MediaStream,
    readonly options?: { mimeType?: string },
  ) {
    FakeRecorder.instances.push(this);
  }
  get mimeType() {
    return this.options?.mimeType ?? "audio/webm";
  }
  start() {
    this.state = "recording";
  }
  pause() {
    if (FakeRecorder.refusesToPause) return;
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

function grantMicrophone() {
  const stream = { getTracks: () => [{ stop: () => {} }] } as unknown as MediaStream;
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.resolve(stream)) },
  });
}

const ONE = { ...pt105, items: [pt105.items[0]] };
const TWO = { ...pt105, items: pt105.items.slice(0, 2) };
const OPENING = ONE.items[0].chunks[0].text.slice(0, 40);

/** A clock the test drives, so a break can be minutes long and take no time. */
let clock = 0;
const now = () => clock;
const pass = (seconds: number) => {
  clock += seconds * 1000;
};

const space = () => fireEvent.keyDown(document, { code: "Space" });
const pause = () => fireEvent.click(screen.getByRole("button", { name: "Pause" }));
const resume = () => fireEvent.click(screen.getByRole("button", { name: "Back to it" }));
const onPaper = () => screen.queryByText((_t, node) => node?.className === "ac-section-stimulus");

async function renderRun(overrides: Partial<Parameters<typeof SectionRunner>[0]> = {}) {
  const view = render(
    <SectionRunner
      assignmentId="a1"
      studentId="s1"
      items={ONE.items}
      sourceSection={ONE.source_section}
      timeGoalMinutes={ONE.time_goal_minutes}
      readySeconds={0}
      now={now}
      {...overrides}
    />,
  );
  await act(async () => {});
  await act(async () => {});
  return view;
}

/** The `rrc` payload of the newest write of a given stimulus. */
function lastRrcFor(order: number): Record<string, unknown> | null {
  for (let i = upsert.mock.calls.length - 1; i >= 0; i -= 1) {
    const row = upsert.mock.calls[i][0].find((r) => r.item_order === order);
    if (row) return row.rrc as Record<string, unknown>;
  }
  return null;
}

/** Two presses is one stimulus, start to finish. */
async function finishOneStimulus() {
  space();
  space();
  await act(async () => {});
  await act(async () => {});
}

beforeEach(() => {
  grantMicrophone();
  FakeRecorder.instances = [];
  FakeRecorder.refusesToPause = false;
  upsert.mockClear();
  attemptRows.data = [];
  clock = 0;
});

describe("stepping away mid-section", () => {
  it("takes the stimulus off the screen for the whole of the break", async () => {
    await renderRun();
    expect(onPaper()?.textContent).toContain(OPENING);

    pause();

    // Not blurred, not dimmed, not scrolled off: absent, exactly as during The
    // Recall. A text left in the DOM is read aloud to a student on a screen
    // reader, and a text she can reach at all is free reading time.
    expect(onPaper()).toBeNull();
    expect(screen.getByText("Paused", { selector: "p" })).toBeInTheDocument();
  });

  it("gives the stimulus back when she does", async () => {
    await renderRun();
    pause();
    resume();
    expect(onPaper()?.textContent).toContain(OPENING);
  });

  it("shuts the loop, so the one key cannot advance the drill from behind the card", async () => {
    await renderRun({ items: TWO.items });
    pause();

    space();
    space();
    space();

    // Still stimulus one, still paused. Without this a reflex press during a
    // break would spend her next stimulus on an empty room.
    expect(screen.getByText("Paused", { selector: "p" })).toBeInTheDocument();
    resume();
    expect(document.querySelector(".ac-section-where")?.textContent).toBe("Stimulus 1 of 2");
  });

  it("stops writing to the recording, and starts again on the same file", async () => {
    await renderRun();
    // The real recorder and its backup copy.
    expect(FakeRecorder.instances.length).toBe(2);
    expect(FakeRecorder.instances.every((r) => r.state === "recording")).toBe(true);

    pause();
    expect(FakeRecorder.instances.every((r) => r.state === "paused")).toBe(true);

    resume();
    expect(FakeRecorder.instances.every((r) => r.state === "recording")).toBe(true);
    // Still those two. A third would be a second file, which is the one thing
    // the drill forbids outright.
    expect(FakeRecorder.instances.length).toBe(2);
  });

  it("stops the clock, and picks it up where she left it", async () => {
    await renderRun();
    pass(30);
    pause();
    pass(600);
    resume();
    pass(10);
    await finishOneStimulus();

    const rrc = lastRrcFor(1);
    expect(rrc).not.toBeNull();
    // Thirty seconds before the break and ten after it. The ten minutes she was
    // away are not in her time.
    expect(rrc?.elapsed_seconds).toBe(40);
    expect(rrc?.working_seconds).toBe(40);
  });

  it("records how long she was away rather than hiding it", async () => {
    await renderRun();
    pause();
    pass(300);
    resume();
    pause();
    pass(120);
    resume();
    await finishOneStimulus();

    const rrc = lastRrcFor(1);
    expect(rrc?.paused_seconds).toBe(420);
    expect(rrc?.pause_count).toBe(2);
  });

  it("says nothing about pauses on a run she never paused", async () => {
    await renderRun();
    await finishOneStimulus();

    const rrc = lastRrcFor(1);
    expect(rrc?.paused_seconds).toBe(0);
    expect(rrc?.pause_count).toBe(0);
  });

  it("refuses to pause at all rather than half-pause, when the browser will not", async () => {
    FakeRecorder.refusesToPause = true;
    await renderRun();

    pause();

    // The clock stopping while the file kept being written would put the break
    // inside the recording with nothing in the index to say it is there, and
    // every segment after it would point minutes away from the words it names.
    // So the section stays running, and she is told why.
    expect(onPaper()?.textContent).toContain(OPENING);
    expect(screen.getByText(/will not pause the recording/i)).toBeInTheDocument();

    pass(60);
    await finishOneStimulus();
    expect(lastRrcFor(1)?.elapsed_seconds).toBe(60);
    expect(lastRrcFor(1)?.pause_count).toBe(0);
  });

  it("has no pause to offer before the section has started", async () => {
    await renderRun({ readySeconds: 3 });
    // The ready beat: nothing has begun, her time has not started, and there is
    // nothing to step away from.
    expect(screen.getByText(/Microphone on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
  });
});
