import * as React from "react";
import { Neg } from "@/bootcamps/conditionals/components/ContrapositiveVisuals";
import "./note-prose.css";

/**
 * Explanation prose with its conditional chains drawn, not typed.
 *
 * Notes are authored as plain text: "Motivate inventing → Financial reward
 * ~Financial reward → ~Motivate Inventing". Read raw, two chains run into one
 * line and the tilde is easy to miss. Here each chain gets its own row, each
 * idea its own pill, a negated idea is struck through the way the
 * contrapositive lesson strikes it (the same `Neg`), and the arrows draw in
 * one after another. The words themselves are never changed.
 */

export type Term = { text: string; negated: boolean };
export type Block = { kind: "text"; text: string } | { kind: "chain"; terms: Term[] };

const ARROW = /\s*(?:→|->|⟶)\s*/;

function term(raw: string): Term {
  const t = raw.trim();
  return t.startsWith("~") ? { text: t.slice(1).trim(), negated: true } : { text: t, negated: false };
}

/**
 * Split a run of chain text into separate chains. A middle segment such as
 * "Financial reward ~Financial reward" is the end of one chain and the start
 * of the next, joined only by a space; a fresh "~" term is where it breaks.
 */
export function parseChains(text: string): Term[][] {
  const segments = text.split(ARROW).map((s) => s.trim()).filter(Boolean);
  const chains: Term[][] = [];
  let current: Term[] = [];
  segments.forEach((segment, i) => {
    const isMiddle = i > 0 && i < segments.length - 1;
    const split = isMiddle ? segment.match(/^(.+?)\s+(~.+)$/) : null;
    if (split) {
      current.push(term(split[1]));
      chains.push(current);
      current = [term(split[2])];
    } else {
      current.push(term(segment));
    }
  });
  if (current.length) chains.push(current);
  return chains.filter((c) => c.length > 1);
}

/** Paragraphs in order; a paragraph with arrows becomes lead text plus its chains. */
export function parseNote(note: string): Block[] {
  const blocks: Block[] = [];
  for (const para of note.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    if (!ARROW.test(para)) { blocks.push({ kind: "text", text: para }); continue; }
    const firstArrow = para.search(ARROW);
    const colon = para.lastIndexOf(":", firstArrow);
    // The chain starts after the colon that introduces it, or is the whole line.
    const lead = colon >= 0 ? para.slice(0, colon + 1).trim() : "";
    const chainText = colon >= 0 ? para.slice(colon + 1) : para;
    const chains = parseChains(chainText);
    if (chains.length === 0) { blocks.push({ kind: "text", text: para }); continue; }
    if (lead) blocks.push({ kind: "text", text: lead });
    for (const terms of chains) blocks.push({ kind: "chain", terms });
  }
  return blocks;
}

function Chain({ terms, index }: { terms: Term[]; index: number }) {
  const label = terms.map((t) => (t.negated ? `not ${t.text}` : t.text)).join(" leads to ");
  return (
    <div className="note-chain" role="img" aria-label={label} style={{ "--chain-delay": `${index * 180}ms` } as React.CSSProperties}>
      {terms.map((t, i) => (
        <span key={i} className="note-chain__step">
          {i > 0 && (
            <svg className="note-chain__arrow" viewBox="0 0 40 12" aria-hidden="true" style={{ "--step": i } as React.CSSProperties}>
              <path d="M1 6 H35" />
              <path d="M30 1.5 L36 6 L30 10.5" />
            </svg>
          )}
          <span className="note-chain__term" data-negated={t.negated} style={{ "--step": i } as React.CSSProperties}>
            {t.negated ? <Neg>{t.text}</Neg> : t.text}
          </span>
        </span>
      ))}
    </div>
  );
}

export function NoteProse({ note, className }: { note: string; className?: string }) {
  const blocks = React.useMemo(() => parseNote(note), [note]);
  let chainIndex = 0;
  return (
    <div className={className}>
      {blocks.map((b, i) => b.kind === "text"
        ? <p key={i} className="note-prose__para">{b.text}</p>
        : <Chain key={i} terms={b.terms} index={chainIndex++} />)}
    </div>
  );
}
