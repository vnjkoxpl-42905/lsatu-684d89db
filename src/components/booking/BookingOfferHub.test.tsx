import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BookingOfferHub from "./BookingOfferHub";
import { MemoryRouter } from "react-router-dom";

const renderHub = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe("BookingOfferHub", () => {
  it("renders the registry's canonical single, 5-hour, and 10-hour options in order", () => {
    renderHub(<BookingOfferHub offers={[
      { id: "single-session-native", label: "Single session", provider: "native", url: "/book/session", credits: 0 },
      { id: "package-5", label: "5-hour package", provider: "stripe", url: "https://buy.stripe.com/4gMaEY05F3dc9x13NqdZ61x", credits: 5 },
      { id: "package-10", label: "10-hour package", provider: "stripe", url: "https://buy.stripe.com/3cI6oI2dN5lk4cHcjWdZ61O", credits: 10 },
    ]} commerce={[]} externalBookings={[]} />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining("Book one session"),
      expect.stringContaining("Buy 5-hour package"),
      expect.stringContaining("Buy 10-hour package"),
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/book/session",
      "https://buy.stripe.com/4gMaEY05F3dc9x13NqdZ61x",
      "https://buy.stripe.com/3cI6oI2dN5lk4cHcjWdZ61O",
    ]);
  });

  it("does not synthesize defaults when the effective arrangement disables every offer", () => {
    renderHub(<BookingOfferHub offers={[]} commerce={[]} externalBookings={[]} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/No booking offers are available/i)).toBeInTheDocument();
  });

  it("uses live offer URLs and labels when they are available", () => {
    renderHub(
      <BookingOfferHub
        offers={[{ id: "package-5", label: "Five-hour package", provider: "stripe", url: "https://example.com/five", credits: 5 }]}
        commerce={[]}
        externalBookings={[]}
      />,
    );

    expect(screen.getByRole("link", { name: /Buy Five-hour package/i })).toHaveAttribute("href", "https://example.com/five");
  });

  it("merges recent activity chronologically and preserves booking status", () => {
    renderHub(
      <BookingOfferHub
        offers={[{ id: "package-5", label: "5-hour package", provider: "stripe", url: "https://example.com/five", credits: 5 }]}
        commerce={[{ id: "payment", offer_id: "package-5", provider: "stripe", event_type: "paid", created_at: "2026-08-09T12:00:00Z" }]}
        externalBookings={[{ id: "canceled", offer_id: "single-session", source_url: null, start_at: "2026-08-10T12:00:00Z", status: "canceled" }]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/Single session/i);
    expect(items[0]).toHaveTextContent(/canceled/i);
    expect(items[1]).toHaveTextContent(/5-hour package/i);
  });

  it("uses client-side navigation for the native Single Session offer", () => {
    renderHub(
      <BookingOfferHub
        offers={[{ id: "single-session-native", label: "Single session", provider: "native", url: "/book/session", credits: 0 }]}
        commerce={[]}
        externalBookings={[]}
      />,
    );

    const link = screen.getByRole("link", { name: /book one session/i });
    expect(link).toHaveAttribute("href", "/book/session");
    expect(link).not.toHaveAttribute("target");
  });

  it("preserves a retained external Single Session arrangement without synthesizing native", () => {
    renderHub(
      <BookingOfferHub
        offers={[
          { id: "single-session", label: "Single session", provider: "calcom", url: "https://cal.com/student-specific", credits: 0 },
          { id: "package-5", label: "5-hour package", provider: "stripe", url: "https://example.com/five", credits: 5 },
        ]}
        commerce={[]}
        externalBookings={[]}
      />,
    );

    expect(screen.getByRole("link", { name: /Book one session/i })).toHaveAttribute("href", "https://cal.com/student-specific");
    expect(screen.queryByRole("link", { name: /book one session/i })?.getAttribute("href")).not.toBe("/book/session");
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
