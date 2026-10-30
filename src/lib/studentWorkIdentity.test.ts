import { describe, it, expect } from 'vitest';
import { parseWorkIdentity, withWorkIdentity, classroomWorkIdentity, deduplicateEquivalentClassroomItems } from './studentWorkIdentity';
const identity = { sourceTable: 'practice_test_assignments', sourceId: '00000000-0000-4000-8000-000000000001', issuance: 2 };
describe('canonical destination identity', () => {
    it('keeps the newest identical concurrent bootcamp but preserves editions and completed history',()=>{
        const row={id:'one',type:'bootcamp_module',status:'assigned',created_at:'2026-10-27T00:00:00Z',source_table:'bootcamps',source_id:'/quick-drills/unless-drill',metadata_json:{edition:1}};
        const rows=deduplicateEquivalentClassroomItems([row,{...row,id:'two',created_at:'2026-10-28T00:00:00Z'},{...row,id:'edition',metadata_json:{edition:2}},{...row,id:'history',status:'completed'}]);
        expect(rows.map(row=>row.id).sort()).toEqual(['edition','history','two']);
    });
    it('preserves query and fragment through a round trip', () => { const route = withWorkIdentity('/testing?pt=141#start', identity); expect(parseWorkIdentity(route.split('?')[1].split('#')[0])).toEqual(identity); expect(route).toContain('pt=141'); expect(route).toContain('#start'); });
    it('rejects aliases and malformed generations as explicit canonical identity', () => { expect(parseWorkIdentity('?workSource=practice_test_assignments&workId=practice_test:141&workIssuance=1')).toBeNull(); expect(parseWorkIdentity(withWorkIdentity('/testing', { ...identity, issuance: 0 }).split('?')[1])).toBeNull(); });
    it('normalizes old PT mirrors to native assignment UUIDs', () => { expect(classroomWorkIdentity({ id: 'mirror', source_table: 'practice_test_assignments', source_id: 'practice_test:141' }, [{ id: identity.sourceId, pt: 141 }])).toEqual({ ...identity, issuance: 1 }); });
    it('keeps unrelated standalone instances distinct', () => { expect(classroomWorkIdentity({ id: 'one', source_table: 'bootcamps', source_id: '/bootcamp/a' })?.sourceId).toBe('one'); expect(classroomWorkIdentity({ id: 'two', source_table: 'bootcamps', source_id: '/bootcamp/a' })?.sourceId).toBe('two'); });
});
