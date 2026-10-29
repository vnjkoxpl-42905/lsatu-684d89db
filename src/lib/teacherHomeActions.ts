import { supabase } from '@/integrations/supabase/client';
import { ALL_FLAG_KEYS, CONFIGURABLE_FLAG_KEYS, tierFlags, withDerivedAccess, type ManagedUser } from '@/lib/adminUsers';

export type HomeBookingPass = { id: string; student_id: string; total_credits: number; used_credits: number; credits_remaining: number; status: string; booking_url: string | null; session_length_minutes: number; expires_at: string | null };
export type PendingHomeTopUp = { actorId: string; studentId: string; passId: string; amount: number; operationKey: string };
export type HomeCreditReceipt = { operation_key: string; owner_id: string; student_id: string; pass_id: string; delta: number; total_credits: number; used_credits: number };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const PREFIX = 'teacher-home-topup:';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requireUuid = (s: string) => { if (!uuid.test(s)) throw new Error('Invalid account or operation identity'); };
async function call(route: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(route, { method: 'POST', body });
  if (error || !data || data.error) {
    let reason = typeof data?.error === 'string' ? data.error : null;
    // Edge errors carry the conflict/eligibility reason in their JSON response.
    // Failure to decode it must still fail the operation, never trigger a write fallback.
    const response = error?.context;
    if (!reason && response instanceof Response) {
      try { const detail = await response.clone().json(); if (typeof detail?.error === 'string') reason = detail.error; } catch { /* Keep the original transport failure visible. */ }
    }
    throw new Error(reason || error?.message || 'The server did not confirm this change. Refresh and try again.');
  }
  return data;
}
export async function saveHomeAccess(person: ManagedUser, tier: 'tier_1' | 'tier_2' | 'tier_3', draft?: Record<string, boolean>): Promise<ManagedUser> {
  requireUuid(person.class_id);
  if (person.role === 'admin' || person.archived_at) throw new Error('This account is not eligible for student access');
  if (tier === 'tier_2' && (!draft || Object.keys(draft).length !== CONFIGURABLE_FLAG_KEYS.length || CONFIGURABLE_FLAG_KEYS.some(k => typeof draft[k] !== 'boolean'))) throw new Error('Review all custom access switches');
  const expected = Object.fromEntries(ALL_FLAG_KEYS.map(k => [k, person[k as keyof ManagedUser]]));
  if (Object.values(expected).some(v => typeof v !== 'boolean')) throw new Error('Refresh this account before changing access');
  const flags = tier === 'tier_2' ? withDerivedAccess(draft!) : tierFlags(tier);
  const data = await call('admin-manage-users', { action: tier === 'tier_2' ? 'set_custom_access' : 'set_home_tier', class_id: person.class_id, expected_tier: person.access_tier, expected_flags: expected, tier, ...(tier === 'tier_2' ? { flags: draft } : {}) });
  const row = data.profile;
  if (!row || row.class_id !== person.class_id || row.access_tier !== tier || Object.entries(flags).some(([k,v]) => row[k] !== v)) throw new Error('The server did not verify the complete access change. Refresh this account.');
  return { ...person, ...row };
}
export function safeHomeBookingUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('Invalid booking link');
  const u = new URL(value);
  if (u.origin !== 'https://lsatprep.study' || !/^\/book\/[a-zA-Z0-9_-]+$/.test(u.pathname) || u.search || u.hash || u.username || u.password) throw new Error('Invalid booking link');
  return u.href;
}
function passFrom(value: unknown, studentId: string, passId?: string): HomeBookingPass {
  const p = value as HomeBookingPass;
  if (!p || p.student_id !== studentId || (passId && p.id !== passId) || !uuid.test(p.id) || !['active','paused','exhausted','expired','revoked'].includes(p.status) || !Number.isInteger(p.total_credits) || !Number.isInteger(p.used_credits) || p.used_credits < 0 || p.total_credits < p.used_credits || p.credits_remaining !== p.total_credits-p.used_credits) throw new Error('The server did not verify the selected booking pass');
  return { ...p, booking_url: safeHomeBookingUrl(p.booking_url) };
}
export async function loadHomeBooking(studentId: string): Promise<HomeBookingPass | null> {
  requireUuid(studentId);
  const data = await call('booking-pass-admin', { action: 'home_get', student_id: studentId });
  if (!Object.prototype.hasOwnProperty.call(data, 'pass')) throw new Error('Booking status is unavailable on this server');
  return data.pass === null ? null : passFrom(data.pass, studentId);
}
export async function createHomeBooking(studentId: string, credits: number, options: { sessionMinutes: number; expiresAt: string | null } = { sessionMinutes: 70, expiresAt: null }): Promise<HomeBookingPass> {
  requireUuid(studentId); checkAmount(credits);
  if (!Number.isInteger(options.sessionMinutes) || options.sessionMinutes < 15 || options.sessionMinutes > 480 || (options.expiresAt !== null && (!Number.isFinite(Date.parse(options.expiresAt)) || Date.parse(options.expiresAt) <= Date.now()))) throw new Error('Choose a valid session length and future expiry');
  const data = await call('booking-pass-admin', { action: 'home_create', student_id: studentId, credits, session_minutes: options.sessionMinutes, expires_at: options.expiresAt });
  const pass = passFrom(data.pass, studentId);
  if (data.created === false) throw new Error('pass_exists: Existing booking link loaded. Review and confirm Add sessions.');
  if (data.created !== true) throw new Error('The server did not verify creation. Refresh booking status.');
  return pass;
}
export async function revokeHomeBooking(studentId: string, passId: string, confirmed: boolean): Promise<HomeBookingPass> {
  requireUuid(studentId); requireUuid(passId);
  if (!confirmed) throw new Error('Confirm revoking this named student’s booking link');
  const pass = passFrom((await call('booking-pass-admin', { action: 'home_revoke', student_id: studentId, pass_id: passId, confirmed: true })).pass, studentId, passId);
  if (pass.status !== 'revoked') throw new Error('Revocation was not verified');
  return pass;
}
function checkAmount(n: number) { if (!Number.isInteger(n) || n < 1 || n > 50) throw new Error('Choose 1 to 50 sessions'); }
function pendingKey(actorId: string) { requireUuid(actorId); return PREFIX+actorId; }
export function getPendingHomeTopUp(actorId: string, storage: Store = sessionStorage): PendingHomeTopUp | null {
  const value = storage.getItem(pendingKey(actorId));
  if (!value) return null;
  let p: PendingHomeTopUp;
  try { p = JSON.parse(value) as PendingHomeTopUp; } catch { throw new Error('Pending booking data is unreadable. Do not repeat the add. Review this account’s booking balance before recovering the pending operation.'); }
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Pending booking data is unreadable. Review booking status before recovering.');
  if (p.actorId !== actorId) throw new Error('Pending booking operation belongs to another account');
  requireUuid(p.studentId); requireUuid(p.passId); requireUuid(p.operationKey); checkAmount(p.amount);
  return p;
}
export function prepareHomeTopUp(actorId: string, studentId: string, passId: string, amount: number, storage: Store = sessionStorage): PendingHomeTopUp {
  requireUuid(studentId); requireUuid(passId); checkAmount(amount);
  const prior = getPendingHomeTopUp(actorId, storage);
  if (prior) {
    if (prior.studentId !== studentId || prior.passId !== passId || prior.amount !== amount) throw new Error('Resolve the pending add before starting a different booking change');
    return prior;
  }
  const pending = { actorId, studentId, passId, amount, operationKey: crypto.randomUUID() };
  storage.setItem(pendingKey(actorId), JSON.stringify(pending));
  return pending;
}
export function clearPendingHomeTopUps(storage: Store = sessionStorage) {
  const keys = Array.from({ length: storage.length }, (_,i) => storage.key(i)).filter((k): k is string => !!k?.startsWith(PREFIX));
  keys.forEach(k => storage.removeItem(k));
}
export async function addHomeBookingCredits(p: PendingHomeTopUp, storage: Store = sessionStorage): Promise<{ receipt: HomeCreditReceipt; pass: HomeBookingPass }> {
  const stored = getPendingHomeTopUp(p.actorId, storage);
  if (!stored || JSON.stringify(stored) !== JSON.stringify(p)) throw new Error('The saved operation identity changed');
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.id !== p.actorId) throw new Error('Account changed. Sign in again before retrying.');
  const data = await call('booking-pass-admin', { action: 'home_add_credits', student_id: p.studentId, pass_id: p.passId, operation_key: p.operationKey, credits: p.amount });
  const r = data.receipt as HomeCreditReceipt;
  if (!r || r.operation_key !== p.operationKey || r.owner_id !== p.actorId || r.student_id !== p.studentId || r.pass_id !== p.passId || r.delta !== p.amount || !Number.isInteger(r.total_credits) || !Number.isInteger(r.used_credits)) throw new Error('The server did not confirm this add. Keep the pending operation and retry.');
  const pass = passFrom(data.pass, p.studentId, p.passId);
  storage.removeItem(pendingKey(p.actorId));
  return { receipt: r, pass };
}

