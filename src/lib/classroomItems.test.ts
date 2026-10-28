import { describe, it, expect } from 'vitest';
import { nextActionFor, resolveItemRoute } from './classroomItems';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

function makeItem(overrides: Partial<ClassroomItem> = {}): ClassroomItem {
  return {
    id: 'item-1',
    student_id: 'student-1',
    class_id: null,
    created_by: 'teacher-1',
    type: 'drill',
    title: 'Test item',
    description: null,
    content_html: null,
    content_markdown: null,
    source_table: null,
    source_id: null,
    status: 'assigned',
    unlock_at: null,
    due_at: null,
    completed_at: null,
    priority: 0,
    visible_to_student: true,
    metadata_json: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── nextActionFor ───────────────────────────────────────────────────────────

describe('nextActionFor', () => {
  it('returns null for empty array', () => {
    expect(nextActionFor([])).toBeNull();
  });

  it('returns null when no assigned or in_progress items', () => {
    const items = [
      makeItem({ status: 'completed' }),
      makeItem({ status: 'archived' }),
    ];
    expect(nextActionFor(items)).toBeNull();
  });

  it('returns the single assigned item', () => {
    const item = makeItem({ id: 'a', status: 'assigned' });
    expect(nextActionFor([item])).toBe(item);
  });

  it('treats in_progress as a candidate', () => {
    const item = makeItem({ id: 'b', status: 'in_progress' });
    expect(nextActionFor([item])).toBe(item);
  });

  it('prefers higher priority', () => {
    const lo = makeItem({ id: 'lo', priority: 0 });
    const hi = makeItem({ id: 'hi', priority: 10 });
    expect(nextActionFor([lo, hi])).toBe(hi);
    expect(nextActionFor([hi, lo])).toBe(hi);
  });

  it('breaks priority tie by earliest due_at', () => {
    const earlier = makeItem({ id: 'early', due_at: '2025-01-01T00:00:00Z', priority: 5 });
    const later   = makeItem({ id: 'late',  due_at: '2025-06-01T00:00:00Z', priority: 5 });
    expect(nextActionFor([later, earlier])).toBe(earlier);
  });

  it('items with no due_at sort after items with a due_at', () => {
    const dated   = makeItem({ id: 'dated',   due_at: '2025-12-31T00:00:00Z', priority: 1 });
    const undated = makeItem({ id: 'undated', due_at: null,                   priority: 1 });
    expect(nextActionFor([undated, dated])).toBe(dated);
  });

  it('breaks due_at tie by earliest unlock_at', () => {
    const a = makeItem({ id: 'a', due_at: '2025-06-01T00:00:00Z', unlock_at: '2025-01-01T00:00:00Z' });
    const b = makeItem({ id: 'b', due_at: '2025-06-01T00:00:00Z', unlock_at: '2025-03-01T00:00:00Z' });
    expect(nextActionFor([b, a])).toBe(a);
  });

  it('skips archived/completed and returns the actionable one', () => {
    const done   = makeItem({ id: 'done',   status: 'completed' });
    const active = makeItem({ id: 'active', status: 'in_progress', priority: 0 });
    expect(nextActionFor([done, active])).toBe(active);
  });
});

it('keeps old conditional card links exact and contextualizes only explicit expanded cards', () => {
  const source_id = '/bootcamp/conditionals?edition=full-conditionals-v3&scope=course&assignment=item-1#lesson';
  expect(resolveItemRoute(makeItem({ type: 'bootcamp_module', source_id: '/bootcamp/conditionals' }))).toBe('/bootcamp/conditionals');
  const route = resolveItemRoute(makeItem({ type: 'bootcamp_module', source_id, metadata_json: { conditional_target: { courseEdition: 'full-conditionals-v3' } } }));
  expect(route).toBe(source_id);
  expect(resolveItemRoute(makeItem({ type: 'bootcamp_module', source_id: '/bootcamp/conditionals?assignment=wrong', metadata_json: { conditional_target: { courseEdition: 'full-conditionals-v3' } } }))).toBe('/bootcamp/conditionals?assignment=item-1');
});

// ─── resolveItemRoute ────────────────────────────────────────────────────────

describe('resolveItemRoute', () => {
  it('guided drill assignment rows open the guided launch page with classroom return context', () => {
    const item = makeItem({
      type: 'drill',
      source_table: 'guided_drill_assignments',
      source_id: 'guided-abc',
    });
    expect(resolveItemRoute(item)).toBe('/guided/guided-abc?returnTo=%2Fclassroom');
  });

  it('drill with source_id → /drill?assignmentId=...', () => {
    const item = makeItem({ type: 'drill', source_id: 'set-abc' });
    expect(resolveItemRoute(item)).toBe('/drill?assignmentId=set-abc');
  });

  it('drill without source_id → /drill', () => {
    expect(resolveItemRoute(makeItem({ type: 'drill', source_id: null }))).toBe('/drill');
  });

  it('homework with source_id → /classroom/:id', () => {
    const item = makeItem({ type: 'homework', source_id: 'hw-42' });
    expect(resolveItemRoute(item)).toBe('/classroom/hw-42');
  });

  it('homework without source_id → /classroom', () => {
    expect(resolveItemRoute(makeItem({ type: 'homework', source_id: null }))).toBe('/classroom');
  });

  it('bootcamp_module with source_id → that path', () => {
    const item = makeItem({ type: 'bootcamp_module', source_id: '/bootcamp/principle-flaw' });
    expect(resolveItemRoute(item)).toBe('/bootcamp/principle-flaw');
  });

  it('bootcamp_module without source_id → /bootcamps', () => {
    expect(resolveItemRoute(makeItem({ type: 'bootcamp_module', source_id: null }))).toBe('/bootcamps');
  });

  it('note → /classroom/item/:id', () => {
    const item = makeItem({ id: 'note-99', type: 'note' });
    expect(resolveItemRoute(item)).toBe('/classroom/item/note-99');
  });

  it('session_recap → /classroom/item/:id', () => {
    const item = makeItem({ id: 'recap-1', type: 'session_recap' });
    expect(resolveItemRoute(item)).toBe('/classroom/item/recap-1');
  });

  it('announcement → /classroom/item/:id', () => {
    const item = makeItem({ id: 'ann-5', type: 'announcement' });
    expect(resolveItemRoute(item)).toBe('/classroom/item/ann-5');
  });

  it('URL-encodes IDs with special chars', () => {
    const item = makeItem({ type: 'drill', source_id: 'set a/b' });
    expect(resolveItemRoute(item)).toBe('/drill?assignmentId=set%20a%2Fb');
  });
});
