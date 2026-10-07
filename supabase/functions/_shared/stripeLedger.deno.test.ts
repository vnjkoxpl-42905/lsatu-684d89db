import { buildPaymentRow, upsertPayment } from "./stripeLedger.ts";

function assert(value: unknown, message: string) {
  if (!value) throw new Error(message);
}
const charge = {
  id: "ch_test", amount: 20000, currency: "usd", status: "succeeded", created: 1790000000,
  livemode: true, billing_details: { email: "test@example.invalid" },
};
const session = { id: "cs_test", payment_link: "plink_test" };
const students = new Map([["test@example.invalid", "student"]]);
const offers = new Map([["plink_test", { id: "package-test", credits: 5 }]]);
const payment = buildPaymentRow(charge, session, students, offers, "webhook");

function ledger(existing: Record<string, unknown>, raceState?: string, failTransitionOnce = false) {
  const stored = { id: "payment", match_state: "matched", grant_state: "none", student_id: "student", source: "webhook", status: "pending", auto_grant_eligible: true, ...existing };
  let updates = 0;
  const client = { from: (_table: string) => {
    const filters: [string, unknown][] = [];
    let facts: Record<string, unknown> | undefined;
    const query: any = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      maybeSingle: () => Promise.resolve({ data: { ...stored }, error: null }),
      update: (value: Record<string, unknown>) => { facts = value; return query; },
      then: (resolve: (value: unknown) => unknown) => {
        if (++updates === 1 && raceState) stored.grant_state = raceState;
        if (updates === 2 && failTransitionOnce) return Promise.resolve({ error: new Error("transient_write_failure") }).then(resolve);
        if (filters.every(([key, value]) => stored[key as keyof typeof stored] === value)) Object.assign(stored, facts);
        return Promise.resolve({ error: null }).then(resolve);
      },
    };
    return query;
  } };
  return { client, stored };
}

Deno.test("new live package is eligible; historical backfill is not", () => {
  assert(payment.grant_state === "awaiting", "live payment eligible");
  const history = buildPaymentRow(charge, session, students, offers, "backfill");
  assert(history.grant_state === "none" && !history.auto_grant_eligible, "history stays ungranted and ineligible");
});
Deno.test("delayed live pending payment becomes awaiting", async () => {
  const { client, stored } = ledger({});
  await upsertPayment(client, payment);
  assert(stored.grant_state === "awaiting", "delayed payment must become eligible");
});
for (const state of ["dismissed", "granted"]) {
  Deno.test(`concurrent ${state} cannot be overwritten by pending refresh`, async () => {
    const { client, stored } = ledger({}, state);
    await upsertPayment(client, payment);
    assert(stored.grant_state === state, "terminal grant state changed");
  });
}
for (const existing of [{ source: "backfill" }, { status: "succeeded", auto_grant_eligible: false }, { match_state: "unmatched", student_id: null }]) {
  Deno.test(`refresh keeps review/history none: ${JSON.stringify(existing)}`, async () => {
    const { client, stored } = ledger(existing);
    await upsertPayment(client, payment);
    assert(stored.grant_state === "none", "history or unmatched payment became eligible");
  });
}
Deno.test("new succeeded charge arriving before Checkout can become awaiting", async () => {
  const { client, stored } = ledger({ status: "succeeded" });
  await upsertPayment(client, payment);
  assert(stored.grant_state === "awaiting", "new charge-first payment must become eligible");
});
Deno.test("retry recovers when facts commit but awaiting transition fails", async () => {
  const { client, stored } = ledger({}, undefined, true);
  let failed = false;
  try { await upsertPayment(client, payment); } catch { failed = true; }
  assert(failed && stored.status === "succeeded" && stored.grant_state === "none", "must expose transient transition failure");
  await upsertPayment(client, payment);
  assert(stored.grant_state === "awaiting", "retry must recover grant eligibility");
});
