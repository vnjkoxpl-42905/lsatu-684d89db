import type { TodoAction } from '@/lib/todoActions';

export interface ScheduleTemplateDraftItem {
  day: string;
  title: string;
  estimatedMinutes?: number;
  deadline?: string;
  action?: TodoAction;
}

export interface ScheduleTemplateItem {
  day_offset: number;
  title: string;
  estimated_minutes?: number | null;
  instructions?: string | null;
  deadline_offset_minutes?: number | null;
}

const DAY_ALIASES: Record<string, number> = {
  monday: 0,
  mon: 0,
  tuesday: 1,
  tue: 1,
  tues: 1,
  wednesday: 2,
  wed: 2,
  thursday: 3,
  thu: 3,
  thur: 3,
  thurs: 3,
  friday: 4,
  fri: 4,
  saturday: 5,
  sat: 5,
  sunday: 6,
  sun: 6,
};

function dayOffsetFromLabel(label: string): number | null {
  const normalized = label.toLowerCase().replace(/[^a-z]/g, '');
  return DAY_ALIASES[normalized] ?? null;
}

function stripListMarker(line: string) {
  return line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
}

function parseMinutes(text: string): { title: string; estimated_minutes: number | null } {
  const match = text.match(/\((?:~\s*)?(\d{1,3})\s*(?:min|mins|minutes|m)\)/i);
  if (!match) return { title: text.trim(), estimated_minutes: null };
  return {
    title: `${text.slice(0, match.index).trim()} ${text.slice((match.index ?? 0) + match[0].length).trim()}`.trim(),
    estimated_minutes: Number(match[1]),
  };
}

export function parseScheduleTemplateText(raw: string): ScheduleTemplateItem[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: ScheduleTemplateItem[] = [];
  let currentOffset: number | null = null;

  for (const line of lines) {
    const heading = line.match(/^([A-Za-z]+)\s*:?\s*$/);
    if (heading) {
      currentOffset = dayOffsetFromLabel(heading[1]);
      if (currentOffset !== null) continue;
    }

    const inline = line.match(/^([A-Za-z]+)\s*:\s*(.+)$/);
    let body = line;
    let offset = currentOffset;

    if (inline) {
      const inlineOffset = dayOffsetFromLabel(inline[1]);
      if (inlineOffset !== null) {
        offset = inlineOffset;
        currentOffset = inlineOffset;
        body = inline[2];
      }
    }

    if (offset === null) continue;

    const { title, estimated_minutes } = parseMinutes(stripListMarker(body));
    if (!title) continue;
    items.push({
      day_offset: offset,
      title,
      estimated_minutes,
      deadline_offset_minutes: null,
    });
  }

  return items;
}

