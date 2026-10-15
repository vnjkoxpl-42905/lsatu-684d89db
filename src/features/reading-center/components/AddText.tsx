import React, { useEffect, useRef, useState } from "react";
import { useUpsertPassage } from "../hooks/useReadingCenterData";
import type { Passage } from "../lib/types";
import { Modal } from "./spreeder-ui";
import { MIcon } from "./Icon";
import { IMPORT_ACCEPT, importText } from "../lib/importText";

/**
 * Spreeder full-screen text dialogs (captured 2026-10-13, 1036px window):
 * - "Add To Library" (Paste Text; Import Document fills it from a local file): Enter Title
 *   (focused on open), an outlined "Add Text Here" box, Cancel + Save (disabled until valid).
 * - "Edit Text" (card menu): Title, Author, Genre, the text, and one green Save.
 */
export function AddTextScreen({
  mode,
  passage,
  onClose,
  onSaved,
}: {
  mode: "paste" | "import" | "edit";
  passage?: Passage;
  onClose: () => void;
  onSaved: (slug: string) => void;
}): React.ReactElement {
  const upsert = useUpsertPassage();
  const [title, setTitle] = useState(passage?.title ?? "");
  const [author, setAuthor] = useState(passage?.author ?? "");
  const [genre, setGenre] = useState(passage?.genre ?? "");
  const [body, setBody] = useState(passage?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const file = useRef<HTMLInputElement | null>(null);
  const saving = useRef(false);
  const isEdit = mode === "edit";
  const busy = upsert.isPending || importing;
  const close = () => { if (!busy && !saving.current) onClose(); };

  useEffect(() => {
    if (mode === "import") file.current?.click();
  }, [mode]);

  const readFile = async (f: File) => {
    setError(null);
    setImporting(true);
    try {
      const imported = await importText(f);
      setTitle((t) => t || imported.title);
      setBody(imported.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "This file could not be read. Try another file.");
    } finally { setImporting(false); }
  };

  const canSave = title.trim() !== "" && body.trim() !== "" && !busy;
  const save = () => {
    if (!canSave || saving.current) return;
    saving.current = true;
    upsert.mutate(
      passage
        ? { id: passage.id, title: title.trim(), body: body.trim(), author: author.trim() || null, genre: genre.trim() || null }
        : { title: title.trim(), body: body.trim() },
      { onSuccess: (p) => onSaved(p.slug), onError: (e) => setError(e.message), onSettled: () => { saving.current = false; } },
    );
  };

  return (
    <Modal open onClose={close} fullScreen closeOnEscape labelledBy="rc-add-title">
      <fieldset disabled={busy} className="flex h-full min-w-0 flex-col px-[30px] pb-[28px] pt-[19px]">
        <div className="flex items-start justify-between">
          <h2 id="rc-add-title" className="pl-1 text-2xl leading-8" style={{ color: "var(--rc-text)" }}>{isEdit ? "Edit Text" : "Add To Library"}</h2>
          <button type="button" aria-label="Close" onClick={close} className="-mr-[10px] mt-px flex h-9 w-[34px] items-center justify-center rounded-full hover:bg-[var(--rc-menu-hover)]" style={{ color: "var(--rc-strong)" }}>
            <MIcon name="close" />
          </button>
        </div>
        {isEdit ? (
          <>
            <FloatField label="Title" value={title} onChange={setTitle} className="ml-2.5 mr-[26px] mt-[49px]" />
            <FloatField label="Author" value={author} onChange={setAuthor} className="ml-2.5 mr-[26px] mt-[38px]" />
            <FloatField label="Genre" value={genre} onChange={setGenre} className="ml-2.5 mr-[26px] mt-[39px]" />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label="Text"
              className="ml-2.5 mr-[26px] mt-1 min-h-0 flex-1 resize-none bg-transparent pb-2 pt-[18px] text-sm outline-none"
              style={{ color: "var(--rc-text)" }}
            />
          </>
        ) : (
          <>
            <FloatField label="Enter Title" value={title} onChange={setTitle} autoFocus className="mr-4 mt-[42px]" />
            <label className="relative mt-[40px] flex min-h-0 flex-1 rounded" style={{ border: "1px solid var(--rc-outline)" }}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add Text Here"
                aria-label="Add Text Here"
                className="m-[11px] mx-4 min-h-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[var(--rc-text)]"
                style={{ color: "var(--rc-text)" }}
              />
            </label>
          </>
        )}
        {error && <p role="alert" className="mt-2 text-sm" style={{ color: "#f44336" }}>{error}</p>}
        {upsert.isPending && <p role="status" className="mt-2 text-sm">Saving your text.</p>}
        {mode === "import" && (
          <div className="mt-3 flex items-center gap-3 text-sm">
            <button type="button" disabled={importing} className="rc-outline-btn" onClick={() => file.current?.click()}>{importing ? "Reading file..." : "Choose file"}</button>
            <span>Text, Markdown, or HTML. Maximum 5 MB.</span>
            <input ref={file} type="file" accept={IMPORT_ACCEPT} className="hidden" onChange={(e) => {
              const selected = e.target.files?.[0];
              e.target.value = "";
              if (selected) void readFile(selected);
            }} />
          </div>
        )}
        <div className="mt-[31px] flex items-center justify-end -mr-1.5 gap-[5px]">
          {!isEdit && <button type="button" className="rc-outline-btn h-[38px] w-[84px]" onClick={close}>Cancel</button>}
          <button
            type="button"
            className="h-[38px] w-[120px] rounded text-sm font-medium"
            disabled={!canSave}
            onClick={save}
            style={canSave ? { background: "var(--rc-green)", color: "#fff" } : { background: "var(--rc-btn-disabled-bg)", color: "var(--rc-btn-disabled-fg)" }}
          >
            {upsert.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </fieldset>
    </Modal>
  );
}

/** Angular Material "fill" field reduced to Spreeder's look: underline, label floats to 75% when focused or filled. */
function FloatField({ label, value, onChange, autoFocus = false, className = "" }: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean; className?: string }): React.ReactElement {
  const [focused, setFocused] = useState(autoFocus);
  const floated = focused || value !== "";
  const id = `rc-field-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={`relative ${className}`}>
      <label
        htmlFor={id}
        className="pointer-events-none absolute origin-left text-sm transition-all duration-150"
        style={{ top: floated ? -19 : 0, transform: floated ? "scale(.75)" : "none", color: "#0a85ff" }}
      >
        {label}
      </label>
      <input
        id={id}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-[21px] w-full bg-transparent text-sm outline-none"
        style={{ color: "var(--rc-text)" }}
      />
      <div className="mt-[7px]" style={{ height: focused ? 2 : 1, background: focused ? "#0a85ff" : "var(--rc-field-line)" }} />
    </div>
  );
}
