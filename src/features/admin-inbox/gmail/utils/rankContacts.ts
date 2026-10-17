import type { GmailContact } from "../api";

// Rank contacts by case-insensitive substring match against name OR email.
// Prefix matches on either field outrank midstring matches.
export function rankContacts(query: string, contacts: GmailContact[], limit: number): GmailContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ c: GmailContact; score: number }> = [];
  for (const c of contacts) {
    const email = c.email.toLowerCase();
    const name = (c.name ?? "").toLowerCase();
    const emailIdx = email.indexOf(q);
    const nameIdx = name.indexOf(q);
    if (emailIdx === -1 && nameIdx === -1) continue;
    let score = 0;
    if (emailIdx === 0 || nameIdx === 0) score += 1000;
    else score += 100;
    score += Math.max(
      0,
      100 - Math.min(emailIdx === -1 ? 999 : emailIdx, nameIdx === -1 ? 999 : nameIdx),
    );
    scored.push({ c, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.c);
}
