import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  OrientationCardView,
  ORIENTATION_STEPS,
  answeredCount,
  firstUnansweredStep,
} from "./OrientationCard";
import { UNDECIDED_TEST_DATE } from "@/lib/onboarding";

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
  it("opens immediately so setup is prominent on Home", () => {
    render(<OrientationCardView initialName="" initialAnswers={{}} onSave={save()} />);
    expect(screen.getByText("Set up your classroom")).toBeTruthy();
    expect(screen.getByLabelText("Your name")).toBeTruthy();
  });

  it("resumes immediately at the first required unanswered step", () => {
    render(
      <OrientationCardView
        initialName="Ada"
        initialAnswers={{ last_score_band: "156_160" }}
        onSave={save()}
      />,
    );
    expect(screen.getByText("What score are you aiming for?")).toBeTruthy();
    expect(screen.getByText(`Step 5 of ${ORIENTATION_STEPS.length}`)).toBeTruthy();
  });

  it("saves the name on the first Continue and moves on", async () => {
    const onSave = save();
    render(<OrientationCardView initialName="" initialAnswers={{}} onSave={onSave} />);
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

  it("requires an explicit availability choice before finishing", async () => {
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
    await screen.findByText("Build your study week");

    const finish = screen.getByRole("button", { name: /Finish/ }) as HTMLButtonElement;
    expect(finish.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Mon: 1–2 hrs" }));
    expect(finish.disabled).toBe(false);
    fireEvent.click(finish);

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        answers: expect.objectContaining({
          study_time: expect.objectContaining({ mon: "1_2" }),
        }),
        complete: true,
      }),
    );
    await screen.findByText("You're set up");
  });

  it("keeps the step open when the save fails", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<OrientationCardView initialName="" initialAnswers={{}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByLabelText("Your name")).toBeTruthy();
    expect(screen.getByText(`Step 1 of ${ORIENTATION_STEPS.length}`)).toBeTruthy();
  });
});
