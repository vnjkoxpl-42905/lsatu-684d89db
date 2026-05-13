import { useEffect, useState, type ReactElement } from "react";
import { IndicatorHighlighter } from "./IndicatorHighlighter";
import { DecoderPanel } from "./DecoderPanel";

export interface ChapterReaderProps {
  markdown: string;
}

// Minimal Obsidian-flavored markdown -> JSX renderer scoped to the chapter's
// shape: H1/H2/H3, paragraphs, blockquotes, bullet lists, numbered lists,
// markdown tables, bold (**...**), italic (*...*), and the topic-specific
// inline tokens [[indicator:ts-id]] and [[decoder]] for embeds.

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "blockquote"; lines: string[] }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "hr" }
  | { kind: "indicator-embed"; stimulusId: string }
  | { kind: "decoder-embed" };

function parseInline(text: string): ReactElement[] {
  const out: ReactElement[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[\[indicator:[a-z0-9-]+\]\]|\[\[decoder\]\])/g;
  let cursor = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) {
      out.push(<span key={key++}>{text.slice(cursor, m.index)}</span>);
    }
    const token = m[0];
    if (token.startsWith("**")) {
      out.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[[indicator:")) {
      const id = token.slice(12, -2);
      out.push(<IndicatorHighlighter key={key++} stimulusId={id} mode="reveal" />);
    } else if (token === "[[decoder]]") {
      out.push(<DecoderPanel key={key++} />);
    } else if (token.startsWith("*")) {
      out.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    cursor = m.index + token.length;
  }
  if (cursor < text.length) {
    out.push(<span key={key++}>{text.slice(cursor)}</span>);
  }
  return out;
}

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") {
      i++;
      continue;
    }
    if (trimmed === "---") {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "h3", text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ kind: "h2", text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "h1", text: trimmed.slice(2) });
      i++;
      continue;
    }
    if (trimmed.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", lines: buf });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    if (trimmed.startsWith("|") && lines[i + 1]?.trim().startsWith("|")) {
      const header = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(
          lines[i]
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim()),
        );
        i++;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }
    // Paragraph: collect until blank line / structural marker.
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|") &&
      lines[i].trim() !== "---"
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }
  return blocks;
}

// Inject IndicatorHighlighter and DecoderPanel at canonical mount points.
// The brief specifies tomatoes slot-map, apatosaurus slot-map, marketing slot-map,
// and one decoder panel in §2 between X/Y move and full-sentence decoding.
function injectEmbeds(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    out.push(b);
    if (b.kind === "p") {
      if (b.text.startsWith("Read the stimulus again now")) {
        out.push({ kind: "indicator-embed", stimulusId: "ts-tomatoes" });
      }
      if (b.text.startsWith("Notice there's no Concession in this one")) {
        out.push({ kind: "indicator-embed", stimulusId: "ts-apatosaurus" });
      }
      if (b.text.startsWith("Almost the entire stimulus is one author talking")) {
        out.push({ kind: "indicator-embed", stimulusId: "ts-marketing" });
      }
      if (b.text.startsWith("Once you've internalized this")) {
        out.push({ kind: "decoder-embed" });
      }
    }
  }
  return out;
}

export function ChapterReader({ markdown }: ChapterReaderProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  useEffect(() => {
    setBlocks(injectEmbeds(parseBlocks(markdown)));
  }, [markdown]);

  return (
    <article className="chapter-reader prose prose-invert max-w-none px-4 md:px-6 py-6">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h1":
            return (
              <h1 key={i} className="text-3xl font-bold mt-2 mb-4">
                {parseInline(b.text)}
              </h1>
            );
          case "h2":
            return (
              <h2 key={i} className="text-2xl font-semibold mt-8 mb-3">
                {parseInline(b.text)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="text-xl font-semibold mt-6 mb-2">
                {parseInline(b.text)}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="leading-relaxed my-3">
                {parseInline(b.text)}
              </p>
            );
          case "blockquote":
            return (
              <blockquote
                key={i}
                className="italic border-l-2 border-border pl-4 my-3 leading-relaxed"
              >
                {b.lines.map((l, j) => (
                  <p key={j} className="my-1">
                    {parseInline(l)}
                  </p>
                ))}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc pl-6 my-3 space-y-1">
                {b.items.map((it, j) => (
                  <li key={j}>{parseInline(it)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal pl-6 my-3 space-y-1">
                {b.items.map((it, j) => (
                  <li key={j}>{parseInline(it)}</li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto my-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      {b.header.map((h, j) => (
                        <th
                          key={j}
                          className="border-b border-border px-2 py-1 text-left font-semibold"
                        >
                          {parseInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="border-b border-border/50 px-2 py-1 align-top"
                          >
                            {parseInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return <hr key={i} className="my-6 border-border" />;
          case "indicator-embed":
            return (
              <IndicatorHighlighter
                key={i}
                stimulusId={b.stimulusId}
                mode="reveal"
              />
            );
          case "decoder-embed":
            return <DecoderPanel key={i} />;
          default:
            return null;
        }
      })}
    </article>
  );
}
