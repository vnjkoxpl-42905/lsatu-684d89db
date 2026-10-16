import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepField } from "./stepFields";
import type { OnboardingAnswers } from "@/lib/onboarding";

function renderSchools(answers: OnboardingAnswers = {}) {
  const onChange = vi.fn();
  render(<StepField step="schools" answers={answers} onChange={onChange} />);
  return onChange;
}

describe("the schools step", () => {
  it("suggests real law schools as the student types", () => {
    renderSchools();
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "fordh" },
    });
    expect(screen.getByText("Fordham University School of Law")).toBeTruthy();
  });

  it("finds a school by the name students actually use", () => {
    renderSchools();
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "UCLA" },
    });
    expect(
      screen.getByText("University of California, Los Angeles School of Law"),
    ).toBeTruthy();
  });

  it("adds the school that was picked", () => {
    const onChange = renderSchools();
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "osgoo" },
    });
    fireEvent.click(screen.getByText("Osgoode Hall Law School"));
    expect(onChange).toHaveBeenCalledWith({ schools: ["Osgoode Hall Law School"] });
  });

  it("still takes a school the list has never heard of", () => {
    const onChange = renderSchools();
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "Some New Law School" },
    });
    fireEvent.click(screen.getByText('Add "Some New Law School"'));
    expect(onChange).toHaveBeenCalledWith({ schools: ["Some New Law School"] });
  });

  it("does not offer a school the student already picked", () => {
    renderSchools({ schools: ["Osgoode Hall Law School"] });
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "osgoo" },
    });
    expect(screen.queryByRole("button", { name: /Osgoode Hall Law School ON/ })).toBeNull();
  });

  it("stops at five and says so", () => {
    renderSchools({ schools: ["A", "B", "C", "D", "E"] });
    expect(screen.getByText("That's five. Remove one to add another.")).toBeTruthy();
    expect(
      (screen.getByLabelText("Search law schools") as HTMLInputElement).disabled,
    ).toBe(true);
  });
});

describe("the test-date step", () => {
  it("offers real LSAC sittings instead of a free date field", () => {
    render(<StepField step="test_date" answers={{}} onChange={vi.fn()} />);
    expect(document.querySelector('input[type="date"]')).toBeNull();
    expect(screen.getByText(/I haven't picked a date yet/)).toBeTruthy();
    // Every offered sitting names a month and a window.
    const chips = screen.getAllByRole("button");
    expect(chips.length).toBeGreaterThan(1);
  });
});

describe("the Add button on the schools step", () => {
  it("adds the top match without the student clicking the list", () => {
    const onChange = renderSchools();
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "harv" },
    });
    fireEvent.click(screen.getByLabelText("Add this school"));
    expect(onChange).toHaveBeenCalledWith({ schools: ["Harvard Law School"] });
  });

  it("adds what they typed when the list has nothing", () => {
    const onChange = renderSchools();
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "Some New Law School" },
    });
    fireEvent.click(screen.getByLabelText("Add this school"));
    expect(onChange).toHaveBeenCalledWith({ schools: ["Some New Law School"] });
  });

  it("stays dead until there is something to add", () => {
    renderSchools();
    const add = screen.getByLabelText("Add this school") as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Search law schools"), {
      target: { value: "ya" },
    });
    expect(add.disabled).toBe(false);
  });
});
