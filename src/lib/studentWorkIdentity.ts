export const STUDENT_WORK_TABLES = ['homework_assignments', 'ta_assignments', 'guided_drill_assignments', 'activity_assignments', 'practice_test_assignments', 'classroom_items'] as const;
export interface StudentWorkIdentity {
    sourceTable: string;
    sourceId: string;
    issuance: number;
}
type ClassroomContent={source_table:string|null;source_id:string|null;title?:string;description?:string|null;content_html?:string|null;content_markdown?:string|null;metadata_json?:Record<string,unknown>};
export function classroomContentKey(item:ClassroomContent):string {
    const stable=(value:unknown):unknown=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,entry])=>[key,stable(entry)])):value;
    const metadata=Object.fromEntries(Object.entries(item.metadata_json??{}).filter(([key])=>!['read_at','notification_policy','notification_group_id','issuance'].includes(key)));
    return JSON.stringify(stable([item.source_table,item.source_id,item.title,item.description,item.content_html,item.content_markdown,metadata]));
}
/** Collapse only concurrent standalone bootcamp copies with identical authored instructions. */
export function deduplicateEquivalentClassroomItems<T extends {
    id: string;
    type: string;
    status: string;
    created_at: string;
    source_table: string | null;
    source_id: string | null;
    title?: string;
    description?: string | null;
    content_html?: string | null;
    content_markdown?: string | null;
    metadata_json?: Record<string, unknown>;
}>(items: T[]): T[] {
    const seen = new Set<string>();
    const retained = [...items].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id.localeCompare(a.id)).filter(item => {
        if (item.type !== 'bootcamp_module' || !['assigned', 'in_progress'].includes(item.status))
            return true;
        const signature = classroomContentKey(item);
        if (seen.has(signature))
            return false;
        seen.add(signature);
        return true;
    });
    const ids = new Set(retained.map(item => item.id));
    return items.filter(item => ids.has(item.id));
}
export function studentWorkIdentityKey(identity: StudentWorkIdentity) { return `${identity.sourceTable}:${identity.sourceId}:${identity.issuance}`; }
export function withWorkIdentity(route: string, identity: StudentWorkIdentity): string {
    const url = new URL(route, 'https://lsatprep.study');
    if (url.origin !== 'https://lsatprep.study')
        return route;
    url.searchParams.set('workSource', identity.sourceTable);
    url.searchParams.set('workId', identity.sourceId);
    url.searchParams.set('workIssuance', String(identity.issuance));
    return `${url.pathname}${url.search}${url.hash}`;
}
export function parseWorkIdentity(search: string): StudentWorkIdentity | null {
    const params = new URLSearchParams(search);
    const sourceTable = params.get('workSource');
    const sourceId = params.get('workId');
    const issuance = Number(params.get('workIssuance'));
    if (!STUDENT_WORK_TABLES.includes(sourceTable as typeof STUDENT_WORK_TABLES[number]) || !sourceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceId) || !Number.isSafeInteger(issuance) || issuance < 1)
        return null;
    return { sourceTable: sourceTable!, sourceId, issuance };
}
export function classroomWorkIdentity(item: {
    id: string;
    source_table: string | null;
    source_id: string | null;
    issuance?: number;
}, practiceTests: {
    id: string;
    pt: number;
}[] = []): StudentWorkIdentity | null {
    if (item.source_table && STUDENT_WORK_TABLES.includes(item.source_table as typeof STUDENT_WORK_TABLES[number]) && item.source_table !== 'classroom_items') {
        let sourceId = item.source_id;
        if (item.source_table === 'practice_test_assignments' && sourceId?.startsWith('practice_test:'))
            sourceId = practiceTests.find(test => test.pt === Number(sourceId!.split(':')[1]))?.id ?? null;
        return sourceId ? { sourceTable: item.source_table, sourceId, issuance: item.issuance ?? 1 } : null;
    }
    return { sourceTable: 'classroom_items', sourceId: item.id, issuance: item.issuance ?? 1 };
}
