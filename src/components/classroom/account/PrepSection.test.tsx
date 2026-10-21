import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PrepSectionView } from "./PrepSection";
import { answerSummary } from "@/components/classroom/onboarding/stepFields";
import { UNDECIDED_TEST_DATE, type OnboardingAnswers } from "@/lib/onboarding";

const ANSWERS: OnboardingAnswers = {
  has_taken_lsat: true,
  last_score_band: "156_160",
  schools: ["Osgoode", "U of T"],
  target_score_band: "166_170",
  test_date: "2026-11-14",
  life_stage: "working",
  study_time: {
    sun: "none",
    mon: "1_2",
    tue: "1_2",
    wed: "none",
    thu: "1_2",
    fri: "none",
    sat: "3_plus",
  },
};

describe("answerSummary", () => {
  it("reads each answer back in the student's terms", () => {
    expect(answerSummary("taken_lsat", ANSWERS)).toBe("Yes");
    expect(answerSummary("taken_lsat", { has_taken_lsat: false })).toBe("Not yet");
    expect(answerSummary("last_score", ANSWERS)).toBe("156–160");
    expect(answerSummary("schools", ANSWERS)).toBe("Osgoode, U of T");
    expect(answerSummary("test_date", ANSWERS)).toBe("November 14, 2026");
    expect(answerSummary("life_stage", ANSWERS)).toBe("Working");
    expect(answerSummary("study_time", ANSWERS)).toBe("4 days a week");
  });

  it("does not invent an answer that was never given", () => {
    expect(answerSummary("experience", ANSWERS)).toBeNull();
    expect(answerSummary("last_score", {})).toBeNull();
    expect(answerSummary("taken_lsat", {})).toBeNull();
    expect(answerSummary("study_time", {})).toBeNull();
  });

  it("says so plainly when the student has no date yet", () => {
    expect(answerSummary("test_date", { test_date: UNDECIDED_TEST_DATE })).toBe(
      "No date picked yet",
    );
  });
});

describe("PrepSectionView", () => {
  it("lists every answer and flags the unanswered ones", () => {
    render(
      <PrepSectionView answers={ANSWERS} loading={false} onSave={vi.fn()} />,
    );
    expect(screen.getByText("Test date")).toBeTruthy();
    expect(screen.getByText("November 14, 2026")).toBeTruthy();
    expect(screen.getByText("Not answered yet")).toBeTruthy();
  });

  it("saves only the row that was edited", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(
      <PrepSectionView answers={ANSWERS} loading={false} onSave={onSave} />,
    );

    fireEvent.click(screen.getByLabelText("Edit target score"));
    fireEvent.click(screen.getByRole("button", { name: "171–175" }));
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...ANSWERS,
        target_score_band: "171_175",
      }),
    );
  });

  it("throws away the draft when the student cancels", () => {
    const onSave = vi.fn();
    render(
      <PrepSectionView answers={ANSWERS} loading={false} onSave={onSave} />,
    );

    fireEvent.click(screen.getByLabelText("Edit target score"));
    fireEvent.click(screen.getByRole("button", { name: "171–175" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("166–170")).toBeTruthy();
  });

  it("keeps the row open when the save fails", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(
      <PrepSectionView answers={ANSWERS} loading={false} onSave={onSave} />,
    );

    fireEvent.click(screen.getByLabelText("Edit test date"));
    fireEvent.click(screen.getByRole("button", { name: /I haven't picked a date yet/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });
});

describe("starting the setup again", () => {
  it("asks before wiping the answers", () => {
    const onStartOver = vi.fn().mockResolvedValue(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <PrepSectionView
        answers={{ has_taken_lsat: true }}
        loading={false}
        onSave={vi.fn()}
        onStartOver={onStartOver}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Start my setup again/ }));
    expect(confirm).toHaveBeenCalled();
    expect(onStartOver).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("resets once they say yes", async () => {
    const onStartOver = vi.fn().mockResolvedValue(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <PrepSectionView
        answers={{ has_taken_lsat: true }}
        loading={false}
        onSave={vi.fn()}
        onStartOver={onStartOver}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Start my setup again/ }));
    await waitFor(() => expect(onStartOver).toHaveBeenCalled());
    confirm.mockRestore();
  });

  it("offers nothing to reset where the page cannot do it", () => {
    render(
      <PrepSectionView answers={{}} loading={false} onSave={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /Start my setup again/ })).toBeNull();
  });
});
