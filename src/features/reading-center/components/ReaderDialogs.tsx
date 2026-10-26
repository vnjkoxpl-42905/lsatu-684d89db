import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Bookmark, Preferences, ReaderTheme, ReadingMode } from "../lib/types";
import type { Word } from "../lib/spreeder";
import { DEFAULT_PREFERENCES, FONTS, FONT_SIZES, READING_MODES, THEMES } from "../lib/constants";
import { clampWpm } from "../lib/spreeder";
import { DialogHeader, Dropdown, HelpTip, Modal, PillTabs, TickSlider, Toggle } from "./spreeder-ui";
import { Icon, MIcon } from "./Icon";

const fontStackOf = (label: string): string => FONTS.find((f) => f.label === label)?.stack ?? FONTS[0].stack;

// ---------------------------------------------------------------- preferences

type PrefTab = "spreed" | "appearance" | "advanced";

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-0">
      <p className="w-[138px] shrink-0 text-[13px] tracking-[0.52px]" style={{ color: "var(--rc-text)" }}>{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function AppearanceRows({ prefs, onChange }: { prefs: Preferences; onChange: (p: Partial<Preferences>) => void }): React.ReactElement {
  return (
    <>
      <Row label="Theme">
        <Dropdown ariaLabel="Theme" value={prefs.theme} options={THEMES} onChange={(v) => onChange({ theme: v as ReaderTheme })} />
      </Row>
      <Row label="Font">
        <Dropdown
          ariaLabel="Font"
          filled
          minWidth={171}
          value={prefs.font_family}
          options={FONTS.map((f) => ({ value: f.label, label: f.label, style: { fontFamily: f.stack } }))}
          onChange={(v) => onChange({ font_family: String(v) })}
          buttonStyle={{ fontFamily: fontStackOf(prefs.font_family), fontWeight: 400 }}
        />
        <Dropdown ariaLabel="Size" minWidth={62} value={prefs.font_size} options={FONT_SIZES.map((s) => ({ value: s, label: String(s) }))} onChange={(v) => onChange({ font_size: Number(v) })} />
      </Row>
      <div className="flex h-[150px] items-center justify-center overflow-hidden" style={{ fontFamily: fontStackOf(prefs.font_family), fontSize: prefs.font_size, color: "var(--rc-text)" }}>
        Sample Text
      </div>
    </>
  );
}

export function PreferencesDialog({
  open,
  onClose,
  prefs,
  onChange,
  name,
  settingsOnly = false,
}: {
  open: boolean;
  onClose: () => void;
  prefs: Preferences;
  onChange: (p: Partial<Preferences>) => void;
  name: string;
  /** Profile > Settings: the Appearance and Advanced tabs only. */
  settingsOnly?: boolean;
}): React.ReactElement {
  const [tab, setTab] = useState<PrefTab>(settingsOnly ? "appearance" : "spreed");
  const mode = prefs.reading_mode;
  const modeRow = (
    <Row label="Reading Mode:">
      <Dropdown ariaLabel="Reading Mode" value={mode} options={READING_MODES} onChange={(v) => onChange({ reading_mode: v as ReadingMode })} />
    </Row>
  );
  const wpl = <TickSlider label="Words Per Line" value={prefs.words_per_line} min={1} max={6} onChange={(v) => onChange({ words_per_line: v })} />;
  const nol = <TickSlider label="Number of Lines" value={prefs.number_of_lines} min={1} max={6} onChange={(v) => onChange({ number_of_lines: v })} />;

  return (
    <Modal open={open} onClose={onClose} width={550} height={599} labelledBy="rc-prefs-title">
      <DialogHeader id="rc-prefs-title" title={`${name}'s preferences`} onClose={onClose} />
      {mode === "ereader" && !settingsOnly ? (
        <div className="mt-3 space-y-4 px-4 sm:px-11">
          {modeRow}
          <AppearanceRows prefs={prefs} onChange={onChange} />
          <TickSlider label="Line Spacing" value={prefs.line_spacing} min={1} max={2} step={0.1} format={(v) => String(Number(v.toFixed(1)))} onChange={(v) => onChange({ line_spacing: v })} />
        </div>
      ) : (
        <>
          <div className="mt-6">
            <PillTabs value={tab} onChange={(v) => setTab(v as PrefTab)} tabs={[...(settingsOnly ? [] : [{ value: "spreed" as const, label: "Reading" }]), { value: "appearance", label: "Appearance" }, { value: "advanced", label: "Advanced" }]} />
          </div>
          <div className="mt-9 space-y-6 px-4 sm:px-11">
            {tab === "spreed" && (
              <>
                {modeRow}
                {mode === "serial" && (
                  <>
                    {nol}
                    {wpl}
                    <Row label="Center Text">
                      <Toggle label="Center Text" checked={prefs.center_text} onChange={(v) => onChange({ center_text: v })} />
                    </Row>
                  </>
                )}
                {(mode === "flow" || mode === "scroll") && wpl}
                {mode === "highlight" && (
                  <>
                    {wpl}
                    {nol}
                  </>
                )}
              </>
            )}
            {tab === "appearance" && <AppearanceRows prefs={prefs} onChange={onChange} />}
            {tab === "advanced" && (
              <>
                <Row label="Punctuation Pauses">
                  <Toggle label="Punctuation Pauses" checked={prefs.punctuation_pauses} onChange={(v) => onChange({ punctuation_pauses: v })} />
                  <span className="ml-4"><HelpTip text="Slight pause at end of sentences and punctuation marks. Only works for group size of 1." /></span>
                </Row>
                <Row label="Speed Variability">
                  <Toggle label="Speed Variability" checked={prefs.speed_variability} onChange={(v) => onChange({ speed_variability: v })} />
                  <span className="ml-4"><HelpTip text="Slow down for larger chunks and speed up for smaller chunks so average wpm stays the same" /></span>
                </Row>
              </>
            )}
          </div>
        </>
      )}
      <button type="button" className="rc-outline-btn mb-2 ml-4 mt-6 shrink-0 self-start sm:ml-6 sm:mt-auto" style={{ height: 38, borderColor: "var(--rc-outline-2)" }} onClick={() => onChange({ ...DEFAULT_PREFERENCES, goal_wpm: prefs.goal_wpm })}>
        Restore Defaults
      </button>
    </Modal>
  );
}

// ---------------------------------------------------------------- reading speed

export function WpmDialog({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: number; onSave: (v: number) => void }): React.ReactElement {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    if (open) setLocal(value);
  }, [open, value]);
  const step = (d: number) => setLocal((v) => clampWpm(v + d));
  const btn = (d: number) => (
    <button type="button" onClick={() => step(d)} className="h-[55px] w-[75px] rounded-[15px] text-lg font-medium" style={{ background: "#d5e7fb", color: "var(--rc-blue)" }}>
      {d > 0 ? `+${d}` : d}
    </button>
  );
  return (
    <Modal open={open} onClose={onClose} width={528} height={363} closeOnEscape labelledBy="rc-wpm-title">
      <DialogHeader id="rc-wpm-title" title="Reading Speed (WPM)" onClose={onClose} />
      <div className="mt-9 grid grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-14">
        <div className="flex flex-col gap-4">{btn(-10)}{btn(-100)}</div>
        <div className="text-[45px] font-normal tabular-nums" style={{ color: "var(--rc-text)" }} aria-live="polite">{local}</div>
        <div className="flex flex-col items-end gap-4">{btn(10)}{btn(100)}</div>
      </div>
      <div className="mt-auto flex justify-end gap-1.5 px-5 pb-5">
        <button type="button" className="rc-outline-btn h-[38px]" onClick={onClose}>Cancel</button>
        <button type="button" className="rc-green-btn" onClick={() => { onSave(local); onClose(); }}>Save</button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- bookmarks

/** Spreeder my-bookmarks: text title, then a 300px bordered table of "Page N - Word" | notes | menu. */
export function BookmarksDialog({
  open,
  onClose,
  title,
  bookmarks,
  words,
  onOpenBookmark,
  onGoTo,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  bookmarks: Bookmark[];
  words: Word[];
  onOpenBookmark: (b: Bookmark) => void;
  onGoTo: (b: Bookmark) => void;
  onDelete: (b: Bookmark) => void;
}): React.ReactElement {
  const [menuFor, setMenuFor] = useState<{ id: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!menuFor) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-rc-bmmenu]") && setMenuFor(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuFor]);
  const sorted = [...bookmarks].sort((a, b) => a.word_index - b.word_index);
  const menuBm = menuFor && sorted.find((b) => b.id === menuFor.id);
  return (
    <Modal open={open} onClose={onClose} width={850} height={480} closeOnEscape labelledBy="rc-bm-title">
      <DialogHeader id="rc-bm-title" title="Bookmarks" onClose={onClose} />
      {sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
          <div className="flex h-[150px] w-[150px] items-center justify-center rounded-full" style={{ background: "#757575" }}>
            <Icon name="list" size={84} style={{ color: "#fff" }} />
          </div>
          <div className="mt-4 text-[28px]" style={{ color: "#616161" }}>No Bookmarks Yet</div>
          <p className="mt-3 max-w-[760px] text-base font-medium" style={{ color: "#757575" }}>
            To create a bookmark, pause the reader, then press and hold or click a word.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex-1 px-5">
          <h3 className="mb-2.5 line-clamp-2 pr-4 text-xl font-medium" style={{ color: "var(--rc-strong)" }}>{title}</h3>
          <div className="h-[300px] overflow-y-auto" style={{ border: "1px solid #ccc" }}>
            <table className="w-full table-fixed text-sm">
              <tbody>
                {sorted.map((b) => {
                  const w = words[b.word_index];
                  return (
                    <tr key={b.id} className="h-12">
                      <td className="w-[30%] truncate px-[18px]">
                        <button type="button" onClick={() => onOpenBookmark(b)} className="max-w-full truncate text-left" style={{ color: "#448aff" }}>
                          Page {(w?.sectionIndex ?? 0) + 1} - {w?.text}
                        </button>
                      </td>
                      <td className="w-1/2 truncate px-[18px]" style={{ color: "var(--rc-text)" }}>{b.note ?? ""}</td>
                      <td className="w-[20%] px-[18px] text-right">
                        <button
                          type="button"
                          aria-label="Bookmark options"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--rc-menu-hover)]"
                          style={{ color: "var(--rc-text)" }}
                          onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setMenuFor({ id: b.id, x: r.right, y: r.bottom });
                          }}
                        >
                          <MIcon name="more_vert" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {menuBm &&
        createPortal(
          <div data-rc-bmmenu role="menu" className="rc-menu fixed z-[60] w-[200px] text-base" style={{ left: menuFor.x - 200, top: menuFor.y }}>
            <button type="button" role="menuitem" className="rc-menu-item" onClick={() => { setMenuFor(null); onGoTo(menuBm); }}>
              <MIcon name="location_on" /> Go to location
            </button>
            <button type="button" role="menuitem" className="rc-menu-item" onClick={() => { setMenuFor(null); onDelete(menuBm); }}>
              <MIcon name="delete_outline" /> Delete
            </button>
          </div>,
          document.getElementById("reading-center-root") ?? document.body,
        )}
    </Modal>
  );
}

export type BookmarkNoteState = { mode: "create"; word: Word } | { mode: "edit"; word: Word; bookmark: Bookmark };

/**
 * Spreeder view-bookmark: chips (title, Position, word), optional note (max 2000).
 * A new bookmark's title chip is the text title; a saved one's is "Page N - Word".
 * Typing autosaves after 5s ("Bookmark saved."). Footer: Go to location (saved only) + Save/Update.
 */
export function BookmarkNoteDialog({
  state,
  title,
  onClose,
  onSave,
  onGoTo,
}: {
  state: BookmarkNoteState | null;
  title: string;
  onClose: () => void;
  /** close=false is the 5s autosave: keep the dialog open. */
  onSave: (note: string, close: boolean) => void | Promise<void>;
  onGoTo: (w: Word) => void;
}): React.ReactElement {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");
  const [dirtyAt, setDirtyAt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = React.useRef(false);
  const key = state ? (state.mode === "edit" ? state.bookmark.id : `new:${state.word.index}`) : "";
  useEffect(() => {
    const v = state?.mode === "edit" ? state.bookmark.note ?? "" : "";
    setNote(v);
    setSaved(v);
    setDirtyAt(0);
    setSaveError(false);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = React.useRef(note);
  latest.current = note;
  const latestSave = React.useRef(onSave);
  latestSave.current = onSave;
  const save = async (text: string, close: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await latestSave.current(text, close);
      setSaved(text);
    } catch {
      setSaveError(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!dirtyAt) return;
    const t = window.setTimeout(() => {
      if (latest.current !== saved) {
        void save(latest.current, false);
      }
    }, 5000);
    return () => window.clearTimeout(t);
  }, [dirtyAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const word = state?.word;
  const clean = word ? word.text.replace(/[^\w\s'-]/g, "").replace(/'s$/i, "").trim() : "";
  const isEdit = state?.mode === "edit";
  const chip = (t: string) => (
    <span className="max-w-[320px] truncate rounded-2xl px-3 py-1.5 text-sm" style={{ background: "#e0e0e0", color: "rgba(0,0,0,.87)" }}>{t}</span>
  );
  return (
    <Modal open={!!state} onClose={onClose} width={600} height={430} closeOnEscape labelledBy="rc-note-title">
      <DialogHeader id="rc-note-title" title={isEdit ? "Edit Bookmark/Note" : "Create Bookmark/Note"} onClose={onClose} />
      <div className="mt-4 flex flex-wrap gap-2 px-5">
        {chip(isEdit && word ? `Page ${word.sectionIndex + 1} - ${clean}` : title)}
        {word && chip(`Position ${word.charPosition}`)}
        {chip(clean)}
      </div>
      <div className="mt-3 flex-1 px-5">
        <textarea
          aria-label="Enter Notes (Optional)..."
          placeholder="Enter Notes (Optional)..."
          maxLength={2000}
          value={note}
          disabled={saving}
          onChange={(e) => { if (savingRef.current) return; setNote(e.target.value); setDirtyAt((revision) => revision + 1); }}
          className="mt-4 h-[150px] w-full resize-none p-[5px] text-sm outline-none"
          style={{ border: "1px solid #ccc", background: "transparent", color: "var(--rc-text)" }}
        />
      </div>
      {saveError && <p role="alert" className="px-5 pb-2 text-sm">Your note has not saved. Check your connection and use {isEdit ? "Update" : "Save"} to try again.</p>}
      {saving && <p role="status" className="px-5 pb-2 text-sm">Saving your note.</p>}
      <div className="flex items-center justify-end gap-1.5 px-5 pb-5">
        {isEdit && (
          <button type="button" className="rc-outline-btn h-[38px]" onClick={() => word && onGoTo(word)}>Go to location</button>
        )}
        <button
          type="button"
          className="rc-green-btn"
          disabled={saving}
          onClick={() => (isEdit && note === saved && !saveError ? onClose() : void save(note, true))}
        >
          {isEdit ? "Update" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- word action sheet

/** Ionic action sheet Spreeder opens on a word click. Look Up Word / Wordela lists are not built yet. */
export function WordActionSheet({ word, onClose, onBookmark }: { word: Word | null; onClose: () => void; onBookmark: (w: Word) => void }): React.ReactElement | null {
  if (!word) return null;
  const header = word.text.replace(/[^\w\s'-]/g, "").replace(/'s$/i, "").trim();
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,.32)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={header} className="w-full max-w-[500px]" style={{ background: "var(--rc-sheet)", color: "var(--rc-text)", boxShadow: "0 -2px 8px rgba(0,0,0,.2)" }}>
        <div className="flex h-[60px] items-center px-4 text-sm" style={{ color: "var(--rc-sheet-title)" }}>{header}</div>
        <button type="button" className="rc-menu-item h-[52px] text-sm" onClick={() => onBookmark(word)}>
          <Icon name="bookmark" size={24} style={{ color: "var(--rc-text-2)" }} /> Bookmark/Note
        </button>
        <button type="button" className="rc-menu-item h-[52px] text-sm" onClick={onClose}>
          <MIcon name="cancel" style={{ color: "var(--rc-text-2)" }} /> Cancel
        </button>
      </div>
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}

// ---------------------------------------------------------------- shortcuts

function Key({ children, wide = false, tall = false }: { children: React.ReactNode; wide?: boolean; tall?: boolean }): React.ReactElement {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded text-[13px] font-medium"
      style={{
        width: wide ? 216 : 32,
        height: tall ? 48 : 30,
        background: "var(--rc-keycap)",
        color: "var(--rc-strong)",
        boxShadow: "0 2px 0 rgba(0,0,0,.25)",
        fontFamily: "Roboto, Poppins, sans-serif",
      }}
    >
      {children}
    </kbd>
  );
}

export function ShortcutsPopover({ open, anchorX, onClose }: { open: boolean; anchorX: number; onClose: () => void }): React.ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-rc-shortcuts]") && onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open, onClose]);
  if (!open) return null;
  const lbl = "text-xs";
  return createPortal(
    <div data-rc-shortcuts className="fixed z-50 rounded-xl p-6 pt-5" style={{ left: Math.max(8, anchorX - 32), bottom: 50, width: 450, background: "var(--rc-popover)", color: "var(--rc-strong)", boxShadow: "0 2px 12px rgba(0,0,0,.2)" }}>
      <div className="mb-4 text-center text-base font-medium">Keyboard Shortcuts</div>
      <div className="flex items-center gap-2">
        <Key>↑</Key><span className="text-2xl font-light">/</span><Key>↓</Key><span className={`${lbl} mx-2`}>or</span><Key tall>+</Key><Key>-</Key>
        <span className={`${lbl} ml-3`}>increase or decrease speed</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Key>P</Key><span className={`${lbl} mx-2`}>or</span><Key wide>SPACE BAR</Key><span className={`${lbl} ml-4`}>pause / resume</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-y-4">
        <div className="flex items-center gap-4"><Key>→</Key><span className={lbl}>section forward</span></div>
        <div className="flex items-center gap-4"><Key>R</Key><span className={lbl}>restart</span></div>
        <div className="flex items-center gap-4"><Key>←</Key><span className={lbl}>section back</span></div>
        <div className="flex items-center gap-4"><Key>S</Key><span className={lbl}>settings</span></div>
      </div>
      <span aria-hidden className="absolute -bottom-2 left-6 h-4 w-4 rotate-45" style={{ background: "var(--rc-popover)" }} />
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}

// ---------------------------------------------------------------- finish + toast

export function FinishAlert({ title, open, onOkay }: { title: string; open: boolean; onOkay: () => void }): React.ReactElement | null {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,.32)" }}>
      <div role="alertdialog" aria-labelledby="rc-finish-h" className="w-[280px] rounded p-5 pb-2" style={{ background: "var(--rc-dialog)", color: "var(--rc-text)", boxShadow: "0 11px 15px -7px rgba(0,0,0,.2), 0 24px 38px 3px rgba(0,0,0,.14)" }}>
        <h2 id="rc-finish-h" className="text-base font-medium" style={{ color: "var(--rc-text-2)" }}>Congratulations!</h2>
        <p className="mt-3 text-sm" style={{ color: "var(--rc-text-2)" }}>
          You have successfully completed {title}. It will now be moved to your finished section on the Home Screen.
        </p>
        <div className="mt-4 flex justify-end">
          <button type="button" className="h-9 rounded px-3 text-sm font-medium uppercase" style={{ color: "#3880ff" }} onClick={onOkay}>Okay</button>
        </div>
      </div>
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}

/** "N WPM" pill: fades in .5s, holds 2s, fades out 2s (Spreeder updateNotificationText). */
export function SpeedToast({ text, nonce }: { text: string; nonce: number }): React.ReactElement {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!nonce) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2000);
    return () => window.clearTimeout(t);
  }, [nonce]);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-[10px] z-[4] -translate-x-1/2 whitespace-nowrap rounded px-2 py-2 text-sm text-white"
      style={{ background: "#323232", opacity: visible ? 1 : 0, transition: visible ? "opacity .5s" : "opacity 2s" }}
    >
      {text}
    </div>
  );
}