/** Resolves an unknown outcome without applying credits or guessing a new operation identity. */
export async function resolvePendingHomeTopUp(p: PendingHomeTopUp, storage: Store = sessionStorage): Promise<{receipt: HomeCreditReceipt | null; pass: HomeBookingPass}> {
 const stored = getPendingHomeTopUp(p.actorId,storage);
 if (!stored || JSON.stringify(stored)!==JSON.stringify(p)) throw new Error('The saved operation identity changed');
 const {data:auth}=await supabase.auth.getUser();
 if(auth.user?.id!==p.actorId) throw new Error('Account changed. Sign in again before checking.');
 const data=await call('booking-pass-admin',{action:'home_resolve_add',student_id:p.studentId,pass_id:p.passId,operation_key:p.operationKey,credits:p.amount});
 const pass=passFrom(data.pass,p.studentId,p.passId);
 const r=data.receipt as HomeCreditReceipt|null;
 const identity=r || data;
 if(identity.operation_key!==p.operationKey || identity.owner_id!==p.actorId || identity.student_id!==p.studentId || identity.pass_id!==p.passId || identity.delta!==p.amount || (!r && data.not_applied!==true)) throw new Error('The server could not resolve this pending add. Keep it for retry.');
 storage.removeItem(pendingKey(p.actorId));
 return {receipt:r,pass};
}

