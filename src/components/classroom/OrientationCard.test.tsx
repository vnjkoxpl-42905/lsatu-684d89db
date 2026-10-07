import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
      firstUnansweredStep("Ada", { has_taken_lsat: true, last_score_band: "156_160" }),
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
        initialAnswers={{ has_taken_lsat: true, last_score_band: "156_160" }}
        onSave={save()}
      />,
    );
    expect(screen.getByText("What score are you aiming for?")).toBeTruthy();
    expect(screen.getByText(`Step 6 of ${ORIENTATION_STEPS.length}`)).toBeTruthy();
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
    await screen.findByText("Have you taken the LSAT?");
  });

  it("will not continue past a required step with no answer", () => {
    render(
      <OrientationCardView
        initialName="Ada"
        initialAnswers={{ has_taken_lsat: true }}
        onSave={save()}
      />,
    );
    const button = screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "156–160" }));
    expect(button.disabled).toBe(false);
  });

  it("never asks for a score from someone who has not taken the LSAT", async () => {
    const onSave = save();
    render(
      <OrientationCardView initialName="Ada" initialAnswers={{}} onSave={onSave} />,
    );
    await screen.findByText("Have you taken the LSAT?");
    // One step shorter than the full walk, and the counter says so.
    expect(screen.getByText(`Step 2 of ${ORIENTATION_STEPS.length}`)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Not yet/ }));
    expect(screen.getByText(`Step 2 of ${ORIENTATION_STEPS.length - 1}`)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await screen.findByText("How has your LSAT experience been so far?");
    expect(screen.queryByText("What did you get on your last LSAT?")).toBeNull();
  });

  it("asks for the score when they have taken it", async () => {
    render(
      <OrientationCardView initialName="Ada" initialAnswers={{}} onSave={save()} />,
    );
    await screen.findByText("Have you taken the LSAT?");
    fireEvent.click(screen.getByRole("button", { name: /Yes, I have taken it/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await screen.findByText("What did you get on your last LSAT?");
  });

  it("answers the test-date step with 'no date yet' and saves it", async () => {
    const onSave = save();
    render(
      <OrientationCardView
        initialName="Ada"
        initialAnswers={{ has_taken_lsat: true, last_score_band: "156_160", target_score_band: "166_170" }}
        onSave={onSave}
      />,
    );
    await screen.findByText("When are you taking the LSAT?");

    // Real sittings only. The free date field let a student pick a day the
    // LSAT is not given, and the classroom then counted down to it.
    expect(document.querySelector('input[type="date"]')).toBeNull();

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
    // The done panel offers a link to booking, so this one needs a router.
    render(
      <MemoryRouter>
        <OrientationCardView
          initialName="Ada"
          initialAnswers={{
            has_taken_lsat: true,
            last_score_band: "156_160",
            target_score_band: "166_170",
            test_date: "2026-11-14",
            life_stage: "working",
          }}
          onSave={onSave}
        />
      </MemoryRouter>,
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

describe("the finish line", () => {
  /** Walk the last step so the done panel renders the way a student sees it. */
  const finish = async () => {
    render(
      <MemoryRouter>
        <OrientationCardView
          initialName="Ada"
          initialAnswers={{
            has_taken_lsat: true,
            last_score_band: "156_160",
            target_score_band: "166_170",
            test_date: "2026-11-14",
            life_stage: "working",
          }}
          onSave={vi.fn().mockResolvedValue(true)}
          onDone={vi.fn()}
        />
      </MemoryRouter>,
    );
    await screen.findByText("Build your study week");
    fireEvent.click(screen.getByRole("button", { name: "Mon: 1–2 hrs" }));
    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));
    await screen.findByText("You're set up");
  };

  it("offers the session before the classroom", async () => {
    await finish();
    const book = screen.getByRole("link", { name: /Book a session/ });
    expect(book.getAttribute("href")).toBe("/booking");
    expect(screen.getByRole("button", { name: /Back to home/ })).toBeTruthy();
  });

  it("never sends them to an outside booking link", async () => {
    await finish();
    const hrefs = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.every((href) => href.startsWith("/"))).toBe(true);
  });
});
