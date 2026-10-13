import { describe, expect, it } from "vitest";
import { buildPaymentRow, chargeStatus } from "./stripeLedger.ts";

const charge = (over: Record<string, unknown> = {}) => ({
  id: "ch_1", amount: 30000, amount_refunded: 0, currency: "usd", status: "succeeded",
  created: 1_790_000_000, livemode: true, payment_intent: "pi_1", refunded: false, disputed: false,
  billing_details: { email: "Celia@Example.com", name: "Celia" }, ...over,
});
const students = new Map([["celia@example.com", "stu_1"]]);
const offers = new Map([["plink_pkg", { id: "pkg5", credits: 5 }]]);

describe("chargeStatus", () => {
  it("orders dispute > failed > refund", () => {
    expect(chargeStatus(charge({ disputed: true, refunded: true }))).toBe("disputed");
    expect(chargeStatus(charge({ refunded: true }))).toBe("refunded");
    expect(chargeStatus(charge({ amount_refunded: 100 }))).toBe("partially_refunded");
    expect(chargeStatus(charge({ status: "failed" }))).toBe("failed");
  });
});

describe("buildPaymentRow", () => {
  it("live package payment from a known student waits for the teacher", () => {
    const row = buildPaymentRow(charge(), { id: "cs_1", payment_link: "plink_pkg" }, students, offers, "webhook");
    expect(row).toMatchObject({ student_id: "stu_1", match_state: "matched", offer_id: "pkg5", grant_state: "awaiting", product: "package" });
  });
  it("backfilled history never asks for a grant", () => {
    const row = buildPaymentRow(charge(), { id: "cs_1", payment_link: "plink_pkg" }, students, offers, "backfill");
    expect(row.grant_state).toBe("none");
  });
  it("unknown payer is unmatched and grants nothing", () => {
    const row = buildPaymentRow(charge({ billing_details: { email: "x@y.z" } }), { id: "cs", payment_link: "plink_pkg" }, students, offers, "webhook");
    expect(row).toMatchObject({ student_id: null, match_state: "unmatched", grant_state: "none" });
  });
  it("single session is recorded, not a package", () => {
    const row = buildPaymentRow(charge(), { id: "cs", metadata: { product: "single_session" } }, students, offers, "webhook");
    expect(row).toMatchObject({ product: "single_session", offer_id: null, grant_state: "none" });
  });
});
