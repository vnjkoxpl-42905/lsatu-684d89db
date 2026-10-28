export type CalendarSlot = { start_at: string; end_at: string };

export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function buildMonthCells(anchor: Date): (Date | null)[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
  const count = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= count; day += 1) cells.push(new Date(anchor.getFullYear(), anchor.getMonth(), day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function groupSlotsByDay<T extends CalendarSlot>(slots: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const slot of slots) {
    const key = dayKey(new Date(slot.start_at));
    grouped.set(key, [...(grouped.get(key) ?? []), slot]);
  }
  return grouped;
}

export function slotDays(slots: CalendarSlot[], limit: number): Date[] {
  return [...groupSlotsByDay(slots).keys()].slice(0, limit).map((key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month, day);
  });
}

export function formatBookingTime(iso: string, hour12?: boolean) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric", minute: "2-digit", ...(hour12 === undefined ? {} : { hour12 }),
  });
}
