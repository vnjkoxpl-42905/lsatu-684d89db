import { ArrowLeft, ChevronRight, MoreVertical, Upload } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeletePassage, usePassages, useProgressList, useSaveProgress, useUpsertPassage } from "../hooks/useReadingCenterData";
import { buildTextModel } from "../lib/spreeder";
import { rcReaderPath, RC_LIBRARY_PATH } from "../lib/routes";
import type { Passage, Progress } from "../lib/types";
import { Icon, type IconName } from "../components/Icon";
import { TopBar } from "../components/AppShell";
import { AddTextScreen } from "../components/AddText";
import { ViewPanel } from "../components/ViewPanel";
import { Modal, DialogHeader } from "../components/spreeder-ui";
import { ConfirmDialog, TagTextDialog } from "../components/Tags";
import { NothingHereYet } from "./TagsPage";

type ShelfKey = "recent" | "added" | "available" | "progress" | "finished";
const SHELF_TITLES: Record<ShelfKey, string> = { recent: "Recent", added: "Added By Me", available: "From LSAT U", progress: "In Progress", finished: "Finished" };

export default function LibraryPage(): React.ReactElement {
  const { user } = useAuth();
  const { tag } = useParams<{ tag?: string }>();
  const passagesQuery = usePassages();
  const passages = passagesQuery.data ?? [];
  const progress = useProgressList().data ?? [];
  const saveProgress = useSaveProgress();
  const [query, setQuery] = useState("");
  const [viewAll, setViewAll] = useState<ShelfKey | null>(null);
  const [menu, setMenu] = useState<{ passage: Passage; anchor: DOMRect; shelf: ShelfKey } | null>(null);
  const [action, setAction] = useState<{ kind: "view" | "image" | "edit" | "tag" | "delete"; passage: Passage } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { setQuery(""); setViewAll(null); }, [location.key]);

  const prog = useMemo(() => new Map<string, Progress>(progress.map((p) => [p.passage_id, p])), [progress]);
  const visible = passages.filter((p) => p.is_published && (!tag || (p.tags ?? []).includes(tag)));

  const shelves: Record<ShelfKey, Passage[]> = useMemo(() => {
    const recent = visible
      .filter((p) => prog.has(p.id) && !prog.get(p.id)!.hidden_from_recent)
      .sort((a, b) => prog.get(b.id)!.last_opened_at.localeCompare(prog.get(a.id)!.last_opened_at));
    const added = visible.filter((p) => p.owner_id === user?.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const available = visible.filter((p) => !p.owner_id);
    const inProgress = visible.filter((p) => {
      const pr = prog.get(p.id);
      return !!pr && pr.word_index > 0 && !pr.completed_at;
    });
    const finished = visible.filter((p) => !!prog.get(p.id)?.completed_at);
    return { recent, added, available, progress: inProgress, finished };
  }, [visible, prog, user?.id]);

  const needle = query.trim().toLowerCase();
  const results = needle ? visible.filter((p) => [p.title, p.author ?? "", p.body].some((text) => text.toLowerCase().includes(needle))) : null;

  const card = (p: Passage, shelf: ShelfKey) => (
    <PassageCard key={`${shelf}:${p.id}`} passage={p} onMenu={(anchor) => setMenu({ passage: p, anchor, shelf })} />
  );

  return (
    <div data-motion-group className="min-h-screen">
      <TopBar query={query} onQuery={setQuery} placeholder="Search text" />
      <div className="px-5 pb-10">
        <h1 data-motion-item className="mt-5 text-2xl font-semibold">{tag ? `Tagged: ${tag}` : "My Library"}</h1>
        <p data-motion-item className="mt-2 text-sm" style={{ color: "var(--rc-text-2)" }}>{tag ? "Articles you grouped with this tag. Use an article's menu to change its tags." : "Read an article, add your own text, or search by title, author, or article text."}</p>
        {passagesQuery.isLoading && <p className="mt-8" role="status">Loading your reading library.</p>}
        {passagesQuery.error && <p className="mt-8" role="alert">Your reading library could not load. {passagesQuery.error.message} <button type="button" className="underline" onClick={() => void passagesQuery.refetch()}>Try again</button></p>}
        <div data-motion-item data-motion-id="reading-library-shelves" data-motion-ready={passagesQuery.isLoading ? "false" : "true"}>
        {tag && !results ? (
          visible.length === 0 ? <NothingHereYet /> : <Shelf title={tag} wrap>{visible.map((p) => card(p, "added"))}</Shelf>
        ) : results ? (
          <Shelf title={`Results (${results.length})`}>{results.map((p) => card(p, "added"))}</Shelf>
        ) : viewAll ? (
          <Shelf title={SHELF_TITLES[viewAll]} back={() => setViewAll(null)} wrap>{shelves[viewAll].map((p) => card(p, viewAll))}</Shelf>
        ) : visible.length === 0 && !passagesQuery.isLoading && !passagesQuery.error ? (
          <p className="mt-16 text-center text-base" style={{ color: "var(--rc-text-2)" }}>{tag ? "No texts with this tag." : "Your library is empty. Use Add Text to add something to read."}</p>
        ) : (
          (["recent", "added", "available", "progress", "finished"] as ShelfKey[]).map((k) =>
            shelves[k].length === 0 ? null : (
              <Shelf key={k} title={SHELF_TITLES[k]} onViewAll={k === "recent" ? undefined : () => setViewAll(k)}>
                {shelves[k].map((p) => card(p, k))}
              </Shelf>
            ),
          )
        )}
        </div>
      </div>

      {menu && (
        <CardMenu
          anchor={menu.anchor}
          showHide={menu.shelf === "recent"}
          onClose={() => setMenu(null)}
          onPick={(kind) => {
            const p = menu.passage;
            setMenu(null);
            if (kind === "hide") {
              const pr = prog.get(p.id);
              saveProgress.mutate({ passage_id: p.id, word_index: pr?.word_index ?? 0, hidden_from_recent: true });
            } else setAction({ kind, passage: p });
          }}
        />
      )}
      {action?.kind === "view" && (
        <LocationDialog
          passage={action.passage}
          start={prog.get(action.passage.id)?.word_index ?? 0}
          onClose={() => setAction(null)}
          onMove={(i) => saveProgress.mutate({ passage_id: action.passage.id, word_index: i, hidden_from_recent: prog.get(action.passage.id)?.hidden_from_recent ?? false })}
          onPlay={() => navigate(rcReaderPath(action.passage.slug))}
        />
      )}
      {action?.kind === "edit" && <AddTextScreen mode="edit" passage={action.passage} onClose={() => setAction(null)} onSaved={() => setAction(null)} />}
      {action?.kind === "image" && <EditImageDialog passage={action.passage} onClose={() => setAction(null)} />}
      {action?.kind === "tag" && <TagTextDialog passage={action.passage} onClose={() => setAction(null)} />}
      {action?.kind === "delete" && <DeleteDialog passage={action.passage} onClose={() => setAction(null)} />}
    </div>
  );
}

