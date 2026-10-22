import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpsertPassage } from "../hooks/useReadingCenterData";
import { countWords, slugify } from "../lib/tokenize";
import { estimateMinutes } from "../lib/timing";
import type { Passage } from "../lib/types";

export function PassageEditor({
  open,
  onOpenChange,
  passage,
  nextSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates a new passage. */
  passage: Passage | null;
  nextSortOrder: number;
}): React.ReactElement {
  const upsert = useUpsertPassage();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(passage?.title ?? "");
    setAuthor(passage?.author ?? "");
    setCoverUrl(passage?.cover_url ?? "");
    setBody(passage?.body ?? "");
    upsert.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, passage]);

  const words = countWords(body);
  const canSave = title.trim() !== "" && body.trim() !== "" && !upsert.isPending;

  const save = () => {
    const fields = {
      title: title.trim(),
      author: author.trim() || null,
      cover_url: coverUrl.trim() || null,
      body: body.trim(),
    };
    // The slug is fixed at creation so reader links and saved progress never break.
    const payload = passage
      ? { id: passage.id, owner_id: passage.owner_id ?? null, slug: passage.slug, ...fields }
      : { owner_id: null, slug: slugify(fields.title), sort_order: nextSortOrder, is_published: true, ...fields };
    upsert.mutate(payload, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{passage ? "Edit passage" : "New passage"}</DialogTitle>
          <DialogDescription className="sr-only">Title, author, cover and text of the passage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rc-title">Title</Label>
            <Input id="rc-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rc-author">Author (optional)</Label>
              <Input id="rc-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-cover">Cover URL (optional)</Label>
              <Input id="rc-cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-body">Body</Label>
            <Textarea id="rc-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[50vh]" />
            <p className="text-xs text-muted-foreground">Leave a blank line between paragraphs.</p>
            <p className="text-xs text-muted-foreground">
              {words} words · about {estimateMinutes(words, 200)} min at 200 WPM
            </p>
          </div>
          {upsert.error && <p className="text-sm text-red-600">{upsert.error.message}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!canSave}>{upsert.isPending ? "Saving" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
