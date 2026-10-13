# New package payments add their purchased sessions

Apply `supabase/migrations/20261002090000_automatic_stripe_package_credits.sql` through Lovable Cloud, then deploy `booking-commerce-webhook` with the updated `_shared/stripeLedger.ts`. No other function, frontend, secret, tier, notification, or historical balance needs changing. Keep Stripe signature verification and the current webhook `verify_jwt` configuration.

The webhook validates the active payment link, mode, settled status, amount, currency, live mode, and exact student email before calling the service-only RPC. Both completed and async-payment-succeeded Checkout events use this path. Unknown links and unmatched payers remain for review. Ledger or grant failures in this validated branch return 500 for Stripe retry.

The RPC locks the payment, accepts only awaiting live matched rows with the validated Checkout/student/offer identities, and adds database offer credits atomically with the granted ledger state. The insert-only `auto_grant_eligible` marker is false for all existing rows and true only for new live ledger rows, so replays cannot credit pre-rollout history. New charge events can arrive before Checkout facts and still become eligible; a failed eligibility update recovers on retry. It uses a per-student transaction lock so two first payments cannot create competing passes. Teacher grants share that transaction implementation. Dismissed, granted, and none rows return unchanged; the sync refresh cannot overwrite terminal grant decisions. Historical backfill never becomes auto-eligible. A brand-new pass uses a generated token hash and an existing admin as its required creator; `granted_by` stays null for automatic grants.

## Verify without changing real balances

Run `supabase/tests/booking/stripe_package_credits.sql` through the Cloud database SQL tool as the owner after migration. It creates a synthetic user, offer, payment, and first pass inside one transaction, checks five credits exactly once, caller permissions, wrong identity, terminal states, historical source, unmatched status, and refund failure, then rolls everything back. Capture the passing notice. Never strip BEGIN/ROLLBACK or run isolated fixture statements. An existing admin role is needed as the pass creator.

Run locally: `deno test supabase/functions/_shared/stripeLedger.deno.test.ts`. This checks pending-to-succeeded eligibility and concurrent terminal-state preservation. The SQL smoke suite exercises the actual database implementation; the local mocks do not substitute for it.

For live regression, first read payment `bb89e821-778f-4ae8-bdc7-7a42478d5bda` and pass `014de9d0-5d10-45da-80be-483c01aaba35`, recording grant state and total/used credits. That payment must be dismissed. Replay Stripe event `evt_1ULtZOIULVCj6rqqOYGA3CEa` through Stripe's existing endpoint only after confirming the deployed awaiting-only guard. A successful response must show `grant: dismissed`; re-read and verify exactly the same pass balance. This proves the deployed webhook path while protecting Celia's manually credited five sessions. Do not backfill or replay any historical eligible payment.

Deployment does not configure Stripe subscriptions. Verify the existing endpoint includes `checkout.session.async_payment_succeeded`; enable that event on the same endpoint if absent so delayed payment methods also fulfill.
