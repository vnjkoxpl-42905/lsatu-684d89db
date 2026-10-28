import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { withWorkIdentity, type StudentWorkIdentity } from '@/lib/studentWorkIdentity';
import { routeWithReturnTo } from '@/hooks/useAssignedTodoFeed';
import { useAssignmentGroupAcknowledgment } from '@/hooks/useStudentWorkState';
type UpdateMember = {
    source_table: string;
    source_id: string;
    issuance: number;
    title: string;
    link: string;
    read_at: string | null;
};
export default function AssignmentUpdate({ groupId, generalAccess = true, readingCenterAllowed = false }: {
    groupId: string;
    generalAccess?: boolean;
    readingCenterAllowed?: boolean;
}) {
    const { user } = useAuth();
    const location = useLocation();
    const userId = user?.id;
    const query = useQuery({ queryKey: ['assignment-update', userId, groupId], enabled: !!userId, retry: false, queryFn: async () => {
            const { data: before, error: authError } = await supabase.auth.getUser();
            if (authError || before.user?.id !== userId)
                throw new Error('Your account changed. Reload this update.');
            const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{
                data: unknown;
                error: unknown;
            }>)('get_assignment_notification_group_items', { p_group_id: groupId });
            if (error)
                throw error;
            const { data: after, error: afterError } = await supabase.auth.getUser();
            if (afterError || after.user?.id !== userId)
                throw new Error('Your account changed. Reload this update.');
            if (!Array.isArray(data) || data.some(row => !row || typeof row.source_table !== 'string' || typeof row.source_id !== 'string' || !Number.isInteger(row.issuance) || typeof row.title !== 'string' || typeof row.link !== 'string' || (!row.link.startsWith('/') && !/^https?:\/\//i.test(row.link)) || row.link.startsWith('//') || row.link.includes('\\')))
                throw new Error('This update could not be loaded.');
            return data as UpdateMember[];
        } });
    const members = query.data?.filter(item => item.link.startsWith("/reading-center") ? readingCenterAllowed : generalAccess) ?? [];
    const completeAccess = query.data !== undefined && members.length === query.data.length;
    useAssignmentGroupAcknowledgment({ ready: query.isSuccess && !query.isFetching && completeAccess });
    if (query.isPending)
        return <p className="student-destination-message" role="status">Loading this update…</p>;
    if (query.isError)
        return <div className="student-destination-message" role="alert"><p>We could not load this update. Its unread status has been kept.</p><button className="classroom-button" onClick={() => void query.refetch()}>Try again</button></div>;
    return <section className="student-work-list my-work-organized" aria-label="This assignment update"><div className="my-work-list-heading"><h2>This update</h2><Link className="my-work-update-back" to="/my-work/to-do">All assigned work <ArrowRight size={14} aria-hidden="true"/></Link></div><p>Notes and work shared together. Each item stays unread until you open it.</p>{!completeAccess ? <p role="status">Some items in this update are not available for your account. The update remains unread.</p> : null}{query.data.length === 0 ? <p className="student-destination-message">Your plan is ready. Open assigned work to see what is available now.</p> : <ul data-motion-list>{members.map(item => { const identity: StudentWorkIdentity = { sourceTable: item.source_table, sourceId: item.source_id, issuance: item.issuance }; return <li key={item.source_table + ':' + item.source_id + ':' + item.issuance} data-motion-item><Link className="student-work-row" to={routeWithReturnTo(withWorkIdentity(item.link, identity), location.pathname + location.search)}><span><strong>{item.title}</strong><small>{item.read_at ? 'Read' : 'Unread'}</small></span><span className="my-work-row-action"><ArrowRight size={18} aria-hidden="true"/></span></Link></li>; })}</ul>}</section>;
}
