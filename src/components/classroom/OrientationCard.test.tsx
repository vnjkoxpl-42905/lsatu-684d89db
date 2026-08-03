import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  OrientationCardView,
  ORIENTATION_STEPS,
  answeredCount,
  firstUnansweredStep,
} from "./OrientationCard";
import { DEFAULT_STUDY_TIME, UNDECIDED_TEST_DATE } from "@/lib/onboarding";

const save = () => vi.fn().mockResolvedValue(true);

describe("orientation progress helpers", () => {
  it("counts the name plus every answered intake step", () => {
    expect(answeredCount("", {})).toBe(0);
    expect(answeredCount("Ada", {})).toBe(1);
    expect(
      answeredCount("Ada", { last_score_band: "156_160", test_date: "2026-11-14" }),
    ).toBe(3);
  });

  it("resumes on the first required step still owed", () => {
    expect(firstUnansweredStep("", {})).toBe(0);
    // Name done, nothing else: the first intake step.
    expect(firstUnansweredStep("Ada", {})).toBe(1);
    // Optional steps never hold the resume point.
    expect(
      firstUnansweredStep("Ada", { last_score_band: "156_160" }),
    ).toBe(ORIENTATION_STEPS.indexOf("target_score"));
  });
});

describe("OrientationCardView", () => {
  it("stays shut until the student opens it", () => {
    render(<OrientationCardView initialName="" initialAnswers={{}} onSave={save()} />);
    expect(screen.getByText("Set up your classroom")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start setup/ })).toBeTruthy();
    expect(screen.queryByLabelText("Your name")).toBeNull();
  });

  it("shows how much is already answered and offers to resume", () => {
    render(
      <OrientationCardView
        initialName="Ada"
        initialAnswers={{ last_score_band: "156_160" }}
        onSave={save()}
      />,
    );
    expect(screen.getByText(`2 of ${ORIENTATION_STEPS.length} answered`)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pick up where you left off/ })).toBeTruthy();
  });

  it("saves the name on the first Continue and moves on", async () => {
    const onSave = save();
    render(<OrientationCardView initialName="" initialAnswers={{}} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Start setup/ }));

    expect(screen.getByText(`Step 1 of ${ORIENTATION_STEPS.length}`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your name"), {
      target: { value: "  Ada Lovelace  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: "Ada Lovelace" }));
    await screen.findByText("What did you get on your last LSAT?");
  });

  it("will not continue past a required step with no answer", () => {
    render(
      <OrientationCardView initialName="Ada" initialAnswers={{}} onSave={save()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pick up where you left off/ }));

    const button = screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "156–160" }));
    expect(button.disabled).toBe(false);
  });

  it("answers the test-date step with 'no date yet' and saves it", async () => {
    const onSave = save();
    render(
      <OrientationCardView
        initialName="Ada"
        initialAnswers={{ last_score_band: "156_160", target_score_band: "166_170" }}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pick up where you left off/ }));
    await screen.findByText("When are you taking the LSAT?");

    fireEvent.click(screen.getByRole("button", { name: /I haven't picked a date yet/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        answers: expect.objectContaining({ test_date: UNDECIDED_TEST_DATE }),
        complete: false,
      }),
    );
  });

  it("completes on the last step, defaulting an untouched study week", async () => {
    const onSave = save();
    render(
      <OrientationCardView
        initialName="Ada"
        initialAnswers={{
          last_score_band: "156_160",
          target_score_band: "166_170",
          test_date: "2026-11-14",
          life_stage: "working",
        }}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pick up where you left off/ }));
    await screen.findByText("When can you study?");

    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        answers: expect.objectContaining({ study_time: DEFAULT_STUDY_TIME }),
        complete: true,
      }),
    );
    await screen.findByText("You're set up");
  });

  it("keeps the step open when the save fails", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<OrientationCardView initialName="" initialAnswers={{}} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: /Start setup/ }));
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByLabelText("Your name")).toBeTruthy();
    expect(screen.getByText(`Step 1 of ${ORIENTATION_STEPS.length}`)).toBeTruthy();
  });
});
