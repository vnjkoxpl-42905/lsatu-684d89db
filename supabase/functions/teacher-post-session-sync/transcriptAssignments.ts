import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  exportDocText,
  isWellFormedUuid,
} from "../_shared/sessionIngestCore.ts";
import { getEvent } from "../_shared/googleCalendar.ts";
import {
  type CalendarEvent,
  candidateEmails,
  normalizeEmail,
  transcript,
} from "./model.ts";

type Session = {
  id: string;
  owner_id: string;
  event_id: string;
  calendar_id: string;
  student_id: string;
  student_name: string | null;
  starts_at: string;
  ends_at: string;
  revision: number;
  source_state: string;
  match_state: string;
  transcript_status: string;
  transcript_source: string;
  transcript_doc_id: string;
};

const eligible = (session: Session) =>
  session.source_state === "ended" && session.match_state === "matched" &&
  session.transcript_status === "linked" &&
  session.transcript_source === "auto" &&
  !!session.student_id && !!session.transcript_doc_id;

export function explicitSection(
  text: string,
  teacherName: string,
  studentName?: string | null,
) {
  const choices = new Map<
    string,
    { pt: number; section: number; excerpt: string }
  >();
  for (const line of text.split(/\r?\n/)) {
    const speakerEnd = line.indexOf(":");
    if (
      speakerEnd < 0 ||
      normalizeEmail(line.slice(0, speakerEnd)) !== normalizeEmail(teacherName)
    ) continue;
    const sentence = line.slice(speakerEnd + 1).trim();
    const commitment = /^(?:I will|I['’]ll)\s+assign\s+(.+)$/i.exec(sentence);
    if (!commitment) continue;
    const assignment = commitment[1];
    const recipient = ["you", studentName?.trim()].find((name) =>
      name && assignment.toLowerCase().startsWith(name.toLowerCase() + " ")
    );
    const reference = recipient
      ? assignment.slice(recipient.length).trimStart()
      : assignment;
    const match =
      /^(?:PT|PrepTest)\s*(\d{1,3})(?:[,.\s]+)(?:section\s*|S)([1-4])\.?$/i
        .exec(reference);
    if (!match) continue;
    choices.set(match[1] + ":" + match[2], {
      pt: Number(match[1]),
      section: Number(match[2]),
      excerpt: line.trim(),
    });
  }
  return choices.size === 1 ? [...choices.values()][0] : null;
}

function matchesStudent(
  event: CalendarEvent,
  teacherEmail: string,
  studentEmail?: string,
) {
  const guests = candidateEmails(event, teacherEmail);
  return guests.length === 1 &&
    guests[0] === normalizeEmail(studentEmail ?? "");
}

export async function sessionForTranscript(
  db: SupabaseClient,
  owner: string,
  selector: { id: string } | { event_id: string; calendar_id: string },
) {
  const { data, error } = await db.from("teacher_post_session_tasks").select(
    "id,owner_id,event_id,calendar_id,student_id,student_name,starts_at,ends_at,revision,source_state,match_state,transcript_status,transcript_source,transcript_doc_id",
  ).eq("owner_id", owner).match(selector).maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

export async function prepareTranscript(
  db: SupabaseClient,
  session: Session,
  googleEmail: string,
  options: {
    event?: CalendarEvent;
    accept?: string;
    correction?: { previewId: string; section: number };
  } = {},
) {
  const { accept, correction } = options;
  const { data: prior, error: priorError } = await db.from(
    "teacher_transcript_assignment_previews",
  )
    .select("id,snapshot,receipt").eq("session_id", session.id).eq(
      "owner_id",
      session.owner_id,
    )
    .is("superseded_at", null).maybeSingle();
  if (priorError) throw priorError;
  if (prior?.receipt) {
    if (correction || (accept && accept !== prior.id)) {
      throw new Error("Preview changed");
    }
    return prior;
  }
  if (
    !eligible(session) ||
    normalizeEmail(session.calendar_id) !== normalizeEmail(googleEmail)
  ) {
    if (accept || correction) throw new Error("Session changed");
    return null;
  }

  const [event, student] = await Promise.all([
    options.event ?? getEvent("primary", session.event_id),
    db.auth.admin.getUserById(session.student_id),
  ]);
  if (
    student.error || !event || event.status === "cancelled" ||
    Date.parse(event.start?.dateTime ?? "") !== Date.parse(session.starts_at) ||
    Date.parse(event.end?.dateTime ?? "") !== Date.parse(session.ends_at) ||
    transcript(event).transcript_doc_id !== session.transcript_doc_id ||
    !matchesStudent(event, googleEmail, student.data?.user?.email)
  ) {
    throw new Error("Session or transcript changed");
  }

  const document = await exportDocText(session.transcript_doc_id);
  if (
    normalizeEmail(document.meta.owner ?? "") !== normalizeEmail(googleEmail)
  ) {
    throw new Error("Transcript ownership could not be verified");
  }
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(document.text),
      ),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const teacherName = Deno.env.get("TEACHER_HOME_TRANSCRIPT_SPEAKER")?.trim() ||
    "Joshua Fisseha";
  const choice = explicitSection(
    document.text,
    teacherName,
    session.student_name,
  );
  const { data, error } = await db.rpc("teacher_transcript_assignment", {
    p_owner: session.owner_id,
    p_session: session.id,
    p_document: session.transcript_doc_id,
    p_student: session.student_id,
    p_source_revision: session.revision,
    p_hash: hash,
    p_pt: choice?.pt ?? null,
    p_section: choice?.section ?? null,
    p_excerpt: choice?.excerpt ?? null,
    p_accept: accept ?? null,
    p_replace: correction?.previewId ?? null,
    p_selected_section: correction?.section ?? null,
  });
  if (error) throw error;
  return data;
}

export async function transcriptActions(
  db: SupabaseClient,
  owner: string,
  googleEmail: string,
  body: Record<string, unknown>,
) {
  if (body.action === "transcript_assignments") {
    const { data, error } = await db.from(
      "teacher_transcript_assignment_previews",
    )
      .select("id,session_id,student_id,snapshot,receipt")
      .eq("owner_id", owner).is("superseded_at", null)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return { actions: data };
  }

  if (
    !isWellFormedUuid(body.sessionId) ||
    (body.action !== "refresh_transcript" && !isWellFormedUuid(body.previewId))
  ) {
    throw new Error("Invalid preview");
  }
  const session = await sessionForTranscript(db, owner, {
    id: body.sessionId as string,
  });
  if (!session) throw new Error("Session unavailable");
  const section = typeof body.section === "number" ? body.section : 0;
  if (
    body.action === "correct_transcript" &&
    (!Number.isInteger(section) || section < 1 || section > 4)
  ) {
    throw new Error("Invalid section");
  }
  const correction = body.action === "correct_transcript"
    ? { previewId: body.previewId as string, section }
    : undefined;
  return {
    action: await prepareTranscript(db, session, googleEmail, {
      accept: body.action === "accept_transcript"
        ? body.previewId as string
        : undefined,
      correction,
    }),
  };
}
