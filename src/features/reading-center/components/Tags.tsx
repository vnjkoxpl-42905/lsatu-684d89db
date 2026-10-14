import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSaveTag, useTags, useUpsertPassage } from "../hooks/useReadingCenterData";
import type { Passage, UserTag } from "../lib/types";
import { DialogHeader, Modal } from "./spreeder-ui";
import { MIcon } from "./Icon";

/**
 * Spreeder tags (captured 2026-10-13): tag-text dialog, add-or-edit-tag dialog,
 * tag colour picker (24 swatches, .c1-.c24), and a two-button confirm.
 */

/** Spreeder .cN: [text, background]. Index 0 is "no colour". */
export const TAG_COLORS: [string, string][] = [
  ["#888888", "transparent"],
  ["#494949", "#e9e9e9"], ["#103977", "#b5cef6"], ["#0a3a44", "#9ad5e5"], ["#3e1a96", "#e2d6fc"],
  ["#751837", "#fbd2e0"], ["#8a1e11", "#f5b5ac"], ["#ffffff", "#c3c3c3"], ["#ffffff", "#4785e8"],
  ["#ffffff", "#2c9cc1"], ["#ffffff", "#b998ff"], ["#954963", "#f792b4"], ["#ffffff", "#ff4a32"],
  ["#742f12", "#fbc9b0"], ["#744b09", "#fbdbb5"], ["#74470e", "#fae788"], ["#674f05", "#faedc0"],
  ["#0f4e31", "#b1f0d1"], ["#0f5032", "#a0dfc2"], ["#ffffff", "#ff7534"], ["#ffffff", "#ffae45"],
  ["#682836", "#eed9de"], ["#ffffff", "#cfa4ab"], ["#0b4022", "#42d994"], ["#ffffff", "#18a765"],
];

/** Tag glyph tinted with the tag's colour (Spreeder: the swatch background, grey when none). */
export function TagGlyph({ color, size = 18 }: { color: number; size?: number }): React.ReactElement {
  return <MIcon name="label" size={size} style={{ color: color ? TAG_COLORS[color][1] : "#b4b4b4" }} />;
}

function Footer({ children, top = 24 }: { children: React.ReactNode; top?: number }): React.ReactElement {
  return <div className="mt-auto flex justify-end gap-2 px-6 pb-4" style={{ paddingTop: top }}>{children}</div>;
}

/** Spreeder showMdlConfirmDialog: title, message, No (outlined) / Yes (green, 120 wide). */
export function ConfirmDialog({ title, message, onNo, onYes }: { title: string; message: React.ReactNode; onNo: () => void; onYes: () => void }): React.ReactElement {
  return (
    <Modal open onClose={onNo} width={450} closeOnEscape labelledBy="rc-confirm-title">
      <DialogHeader id="rc-confirm-title" title={title} onClose={onNo} />
      <p className="mt-[34px] px-5 pb-2.5 text-sm leading-6" style={{ color: "var(--rc-text)" }}>{message}</p>
      <div className="flex justify-end gap-[5px] pb-[8px] pl-5 pr-4 pt-7">
        <button type="button" className="rc-outline-btn h-[38px] min-w-16" onClick={onNo}>No</button>
        <button type="button" className="rc-green-btn w-[120px]" onClick={onYes}>Yes</button>
      </div>
    </Modal>
  );
}

/** Create New Tag / Edit Tag: one underline field with a floating "Enter New Tag Name..." label. */
export function TagEditDialog({ tag, onClose, onSaved }: { tag?: UserTag; onClose: () => void; onSaved?: (t: UserTag) => void }): React.ReactElement {
  const save = useSaveTag();
  const [name, setName] = useState(tag?.name ?? "");
  const [focused, setFocused] = useState(false);
  const floated = focused || name.length > 0;
  const submit = () =>
    name.trim() &&
    save.mutate({ oldName: tag?.name, name, color: tag?.color }, { onSuccess: (t) => { onSaved?.(t); onClose(); } });
  return (
    <Modal open onClose={onClose} width={500} closeOnEscape labelledBy="rc-tagedit-title">
      <DialogHeader id="rc-tagedit-title" title={tag ? "Edit Tag" : "Create New Tag"} onClose={onClose} />
      <form className="relative mx-6 mt-[22px]" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label
          htmlFor="rc-tag-name"
          className="pointer-events-none absolute left-0 origin-left text-sm transition-all"
          style={{ top: floated ? -11 : 3, transform: floated ? "scale(.75)" : "none", color: focused ? "#3e92d7" : "var(--rc-text)" }}
        >
          Enter New Tag Name...<span style={{ color: "#b0b0b0" }}> *</span>
        </label>
        <input
          id="rc-tag-name"
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-[23px] w-full bg-transparent pb-[7px] text-sm leading-4 outline-none"
          style={{ color: "var(--rc-text)", borderBottom: `${focused ? 2 : 1}px solid ${focused ? "#3e92d7" : "var(--rc-outline)"}` }}
        />
        {save.error && <p className="mt-1 text-xs" style={{ color: "#f44336" }}>{save.error.message}</p>}
      </form>
      <Footer top={48}>
        <button type="button" className="rc-outline-btn h-[38px]" onClick={onClose}>Cancel</button>
        <button type="button" className="rc-green-btn" disabled={!name.trim()} onClick={submit}>Save</button>
      </Footer>
    </Modal>
  );
}

