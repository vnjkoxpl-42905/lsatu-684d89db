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
  20260720200000_booking_phase6_health.sql; do
  "${psql[@]}" -f "$repo_dir/supabase/migrations/$migration" >/dev/null
done
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
