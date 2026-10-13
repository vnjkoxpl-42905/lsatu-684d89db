import React, { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Preferences, Token } from "../lib/types";
import { readingTextStyleFor } from "./ReaderSurface";

const normalize = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "");

/**
 * Full-screen view of the whole passage. In the reader, clicking a word jumps
 * there; opened from the library it is read-only (no onJump, no play button).
 */
export function ViewPanel({
  open,
  onOpenChange,
  title,
  tokens,
  prefs,
  currentWord,
  wpm,
  remainingText,
  onJump,
  onPlay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tokens: Token[];
  prefs: Preferences;
  currentWord?: number;
  wpm?: number;
  remainingText?: string;
  onJump?: (wordIndex: number) => void;
  onPlay?: () => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const needle = normalize(query.trim());

  const paragraphs = useMemo(() => {
    const out: Token[][] = [];
    for (const t of tokens) (out[t.paragraphIndex] ??= []).push(t);
    return out.filter(Boolean);
  }, [tokens]);

  const footer =
    remainingText && wpm ? `${remainingText.replace("remaining", "to go")} - ${wpm} WPM` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-screen w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:rounded-none">
        <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4 pr-14">
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <Badge variant="secondary">Passage</Badge>
          <DialogDescription className="sr-only">The full passage text.</DialogDescription>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this text..."
            className="ml-auto w-full max-w-xs"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-[46rem]" style={readingTextStyleFor(prefs)}>
            {paragraphs.map((para, pIdx) => (
              <p key={pIdx} className="mb-6">
                {para.map((t, i) => {
                  const match = needle !== "" && normalize(t.text).includes(needle);
                  const current = currentWord === t.index;
                  const cls = `rounded-sm ${match ? "bg-yellow-300 text-black" : ""} ${
                    current ? "outline outline-2 outline-primary" : ""
                  }`;
                  return (
                    <React.Fragment key={t.index}>
                      {i > 0 && " "}
                      {onJump ? (
                        <button
                          type="button"
                          className={`${cls} cursor-pointer border-0 bg-transparent p-0 text-inherit [font:inherit] hover:underline`}
                          onClick={() => {
                            onJump(t.index);
                            onOpenChange(false);
                          }}
                        >
                          {t.text}
                        </button>
                      ) : (
                        <span className={cls}>{t.text}</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </p>
            ))}
          </div>
        </div>

        {(onPlay || footer) && (
          <div className="flex items-center justify-center gap-4 border-t px-6 py-3 text-sm text-muted-foreground">
            {onPlay && (
              <button
                type="button"
                aria-label="Play"
                onClick={() => {
                  onPlay();
                  onOpenChange(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Play className="h-5 w-5" />
              </button>
            )}
            {footer && <span>{footer}</span>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
