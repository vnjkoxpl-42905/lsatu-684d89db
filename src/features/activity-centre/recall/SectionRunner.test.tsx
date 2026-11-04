import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import pt134 from "../content/read-recall-colour-pt134-s3.json";
import { SectionRunner } from "./SectionRunner";
import { isRunLive } from "@/lib/liveRun";
import { stashRows } from "./recordingBackup";

/** The local stash a row that never landed goes into, so it has a way back. */
vi.mock("./recordingBackup", async (importOriginal) => {
  const real = await importOriginal<typeof import("./recordingBackup")>();
  return { ...real, stashRows: vi.fn(() => Promise.resolve()) };
});

// The section runner, driven the way she drives it: one key, pressed twice per
// stimulus, start to finish.
//
// Everything asserted here is a rule the design states negatively, and each one
// fails silently rather than loudly if it breaks: a stimulus that stays on
// screen through its Recall, a verdict shown mid-run, or a write inside the
// loop all look like a working screen. She runs twenty unbroken minutes with
// nothing checking on her, so these are asserted rather than trusted.

type Row = Record<string, unknown>;
/** Every write of a stimulus row: during the run, and the backstop at the end. */
const upsert = vi.fn((_rows: Row[]) => Promise.resolve({ error: null }));
/** The one read: which Attempt is this. */
const attemptRows = { data: [] as Row[], error: null as unknown };
const readAttempt = vi.fn(() => Promise.resolve(attemptRows));
const responseRows = { data: [] as Row[], error: null as unknown };
const upload = vi.fn(() => Promise.resolve({ error: null }));
/** The assignment close: `.update(patch).eq("id", id)`. */
const update = vi.fn((_patch: Row) => Promise.resolve({ data: { id: "a1", status: "completed", completed_at: "2026-09-30T10:00:00Z" }, error: null }));
/** The fire-and-forget ask for a grade. */
const invoke = vi.fn((_fn: string, _opts: Row) => Promise.resolve({ data: null, error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: async (rows: Row[]) => {
        const result = await upsert(rows);
        if (!result.error) for (const row of rows) {
          if (!responseRows.data.some(saved => saved.item_order === row.item_order && saved.attempt_no === row.attempt_no)) responseRows.data.push(row);
        }
        return result;
      },
      update: (patch: Row) => ({ eq: () => ({ or: () => ({ select: () => ({ maybeSingle: () => update(patch) }) }) }) }),
      select: (columns: string) => columns === "*" ? {
        eq: () => ({ eq: () => ({ order: () => ({ order: () => Promise.resolve(responseRows) }) }) }),
      } : columns.includes("completed_at") ? { eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) } : ({
        eq: () => ({
          eq: () => ({ order: () => ({ limit: () => readAttempt() }) }),
        }),
      }),
    }),
    storage: { from: () => ({ upload: () => upload(), list: () => Promise.resolve({ data: [{ id: "audio", name: "a1.webm" }, { id: "audio2", name: "a1-a2.webm" }, { id: "audio3", name: "a1-a3.webm" }], error: null }) }) },
    functions: { invoke: (fn: string, opts: Row) => invoke(fn, opts) },
  },
}));

/**
 * A microphone that works, because a section without one no longer runs.
 *
 * jsdom has neither `navigator.mediaDevices` nor `MediaRecorder`, so every test
 * in this file used to take the recorder's refused-microphone path -- which was
 * the wrong default even before it stopped working. The drill is spoken end to
 * end and the grader refuses a run with no recording, so the ready beat now
 * holds rather than counting down into twenty-five minutes nothing can mark.
 * The beat holding without a microphone is asserted on its own, below.
 */
class FakeRecorder {
  static isTypeSupported = () => true;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state = "inactive";
  constructor(
    _stream: MediaStream,
    readonly options?: { mimeType?: string },
  ) {}
  get mimeType() {
    return this.options?.mimeType ?? "audio/webm";
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

/** Granted, unless a test says otherwise. */
function grantMicrophone() {
  const stream = { getTracks: () => [{ stop: () => {} }] } as unknown as MediaStream;
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.resolve(stream)) },
  });
}

