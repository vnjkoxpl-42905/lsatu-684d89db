-- Rollback for 2026-10-02-session-chain-server-contract.sql. PROPOSAL ARTIFACT.
--
-- Removes the guard and the writer function. It does not touch any
-- classroom_items row: links written by the function stay in metadata_json
-- (and become student-editable again, as before the contract). The legacy
-- record table is kept by default so the evidence of which links predated the
-- contract survives; drop it explicitly only if that record is not wanted.
--
-- Before rolling back, set SESSION_LINK_WRITES_ENABLED back to false in the
-- frontend, or link writes will start failing.

begin;
drop function if exists public.set_classroom_item_session_link(uuid, uuid, timestamptz, text, uuid, text);
drop trigger if exists classroom_items_session_chain_guard on public.classroom_items;
drop function if exists public.guard_classroom_items_session_chain();
-- Optional, destructive of the audit record only:
-- drop table if exists public.classroom_item_session_link_legacy;
commit;
