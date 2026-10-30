// Pure parser for the deterministic "assign <resource> to <name>" command.
//
// This mirrors the regex used server-side in supabase/functions/ta-agent. It is
// kept here as a pure, dependency-free function so it can be unit-tested without
// a network round-trip, and so the client could short-circuit obvious commands
// in future. Keep ASSIGN_RE in sync with the edge function.

export const ASSIGN_RE = /^\s*assign\s+(.+?)\s+to\s+(.+?)\s*$/i;

export interface ParsedAssignCommand {
  resourceQuery: string;
  studentQuery: string;
}

/**
 * Parse an explicit assign command. Returns null when the message is not a
 * clean "assign X to Y" (those route to the AI lane instead).
 */
export function parseAssignCommand(message: string): ParsedAssignCommand | null {
  const m = message.match(ASSIGN_RE);
  if (!m) return null;
  const resourceQuery = m[1].trim();
  const studentQuery = m[2].trim();
  if (!resourceQuery || !studentQuery) return null;
  return { resourceQuery, studentQuery };
}