function Shelf({ title, children, onViewAll, back, wrap = false }: { title: string; children: React.ReactNode; onViewAll?: () => void; back?: () => void; wrap?: boolean }): React.ReactElement {
  return (
    <section className="mb-[50px] mt-[25px]">
      <div className="mb-4 flex h-5 items-center gap-2">
        {back && <button type="button" aria-label="Back" onClick={back} className="flex"><ArrowLeft aria-hidden size={24} /></button>}
        <h2 className="text-lg font-bold leading-5" style={{ color: "var(--rc-strong)" }}>{title}</h2>
        {onViewAll && (
          <button type="button" onClick={onViewAll} className="ml-2 flex items-center text-sm font-medium" style={{ color: "#74b2e5" }}>
            View All <ChevronRight aria-hidden size={20} />
          </button>
        )}
      </div>
      <div className={`flex gap-3 ${wrap ? "flex-wrap" : "overflow-x-auto pb-2"}`}>{children}</div>
    </section>
  );
}

function PassageCard({ passage, onMenu }: { passage: Passage; onMenu: (anchor: DOMRect) => void }): React.ReactElement {
  return (
    <div className="w-[148px] shrink-0">
      <Link to={rcReaderPath(passage.slug)} className="block h-[210px] w-[148px] overflow-hidden rounded-[5px]" aria-label={passage.title}>
        {passage.cover_url ? (
          <img src={passage.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="flex h-full w-full flex-col justify-between border border-[#a8b7a0]/30 bg-[#182b24] p-4 text-[#f4efe2]">
            <span className="text-[9px] font-medium uppercase tracking-[.16em] text-[#c9d8bc]">LSAT U · Reading</span>
            <span className="line-clamp-5 break-words font-serif text-lg leading-snug">{passage.title}</span>
            <span className="border-t border-[#a8b7a0]/30 pt-2 text-[10px] text-[#c9d8bc]">{passage.word_count.toLocaleString()} words</span>
          </div>
        )}
      </Link>
      <div className="mt-2 flex items-start gap-1">
        <Link to={rcReaderPath(passage.slug)} className="line-clamp-2 flex-1 text-[12.5px] font-normal leading-4" style={{ color: "var(--rc-strong)" }}>{passage.title}</Link>
        <button
          type="button"
          aria-label={`More options for ${passage.title}`}
          onClick={(e) => {
            onMenu((e.currentTarget as HTMLElement).getBoundingClientRect());
          }}
          className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center"
          style={{ color: "var(--rc-strong)" }}
        >
          <MoreVertical aria-hidden size={22} />
        </button>
      </div>
      {passage.author && <div className="mt-[3px] truncate text-[11.5px]" style={{ color: "#918f8f" }}>{passage.author}</div>}
    </div>
  );
}

type MenuKind = "view" | "image" | "edit" | "tag" | "delete" | "hide";

function CardMenu({ anchor, showHide, onClose, onPick }: { anchor: DOMRect; showHide: boolean; onClose: () => void; onPick: (k: MenuKind) => void }): React.ReactElement {
  useEffect(() => {
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest("[data-rc-cardmenu]") && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  const items: [MenuKind, IconName, string][] = [
    ["view", "eye", "View/Location"],
    ["image", "image", "Edit Image"],
    ["edit", "create", "Edit Text"],
    ["tag", "pricetag", "Tag"],
    ["delete", "trash", "Delete"],
  ];
  if (showHide) items.push(["hide", "eyeOff", "Hide from Recent"]);
  // mat-menu xPosition "before", yPosition "above"; flips below when it does not fit.
  const height = items.length * 48 + 16;
  const top = anchor.top - height >= 0 ? anchor.top - height : Math.min(anchor.bottom, window.innerHeight - height - 8);
  return createPortal(
    <div data-rc-cardmenu role="menu" className="rc-menu fixed z-50 w-[201px] text-base" style={{ left: Math.max(8, anchor.right - 201), top }}>
      {items.map(([k, icon, label]) => (
        <button key={k} type="button" role="menuitem" className="rc-menu-item h-12" onClick={() => onPick(k)}>
          <Icon name={icon} size={16} /> {label}
        </button>
      ))}
    </div>,
    document.getElementById("reading-center-root") ?? document.body,
  );
}

/** View/Location: the View panel; picking a word opens the reader there. */
function LocationDialog({ passage, start, onClose, onMove, onPlay }: { passage: Passage; start: number; onClose: () => void; onMove: (i: number) => void; onPlay: () => void }): React.ReactElement {
  const words = useMemo(() => buildTextModel(passage.body).words, [passage.body]);
  const [at, setAt] = useState(start);
  return <ViewPanel open onClose={onClose} title={passage.title} words={words} currentWord={at} onJump={(w) => { setAt(w.index); onMove(w.index); }} onPlay={onPlay} />;
}

/** Spreeder Edit Image: cover on the left, Upload Image on the right (Generate With AI left out). */
function EditImageDialog({ passage, onClose }: { passage: Passage; onClose: () => void }): React.ReactElement {
  const upsert = useUpsertPassage();
  const [url, setUrl] = useState(passage.cover_url ?? "");
  const changed = url !== (passage.cover_url ?? "");
  const pickFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => setUrl(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <Modal open onClose={onClose} width={500} closeOnEscape labelledBy="rc-img-title">
      <DialogHeader id="rc-img-title" title="Edit Image" onClose={onClose} />
      <div className="mt-8 flex items-center px-6">
        <div className="ml-[22px] flex h-[225px] w-[150px] shrink-0 items-center justify-center overflow-hidden rounded-[5px]" style={{ background: "var(--rc-cover)" }}>
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <CoverGlyph />}
        </div>
        <div className="flex flex-1 justify-center pl-6">
          <label className="rc-outline-btn h-[38px] cursor-pointer gap-1 px-4" style={{ borderColor: "var(--rc-btn-secondary-border)" }}>
            <Upload aria-hidden size={24} /> Upload Image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])} />
          </label>
        </div>
      </div>
      <div className="mt-[52px] flex justify-end gap-2 px-6 pb-4">
        <button type="button" className="rc-outline-btn h-[38px]" style={{ borderColor: "var(--rc-btn-secondary-border)" }} onClick={onClose}>Cancel</button>
        <button type="button" className="rc-green-btn" disabled={!changed} onClick={() => upsert.mutate({ id: passage.id, title: passage.title, body: passage.body, cover_url: url || null }, { onSuccess: onClose })}>Save</button>
      </div>
    </Modal>
  );
}

function CoverGlyph(): React.ReactElement {
  return (
    <svg viewBox="0 0 72 92" width="72" height="92" aria-hidden>
      <path d="M8 0h40l24 24v60a8 8 0 0 1-8 8H8a8 8 0 0 1-8-8V8a8 8 0 0 1 8-8z" fill="#e6eef5" />
      <path d="M48 0v18a6 6 0 0 0 6 6h18z" fill="#c4d6e6" />
      <rect x="16" y="46" width="40" height="7" rx="1" fill="var(--rc-cover)" />
      <rect x="16" y="62" width="40" height="7" rx="1" fill="var(--rc-cover)" />
    </svg>
  );
}

function DeleteDialog({ passage, onClose }: { passage: Passage; onClose: () => void }): React.ReactElement {
  const del = useDeletePassage();
  return (
    <ConfirmDialog
      title="Delete Text"
      message={`Are you sure you want to delete ${passage.title}?`}
      onNo={onClose}
      onYes={() => del.mutate(passage.id, { onSuccess: onClose })}
    />
  );
}