/** Spreeder tag-text: "Tag <title> as", a 300px bordered checklist of tags, Create New Tag, Cancel/Save. */
export function TagTextDialog({ passage, onClose }: { passage: Passage; onClose: () => void }): React.ReactElement {
  const tags = useTags().data ?? [];
  const upsert = useUpsertPassage();
  const [picked, setPicked] = useState<string[]>(passage.tags ?? []);
  const [creating, setCreating] = useState(false);
  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const save = () => {
    const before = [...(passage.tags ?? [])].sort().join(",");
    if ([...picked].sort().join(",") === before) return onClose();
    upsert.mutate({ id: passage.id, title: passage.title, body: passage.body, tags: picked }, { onSuccess: onClose });
  };
  return (
    <>
      <Modal open onClose={onClose} width={500} closeOnEscape labelledBy="rc-tag-title">
        <DialogHeader id="rc-tag-title" title={`Tag ${passage.title} as`} onClose={onClose} />
        <div className="relative mx-6 mt-5 h-[300px] overflow-y-auto" style={{ border: "1px solid var(--rc-tag-list-border)" }}>
          {tags.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="flex h-[110px] w-[110px] items-center justify-center rounded-full" style={{ background: "var(--rc-empty-circle)" }}>
                <MIcon name="label" size={80} style={{ color: "#fff" }} />
              </div>
              <div className="mt-[13px] text-[28px] leading-[26px]" style={{ color: "var(--rc-strong)" }}>No Tags</div>
              <div className="mt-10 text-base" style={{ color: "var(--rc-strong)" }}>Please add a new tag</div>
            </div>
          ) : (
            <ul role="listbox" aria-multiselectable="true" aria-label="Tags">
              {tags.map((t) => {
                const on = picked.includes(t.name);
                return (
                  <li key={t.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      onClick={() => toggle(t.name)}
                      className="flex h-12 w-full items-center gap-2 px-4 text-left text-base hover:bg-[var(--rc-menu-hover)]"
                      style={{ background: on ? "rgba(52,173,7,.2)" : undefined, color: "var(--rc-text)" }}
                    >
                      <TagGlyph color={t.color} />
                      <span className="flex-1 truncate">{t.name}</span>
                      <span
                        aria-hidden
                        className="flex h-[18px] w-[18px] items-center justify-center rounded-sm"
                        style={{ border: `2px solid ${on ? "#3e92d7" : "var(--rc-text-2)"}`, background: on ? "#3e92d7" : "transparent" }}
                      >
                        {on && <MIcon name="check" size={14} style={{ color: "#fff" }} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mx-6 mt-2.5">
          <button type="button" className="rc-outline-btn h-[38px] gap-1 pl-[17px] pr-4" onClick={() => setCreating(true)}>
            <MIcon name="add" size={18} style={{ color: "#34ad07", width: 24 }} /> Create New Tag
          </button>
        </div>
        <Footer>
          <button type="button" className="rc-outline-btn h-[38px]" onClick={onClose}>Cancel</button>
          <button type="button" className="rc-green-btn" onClick={save}>Save</button>
        </Footer>
      </Modal>
      {creating && <TagEditDialog onClose={() => setCreating(false)} />}
    </>
  );
}

/** Spreeder tag-color-picker: "Tag Color", 24 swatches (6 a row), Remove Color. */
export function TagColorPicker({ selected, onPick, onRemove }: { selected: number; onPick: (c: number) => void; onRemove: () => void }): React.ReactElement {
  return (
    <div className="w-[260px] py-2">
      <div className="ml-4 text-base" style={{ color: "var(--rc-text)" }}>Tag Color</div>
      <div className="grid grid-cols-6 gap-2 px-4 py-3">
        {TAG_COLORS.slice(1).map(([fg, bg], i) => (
          <button
            key={i + 1}
            type="button"
            aria-label={`Colour ${i + 1}`}
            aria-pressed={selected === i + 1}
            onClick={() => onPick(i + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: bg }}
          >
            {selected === i + 1 && <MIcon name="check" size={18} style={{ color: fg }} />}
          </button>
        ))}
      </div>
      <button type="button" className="rc-menu-item pl-[35px] text-base" onClick={onRemove}>Remove Color</button>
    </div>
  );
}

/** A popup menu anchored under a point that closes on outside click or Escape. */
export function PopMenu({ x, y, width = 200, onClose, children }: { x: number; y: number; width?: number; onClose: () => void; children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-rc-popmenu]") && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  return createPortal(
    <div data-rc-popmenu role="menu" className="rc-menu fixed z-[60] text-base" style={{ left: Math.max(8, Math.min(x, window.innerWidth - width - 8)), top: Math.min(y, window.innerHeight - 340), width }}>
      {children}
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}
