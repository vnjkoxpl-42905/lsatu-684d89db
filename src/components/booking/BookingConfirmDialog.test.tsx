import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingConfirmDialog from "./BookingConfirmDialog";

describe("BookingConfirmDialog", () => {
  it("shows success when the booking commits even if the follow-up refresh fails", async () => {
    const book = vi.fn().mockResolvedValue(undefined);
    const onBooked = vi.fn().mockRejectedValue(new Error("refresh failed"));

    render(
      <BookingConfirmDialog
        open
        onOpenChange={vi.fn()}
        slotIso="2026-08-11T17:00:00.000Z"
        durationMinutes={70}
        book={book}
        onBooked={onBooked}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Book it" }));

    expect(await screen.findByText("You're booked")).toBeInTheDocument();
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1));
    expect(book).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Confirm your session")).not.toBeInTheDocument();
  });
});
