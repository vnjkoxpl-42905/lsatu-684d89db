import { scheduleData as principleFlawSchedule } from '@/bootcamps/principle-flaw/data';

// Per-bootcamp day registry — exposes a uniform shape so the teacher
// AssignmentBuilder can render a multi-select without knowing which
// bootcamp it's looking at. Returns null for bootcamps that don't (yet)
// publish a day schedule; callers hide the day picker in that case.

export interface BootcampDay {
  day: number;
  label: string;
  focus: string;
}

const REGISTRY: Record<string, BootcampDay[]> = {
  'principle-flaw': principleFlawSchedule.map((d) => ({
    day: d.day,
    label: d.label,
    focus: d.focus,
  })),
};

export function bootcampDays(bootcampId: string): BootcampDay[] | null {
  return REGISTRY[bootcampId] ?? null;
}
