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

 it("preserves a teacher confirmation after an unknown outcome without refreshing it away", async () => {
   const refresh = vi.fn();
   const close = vi.fn();
   const book = vi.fn().mockRejectedValue(new Error("booking_outcome_unknown"));
   render(<BookingConfirmDialog open onOpenChange={close} slotIso="2026-12-11T17:00:00.000Z" durationMinutes={70} book={book} onCommitError={refresh} bookingFor={{ name: "Fictional Student", email: "fictional@example.test" }} />);
   fireEvent.click(screen.getByRole("button", { name: "Book it" }));
   await waitFor(() => expect(book).toHaveBeenCalledOnce());
   await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled());
   expect(refresh).not.toHaveBeenCalled();
   expect(screen.getByRole("dialog")).toHaveTextContent("Fictional Student");
   expect(close).not.toHaveBeenCalled();
   fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
   expect(close).toHaveBeenCalledWith(false);
 });
 it("keeps the existing student error refresh behavior", async () => {
   const refresh = vi.fn();
   render(<BookingConfirmDialog open onOpenChange={vi.fn()} slotIso="2026-12-11T17:00:00.000Z" durationMinutes={70} book={vi.fn().mockRejectedValue(new Error("slot_conflict"))} onCommitError={refresh} />);
   fireEvent.click(screen.getByRole("button", { name: "Book it" }));
   await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
 });
