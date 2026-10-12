import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import pt105 from "../content/read-recall-colour-pt105-s2.json";
import { SectionRunner } from "./SectionRunner";
import { discard, listPendingRuns } from "./recordingBackup";

/**
 * Leaving a section, and what must die with it.
 *
 * On 2026-09-07 a student opened a section at 23:28, left it, and came back at
 * 00:06 to run it properly. The first sitting's recorder was never stopped:
 * nothing stopped it on unmount, so it kept the microphone open and kept
 * writing its backup pieces for the next two hours, through her real run and
 * past the end of it. When she reloaded the page after finishing, that orphan
 * finally went quiet, the recovery pass took it for a crashed run, and
 * uploaded its 116-minute file OVER the 66-minute recording her real sitting
 * had just stored. The grader then refused the run: every window sat 37
 * minutes before its speech.
 *
 * Two rules, asserted here because both failures are silent. A recorder does
 * not outlive the component that started it, and a run she walked out of has
 * no backup worth recovering.
 */

type Row = Record<string, unknown>;
const attemptRows = { data: [] as Row[], error: null as unknown };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: () => Promise.resolve({ error: null }),
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

class FakeRecorder {
  static isTypeSupported = () => true;
  static instances: FakeRecorder[] = [];
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
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

const trackStop = vi.fn();
function grantMicrophone() {
  const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(() => Promise.resolve(stream)) },
  });
}

const ONE = { ...pt105, items: [pt105.items[0]] };

async function mountRun() {
  const view = render(
    <SectionRunner
      assignmentId="a1"
      studentId="s1"
      items={ONE.items}
      sourceSection={ONE.source_section}
      timeGoalMinutes={ONE.time_goal_minutes}
      readySeconds={0}
    />,
  );
  // The microphone answers in a microtask; the Attempt lookup and the backup
  // announcement take a round trip each.
  await act(async () => {});
  await act(async () => {});
  await act(async () => {});
  return view;
}

beforeEach(async () => {
  grantMicrophone();
  FakeRecorder.instances = [];
  trackStop.mockClear();
  attemptRows.data = [];
  for (const run of await listPendingRuns()) await discard(run.runId);
});

describe("leaving a section before it ends", () => {
  it("stops every recorder and releases the microphone", async () => {
    const view = await mountRun();
    // The real recorder and its backup copy, both live.
    expect(FakeRecorder.instances.length).toBeGreaterThanOrEqual(1);
    expect(FakeRecorder.instances.every((r) => r.state === "recording")).toBe(true);

    view.unmount();

    expect(FakeRecorder.instances.every((r) => r.state === "inactive")).toBe(true);
    expect(trackStop).toHaveBeenCalled();
  });

  it("throws the abandoned run's backup away, so recovery can never upload it", async () => {
    const view = await mountRun();
    expect((await listPendingRuns()).length).toBe(1);

    view.unmount();

    // The discard is an IndexedDB transaction, which settles on its own clock.
    await vi.waitFor(async () => expect((await listPendingRuns()).map((r) => r.runId)).toEqual([]), { timeout: 4000 });
  });
});
