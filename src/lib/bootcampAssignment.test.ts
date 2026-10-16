/**
 * Assigning a bootcamp has to actually open it for the student.
 *
 * Three separate places have to agree on one identity: AssignmentBuilder writes
 * the classroom_items row, BootcampGate decides whether to let the student in,
 * and the bootcamp library decides whether to show the card. They agree only if
 * the id derived from the route matches the id stored on the row. These lock
 * that agreement for every registered bootcamp, so a newly added one cannot
 * ship assignable-but-unopenable.
 */

import { describe, expect, it } from 'vitest';
import {
  BOOTCAMPS,
  bootcampIdFromRoute,
  classroomItemMatchesBootcamp,
  findBootcampById,
  type BootcampDef,
} from './bootcamps';

/** The classroom_items row AssignmentBuilder creates for a bootcamp. */
function assignedRow(bootcamp: BootcampDef) {
  return {
    source_id: bootcamp.route,
    metadata_json: { bootcamp_id: bootcamp.id } as Record<string, unknown>,
  };
}

describe.each(BOOTCAMPS.map((b) => [b.title, b] as const))('%s is assignable', (_title, bootcamp) => {
  it('derives the same id from its route that assignment stores', () => {
    // Topic-family routes resolve through the registry rather than the path.
    expect(bootcampIdFromRoute(bootcamp.route)).toBe(bootcamp.id);
  });

  it('opens the gate for the row assignment writes', () => {
    expect(classroomItemMatchesBootcamp(assignedRow(bootcamp), bootcamp.id)).toBe(true);
  });

  it('opens the gate when matched by route instead of id', () => {
    expect(classroomItemMatchesBootcamp(assignedRow(bootcamp), bootcamp.route)).toBe(true);
  });

  it('opens the gate on metadata alone', () => {
    expect(
      classroomItemMatchesBootcamp(
        { source_id: null, metadata_json: { bootcamp_id: bootcamp.id } },
        bootcamp.id,
      ),
    ).toBe(true);
  });

  it('opens the gate on source_id alone', () => {
    expect(
      classroomItemMatchesBootcamp({ source_id: bootcamp.route, metadata_json: null }, bootcamp.id),
    ).toBe(true);
  });

  it('does not open any other bootcamp', () => {
    for (const other of BOOTCAMPS) {
      if (other.id === bootcamp.id) continue;
      expect(classroomItemMatchesBootcamp(assignedRow(bootcamp), other.id)).toBe(false);
    }
  });
});

describe('bootcamp registry', () => {
  it('has unique ids and routes', () => {
    expect(new Set(BOOTCAMPS.map((b) => b.id)).size).toBe(BOOTCAMPS.length);
    expect(new Set(BOOTCAMPS.map((b) => b.route)).size).toBe(BOOTCAMPS.length);
  });

  it('registers the RC bootcamp so it appears in the assignment picker', () => {
    const rc = findBootcampById('rc-engaging-with-the-passage');
    expect(rc).toBeDefined();
    expect(rc?.route).toBe('/bootcamp/rc-engaging-with-the-passage');
    expect(rc?.title).toBe('Engaging With The Passage');
  });

  it('shows an assigned bootcamp in the student library', () => {
    // The filter src/pages/Bootcamps.tsx applies for a non-admin.
    const rc = findBootcampById('rc-engaging-with-the-passage')!;
    const items = [{ type: 'bootcamp_module', status: 'assigned', ...assignedRow(rc) }];
    const assignedIds = new Set(
      BOOTCAMPS.filter((bc) =>
        items.some(
          (it) =>
            it.type === 'bootcamp_module' &&
            it.status !== 'archived' &&
            classroomItemMatchesBootcamp(it, bc.id),
        ),
      ).map((bc) => bc.id),
    );
    expect([...assignedIds]).toEqual([rc.id]);
  });
});