/** Refused, the way a browser refuses it. */
function refuseMicrophone() {
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.reject(denied)) },
  });
}

/**
 * An input with a voice on it, for the beat's check.
 *
 * jsdom has no AudioContext at all, which is the silent case. This one hands
 * the analyser samples well above the noise floor, so the bar moves on its
 * first frame and the beat hears her.
 */
class LoudAudioContext {
  createAnalyser() {
    return {
      fftSize: 512,
      getFloatTimeDomainData: (samples: Float32Array) => samples.fill(0.05),
    };
  }
  createMediaStreamSource() {
    return { connect: () => {} };
  }
  close() {
    return Promise.resolve();
  }
}

/** One stimulus, so a full run is two presses. */
const ONE = { ...pt105, items: [pt105.items[0]] };
/** Two, for the rules about what never comes back. */
const TWO = { ...pt105, items: pt105.items.slice(0, 2) };
/** The 26-stimulus section observed in the audit. */
const TWENTY_SIX = pt134;
const CHUNKS = ONE.items[0].chunks;

async function renderRun(overrides: Partial<Parameters<typeof SectionRunner>[0]> = {}) {
  const onComplete = vi.fn();
  const view = render(
    <SectionRunner
      assignmentId="a1"
      studentId="s1"
      items={ONE.items}
      sourceSection={ONE.source_section}
      timeGoalMinutes={ONE.time_goal_minutes}
      onComplete={onComplete}
      // The three-second ready beat is real and tested on its own, below. Every
      // other test here is about the loop AFTER it, so they start where a
      // student starts pressing rather than waiting three seconds each.
      readySeconds={0}
      {...overrides}
    />,
  );
  // The microphone is asked for on mount and answers in a microtask. The ready
  // beat waits for that answer now, so a test that pressed Space before it
  // arrived would be pressing at a held beat rather than at stimulus one.
  await act(async () => {});
  return { ...view, onComplete };
}

const space = () => fireEvent.keyDown(document, { code: "Space" });
const finish = (count: number) => {
  for (let i = 0; i < count * 2; i += 1) space();
};

beforeEach(() => {
  grantMicrophone();
  upsert.mockClear();
  attemptRows.data = [];
  attemptRows.error = null;
  readAttempt.mockReset().mockImplementation(() => Promise.resolve(attemptRows));
  responseRows.data = [];
  responseRows.error = null;
  upload.mockClear();
  update.mockClear();
  localStorage.removeItem("rrc:completion:s1:a1");
  invoke.mockClear();
});

describe("what she sees while working", () => {
  it("puts the whole stimulus on screen from the first frame", async () => {
    await renderRun();
    // Full stimulus, no cursor, no rail: she reads, recalls and colours in
    // whatever units she likes, and the screen does not mark where she is.
    for (const chunk of CHUNKS) {
      expect(screen.getByText(chunk.text)).toBeInTheDocument();
    }
  });

  it("marks no chunk as current, done, or upcoming", async () => {
    await renderRun();
    // A place marker would be the chunk cursor coming back as styling. The
    // grain is hers, so no chunk is treated differently from any other.
    const marked = document.querySelectorAll(
      ".is-reading, .is-speaking, .is-done, .is-upcoming",
    );
    expect(marked).toHaveLength(0);
  });

  it("never tells her she read aloud", async () => {
    await renderRun();
    expect(screen.getByText(/tell it back/i)).toBeInTheDocument();
  });

  it("shows elapsed time counting up", async () => {
    // This screen carried no clock at all, on the reasoning that a running
    // clock produces the rushed reading the drill treats. Joshua overruled it:
    // the drill is timed and she cannot pace 25 minutes blind. Counting UP is
    // the part that matters -- a number falling towards zero is the version
    // that was rejected, and a countdown here would be a regression, not a
    // restyle. The goal itself is not shown; the clock is only a pace cue.
    await renderRun();
    expect(screen.getByText("0:00")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Goal/);
    expect(document.body.textContent).not.toMatch(/-\d+:\d\d/);
  });

  it("actually counts once the ready beat is over", async () => {
    // The ticker was started in an effect that ran once, during the beat, and
    // returned early; nothing re-ran it when the beat ended. Every run of the
    // 2026-09-03 audit read 0:00 at minute 46. Real timers here, because the
    // effect and the interval both have to fire on their own.
    // No microphone check here: this test is about the clock after the beat,
    // and jsdom has no AudioContext for the check to hear anything through.
    await renderRun({ readySeconds: 1, micCheckSeconds: 0 });
    await vi.waitFor(() => expect(screen.queryByText("0:00")).not.toBeInTheDocument(), { timeout: 4000 });
    await vi.waitFor(() => expect(screen.getByText(/^0:0[1-9]$/)).toBeInTheDocument(), { timeout: 4000 });
  }, 10000);
});

