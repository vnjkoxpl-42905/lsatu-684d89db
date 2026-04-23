import { useState } from "react";
import {
  BookOpen,
  Search,
  AlertTriangle,
  Loader2,
  FileText,
  FileQuestion,
  BookMarked,
  ClipboardList,
  StickyNote,
  File,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useTeachingAssets,
  type AssetType,
  type TeachingAsset,
} from "@/hooks/useTeachingAssets";

const TYPE_FILTERS: { value: AssetType | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Docs" },
  { value: "question_set", label: "Question sets" },
  { value: "drill", label: "Drills" },
  { value: "curriculum", label: "Curriculum" },
  { value: "notes", label: "Notes" },
];

const TYPE_ICON: Record<AssetType, typeof File> = {
  pdf: FileText,
  document: File,
  question_set: FileQuestion,
  drill: ClipboardList,
  curriculum: BookMarked,
  notes: StickyNote,
};

const TYPE_LABEL: Record<AssetType, string> = {
  pdf: "PDF",
  document: "Doc",
  question_set: "Question set",
  drill: "Drill",
  curriculum: "Curriculum",
  notes: "Notes",
};

/**
 * Read-only teaching library browser for the Student Hub right panel.
 * Mirrors TeachingLibrary.tsx's search + filter pattern but drops upload,
 * edit, and delete — those stay on /admin/library where the library is
 * managed directly.
 */
export default function LibraryBrowser() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | null>(null);
  const { data: assets = [], isLoading, error } = useTeachingAssets(
    search,
    typeFilter
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/40 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-[11px] transition",
                typeFilter === f.value
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading…
          </div>
        ) : error ? (
          <div className="text-sm text-red-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Failed to load library.
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <BookOpen className="h-8 w-8 text-zinc-600 mb-2" />
            <div className="text-sm text-zinc-500">
              {search || typeFilter
                ? "No library assets match."
                : "The library is empty."}
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {assets.map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: TeachingAsset }) {
  const Icon = TYPE_ICON[asset.asset_type];
  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5">
      <div className="flex items-start gap-2.5">
        <div className="h-7 w-7 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-zinc-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-medium text-zinc-100 truncate">
              {asset.title}
            </div>
            <span className="inline-flex items-center rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 shrink-0">
              {TYPE_LABEL[asset.asset_type]}
            </span>
          </div>
          {asset.description && (
            <div className="mt-1 text-[12px] text-zinc-400 line-clamp-2">
              {asset.description}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
