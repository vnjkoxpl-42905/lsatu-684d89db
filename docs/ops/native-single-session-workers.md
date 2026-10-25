# Native Single Session workers

The database migrations are stage 1 only. They create worker RPCs, leases, and
heartbeats, but intentionally do not put an invocation secret in SQL or cron
metadata.

## Stage 2 provisioning

At deploy time, use the Supabase Management API to set the same randomly
generated `BOOKING_WORKER_SECRET` function secret on these deployed functions:

- `single-session-sweeper`
- `single-session-outbox`
- `gcal-reconcile`

The outbox and sweeper also require `STRIPE_SECRET_KEY`; both booking workers
require the existing Supabase function secrets. The outbox requires
`SINGLE_SESSION_ENCRYPTION_KEY`, `SUPABASE_ANON_KEY`, and
`BOOKING_ADMIN_EMAIL`. The public endpoint requires `TURNSTILE_SECRET`,
`BOOKING_IP_HMAC_KEY`, `SINGLE_SESSION_ENCRYPTION_KEY`, and
`STRIPE_SECRET_KEY`. The commerce webhook requires `STRIPE_LIVEMODE` set
explicitly to `true` or `false`, plus its Stripe signing secret. Missing secrets
produce a non-2xx response.

Install authenticated scheduler calls outside the migration.

> **Nothing below is installed as of 2026-09-04, and the table is a
> specification rather than a description.** `cron.job` in this project holds
> four jobs and all four are booking and calendar work; Cloud Scheduler holds
> three paused transcript jobs; there is no launchd agent. In particular
> `sweep-rrc-grading` has no scheduler at all, so the safety net ADR 0021
> describes does not exist. Verified by reading `cron.job` directly. Anything
> that says otherwise is describing this table rather than the deployment.
>
> Installing one is `cron.schedule` with a `net.http_post`, the shape the four
> live jobs already use. It needs a decision about where the worker secret
> lives first: the existing jobs carry a bearer token inline in the command
> text, which the rotation section below is written against.


| Worker | Suggested interval | Request |
| --- | --- | --- |
| `single-session-sweeper` | every minute | `POST /functions/v1/single-session-sweeper` |
| `single-session-outbox` | every minute | `POST /functions/v1/single-session-outbox` |
| `gcal-reconcile` | every five minutes | `POST /functions/v1/gcal-reconcile` |
| `sweep-rrc-grading` | every ten minutes | `POST /functions/v1/sweep-rrc-grading` |

Each request carries `X-Worker-Secret` from the scheduler's secret store. Do
not place its plaintext value in a SQL migration, cron command, or repository
file.

`sweep-rrc-grading` is not a booking worker and writes no heartbeat, so it is
absent from `booking_worker_heartbeats` and from `get_booking_health()` by
design: a Read, Recall, Colour grade that has not been swept is not a booking
outage. It shares `BOOKING_WORKER_SECRET` because a deployment has one worker
secret, and needs nothing else -- it reaches the grader with the service role
key the platform already gives it. Its own health is the `deferred` count in
its JSON response: a number that climbs run after run means sections are
arriving faster than three per ten minutes, which no single tutor's students
can do.

## Rotation

1. Generate a new high-entropy value in the deployment secret manager.
2. Update the Edge Function secret and scheduler request secret together.
3. Trigger each worker once and confirm a 2xx response.
4. Remove the old value from the deployment system.

## Post-deploy assertion

Confirm all three schedules exist in the deployment scheduler, trigger them,
then inspect `booking_worker_heartbeats`. Each expected worker must have a
recent `last_success_at`. `get_booking_health()` must report zero stale workers.
The deployment is incomplete until those assertions pass.
