import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Word } from "../lib/spreeder";
import { Modal } from "./spreeder-ui";
import { Icon, MIcon } from "./Icon";

const clean = (t: string): string => t.toLowerCase().replace(/^[^\w']+|[^\w']+$/g, "");

/** Indexes of words starting a whole-word match of the query (Spreeder text-location search). */
export function findMatches(words: Word[], query: string): number[] {
  const q = query.trim().toLowerCase().split(/\s+/).filter(Boolean).map(clean);
  if (q.length === 0) return [];
  const out: number[] = [];
  for (let i = 0; i + q.length <= words.length; i++) {
    if (q.every((part, k) => clean(words[i + k].text) === part)) out.push(i);
  }
  return out;
}

/** Spreeder's View panel: the whole passage as one block, click a word to jump. */
export function ViewPanel({
  open,
  onClose,
  title,
  words,
  currentWord,
  footer,
  onJump,
  onPlay,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  words: Word[];
  currentWord?: number;
  footer?: string;
  onJump?: (w: Word) => void;
  onPlay?: () => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [hit, setHit] = useState(0);
  const body = useRef<HTMLDivElement | null>(null);
  const matches = useMemo(() => findMatches(words, submitted), [words, submitted]);
  const qLen = submitted.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSubmitted("");
      setHit(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const target = matches.length ? matches[hit] : currentWord;
    if (target == null) return;
    body.current?.querySelector(`[data-word="${target}"]`)?.scrollIntoView({ block: "center" });
  }, [open, matches, hit, currentWord]);

  const hitOf = (i: number): "active" | "hit" | null => {
    for (let m = 0; m < matches.length; m++) {
      if (i >= matches[m] && i < matches[m] + qLen) return m === hit ? "active" : "hit";
    }
    return null;
  };

  return (
    <Modal open={open} onClose={onClose} fullScreen closeOnEscape labelledBy="rc-view-title">
      <div className="flex h-full flex-col px-[30px] pt-5">
        <div className="flex items-center justify-between">
          <h2 id="rc-view-title" className="pl-1 text-2xl" style={{ color: "var(--rc-text)" }}>{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: "var(--rc-strong)" }}>
            <MIcon name="close" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="ml-2 rounded-2xl px-3 py-1.5 text-[12.5px]" style={{ background: "#e0e0e0", color: "rgba(0,0,0,.87)" }}>User added</span>
          <form
            className="flex h-9 w-[380px] items-center rounded-full border px-3"
            style={{ borderColor: "#cccccc" }}
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query);
              setHit(0);
            }}
          >
            <Icon name="search" size={20} style={{ color: "#757575" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search this text..."
              aria-label="Search this text"
              className="ml-2 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#9e9e9e]"
              style={{ color: "var(--rc-strong)" }}
            />
            {submitted && (
              <>
                <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setSubmitted(""); setHit(0); }} className="mx-1" style={{ color: "var(--rc-strong)" }}>
                  <MIcon name="close" size={22} />
                </button>
                <span className="mx-2 whitespace-nowrap text-xs" style={{ color: "#757575" }}>{matches.length ? hit + 1 : 0} of {matches.length}</span>
                <button type="button" aria-label="Next match" disabled={!matches.length} onClick={() => setHit((h) => (h + 1) % matches.length)} style={{ color: matches.length ? "var(--rc-strong)" : "#ccc" }}>
                  <MIcon name="keyboard_arrow_down" size={22} />
                </button>
                <button type="button" aria-label="Previous match" disabled={!matches.length} onClick={() => setHit((h) => (h - 1 + matches.length) % matches.length)} style={{ color: matches.length ? "var(--rc-strong)" : "#ccc" }}>
                  <MIcon name="keyboard_arrow_up" size={22} />
                </button>
              </>
            )}
          </form>
        </div>
        <div ref={body} className="mt-4 min-h-0 flex-1 overflow-y-auto pl-[11px] pr-2 text-base leading-[33px]" style={{ color: "var(--rc-strong)" }}>
          {words.map((w) => {
            const h = hitOf(w.index);
            const current = w.index === currentWord;
            return (
              <React.Fragment key={w.index}>
                <span
                  data-word={w.index}
                  onClick={() => {
                    // Spreeder moves the location and keeps the panel open.
                    onJump?.(w);
                  }}
                  className={onJump ? "cursor-pointer" : ""}
                  style={{
                    border: `1.6px solid ${current ? "var(--rc-green)" : h ? "#cccccc" : "transparent"}`,
                    borderRadius: current ? 5 : h ? 4 : 0,
                    background: h === "active" ? "#fab95d" : h === "hit" ? "#fae55d" : undefined,
                    color: h ? "#212121" : undefined,
                  }}
                >
                  {w.text}
                </span>{" "}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex h-[70px] shrink-0 items-center justify-center">
          {onPlay && (
            <button type="button" aria-label="Play" onClick={() => { onPlay(); onClose(); }} className="flex h-[50px] w-[50px] items-center justify-center rounded-full text-white" style={{ background: "#616161" }}>
              <Icon name="play" size={24} />
            </button>
          )}
        </div>
        <div className="border-t-[3px] pb-2 pt-1 text-sm" style={{ borderColor: "#e0e0e0", color: "#757575" }}>{footer}</div>
      </div>
    </Modal>
  );
}
