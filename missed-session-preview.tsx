import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './src/index.css';
import { supabase } from './src/integrations/supabase/client';
import StudentBookingPanel from './src/components/teacher/schedule/StudentBookingPanel';
let returned = false;
const invoke = async (_name: string, {body}: any) => ({error:null,data:body.action==='history'?{redemptions:[{id:'preview',start_at:'2026-10-13T15:00:00Z',status:'booked',credit_refunded:returned},{id:'already',start_at:'2026-10-12T15:00:00Z',status:'booked',credit_refunded:true}]}:{pass:{id:'pass',total_credits:8,used_credits:returned?2:3,credits_remaining:returned?6:5,session_length_minutes:70,booking_url:'https://example.com'}}});
Object.defineProperty(supabase, 'functions', { value: { invoke }, configurable: true });
(supabase as any).rpc = async () => {returned=true; return {error:null,data:{already_returned:false}};};
createRoot(document.getElementById('root')!).render(<div style={{maxWidth:850,margin:'30px auto',padding:16}}><StudentBookingPanel studentId="preview" studentName="Preview Student" studentEmail="preview@example.com"/><Toaster/></div>);