describe("The Recall", () => {
  it("removes the text on the first press, entirely", async () => {
    await renderRun();
    space();
    // The text vanishes and she says the whole argument back from memory.
    // Truly gone, not hidden: a chunk left in the DOM would be read back to a
    // student using a screen reader, which defeats the drill for her exactly.
    for (const chunk of CHUNKS) {
      expect(document.body.textContent).not.toContain(chunk.text);
    }
    expect(screen.getByText(/from memory/i)).toBeInTheDocument();
  });

  it("does not bring a finished stimulus back", async () => {
    render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
        readySeconds={0}
      />,
    );
    await act(async () => {});
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
  it("judges nothing and shows no verdict at any point in the run", async () => {
    await renderRun();
    for (let i = 0; i < 2; i++) {
      // A live verdict trains her to vet before speaking, which is the exact
      // habit colouring exists to break.
      expect(document.body.textContent).not.toMatch(/correct|incorrect|missed|score|you said/i);
      space();
    }
  });

  it("shows her no Detail list, which is the answer key", async () => {
    await renderRun();
    const details = CHUNKS.flatMap((c) => c.details.map((d) => d.text));
    for (let i = 0; i < 2; i++) {
      for (const detail of details) {
        expect(screen.queryByText(detail)).toBeNull();
      }
      space();
    }
  });

  it("shows her no captured takeaway, which stays unused on purpose", async () => {
    await renderRun();
    // The captured key is wired to nothing (ADR 0012). Rendering it would be
    // the accidental version of turning the takeaway back on.
    for (let i = 0; i < 2; i++) {
      expect(screen.queryByText(ONE.items[0].the_read)).toBeNull();
      space();
    }
  });
});

describe("writing it down", () => {
  it("shows truthful loading while section history is pending, before microphone or countdown", async () => {
    let resolveHistory: (value: typeof attemptRows) => void;
    readAttempt.mockImplementationOnce(() => new Promise(resolve => { resolveHistory = resolve; }));
    await renderRun();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your section history. Recording has not started.");
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByText(/recording now/i)).not.toBeInTheDocument();
    await act(async () => { resolveHistory(attemptRows); });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });
  it("blocks microphone start and retries a failed history read without guessing attempt 1", async () => {
    attemptRows.error = new Error("offline");
    const { onComplete } = await renderRun();
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Retry loading" })).toBeInTheDocument());
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    attemptRows.error = null;
    attemptRows.data = [{ attempt_no: 1 }];
    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
    await act(async () => {});
    finish(1);
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(responseRows.data[0].attempt_no).toBe(2);
  });

  it("does not accept an ignored duplicate row belonging to another recording", async () => {
    responseRows.data = [{ assignment_id: "a1", student_id: "s1", item_order: 1, attempt_no: 1, rrc: { audio_path: "old.webm" } }];
    const { onComplete } = await renderRun();
    finish(1);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Retry saving" })).toBeInTheDocument());
    expect(update).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("holds the report on denied completion and retries status without replaying evidence", async () => {
    update.mockResolvedValueOnce({ data: null, error: { message: "offline" } });
    const { onComplete } = await renderRun();
    finish(1);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Retry saving" })).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    const writes = upsert.mock.calls.length;
    expect(localStorage.getItem("rrc:completion:s1:a1")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(writes);
    expect(localStorage.getItem("rrc:completion:s1:a1")).toBeNull();
  });

  it("treats a zero-row completion acknowledgment as a failed closeout", async () => {
    update.mockResolvedValueOnce({ data: null, error: null });
    const { onComplete } = await renderRun();
    finish(1);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Retry saving" })).toBeInTheDocument());
    expect(onComplete).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("does not complete when final response persistence fails", async () => {
    upsert.mockResolvedValue({ error: { message: "offline" } });
    const { onComplete } = await renderRun();
    finish(1);
    await vi.waitFor(() => expect(screen.getByText(/answer did not reach us/i)).toBeInTheDocument());
    expect(update).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    upsert.mockResolvedValue({ error: null });
  });
  it("writes nothing until the section is over", async () => {
    await renderRun();
    // A dropped connection must not be able to stall her mid-section, so there
    // is no network call inside the loop at all.
    space();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("asks the server to grade the run, without waiting on it", async () => {
    await renderRun();
    space();
    space();

    // The grade is produced by an edge function that transcribes the whole
    // recording; the student must not be held on that promise, and a closed tab
    // must not cost her a Report Card.
    await vi.waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(invoke.mock.calls[0][0]).toBe("grade-rrc-section");
    expect(invoke.mock.calls[0][1]).toEqual({ body: { assignmentId: "a1" } });
  });

  it("marks the assignment completed at the end", async () => {
    await renderRun();
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
    await renderRun();
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

  it("closes the run after the backstop recovers a failed first row write", async () => {
    upsert.mockImplementationOnce(() => Promise.resolve({ error: { message: "nope" } }));
    await renderRun();
    space();
    space();

    // The first write failed; the final backstop succeeds before closeout.
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][0].status).toBe("completed");
  });

  it("writes one row per stimulus, and finishes", async () => {
    const { onComplete } = await renderRun();
    space();
    space();

    // Written as the stimulus finishes, then re-sent by the backstop at the
    // end. Both carry the same row, so what is asserted below holds of either.
    await vi.waitFor(() => expect(upsert).toHaveBeenCalled());
    const rows = upsert.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0].assignment_id).toBe("a1");
    expect(rows[0].item_order).toBe(ONE.items[0].order);
    // Nothing was transcribed. The column is NOT NULL, so a null here is not
    // "not captured", it is a row Postgres refuses -- and on Safari and
    // Firefox, which have no SpeechRecognition, that was every row of every
    // run. "Not captured" lives in `transcript_source`, which stays null.
    expect(rows[0].response_text).toBe("");
    expect((rows[0].rrc as Record<string, unknown>).transcript_source).toBeNull();

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

  it("keeps her on the recovery sentence when the recording never arrived", async () => {
    /*
     * The answers saved and the audio did not, which is the failure this
     * screen's recovery sentence exists for: the recording is still on this
     * computer and opening the section again from the same browser sends it.
     *
     * `onComplete` used to fire anyway, because the gate was only "did the rows
     * save". The Report Card screen replaced that sentence within a frame with
     * "Marking your run", and three minutes later with "Still being marked, it
     * will be here when you come back", which was false: nothing had been
     * uploaded and nothing was being marked. The one instruction that would
     * have recovered her run was on screen for a few hundred milliseconds.
     */
    upload.mockResolvedValueOnce({ error: { message: "network" } });
    upload.mockResolvedValueOnce({ error: { message: "network" } });
    const onExit = vi.fn();
    const { onComplete } = await renderRun({ onExit });
    space();
    space();

    await vi.waitFor(() =>
      expect(screen.getByText(/recording did not reach us/i)).toBeInTheDocument(),
    );
    expect(onComplete).not.toHaveBeenCalled();
    // And a way out. The exit was conditional on unsaved ANSWERS, so the run
    // whose only fault was the recording had an instruction and no button.
    fireEvent.click(screen.getByRole("button", { name: /back to the activity centre/i }));
    expect(onExit).toHaveBeenCalled();
  });

  it("does not ask for a grade there is no recording to make", async () => {
    // The grader refuses a run with no recording, so asking produces a "Not
    // scored" card rather than a Report Card.
    upload.mockResolvedValueOnce({ error: { message: "network" } });
    upload.mockResolvedValueOnce({ error: { message: "network" } });
    await renderRun();
    space();
    space();
    await vi.waitFor(() =>
      expect(screen.getByText(/recording did not reach us/i)).toBeInTheDocument(),
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("scores a student with extra time against her own goal", async () => {
    await renderRun({ accommodation: "accommodation_70" });
    space();
    space();
    await vi.waitFor(() => expect(upsert).toHaveBeenCalled());
    const rrc = upsert.mock.calls[0][0][0].rrc as Record<string, unknown>;
    // Grading her against the standard goal would score her accommodation as a
    // failure, which is the whole reason the goal is three numbers.
    expect(rrc.accommodation).toBe("accommodation_70");
    expect(rrc.goal_minutes).toBe(ONE.time_goal_minutes.accommodation_70);
  });

  it("keeps the work of a section abandoned halfway, but never makes it a run", async () => {
    const { unmount } = render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
        readySeconds={0}
      />,
    );
    await act(async () => {});
    space();
    space();
    await vi.waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0]).toHaveLength(1);
    unmount();

    /*
     * Her work is kept, and the run is still not a run.
     *
     * These used to be one statement: nothing was written until the last
     * stimulus, so abandoning a section threw away every word said in it. A
     * closed lid cost twenty minutes. Saving and judging are different acts and
     * only the second is refused here -- the assignment is never marked
     * finished, so nothing will grade this.
     */
    expect(update).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("saves a stimulus as it finishes, not only when the section ends", async () => {
    render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
        readySeconds={0}
      />,
    );
    await act(async () => {});
    // The first stimulus only. The section is nowhere near over.
    space();
    space();

    await vi.waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0]).toHaveLength(1);
    const rrc = upsert.mock.calls[0][0][0].rrc as Record<string, unknown>;
    // The recorder has not stopped and nothing is uploaded, yet the row already
    // names where its audio will be. The path is a function of the student, the
    // assignment and the Attempt, so it can be known before the file exists.
    expect(rrc.audio_path).toBe("s1/a1.webm");
    // Only the end knows how long the whole section took.
    expect(rrc.section_total_seconds).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("puts a second sitting under its own Attempt, so it cannot collide with the first", async () => {
    attemptRows.data = [{ attempt_no: 1 }];
    await renderRun();
    space();
    space();

    await vi.waitFor(() => expect(upsert).toHaveBeenCalled());
    const row = upsert.mock.calls[0][0][0];
    // An abandoned sitting leaves its stimuli behind now. A second run starting
    // at stimulus 1 would collide with them on the unique index, lose the
    // write, and be graded as a mixture of two sittings with one sitting's
    // audio.
    expect(row.attempt_no).toBe(2);
    expect((row.rrc as Record<string, unknown>).audio_path).toBe("s1/a1-a2.webm");
  });

  it("retries a row that fails once during the run and finishes without a warning", async () => {
    let first = true;
    upsert.mockImplementation((rows: Row[]) => {
      const order = rows[0]?.item_order;
      if (order === TWO.items[0].order && first) {
        first = false;
        return Promise.resolve({ error: { message: "brief outage" } });
      }
      return Promise.resolve({ error: null });
    });
    render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
        readySeconds={0}
      />,
    );
    await act(async () => {});

    finish(1);
    await vi.waitFor(
      () =>
        expect(
          upsert.mock.calls.filter(([rows]) => rows[0]?.item_order === TWO.items[0].order),
        ).toHaveLength(2),
      { timeout: 2500 },
    );
    finish(1);

    await vi.waitFor(() => expect(screen.getByText(/Section finished/)).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(/answers did not reach us/i);
  });

  it("does not let one permanently bad row prevent the other 25 from being stored", async () => {
    const stored = new Set<number>();
    upsert.mockImplementation((rows: Row[]) => {
      const order = Number(rows[0]?.item_order);
      if (rows.length === 1 && order !== 8) stored.add(order);
      return Promise.resolve({ error: order === 8 ? { message: "row rejected" } : null });
    });
    render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWENTY_SIX.items}
        sourceSection={TWENTY_SIX.source_section}
        timeGoalMinutes={TWENTY_SIX.time_goal_minutes}
        readySeconds={0}
      />,
    );
    await act(async () => {});
    finish(26);

    await vi.waitFor(() => expect(screen.getByText(/1 answer did not reach us/i)).toBeInTheDocument());
    expect(stored.size).toBe(25);
    expect(stored.has(8)).toBe(false);
  });

  it("lets the backstop store a good row when the row beside it is rejected", async () => {
    const stored = new Set<number>();
    upsert.mockImplementation((rows: Row[]) => {
      const order = Number(rows[0]?.item_order);
      if (order === TWO.items[1].order) stored.add(order);
      return Promise.resolve({
        error: order === TWO.items[0].order ? { message: "row rejected" } : null,
      });
    });
    render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
        readySeconds={0}
      />,
    );
    await act(async () => {});
    finish(2);

    await vi.waitFor(() => expect(screen.getByText(/1 answer did not reach us/i)).toBeInTheDocument());
    expect(upsert.mock.calls.every(([rows]) => rows.length === 1)).toBe(true);
    expect(stored.has(TWO.items[1].order)).toBe(true);
  });

  it("stashes exactly the rows that did not land, and tells her they will be sent", async () => {
    // Without this the rows die with the component and ADR 0027 refuses the run
    // for ever, including a recording that uploaded perfectly.
    const stash = vi.mocked(stashRows);
    stash.mockClear();
    upsert.mockImplementation((rows: Row[]) =>
      Promise.resolve({ error: Number(rows[0]?.item_order) === TWO.items[0].order ? { message: "down" } : null }),
    );
    render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={TWO.items}
        sourceSection={TWO.source_section}
        timeGoalMinutes={TWO.time_goal_minutes}
        readySeconds={0}
      />,
    );
    await act(async () => {});
    finish(2);

    await vi.waitFor(() => expect(stash).toHaveBeenCalled());
    const stashed = stash.mock.calls.at(-1)![0];
    expect(stashed).toHaveLength(1);
    expect(stashed[0].itemOrder).toBe(TWO.items[0].order);
    expect(stashed[0].assignmentId).toBe("a1");
    expect(stashed[0].studentId).toBe("s1");
    // The sentence stops being a dead end.
    expect(screen.getByText(/Open this section again from the same browser/i)).toBeInTheDocument();
  });

  it("names an unsaved answer at the end, but says nothing on a clean run", async () => {
    upsert.mockImplementation((rows: Row[]) =>
      Promise.resolve({ error: rows[0]?.item_order === ONE.items[0].order ? { message: "down" } : null }),
    );
    const { unmount } = await renderRun();
    finish(1);
    await vi.waitFor(() => expect(screen.getByText(/1 answer did not reach us/i)).toBeInTheDocument());
    expect(invoke).not.toHaveBeenCalled();
    unmount();

    upsert.mockImplementation(() => Promise.resolve({ error: null }));
    await renderRun();
    finish(1);
    await vi.waitFor(() => expect(screen.getByText(/Section finished/)).toBeInTheDocument());
    expect(document.body.textContent).not.toMatch(/answers did not reach us/i);
  });
});

describe("a snapshot that is not a section", () => {
  it("says so instead of rendering a blank screen", async () => {
    render(
      <SectionRunner assignmentId="a1" studentId="s1" items={[]} sourceSection={null} timeGoalMinutes={null} />,
    );
    await act(async () => {});
    expect(screen.getByText(/could not be read/i)).toBeInTheDocument();
  });
});

/**
 * The three seconds before the first stimulus.
 *
 * The microphone opens on mount and the clock used to start with it, so the
 * first thing an unrepeatable 25-minute take captured was a student still
 * settling -- and her first frame was already stimulus one. The beat is where
 * the recording is proved: the level indicator is live through it, so a muted
 * input is visible before anything costs her.
 */
describe("the ready beat", () => {
  it("does not show the first stimulus until the beat has run", async () => {
    await renderRun({ readySeconds: 3 });
    expect(screen.getByText(/microphone on/i)).toBeInTheDocument();
    expect(screen.queryByText(CHUNKS[0].text)).not.toBeInTheDocument();
  });

  it("ignores Space during it, so a stray press cannot start the section early", async () => {
    await renderRun({ readySeconds: 3 });
    space();
    space();
    space();
    // Still the beat: the presses went nowhere rather than eating stimulus one.
    expect(screen.getByText(/microphone on/i)).toBeInTheDocument();
  });

  it("holds the section clock at zero through it", async () => {
    // Three seconds of settling must not be charged to a 25-minute goal.
    await renderRun({ readySeconds: 3 });
    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("hands over to the first stimulus when it ends", async () => {
    await renderRun({ readySeconds: 0 });
    expect(await screen.findByText(CHUNKS[0].text)).toBeInTheDocument();
    expect(screen.queryByText(/microphone on/i)).not.toBeInTheDocument();
  });

  /*
   * The check. "Say something to check your microphone" used to be printed
   * over a count that ran whether or not anything was ever heard. The count
   * now waits for the first sound, or for the check to run out.
   */
  it("does not start counting until it has heard her", async () => {
    // jsdom has no AudioContext, so the bar never attaches and nothing is heard.
    await renderRun({ readySeconds: 1, micCheckSeconds: 10 });
    expect(screen.getByText(/say something to check your microphone/i)).toBeInTheDocument();
    expect(screen.queryByText(/starting/i)).toBeNull();
    await new Promise((r) => setTimeout(r, 1500));
    // A one-second beat that had been counting would be over by now.
    expect(screen.getByText(/say something to check your microphone/i)).toBeInTheDocument();
    expect(screen.queryByText(CHUNKS[0].text)).toBeNull();
  }, 10000);

  it("counts anyway once the check has run out, and says nothing was heard", async () => {
    await renderRun({ readySeconds: 1, micCheckSeconds: 0.3 });
    expect(await screen.findByText(/nothing heard yet/i, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(await screen.findByText(CHUNKS[0].text, {}, { timeout: 3000 })).toBeInTheDocument();
  }, 10000);

  it("counts as soon as it has heard her", async () => {
    vi.stubGlobal("AudioContext", LoudAudioContext);
    try {
      await renderRun({ readySeconds: 1, micCheckSeconds: 10 });
      // The sound arrives inside an animation frame, outside act, so a polling
      // query never sees it flushed. A short real wait does; the beat then
      // holds on "Heard you." for the whole one-second count.
      await new Promise((r) => setTimeout(r, 300));
      expect(screen.getByText("Heard you.")).toBeInTheDocument();
      expect(screen.getByText(/starting in 1/i)).toBeInTheDocument();
      expect(await screen.findByText(CHUNKS[0].text, {}, { timeout: 3000 })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  }, 10000);
});

/**
 * Leaving.
 *
 * A half-finished section writes nothing and is deliberately never a partial
 * score, which is the right rule and is exactly what makes one click on a
 * permanently visible button worth up to twenty-five minutes.
 */
/*
 * The microphone said no, and the drill is only spoken.
 *
 * With `getUserMedia` rejecting, the beat showed the heading "Recording now"
 * over a footer saying nothing was being recorded, counted to zero anyway, and
 * handed her a 26-stimulus run that the grader refuses for having no recording.
 * There was no way to ask again and no way to stop before the clock started.
 */
describe("a refused microphone", () => {
  beforeEach(() => refuseMicrophone());

  it("does not claim to be recording", async () => {
    await renderRun({ readySeconds: 3 });
    expect(screen.queryByText(/microphone on/i)).toBeNull();
    expect(screen.getByText(/no microphone/i)).toBeInTheDocument();
  });

  it("names the consequence rather than the fault", async () => {
    await renderRun({ readySeconds: 3 });
    expect(screen.getByText(/nothing to mark at the end/i)).toBeInTheDocument();
  });

  it("holds the beat instead of counting into a run nothing can mark", async () => {
    await renderRun({ readySeconds: 3 });
    expect(screen.queryByText(/starting in/i)).toBeNull();
    await new Promise((r) => setTimeout(r, 1200));
    // Still the beat, and still no stimulus: the clock has not started.
    expect(screen.getByText(/no microphone/i)).toBeInTheDocument();
    for (const chunk of CHUNKS) {
      expect(document.body.textContent).not.toContain(chunk.text);
    }
  }, 10000);

  it("cannot be started past by pressing the key", async () => {
    await renderRun({ readySeconds: 3 });
    space();
    space();
    expect(screen.getByText(/no microphone/i)).toBeInTheDocument();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("offers a way to ask again, and asking again starts the section", async () => {
    await renderRun({ readySeconds: 3 });
    const again = screen.getByRole("button", { name: /ask again/i });
    grantMicrophone();
    await act(async () => {
      fireEvent.click(again);
    });
    expect(screen.queryByText(/no microphone/i)).toBeNull();
    await vi.waitFor(() => expect(screen.getByText(/microphone on/i)).toBeInTheDocument(), {
      timeout: 4000,
    });
  }, 10000);

  it("offers a way out, and leaving costs nothing because nothing has begun", async () => {
    const onExit = vi.fn();
    await renderRun({ readySeconds: 3, onExit });
    fireEvent.click(screen.getByRole("button", { name: /leave this section/i }));
    expect(onExit).toHaveBeenCalled();
  });
});

describe("the way out", () => {
  it("does not leave on the first click, and says what would be lost", async () => {
    const onExit = vi.fn();
    await renderRun({ onExit });
    fireEvent.click(screen.getByRole("button", { name: /leave/i }));
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/no partial score/i)).toBeInTheDocument();
  });

  it("stays when she says so", async () => {
    const onExit = vi.fn();
    await renderRun({ onExit });
    fireEvent.click(screen.getByRole("button", { name: /leave/i }));
    fireEvent.click(screen.getByRole("button", { name: /keep going/i }));
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // And she is back on the stimulus she was working, not somewhere new.
    expect(screen.getByText(CHUNKS[0].text)).toBeInTheDocument();
  });

  it("leaves when she confirms", async () => {
    const onExit = vi.fn();
    await renderRun({ onExit });
    fireEvent.click(screen.getByRole("button", { name: /leave/i }));
    fireEvent.click(screen.getByRole("button", { name: /leave and lose it/i }));
    expect(onExit).toHaveBeenCalled();
  });

  it("does not advance the drill underneath the question", async () => {
    /*
     * The confirm claimed `aria-modal` and trapped nothing, so focus could sit
     * on Pause behind it and Space still ran the loop: she could be asked
     * whether to throw the section away while the section carried on without
     * her. The stage traps Tab now; this is the other half, on the key itself.
     */
    await renderRun({ onExit: vi.fn() });
    expect(screen.getByText(CHUNKS[0].text)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /leave/i }));
    space();
    // Still working the same stimulus. A Space that got through would have
    // hidden the text and asked her for The Recall, behind the dialog.
    expect(screen.getByText(CHUNKS[0].text)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not ask during the beat, when there is nothing to lose", async () => {
    const onExit = vi.fn();
    await renderRun({ onExit, readySeconds: 3 });
    fireEvent.click(screen.getByRole("button", { name: /leave/i }));
    expect(onExit).toHaveBeenCalled();
  });
});

/**
 * The app must not reload itself over a live take.
 *
 * `main.tsx` reloads the tab whenever a newer bundle has been published, on
 * every return to it. Everywhere else that costs a flicker. Here it costs the
 * section: the recorder lives in this tab and nothing is written until she
 * finishes, so publishing while she works and her glancing at another tab was
 * enough to lose the run.
 */
describe("holding the app still", () => {
  it("marks a run live while it is on screen, and clears it after", async () => {
    const { unmount } = render(
      <SectionRunner
        assignmentId="a1"
        studentId="s1"
        items={ONE.items}
        sourceSection={ONE.source_section}
        timeGoalMinutes={ONE.time_goal_minutes}
        readySeconds={0}
      />,
    );
    expect(isRunLive()).toBe(true);
    unmount();
    expect(isRunLive()).toBe(false);
  });
});
