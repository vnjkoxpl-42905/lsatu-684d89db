import { describe, expect, it } from 'vitest';
import { isSelfContainedItem, resolveItemRoute } from './classroomItems';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

function item(over: Partial<ClassroomItem>): ClassroomItem {
  return {
    id: 'item-1',
    student_id: 's',
    class_id: null,
    created_by: 'a',
    type: 'homework',
    title: 'Logical Reasoning · Timed Section',
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
    created_at: '2026-08-30T00:00:00Z',
    updated_at: '2026-08-30T00:00:00Z',
    ...over,
  } as ClassroomItem;
}

describe('a homework item that carries its own page', () => {
  it('opens its own item view rather than the classroom index', () => {
    // The bug: an assigned section is written straight into classroom_items
    // with no backing assignment row, so this returned "/classroom" and the
    // hero button reloaded the page the student was already on.
    const section = item({ content_html: '<div>cover</div>' });
    expect(isSelfContainedItem(section)).toBe(true);
    expect(resolveItemRoute(section)).toBe('/classroom/item/item-1');
  });

  it('still prefers the backing assignment when there is one', () => {
    const mirrored = item({ source_id: 'hw-9', content_html: '<div>cover</div>' });
    expect(isSelfContainedItem(mirrored)).toBe(false);
    expect(resolveItemRoute(mirrored)).toBe('/classroom/hw-9');
  });

  it('falls back to the classroom index when there is no page and no source', () => {
    expect(resolveItemRoute(item({}))).toBe('/classroom');
  });

  it('counts a markdown body as its own page too', () => {
    expect(isSelfContainedItem(item({ content_markdown: '# cover' }))).toBe(true);
  });
});
