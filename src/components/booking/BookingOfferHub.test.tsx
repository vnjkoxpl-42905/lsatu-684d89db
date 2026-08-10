import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BookingOfferHub from "./BookingOfferHub";

describe("BookingOfferHub", () => {
  it("always renders the canonical single, 5-hour, and 10-hour options in order", () => {
    render(<BookingOfferHub offers={[]} commerce={[]} externalBookings={[]} />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Book one session"),
      expect.stringContaining("Buy 5-hour package"),
      expect.stringContaining("Buy 10-hour package"),
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://cal.com/joshua-jtx5ud/session-link",
      "https://buy.stripe.com/4gMaEY05F3dc9x13NqdZ61x",
      "https://buy.stripe.com/3cI6oI2dN5lk4cHcjWdZ61O",
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

    expect(screen.getByRole("link", { name: /Buy Five-hour package/i })).toHaveAttribute("href", "https://example.com/five");
  });

  it("merges recent activity chronologically and preserves booking status", () => {
    render(
      <BookingOfferHub
        offers={[]}
        commerce={[{ id: "payment", offer_id: "package-5", provider: "stripe", event_type: "paid", created_at: "2026-08-09T12:00:00Z" }]}
        externalBookings={[{ id: "canceled", offer_id: "single-session", source_url: null, start_at: "2026-08-10T12:00:00Z", status: "canceled" }]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/Single session/i);
    expect(items[0]).toHaveTextContent(/canceled/i);
    expect(items[1]).toHaveTextContent(/5-hour package/i);
  });
});
