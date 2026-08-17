#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
pg_bin="/usr/local/opt/postgresql@17/bin"
test_dir="$(mktemp -d -t lsatu-booking-db.XXXXXX)"
port="55439"

cleanup() {
  "$pg_bin/pg_ctl" -D "$test_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$test_dir"
}
trap cleanup EXIT

"$pg_bin/initdb" -D "$test_dir/data" -A trust -U postgres >/dev/null
"$pg_bin/pg_ctl" -D "$test_dir/data" -o "-p $port -k $test_dir" -w start >/dev/null

psql=("$pg_bin/psql" -h "$test_dir" -p "$port" -U postgres -d postgres -v ON_ERROR_STOP=1)
"${psql[@]}" -f "$repo_dir/supabase/tests/booking/minimal_schema.sql" >/dev/null
for migration in \
  20260720160000_booking_phase2_atomic_admin.sql \
  20260720170000_booking_phase3_calendar_recovery.sql \
  20260720180000_booking_phase4_upload_idempotency.sql \
  20260720190000_booking_phase5_student_state.sql \
  20260720200000_booking_phase6_health.sql \
  20260810000000_booking_commerce_hub.sql \
  20260816010000_single_session_schema.sql \
  20260816020000_single_session_lifecycle.sql; do
  "${psql[@]}" -f "$repo_dir/supabase/migrations/$migration" >/dev/null
done
"${psql[@]}" -f "$repo_dir/supabase/tests/booking/single_session_offer_fixtures.sql" >/dev/null
"${psql[@]}" -f "$repo_dir/supabase/migrations/20260816030000_single_session_workers_offers.sql" >/dev/null
"${psql[@]}" -f "$repo_dir/supabase/tests/booking/single_session_lifecycle.sql" >/dev/null

# Two different clients race the same native slot. The shared host-day advisory
# lock plus the occupying exclusion constraint must let exactly one commit.
race_start="$("${psql[@]}" -Atc "SELECT race_start FROM public.single_session_test_runtime")"
race_sql_a="SELECT id FROM public.claim_single_session_slot('$race_start'::timestamptz,'Race A','race-a@example.com',NULL,'[]'::jsonb,'idem-real-race-a',repeat('1',32),repeat('2',32),NULL);"
race_sql_b="SELECT id FROM public.claim_single_session_slot('$race_start'::timestamptz,'Race B','race-b@example.com',NULL,'[]'::jsonb,'idem-real-race-b',repeat('3',32),repeat('4',32),NULL);"
set +e
"${psql[@]}" -c "$race_sql_a" >/dev/null 2>&1 &
race_pid_a=$!
"${psql[@]}" -c "$race_sql_b" >/dev/null 2>&1 &
race_pid_b=$!
wait "$race_pid_a"
race_status_a=$?
wait "$race_pid_b"
race_status_b=$?
set -e
if { test "$race_status_a" -eq 0 && test "$race_status_b" -eq 0; } || \
   { test "$race_status_a" -ne 0 && test "$race_status_b" -ne 0; }; then
  echo "native claim race did not produce exactly one winner" >&2
  exit 1
fi
race_winners="$("${psql[@]}" -Atc "SELECT count(*) FROM public.single_session_bookings WHERE client_idempotency_key IN ('idem-real-race-a','idem-real-race-b')")"
test "$race_winners" = "1"

# Cross-engine race: a package redemption and a native Hold contend for the
# same clean slot. Both paths must use the same host-day advisory lock.
cross_race_start="$("${psql[@]}" -Atc "SELECT cross_race_start FROM public.single_session_test_runtime")"
cross_race_pass="$("${psql[@]}" -Atc "SELECT cross_race_pass_id FROM public.single_session_test_runtime")"
cross_native_sql="SELECT id FROM public.claim_single_session_slot('$cross_race_start'::timestamptz,'Cross Native','cross-native@example.com',NULL,'[]'::jsonb,'idem-real-cross-native',repeat('5',32),repeat('6',32),NULL);"
cross_package_sql="SELECT redemption_id FROM public.redeem_booking_pass_v2('$cross_race_pass'::uuid,'idem-real-cross-package','$cross_race_start'::timestamptz,NULL,'Cross Package','cross-package@example.com');"
set +e
"${psql[@]}" -c "$cross_native_sql" >/dev/null 2>&1 &
cross_pid_native=$!
"${psql[@]}" -c "$cross_package_sql" >/dev/null 2>&1 &
cross_pid_package=$!
wait "$cross_pid_native"
cross_status_native=$?
wait "$cross_pid_package"
cross_status_package=$?
set -e
if { test "$cross_status_native" -eq 0 && test "$cross_status_package" -eq 0; } || \
   { test "$cross_status_native" -ne 0 && test "$cross_status_package" -ne 0; }; then
  echo "cross-engine claim race did not produce exactly one winner" >&2
  exit 1
fi
cross_native_count="$("${psql[@]}" -Atc "SELECT count(*) FROM public.single_session_bookings WHERE client_idempotency_key='idem-real-cross-native'")"
cross_package_count="$("${psql[@]}" -Atc "SELECT count(*) FROM public.booking_pass_redemptions WHERE booking_pass_id='$cross_race_pass' AND idempotency_key='idem-real-cross-package'")"
cross_used="$("${psql[@]}" -Atc "SELECT used_credits FROM public.booking_passes WHERE id='$cross_race_pass'")"
test $((cross_native_count + cross_package_count)) -eq 1
test "$cross_used" = "$cross_package_count"

"${psql[@]}" -f "$repo_dir/supabase/tests/booking/phase_concurrency.sql" >/dev/null

cancel_sql="SELECT public.cancel_booking_redemption('20000000-0000-0000-0000-000000000001', true, NULL);"
"${psql[@]}" -c "$cancel_sql" >/dev/null &
first_pid=$!
"${psql[@]}" -c "$cancel_sql" >/dev/null &
second_pid=$!
wait "$first_pid"
wait "$second_pid"

result="$("${psql[@]}" -Atc "SELECT used_credits || ':' || status FROM public.booking_passes WHERE id='10000000-0000-0000-0000-000000000001'")"
refund="$("${psql[@]}" -Atc "SELECT credit_refunded::text || ':' || status || ':' || calendar_action FROM public.booking_pass_redemptions WHERE id='20000000-0000-0000-0000-000000000001'")"
test "$result" = "0:active"
test "$refund" = "true:cancelled:delete"

echo "booking database migrations and double-cancel concurrency: PASS"
