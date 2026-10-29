export type SegmentationVersion = 1 | 2;
export interface RcSourceIdentity { preptest: number; passageId: number }

/** Version 1 deliberately preserves the historical block boundaries. */
export function rcSourceBlocks(text: string, version: SegmentationVersion = 1, identity?: RcSourceIdentity): string[] {
  const blocks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (version === 1) return blocks;
  if (version !== 2) throw new Error("unsupported_segmentation_version");
  const clean = blocks.filter((block) => !/^`+$/.test(block));
  // Editorial context is not a paragraph to recall. Only leading italic notes
  // explicitly describing the source are excluded; italic body prose survives.
  while (clean[0] && /^\*[^*][\s\S]*\*$/.test(clean[0]) && /^\*(?:(?:The following(?: two)?|This|The two|The) passages?\b|From a critical discussion\b)/i.test(clean[0])) clean.shift();
  if (identity?.preptest !== 141) return clean;
  const lead = identity.passageId === 30
    ? "Given such principles, if the world were wholly just, the following definition would exhaustively cover the subject of justice regarding property:"
    : identity.passageId === 201 ? "Now consider the phenomenon of rivalry" : null;
  if (!lead) return clean;
  const at = clean.findIndex((block) => identity.passageId === 30 ? block === lead : block.startsWith(lead) && block.endsWith("constant:"));
  const prefixes = identity.passageId === 30 ? ["1. A person who acquires", "2. A person who acquires", "3. No one is entitled"] : ["A. You earn $50,000 a year", "B. You earn $100,000 a year"];
  if (at >= 0 && prefixes.every((prefix, index) => clean[at + index + 1]?.startsWith(prefix))) {
    clean.splice(at, prefixes.length + 1, clean.slice(at, at + prefixes.length + 1).join("\n"));
  }
  return clean;
}