/** Explicit recovery only: retain unreadable bytes and refresh the named balance; never retry/add. */
export async function discardUnreadableHomeTopUp(actorId: string, studentId: string, confirmed: boolean, storage: Store = sessionStorage): Promise<HomeBookingPass | null> {
 if (!confirmed) throw new Error('Review the current booking balance and confirm discarding unreadable pending data. Do not repeat an unknown add.');
 const key=pendingKey(actorId), raw=storage.getItem(key);
 if (!raw) throw new Error('No unreadable pending data remains');
 let unreadable=false;
 try { getPendingHomeTopUp(actorId,storage); } catch { unreadable=true; }
 if (!unreadable) throw new Error('This pending operation can be checked safely. Use Check pending add.');
 const {data:auth}=await supabase.auth.getUser();
 if(auth.user?.id!==actorId) throw new Error('Account changed. Sign in again before recovering.');
 const pass=await loadHomeBooking(studentId);
 if(storage.getItem(key)!==raw) throw new Error('Pending operation changed. Review it again.');
 storage.setItem(PREFIX+'quarantine:'+actorId,raw);
 storage.removeItem(key);
 return pass;
}

/** Reactivation is deliberate: remove expiry while preserving the link and unused credits. */
export async function reactivateHomeBooking(studentId: string, passId: string, confirmed: boolean): Promise<HomeBookingPass> {
 requireUuid(studentId);requireUuid(passId);
 if(!confirmed) throw new Error('Confirm removing expiry and keeping this student’s remaining sessions.');
 const pass=passFrom((await call('booking-pass-admin',{action:'home_reactivate',student_id:studentId,pass_id:passId,confirmed:true})).pass,studentId,passId);
 if(pass.expires_at!==null || !['active','exhausted'].includes(pass.status)) throw new Error('Reactivation was not verified');
 return pass;
}
