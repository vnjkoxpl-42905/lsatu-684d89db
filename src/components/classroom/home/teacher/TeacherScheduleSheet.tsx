import * as React from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import CalendlyBookingCard from '@/components/booking/CalendlyBookingCard';
import { AccountPicker, eligibleAccounts } from './TeacherAccessBooking';
import type { ManagedUser } from '@/lib/adminUsers';
import { loadHomeBooking, type HomeBookingPass } from '@/lib/teacherHomeActions';
import { schedulingSlug, teacherSchedulingServices, type TeacherSchedulingServices, type TeacherSchedulingApi, type TeacherPendingBooking } from '@/lib/teacherSchedulingApi';
export function TeacherScheduleSheet({ open,onClose,actorId,students,rosterState,onRetryRoster,load = loadHomeBooking,services = teacherSchedulingServices,onCommitted }: {
 open:boolean; onClose:()=>void; actorId?:string; students:ManagedUser[]; rosterState?:string; onRetryRoster?:()=>void;
 load?:typeof loadHomeBooking; services?:TeacherSchedulingServices; onCommitted?:()=>void;
}) {
 const [studentId,setStudentId] = React.useState('');
 const [loaded,setLoaded] = React.useState<{pass:HomeBookingPass;api:TeacherSchedulingApi;slug:string}|null>(null);
 const [recovery,setRecovery] = React.useState<TeacherSchedulingApi|null>(null);
 const [pending,setPending] = React.useState<TeacherPendingBooking|null>(null);
 const [unreadable,setUnreadable] = React.useState(false);
 const [error,setError] = React.useState(''); const [status,setStatus] = React.useState('');
 const [confirmation,setConfirmation] = React.useState(false); const [busy,setBusy] = React.useState(false);
 const [fresh,setFresh] = React.useState(false); const [discard,setDiscard] = React.useState(false);
 const generation = React.useRef(0);
 const refreshPending = React.useCallback(() => { if(actorId) { try { setPending(services.readPending(actorId)); } catch { setUnreadable(true); setError('Saved scheduling request is unreadable. Keep this request for review.'); } } },[actorId,services]);
 React.useEffect(() => {
   if(!open) return; setLoaded(null); setError(''); setUnreadable(false); setStatus(''); setConfirmation(false); setFresh(false); setDiscard(false);
   try { const p = actorId ? services.readPending(actorId) : null; setPending(p); setStudentId(p?.studentId ?? ''); }
   catch { setUnreadable(true); setError('Saved scheduling request is unreadable. Keep this request for review.'); }
 },[open,actorId,services]);
 React.useEffect(() => {
   const version = ++generation.current; setLoaded(null); setRecovery(null); setError(''); setFresh(false); setDiscard(false);
   if(!open || !actorId || !studentId) return;
   try { const saved = services.readPending(actorId);
     if(saved) setRecovery(services.createApi(saved,refreshPending,true));
   } catch { setUnreadable(true); return; }
   setStatus('Loading booking access…');
   load(studentId).then(pass => {
     if(version !== generation.current) return;
     if(!pass) { setStatus('No booking pass. Add session credits separately before scheduling.'); return; }
     if(pass.student_id !== studentId) throw new Error('The booking pass does not match this student.');
     const p = services.readPending(actorId);
     if(p && (p.studentId !== studentId || p.passId !== pass.id)) throw new Error('The saved request does not match the current booking pass. Keep it for review.');
     const slug = schedulingSlug(pass.booking_url ?? '');
     if(p && p.slug !== slug) throw new Error('The private booking link changed. Keep the saved request for review.');
     if(!p && (pass.status !== 'active' || pass.credits_remaining <= 0 || (pass.expires_at && Date.parse(pass.expires_at)<=Date.now()))) {
       setStatus(`Booking is unavailable: ${pass.status}, ${pass.credits_remaining} sessions remaining. Review credits separately.`); return;
     }
     setLoaded({pass,slug,api:services.createApi({actorId,studentId,passId:pass.id,slug},refreshPending)}); setStatus('');
   }).catch(e => { if(version === generation.current) { setError(e instanceof Error ? e.message : 'Could not load booking access.'); setStatus(''); } });
   return () => { generation.current++; };
 },[open,actorId,studentId,load,services,refreshPending]);
 React.useEffect(() => { setFresh(false); setDiscard(false); }, [loaded?.api, recovery]);
 const person = students.find(s => s.class_id === studentId);
 const name = person?.display_name || person?.email || studentId;
 const operation = async (fn:()=>Promise<void>) => { setBusy(true); setError(''); try { await fn(); refreshPending(); } catch(e) { setError(e instanceof Error ? e.message === 'booking_outcome_unknown' ? 'Booking outcome is unknown. Check this request or retry the same booking.' : e.message : 'Request could not be checked.'); } finally { setBusy(false); } };
 return <Sheet open={open} onOpenChange={v => { if(!v && !confirmation && !busy) onClose(); }}>
  <SheetContent className="home-desk-sheet home-desk-schedule-sheet" overlayClassName="home-desk-overlay">
   <SheetTitle>Schedule a session</SheetTitle><SheetDescription>Book for the named student using one session credit. Normal calendar and email confirmations apply.</SheetDescription>
   <AccountPicker students={students} value={studentId} disabled={confirmation || busy || !!pending || unreadable} state={rosterState} onRetry={onRetryRoster} onChange={setStudentId}/>
   {studentId && (!loaded || pending || error) ? <div className="home-desk-confirm"><h3>{name}</h3><p>{person?.email || `Student ID: ${studentId}`}</p><p>Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p></div> : null}
   {unreadable ? <p role="alert">Saved scheduling request is unreadable. Keep this request for review before making another booking.</p>:null}
   {status ? <p role="status">{status}</p>:null}{error ? <p role="alert">{error}</p>:null}
   {pending ? <div className="home-desk-confirm">
     <p>Pending booking for {name} ({pending.studentId}): {new Date(pending.startAt).toLocaleString(undefined,{dateStyle:'full',timeStyle:'long'})}. The outcome is unknown. Closing keeps this request.</p>
     <button disabled={busy || confirmation || !(loaded?.api || recovery)} onClick={() => void operation(async()=>{ const found = await (loaded?.api || recovery)!.checkPending(); setFresh(true); setStatus(found ? 'Booking verified.': 'No new matching booking was verified.'); if(found) onCommitted?.(); })}>Check booking</button>
     <button disabled={busy || confirmation || !loaded} onClick={() => void operation(async()=>{await loaded!.api.retryPending(); setStatus('Booking verified.'); onCommitted?.();})}>Retry same booking</button>
     {fresh ? <><p>Discard only this saved request. The booking may already exist. Discard does not cancel a booking or restore a session credit.</p><label><input type="checkbox" checked={discard} onChange={e=>setDiscard(e.target.checked)}/>I reviewed this named student and time and accept that the booking may already exist.</label><button disabled={busy || !discard} onClick={()=>void operation(async()=>{await (loaded?.api || recovery)!.discardPending(true); setDiscard(false); setFresh(false); setStatus('Local request discarded. Review current bookings before a new booking.');})}>Discard pending request</button></>:null}
   </div>:null}
   {loaded && !unreadable && (!pending || confirmation) && eligibleAccounts(students).some(s=>s.class_id===studentId) ? <CalendlyBookingCard key={`${actorId}:${studentId}:${loaded.pass.id}:${loaded.slug}`} api={loaded.api} theme="app" dayPicker="dropdown" bookingFor={{name,email:person?.email ?? ''}} onConfirmationChange={setConfirmation} onBookingCommitted={onCommitted}/>:null}
   <button className="home-desk-text-button" disabled={confirmation || busy} onClick={onClose}>Close</button>
  </SheetContent>
 </Sheet>;
}
