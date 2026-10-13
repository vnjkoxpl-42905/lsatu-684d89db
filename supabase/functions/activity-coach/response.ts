export type CoachModelResult = { verdict: "correct" | "partial" | "incorrect"; feedback: string; covered?: number[] };

/** No judgment is returned unless the model supplies both a verdict and feedback. */
export function parseCoachResponse(data: unknown, ideas: { n: number }[] | null): CoachModelResult {
  const envelope = data as { choices?: { message?: { content?: unknown } }[] } | null;
  const raw = envelope?.choices?.[0]?.message?.content;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Malformed coach response");
  const value = parsed as Record<string, unknown>;
  if (value.verdict !== "correct" && value.verdict !== "partial" && value.verdict !== "incorrect") throw new Error("Malformed coach response");
  if (typeof value.feedback !== "string" || !value.feedback.trim()) throw new Error("Malformed coach response");
  const result: CoachModelResult = { verdict: value.verdict, feedback: value.feedback };
  if (ideas && Array.isArray(value.covered)) {
    const known = new Set(ideas.map((idea) => idea.n));
    result.covered = [...new Set(value.covered.map(Number).filter((n) => known.has(n)))].sort((a, b) => a - b);
  }
  return result;
}
