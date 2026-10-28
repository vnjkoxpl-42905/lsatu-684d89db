import { describe, expect, it } from 'vitest';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { archiveShown, filterTeachingNotes, htmlToArchiveText, nearestArchiveNote, orderedTeachingNotes, teachingNoteText } from './teachingNotesArchiveData';

function note(id: string, overrides: Partial<ClassroomItem> = {}) {
  return { id, type: 'note', title: id, created_at: '2026-10-26T12:00:00Z', content_html: '', content_markdown: null, description: null, metadata_json: {}, status: 'assigned', ...overrides } as ClassroomItem;
}
describe('teaching note archive', () => {
  it('extracts readable text without retaining resource or style content', () => {
    expect(htmlToArchiveText('<style>@import url(https://invalid.test);hidden</style><p>Complete condition</p><p>Second paragraph<img src="https://invalid.test/a" onerror="window.bad=1"></p><script>window.bad=2</script>')).toBe('Complete condition Second paragraph');
    expect(document.querySelector('img[src="https://invalid.test/a"]')).toBeNull();
  });
  it('uses source body when available and description otherwise', () => {
    expect(teachingNoteText(note('a', { content_html: '<p>Full body</p>', description: 'Description' }))).toBe('Full body');
    expect(teachingNoteText(note('a', { description: 'Description' }))).toBe('Description');
  });
  it('searches the complete sorted collection before limiting visible cards', () => {
    const records = Array.from({ length: 26 }, (_, index) => note(String(index).padStart(2, '0'), { content_html: `<p>${index === 25 ? 'older body target' : 'Ordinary text'}</p>` }));
    const sorted = orderedTeachingNotes(records.reverse());
    expect(sorted.map((item) => item.id)).toEqual(Array.from({ length: 26 }, (_, index) => String(index).padStart(2, '0')));
    const text = new Map(sorted.map((item) => [item.id, teachingNoteText(item)]));
    expect(filterTeachingNotes(sorted, text, 'BODY TARGET', false).map((item) => item.id)).toEqual(['25']);
  });
  it('keeps read notes in All and excludes them only in Unread', () => {
    const records = [note('read', { metadata_json: { read_at: '2026-10-26' } }), note('unread')];
    expect(filterTeachingNotes(records, new Map(), '', false)).toHaveLength(2);
    expect(filterTeachingNotes(records, new Map(), '', true).map((item) => item.id)).toEqual(['unread']);
  });
  it('restores the opened card or the nearest surviving neighbour', () => {
    expect(nearestArchiveNote(['a', 'b', 'c', 'd'], 'b', ['a', 'b', 'c'])).toBe('b');
    expect(nearestArchiveNote(['a', 'b', 'c', 'd'], 'b', ['a', 'c', 'd'])).toBe('c');
    expect(nearestArchiveNote(['a', 'b'], 'b', ['a'])).toBe('a');
    expect(nearestArchiveNote(['a'], 'a', [])).toBeUndefined();
  });
  it('bounds invalid and excessive archive limits', () => {
    expect(archiveShown('-1')).toBe(12);
    expect(archiveShown('13abc')).toBe(12);
    expect(archiveShown('24')).toBe(24);
    expect(archiveShown('999999')).toBe(10000);
  });
});
