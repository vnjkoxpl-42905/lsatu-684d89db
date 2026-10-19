import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RcTrainingDemo from "./RcTrainingDemo";

const P1 = /Millions of people worldwide play multiplayer online games/;
const P2 = /The economist Edward Castronova noticed something curious/;
const go = (tab: RegExp) => fireEvent.click(screen.getByRole("button", { name: tab }));
const firstCheck = () => { go(/Hide paragraph 1/); go(/Show paragraph 1/); };
const finishExample = () => { firstCheck(); go(/Read paragraph 2/); go(/Hide paragraph 2/); go(/Show both paragraphs/); go(/Finish the example/); };

describe("RC Training demonstration", () => {
  it("starts with paragraph 1 and does not mention paragraph 2 yet", () => {
    render(<RcTrainingDemo />);
    expect(screen.getByText(P1)).toBeVisible();
    expect(screen.queryByText(P2)).not.toBeInTheDocument();
  });

  it("hides the text for recall and gives no answer while the learner is being tested", () => {
    render(<RcTrainingDemo />);
    go(/Hide paragraph 1/);
    expect(screen.queryByText(P1)).not.toBeInTheDocument();
    expect(document.querySelector("blockquote")).toBeNull();
    expect(screen.getByText("Your turn")).toBeVisible();
  });

  it("labels the instructor's example and shows an omitted qualification being repaired", () => {
    render(<RcTrainingDemo />);
    firstCheck();
    expect(screen.getByText("Instructor modelling")).toBeVisible();
    expect(screen.getByText(/they all team up/)).toBeVisible();
    expect(screen.getByText("might band together")).toBeVisible();
    const repair = screen.getByText(/The recall makes two details too strong/);
    expect(repair).toHaveTextContent(/one possible character/);
    expect(repair).toHaveTextContent(/players might team up/);
    expect(repair).toHaveTextContent(/does not say they all do/);
  });

  it("recalls paragraph 2 alone, then confirms both paragraphs", () => {
    render(<RcTrainingDemo />);
    firstCheck();
    go(/Read paragraph 2/);
    expect(screen.getByText(P2)).toBeVisible();
    go(/Hide paragraph 2/);
    expect(screen.getByText(/Silently retell paragraph 2 only/)).toBeVisible();
    expect(screen.queryByText(P2)).not.toBeInTheDocument();
    go(/Show both paragraphs/);
    expect(screen.getByText(P1)).toBeVisible();
    expect(screen.getByText(P2)).toBeVisible();
  });

  it("ends with an optional passage recall, not another paragraph, and can restart", () => {
    render(<RcTrainingDemo />);
    finishExample();
    expect(screen.getByText(/whole-passage recall is optional/)).toBeVisible();
    expect(screen.getByText(/not graded/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Try the example again/i }));
    expect(screen.getByText(P1)).toBeVisible();
  });

  it("uses no em dashes in its teaching copy", () => {
    const { container } = render(<RcTrainingDemo />);
    for (let i = 0; i < 7; i++) {
      expect(container.textContent).not.toContain("—");
      if (i < 6) fireEvent.click(container.querySelector<HTMLButtonElement>(".rct-demo-controls > button:not(.rct-demo-back)")!);
    }
  });

  it("leads into practice after the guided example, without generic Next buttons", () => {
    const start = vi.fn();
    render(<RcTrainingDemo onStartPractice={start} />);
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    finishExample();
    go(/Choose a passage/);
    expect(start).toHaveBeenCalledOnce();
  });

  it("can play and pause the same walkthrough without creating an attempt", () => {
    vi.useFakeTimers();
    try {
      render(<RcTrainingDemo />);
      go(/Watch demo/);
      act(() => vi.advanceTimersByTime(18000));
      expect(screen.queryByText(P1)).not.toBeInTheDocument();
      go(/Pause demo/);
      act(() => vi.advanceTimersByTime(60000));
      expect(screen.queryByText(P1)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Show paragraph 1 and check/ })).toBeVisible();
    } finally { vi.useRealTimers(); }
  });
});
