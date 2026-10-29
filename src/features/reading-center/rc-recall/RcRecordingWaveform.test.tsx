import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import RcRecordingWaveform from "./RcRecordingWaveform";

it("shows actual level changes only while recalling and keeps silence still", () => {
  const { container, rerender } = render(<RcRecordingWaveform active level={0} available />);
  expect(screen.getByRole("img", { name: "Live microphone input level" })).toBeInTheDocument();
  expect(container.querySelector("i")!.style.height).toBe("3px");
  rerender(<RcRecordingWaveform active level={1} available />);
  expect(parseFloat(container.querySelector("i")!.style.height)).toBeGreaterThan(3);
  rerender(<RcRecordingWaveform active={false} level={1} available />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("does not display pretend audio activity when a level meter is unavailable", () => {
  const { container } = render(<RcRecordingWaveform active level={1} available={false} />);
  expect(screen.getByText("Recording · input level unavailable")).toBeInTheDocument();
  expect(container.querySelector(".rct-recording-bars")).toBeNull();
});

it("clamps invalid meter samples to a quiet baseline", () => {
  const { container, rerender } = render(<RcRecordingWaveform active level={NaN} available />);
  expect([...container.querySelectorAll("i")].every((bar) => bar.style.height === "3px")).toBe(true);
  rerender(<RcRecordingWaveform active level={-1} available />);
  expect([...container.querySelectorAll("i")].every((bar) => bar.style.height === "3px")).toBe(true);
});
