export type Student = {
  id: string;
  email: string;
  name: string;
  archived?: boolean;
  admin?: boolean;
  aliases?: string[];
};
export type CalendarEvent = {
  id: string;
  summary?: string;
  status?: string;
  updated?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  attendees?: {
    email?: string;
    responseStatus?: string;
    self?: boolean;
    resource?: boolean;
    organizer?: boolean;
  }[];
  attachments?: {
    fileId?: string;
    fileUrl?: string;
    title?: string;
    mimeType?: string;
  }[];
};
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
export function docId(url: string): string | null {
  return /^https:\/\/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]{10,200})(?:\/[^?#]*)?(?:[?#].*)?$/
    .exec(url)?.[1] ?? null;
}
export const isSyncAction = (action?: string) =>
  action === undefined || action === "sync";
export async function recordSyncAttempt(
  action: string | undefined,
  write: () => Promise<unknown>,
) {
  if (isSyncAction(action)) await write();
}
export function transcript(event: CalendarEvent) {
  const docs = (event.attachments ?? []).filter((a) =>
    a.mimeType === "application/vnd.google-apps.document"
  );
  const allIds = [
    ...new Set(
      docs.map((a) => a.fileUrl ? docId(a.fileUrl) : null).filter(Boolean),
    ),
  ];
  const namedIds = [
    ...new Set(
      docs.filter((a) => /gemini|notes|transcript/i.test(a.title ?? "")).map(
        (a) => a.fileUrl ? docId(a.fileUrl) : null,
      ).filter(Boolean),
    ),
  ];
  const certain = allIds.length === 1 && namedIds.length === 1;
  return {
    transcript_doc_id: certain ? namedIds[0] : null,
    transcript_status: certain
      ? "linked"
      : docs.length
      ? "needs_review"
      : "waiting",
  };
}
export type Source = {
  source_state: string;
  source_updated_at: string;
  source_title?: string;
  starts_at?: string;
  ends_at?: string;
  student_id?: string | null;
  student_name?: string | null;
  match_state?: string;
  transcript_doc_id?: string | null;
  transcript_status?: string;
};
export function candidateEmails(
  event: CalendarEvent,
  teacher: string,
): string[] {
  return [
    ...new Set(
      (event.attendees ?? []).filter((a) =>
        a.email && !a.self && !a.resource && a.responseStatus !== "declined" &&
        normalizeEmail(a.email) !== normalizeEmail(teacher)
      ).map((a) => normalizeEmail(a.email!)),
    ),
  ];
}
export function matchStudent(
  event: CalendarEvent,
  roster: Student[],
  teacher: string,
): Student | null {
  const emails = candidateEmails(event, teacher);
  const matches = roster.filter((s) =>
    emails.some((e) =>
      [s.email, ...(s.aliases ?? [])].some((v) => normalizeEmail(v) === e)
    )
  );
  return matches.length === 1 && !matches[0].archived && !matches[0].admin
    ? matches[0]
    : null;
}
export function consultationSource(
  event: CalendarEvent,
  teacher: string,
  now: string,
) {
  const starts = event.start?.dateTime, ends = event.end?.dateTime;
  return {
    source_title: event.summary ?? "Consultation",
    source_updated_at: event.updated ?? now,
    starts_at: starts,
    ends_at: ends,
    eligible_guest: candidateEmails(event, teacher).length > 0,
    source_state: event.status === "cancelled"
      ? "cancelled"
      : !starts || !ends
      ? "unavailable"
      : Date.parse(ends) > Date.parse(now)
      ? "rescheduled"
      : "ended",
  };
}
export function classify(
  event: CalendarEvent,
  roster: Student[],
  teacher: string,
  cutoff: string,
  now: string,
  existing = false,
  explicitlySession = false,
): Source | null {
  if (!event.id) return null;
  if (event.status === "cancelled") {
    return existing
      ? { source_state: "cancelled", source_updated_at: event.updated ?? now }
      : null;
  }
  const starts = event.start?.dateTime, ends = event.end?.dateTime;
  if (!starts || !ends || !Number.isFinite(Date.parse(ends))) {
    return existing
      ? { source_state: "unavailable", source_updated_at: event.updated ?? now }
      : null;
  }
  if (
    !existing &&
    (Date.parse(ends) < Date.parse(cutoff) ||
      Date.parse(ends) > Date.parse(now))
  ) return null;
  const emails = candidateEmails(event, teacher);
  if (!existing && !emails.length) return null;
  const matches = roster.filter((s) =>
    emails.some((e) =>
      [s.email, ...(s.aliases ?? [])].some((v) => normalizeEmail(v) === e)
    )
  );
  if (
    !existing && !explicitlySession && !matches.length &&
    /consultation|consult call|personal|out of office|holiday/i.test(
      event.summary ?? "",
    )
  ) return null;
  if (
    !existing && !explicitlySession && !matches.length &&
    !/session|tutoring|lsat lesson/i.test(event.summary ?? "")
  ) return null;
  // Shared/archived/admin matches hold the task, even if one active match also exists.
  const student =
    matches.length === 1 && !matches[0].archived && !matches[0].admin
      ? matches[0]
      : null;
  return {
    source_title: event.summary ?? "Teaching session",
    starts_at: starts,
    ends_at: ends,
    source_state: Date.parse(ends) > Date.parse(now) ? "rescheduled" : "ended",
    source_updated_at: event.updated ?? now,
    student_id: student?.id ?? null,
    student_name: student?.name ?? null,
    match_state: student ? "matched" : "needs_match",
    ...transcript(event),
  };
}
const day = 86_400_000;
export function coverage(cutoff: string, covered: string | null, now: string) {
  const c = Date.parse(cutoff),
    previous = Math.max(c, Date.parse(covered ?? cutoff)),
    end = Math.min(Date.parse(now), previous + 7 * day);
  return {
    start: new Date(Math.max(c, previous - day)).toISOString(),
    end: new Date(end).toISOString(),
    catchingUp: end < Date.parse(now),
  };
}

export interface WorkerIO {
  renew(): Promise<void>;
  list(
    params: Record<string, string>,
  ): Promise<{ items?: CalendarEvent[]; nextPageToken?: string }>;
  save(event: CalendarEvent): Promise<void>;
  revisits(): Promise<{ event_id: string }[]>;
  get(id: string): Promise<CalendarEvent>;
  unavailable(id: string): Promise<void>;
  finish(covered: string, updated: string, catchingUp: boolean): Promise<void>;
}
export async function runWorker(
  io: WorkerIO,
  settings: {
    activation_cutoff: string;
    covered_through: string | null;
    updated_checkpoint: string | null;
  },
  frozenNow: string,
) {
  const chunk = coverage(
    settings.activation_cutoff,
    settings.covered_through,
    frozenNow,
  );
  async function pass(params: Record<string, string>) {
    let token: string | undefined;
    const seen = new Set<string>();
    do {
      await io.renew();
      const page = await io.list({
        singleEvents: "true",
        showDeleted: "true",
        orderBy: "startTime",
        maxResults: "250",
        ...params,
        ...(token ? { pageToken: token } : {}),
      });
      for (const event of page.items ?? []) {
        await io.renew();
        await io.save(event);
      }
      token = page.nextPageToken;
      if (token && seen.has(token)) {
        throw new Error("calendar_page_token_repeated");
      }
      if (token) seen.add(token);
    } while (token);
  }
  await pass({ timeMin: chunk.start, timeMax: chunk.end });
  await pass({
    timeMin: settings.activation_cutoff,
    timeMax: chunk.end,
    updatedMin: settings.updated_checkpoint ?? settings.activation_cutoff,
  });
  for (const task of await io.revisits()) {
    await io.renew();
    try {
      await io.save(await io.get(task.event_id));
    } catch (e) {
      if ([404, 410].includes((e as { status?: number }).status ?? 0)) {
        await io.unavailable(task.event_id);
      } else throw e;
    }
  }
  await io.renew();
  await io.finish(chunk.end, frozenNow, chunk.catchingUp);
}
