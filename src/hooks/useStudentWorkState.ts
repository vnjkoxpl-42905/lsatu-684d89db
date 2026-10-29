import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { STUDENT_WORK_TABLES, parseWorkIdentity, studentWorkIdentityKey, type StudentWorkIdentity } from '@/lib/studentWorkIdentity';
import { acknowledgeAssignmentGroup, acknowledgeStudentWork, loadStudentWorkState } from '@/lib/studentWorkState';
type WorkSubscription={references:number;channel:ReturnType<typeof supabase.channel>};
const workSubscriptions=new WeakMap<QueryClient,Map<string,WorkSubscription>>();
function subscribeToStudentWork(client:QueryClient,userId:string) {
    let actors=workSubscriptions.get(client);
    if(!actors){actors=new Map();workSubscriptions.set(client,actors);}
    let subscription=actors.get(userId);
    if(!subscription){
        const refresh=()=>{
            for(const key of ['student-work-state','todo-feed:practice-tests','todo-feed:guided','todo-feed:activity','todo-feed:assignment-evidence','student-assignments','student-ta-assignments','classroom-items'])void client.invalidateQueries({queryKey:[key,userId]});
        };
        let channel=supabase.channel(`student-work-${userId}-${Math.random().toString(36).slice(2)}`);
        for(const table of [...STUDENT_WORK_TABLES,'student_work_receipts'])channel=channel.on('postgres_changes',{event:'*',schema:'public',table,filter:`student_id=eq.${userId}`},refresh);
        channel.subscribe();subscription={references:0,channel};actors.set(userId,subscription);
    }
    subscription.references++;
    const retained=subscription;
    return ()=>{
        retained.references--;
        if(retained.references===0&&actors!.get(userId)===retained){actors!.delete(userId);void supabase.removeChannel(retained.channel);}
    };
}
export function useStudentWorkAccessReceipts() {
    const { user } = useAuth();
    const userId = user?.id;
    const client = useQueryClient();
    const query = useQuery({ queryKey: ['student-work-state', userId], enabled: !!userId, staleTime: 5000, queryFn: () => loadStudentWorkState(userId!) });
    useEffect(() => {
        if (!userId)
            return;
        return subscribeToStudentWork(client,userId);
    }, [client, userId]);
    return query;
}
function useForeground() {
    const [foreground, setForeground] = useState(() => document.visibilityState === 'visible' && document.hasFocus());
    useEffect(() => { const update = () => setForeground(document.visibilityState === 'visible' && document.hasFocus()); document.addEventListener('visibilitychange', update); window.addEventListener('focus', update); window.addEventListener('blur', update); return () => { document.removeEventListener('visibilitychange', update); window.removeEventListener('focus', update); window.removeEventListener('blur', update); }; }, []);
    return foreground;
}
export function useLoadedStudentWorkAcknowledgment({ sourceTable, sourceId, ready, studentId }: {
    sourceTable: string;
    sourceId?: string | null;
    ready: boolean;
    studentId?: string | null;
}) {
    const state = useStudentWorkAccessReceipts();
    const location = useLocation();
    const requested = parseWorkIdentity(location.search);
    const current = state.data?.access.find(row => row.available && row.source_table === sourceTable && row.source_id === sourceId);
    const identity = current ? { sourceTable, sourceId: current.source_id, issuance: current.issuance } : null;
    const params = new URLSearchParams(location.search);
    const hasRequested = params.has('workSource') || params.has('workId') || params.has('workIssuance');
    const exact = !hasRequested || (!!requested && !!identity && studentWorkIdentityKey(requested) === studentWorkIdentityKey(identity));
    useStudentWorkAcknowledgment({ identity, ready: ready && !state.isError && exact, studentId });
}
export function useLoadedPracticeTestAcknowledgment(pt: number | undefined, ready: boolean, ownerId: string | undefined) {
    const { user } = useAuth();
    const location = useLocation();
    const requested = parseWorkIdentity(location.search);
    const source = useQuery({ queryKey: ['loaded-pt-assignment', user?.id, pt, requested?.sourceId], enabled: ready && !!pt && user?.id === ownerId, queryFn: async () => {
            let query = supabase.from('practice_test_assignments').select('*').eq('student_id', user!.id).eq('pt', pt!).neq('status', 'archived').order('assigned_at', { ascending: false }).order('id', { ascending: false });
            if (requested?.sourceTable === 'practice_test_assignments')
                query = query.eq('id', requested.sourceId);
            const { data, error } = await query;
            if (error)
                throw error;
            return data?.[0] ?? null;
        } });
    useLoadedStudentWorkAcknowledgment({ sourceTable: 'practice_test_assignments', sourceId: source.data?.id, studentId: ownerId, ready: ready && !source.isLoading && !source.isError && !!source.data });
}
/** Call only with the identity of content whose owned load actually succeeded. */
export function useStudentWorkAcknowledgment({ identity, ready, studentId }: {
    identity: StudentWorkIdentity | null | undefined;
    ready: boolean;
    studentId?: string | null;
}) {
    const { user } = useAuth();
    const userId = user?.id;
    const client = useQueryClient();
    const foreground = useForeground();
    const actor = useRef(userId);
    actor.current = userId;
    const completed = useRef(new Set<string>());
    const key = identity ? studentWorkIdentityKey(identity) : '';
    useEffect(() => {
        if (!userId || !identity || !ready || !foreground || (studentId && studentId !== userId))
            return;
        const attempt = `${userId}:${key}`;
        if (completed.current.has(attempt))
            return;
        completed.current.add(attempt);
        void acknowledgeStudentWork(identity, userId).then(receipt => {
            if (actor.current !== userId)
                return;
            client.setQueryData(['student-work-state', userId], (previous: Awaited<ReturnType<typeof loadStudentWorkState>> | undefined) => previous ? { ...previous, receipts: [...previous.receipts.filter(row => !(row.source_table === receipt.source_table && row.source_id === receipt.source_id && row.issuance === receipt.issuance)), receipt] } : previous);
            for (const queryKey of [['student-work-state', userId], ['classroom-items', userId], ['notifications', userId], ['notifications-unread-count', userId]])
                void client.invalidateQueries({ queryKey });
        }).catch(error => { completed.current.delete(attempt); console.warn('Could not confirm opened work', error); });
    }, [userId, key, ready, foreground, studentId, client]);
}
export function useAssignmentGroupAcknowledgment({ ready }: {
    ready: boolean;
}) {
    const { user } = useAuth();
    const location = useLocation();
    const foreground = useForeground();
    const client = useQueryClient();
    const actor = useRef(user?.id);
    actor.current = user?.id;
    const completed = useRef(new Set<string>());
    const groupId = new URLSearchParams(location.search).get('workGroup');
    useEffect(() => {
        const userId = user?.id;
        if (!userId || !ready || !foreground || !groupId || !/^[0-9a-f-]{36}$/i.test(groupId))
            return;
        const key = `${userId}:${groupId}`;
        if (completed.current.has(key))
            return;
        completed.current.add(key);
        void acknowledgeAssignmentGroup(groupId, userId).then(() => {
            if (actor.current !== userId)
                return;
            void client.invalidateQueries({ queryKey: ['notifications', userId] });
            void client.invalidateQueries({ queryKey: ['notifications-unread-count', userId] });
        }).catch(error => { completed.current.delete(key); console.warn('Could not confirm opened collection', error); });
    }, [user?.id, ready, foreground, groupId, client]);
}
