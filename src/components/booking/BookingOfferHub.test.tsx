import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BookingOfferHub from "./BookingOfferHub";

describe("BookingOfferHub", () => {
  it("always renders the canonical single, 5-hour, and 10-hour options in order", () => {
    render(<BookingOfferHub offers={[]} commerce={[]} externalBookings={[]} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      expect.stringContaining("Book one session"),
      expect.stringContaining("Buy 5-hour package"),
      expect.stringContaining("Buy 10-hour package"),
    ]);
  });

  it("uses live offer URLs and labels when they are available", () => {
    render(
      <BookingOfferHub
        offers={[{ id: "package-5", label: "Five-hour package", provider: "stripe", url: "https://example.com/five", credits: 5 }]}
        commerce={[]}
        externalBookings={[]}
      />,
    );

    expect(screen.getByRole("button", { name: /Buy Five-hour package/i })).toBeInTheDocument();
  });
});
