import type { BookingApi } from '@/components/booking/CalendlyBookingCard';
import { createPublicBookingApi } from './publicBookingApi';
import { supabase } from '@/integrations/supabase/client';
export type TeacherPendingBooking = { actorId: string; studentId: string; passId: string; slug: string; startAt: string; idempotencyKey: string; baselineIDs: string[] };
export type SchedulingTarget = Pick<TeacherPendingBooking, 'actorId'|'studentId'|'passId'|'slug'>;
export type TeacherSchedulingApi = BookingApi & { checkPending(): Promise<boolean>; retryPending(): Promise<void>; discardPending(confirmed: boolean): Promise<void> };
export type TeacherSchedulingServices = { readPending(actorId: string): TeacherPendingBooking|null; createApi(target: SchedulingTarget, onPendingChange?: () => void, readOnly?: boolean): TeacherSchedulingApi };
export type TeacherBookingHistoryRow = { id: string; booking_pass_id: string; idempotency_key: string | null; start_at: string; status: string; student_id?: string };
type Store = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const key = (actor: string) => `teacher-home-schedule:${actor}`;
export function schedulingSlug(url: string): string {
  const u = new URL(url);
  if (u.origin !== 'https://lsatprep.study' || u.username || u.password || u.search || u.hash || !/^\/book\/[A-Za-z0-9_-]+$/.test(u.pathname)) throw new Error('Private booking link is invalid');
  return u.pathname.slice(6);
}
export function makeTeacherSchedulingServices(options: { storage?: Store; createRawApi?: (slug: string) => BookingApi; verifyActor?: (actorId: string) => Promise<boolean>; loadHistory?: (pending: TeacherPendingBooking) => Promise<TeacherBookingHistoryRow[]> } = {}): TeacherSchedulingServices {
  const storage = () => options.storage ?? sessionStorage;
  const readPending = (actorId: string): TeacherPendingBooking|null => {
    const bytes = storage().getItem(key(actorId)); if (!bytes) return null;
    const p = JSON.parse(bytes) as TeacherPendingBooking;
    if (!p || p.actorId !== actorId || !uuid.test(p.actorId) || !uuid.test(p.studentId) || !uuid.test(p.passId) || typeof p.slug !== 'string' || !/^[A-Za-z0-9_-]+$/.test(p.slug) || !uuid.test(p.idempotencyKey) || !Number.isFinite(Date.parse(p.startAt)) || !Array.isArray(p.baselineIDs) || p.baselineIDs.some(id => typeof id !== 'string' || !uuid.test(id))) throw new Error('Saved scheduling request is unreadable. Keep it for review.');
    return p;
  };
  return { readPending, createApi(target, onPendingChange, readOnly = false) {
    const raw = (options.createRawApi ?? createPublicBookingApi)(target.slug);
    let freshRead = false;
    const same = (p: TeacherPendingBooking) => p.actorId === target.actorId && p.studentId === target.studentId && p.passId === target.passId && p.slug === target.slug;
    const assertActor = async () => {
      const valid = options.verifyActor ? await options.verifyActor(target.actorId) : (await supabase.auth.getUser()).data.user?.id === target.actorId;
      if (!valid) throw new Error('Account changed. Reopen scheduling with the original account.');
    };
    const pending = () => { const p = readPending(target.actorId); if (p && !same(p)) throw new Error('A different scheduling request needs review first.'); return p; };
    const clear = () => { storage().removeItem(key(target.actorId)); onPendingChange?.(); };
    const checkPending = async () => {
      await assertActor(); const p = pending(); if (!p) return false;
      if (readOnly) {
        const rows = options.loadHistory ? await options.loadHistory(p) : await (async () => {
          const { data,error } = await supabase.functions.invoke('booking-pass-admin',{body:{action:'history',pass_id:p.passId,student_id:p.studentId,operation_key:p.idempotencyKey}});
          if(error || !data || data.error || data.pass_id !== p.passId || data.student_id !== p.studentId) throw new Error('Historical booking read is unavailable. Keep this request and check again later.');
          return data.redemptions;
        })();
        if(!Array.isArray(rows) || rows.some(row => !row || !uuid.test(row.id) || typeof row.booking_pass_id !== 'string' || typeof row.status !== 'string' || !Number.isFinite(Date.parse(row.start_at)))) throw new Error('Historical bookings could not be verified. Keep this request.');
        freshRead = true;
        const proven = rows.some(row => row.booking_pass_id === p.passId && row.idempotency_key === p.idempotencyKey && (!row.student_id || row.student_id === p.studentId) && row.status === 'booked' && Date.parse(row.start_at) === Date.parse(p.startAt));
        if(proven) clear(); return proven;
      }
      const info = await raw.loadInfo(); freshRead = true;
      const proven = info.bookings?.some(b => b.source === 'redemption' && b.status === 'booked' && Date.parse(b.start_at) === Date.parse(p.startAt) && !p.baselineIDs.includes(b.id)) ?? false;
      if (proven) clear(); return proven;
    };
    const execute = async (p: TeacherPendingBooking, wasPending: boolean, note?: string) => {
      await assertActor(); freshRead = false;
      try { await raw.book(p.startAt,p.idempotencyKey,note); clear(); }
      catch (error) {
        if (!wasPending && (error as { definitiveRefusal?: boolean })?.definitiveRefusal) { clear(); throw error; }
        try { if (await checkPending()) return; } catch { /* Preserve the original operation if readback is unavailable. */ }
        onPendingChange?.(); throw new Error('booking_outcome_unknown');
      }
    };
    return { loadInfo: raw.loadInfo, loadSlots: raw.loadSlots, checkPending,
      async book(startAt,idempotencyKey,note) {
        if (readOnly) throw new Error('The saved pass changed. Only checking or discarding is available.');
        if (note?.trim()) throw new Error('Teacher scheduling does not accept booking notes.');
        await assertActor(); const previous = pending();
        if (previous) { if (Date.parse(startAt) !== Date.parse(previous.startAt)) throw new Error('Resolve the saved booking first.'); return execute(previous,true,note); }
        const baseline = await raw.loadInfo();
        const p = { ...target,startAt,idempotencyKey,baselineIDs: (baseline.bookings ?? []).map(b => b.id) };
        storage().setItem(key(target.actorId),JSON.stringify(p)); onPendingChange?.();
        return execute(p,false,note);
      },
      async retryPending() { if (readOnly) throw new Error('The saved pass changed. Only checking or discarding is available.'); const p = pending(); if (!p) throw new Error('No saved request'); return execute(p,true); },
      async discardPending(confirmed) {
        await assertActor(); const p = pending(); if (!p || !confirmed || !freshRead) throw new Error('Read current bookings and confirm discarding this local request first.');
        storage().setItem(`${key(target.actorId)}:discarded:${Date.now()}`,storage().getItem(key(target.actorId))!); clear();
      },
    };
  }};
}
export const teacherSchedulingServices = makeTeacherSchedulingServices();
