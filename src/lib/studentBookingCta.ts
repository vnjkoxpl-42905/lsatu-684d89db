/**
 * Which booking link a given student should be shown.
 *
 * A student on a package should never be sold anything on Home: they already
 * paid, so their link goes straight to the in-app time picker and says how many
 * sessions are left. A pay-per-session student gets the single-session link. A
 * student whose package is used up or expired gets that same package back as a
 * renewal. One helper so Home, /booking and the schedule panel cannot disagree.
 */

export interface BookingCtaOffer {
  id: string;
  label: string;
  provider: string;
  url: string;
  credits: number;
}

export interface BookingCtaPass {
  status: string;
  total_credits: number;
  credits_remaining: number;
}

export interface StudentBookingCta {
  /** Button copy. */
  label: string;
  /** Where the button goes. Internal routes start with "/". */
  href: string;
  /** True when the destination leaves the app (a checkout page). */
  external: boolean;
  /** Optional second line: "3 of 5 sessions left". */
  detail: string | null;
}

const IN_APP_BOOKING = "/booking";

function isSingle(offer: BookingCtaOffer) {
  return offer.id === "single-session" || offer.id === "single-session-native";
}

function activePass(pass: BookingCtaPass | null | undefined) {
  if (!pass) return false;
  const status = (pass.status ?? "").toLowerCase();
  return status === "active" && pass.credits_remaining > 0;
}

export function resolveStudentBookingCta({
  pass,
  offers = [],
  hasUpcomingSession = false,
}: {
  pass: BookingCtaPass | null | undefined;
  offers?: BookingCtaOffer[];
  hasUpcomingSession?: boolean;
}): StudentBookingCta {
  // Credits in hand: pick a time, never buy.
  if (activePass(pass)) {
    const used = Math.max(0, (pass!.total_credits ?? 0) - pass!.credits_remaining);
    const detail =
      pass!.total_credits > 0
        ? `${pass!.credits_remaining} of ${pass!.total_credits} sessions left`
        : `${pass!.credits_remaining} sessions left`;
    return {
      label: hasUpcomingSession ? "Book another session" : "Book your next session",
      href: IN_APP_BOOKING,
      external: false,
      detail: used >= 0 ? detail : null,
    };
  }

  // Had a package, nothing left on it: offer the same one again when we can
  // still identify it, so the student is not re-sold a different plan.
  if (pass && (pass.total_credits ?? 0) > 1) {
    const renewal =
      offers.find((offer) => !isSingle(offer) && offer.credits === pass.total_credits) ??
      offers.find((offer) => !isSingle(offer));
    if (renewal) {
      return {
        label: `Renew ${renewal.label}`,
        href: renewal.url,
        external: !renewal.url.startsWith("/"),
        detail: "Your package is used up",
      };
    }
  }

  // Pay per session.
  const single = offers.find(isSingle);
  if (single) {
    return {
      label: hasUpcomingSession ? "Book another session" : "Book a session",
      href: single.url,
      external: !single.url.startsWith("/"),
      detail: null,
    };
  }

  return {
    label: hasUpcomingSession ? "Book another" : "Book a session",
    href: IN_APP_BOOKING,
    external: false,
    detail: null,
  };
}
