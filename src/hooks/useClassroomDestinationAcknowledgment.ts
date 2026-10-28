import { useLocation } from 'react-router-dom';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { useLoadedStudentWorkAcknowledgment } from '@/hooks/useStudentWorkState';
import { parseWorkIdentity } from '@/lib/studentWorkIdentity';
import { resolveItemRoute } from '@/lib/classroomItems';
/** A real mounted static lesson calls this after rendering its authored content. */
export function useClassroomDestinationAcknowledgment(ready: boolean) {
    const location = useLocation();
    const requested = parseWorkIdentity(location.search);
    const items = useClassroomItems();
    const candidates = (items.data ?? []).filter(item => resolveItemRoute(item)?.split('?')[0] === location.pathname).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    const loaded = requested ? candidates.find(item => item.workIdentity?.sourceTable === requested.sourceTable && item.workIdentity.sourceId === requested.sourceId) : candidates[0];
    useLoadedStudentWorkAcknowledgment({ sourceTable: loaded?.workIdentity?.sourceTable ?? 'classroom_items', sourceId: loaded?.workIdentity?.sourceId ?? loaded?.id, studentId: loaded?.student_id, ready: ready && !!loaded && !items.isLoading && !items.isError });
}
