import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import readRecallColour from "../content/read-recall-colour.json";
import type { RecallItem } from "../api/types";
import { RecallStage } from "./RecallStage";
import { buildSession, scoreRecall } from "./session";

// The rule this component exists to keep is negative: during `recall` there is
// nothing readable on screen. Hiding the text is the only thing this activity
// has that a voice recorder does not, so it is asserted rather than trusted to
// survive the next layout change.

vi.mock("./RecallOrb", () => ({
  RecallOrb: () => <div data-testid="orb" />,
}));

const FIXTURE = (readRecallColour.items[0] as unknown) as RecallItem;
const session = buildSession(FIXTURE)!;
const chunk = session.steps[0];
const cumulative = session.steps[2];

const props = {
  stepNumber: 1,
  totalSteps: session.steps.length,
  mood: "idle" as const,
  level: 0,
  spoken: true,
  onReadDone: () => {},
  onHold: () => {},
  onRelease: () => {},
  onFeedbackDone: () => {},
};

describe("RecallStage", () => {
  it("shows the chunk during Read, and says it is not coming back", () => {
    render(<RecallStage {...props} step={chunk} phase="read" />);
    expect(screen.getByText(chunk.text!)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
  });

  it("shows NOTHING readable during the recall", () => {
    const view = render(<RecallStage {...props} step={chunk} phase="recall" />);
    // Not the chunk, and not a single detail, which would be the answer key on
    // screen while she is being asked to remember it.
    expect(view.container.textContent).not.toContain(chunk.text!);
    for (const detail of chunk.details) {
      expect(view.container.textContent).not.toContain(detail.text);
    }
    expect(view.container.textContent).not.toContain("freeway");
    // The orb and the button. Nothing to read.
    expect(view.getByTestId("orb")).toBeInTheDocument();
    expect(view.getByRole("button", { name: /hold to talk/i })).toBeInTheDocument();
    view.unmount();

    // Not a transcript either, even when one is handed in: watching her own
    // words appear is rereading with extra steps, and it invites the
    // mid-sentence self-correction the colour stage bans.
    const withTranscript = render(
      <RecallStage {...props} step={chunk} phase="recall" transcript="a news show covered a row" />,
    );
    expect(withTranscript.container.textContent).not.toContain("a news show covered a row");
  });

  it("shows no timer or clock anywhere during a capture", () => {
    // Time is measured silently and reported at the end. A clock on screen is
    // what produces the rushed reading this drill exists to kill.
    const { container } = render(<RecallStage {...props} step={chunk} phase="recall" />);
    expect(container.textContent).not.toMatch(/\d+\s*(s|sec|second|:\d\d)/i);
  });

  it("hides everything during a cumulative round, since there is no text to show", () => {
    const { container } = render(<RecallStage {...props} step={cumulative} phase="recall" />);
    expect(container.textContent).not.toContain("freeway");
    expect(screen.getByTestId("orb")).toBeInTheDocument();
  });

  it("brings the chunk back at feedback, with the details it kept and lost", () => {
    const score = scoreRecall(chunk, "a telly show did a piece on a road row", [1, 2, 3]);
    const { container } = render(
      <RecallStage {...props} step={chunk} phase="feedback" score={score} />,
    );
    expect(screen.getByText(chunk.text!)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-state="kept"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-state="lost"]')).toHaveLength(
      chunk.details.length - 3,
    );
  });

  it("names a cumulative round's misses by the sentence they came from", () => {
    const score = scoreRecall(cumulative, "some of it", []);
    render(<RecallStage {...props} step={cumulative} phase="feedback" score={score} />);
    expect(screen.getByText(/From sentence 1:/)).toBeInTheDocument();
    expect(screen.getByText(/From sentence 2:/)).toBeInTheDocument();
  });

  it("never puts a score or a pass mark on the feedback", () => {
    // "Close enough" is a tolerance, not a threshold. A percentage invites her
    // to work the number instead of the recall.
    const score = scoreRecall(chunk, "a telly show did a piece", [1, 2]);
    const { container } = render(
      <RecallStage {...props} step={chunk} phase="feedback" score={score} />,
    );
    expect(container.textContent).not.toMatch(/%|\b2\s*\/\s*6\b|score/i);
  });

  it("says nobody judged it rather than showing a zero", () => {
    // Unjudged and "nothing survived" are different claims and only one is
    // true. Stamping a zero over an answer nobody checked is a score the app
    // has no basis for.
    const score = scoreRecall(chunk, "said something", undefined);
    const { container } = render(
      <RecallStage {...props} step={chunk} phase="feedback" score={score} />,
    );
    expect(screen.getByText(/could not be checked/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-state="lost"]')).toHaveLength(0);
  });

  it("mentions reciting only when she actually recited", () => {
    const recited = scoreRecall(chunk, chunk.text!, [1]);
    const first = render(<RecallStage {...props} step={chunk} phase="feedback" score={recited} />);
    expect(first.getByText(/word for word/i)).toBeInTheDocument();
    first.unmount();

    const retold = scoreRecall(chunk, "a telly show did a piece on a road row", [1]);
    const second = render(<RecallStage {...props} step={chunk} phase="feedback" score={retold} />);
    expect(second.container.textContent).not.toMatch(/word for word/i);
  });

  it("shows the spoken prompt on screen only when speech is unavailable", () => {
    const spoken = render(<RecallStage {...props} step={chunk} phase="recall" />);
    expect(spoken.container.textContent).not.toContain("Say it back");
    spoken.unmount();

    const silent = render(<RecallStage {...props} step={chunk} phase="recall" spoken={false} />);
    expect(silent.getByText("Say it back.")).toBeInTheDocument();
  });

  it("tells her when the microphone failed, rather than letting her talk into nothing", () => {
    // Silence and a dead input are indistinguishable from her side. Saying
    // nothing while she talks into nothing is the worst version of this.
    const view = render(
      <RecallStage
        {...props}
        step={chunk}
        phase="recall"
        error="The microphone is blocked. Allow it in your browser and try again."
      />,
    );
    expect(view.getByRole("alert")).toHaveTextContent(/microphone is blocked/i);
  });

  it("says nothing about the microphone when it is working", () => {
    const view = render(<RecallStage {...props} step={chunk} phase="recall" />);
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("always offers a way out of a full-screen run", () => {
    // Assignment-gated and full screen. Without this the only exit is the
    // browser's back button, which is a trap rather than a design.
    const onExit = vi.fn();
    const view = render(
      <RecallStage {...props} step={chunk} phase="recall" onExit={onExit} />,
    );
    view.getByRole("button", { name: /leave/i }).click();
    expect(onExit).toHaveBeenCalled();
  });

  it("shows no judgement at all during Colouring In", () => {
    // The colour is never rated, flagged or acknowledged in the moment. Any
    // in-the-moment score teaches her to vet before speaking, which is the
    // exact habit the stage bans.
    const { container } = render(<RecallStage {...props} step={chunk} phase="colour" />);
    expect(container.querySelectorAll("[data-state]")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/generic|good|nice|score/i);
  });
});
