import React from "react";
import { List, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Bookmark, Token } from "../lib/types";

export function BookmarksDialog({
  open,
  onOpenChange,
  bookmarks,
  tokens,
  onJump,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: Bookmark[];
  tokens: Token[];
  onJump: (wordIndex: number) => void;
  onDelete: (id: string) => void;
}): React.ReactElement {
  const sorted = [...bookmarks].sort((a, b) => a.word_index - b.word_index);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bookmarks</DialogTitle>
          <DialogDescription className="sr-only">Saved places in this passage.</DialogDescription>
        </DialogHeader>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <List className="h-8 w-8 text-muted-foreground" />
            <div className="font-semibold">No bookmarks yet</div>
            <p className="text-sm text-muted-foreground">To add one, pause and click any word.</p>
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y overflow-y-auto">
            {sorted.map((b) => {
              const before = tokens.slice(Math.max(0, b.word_index - 6), b.word_index).map((t) => t.text).join(" ");
              const after = tokens.slice(b.word_index + 1, b.word_index + 7).map((t) => t.text).join(" ");
              return (
                <li key={b.id} className="flex items-start gap-2 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-md px-2 py-1 text-left hover:bg-muted"
                    onClick={() => {
                      onJump(b.word_index);
                      onOpenChange(false);
                    }}
                  >
                    <div className="text-sm">
                      {before} <strong>{tokens[b.word_index]?.text}</strong> {after}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" aria-label="Delete bookmark" onClick={() => onDelete(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
