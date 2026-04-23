import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Search, Plus } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AssetType } from "@/hooks/useTeachingAssets";
import AssetList from "@/components/library/AssetList";
import AssetUploadDialog from "@/components/library/AssetUploadDialog";

const TYPE_FILTERS: { value: AssetType | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "pdf", label: "PDFs" },
  { value: "document", label: "Docs" },
  { value: "question_set", label: "Question sets" },
  { value: "drill", label: "Drills" },
  { value: "curriculum", label: "Curriculum" },
  { value: "notes", label: "Notes" },
];

export default function TeachingLibrary() {
  const navigate = useNavigate();
  const { is_admin, loading } = useUserPermissions();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Hard admin gate at the page level. has_ta_access flag acts as a secondary
  // switch but the feature itself is admin-only per the brief.
  useEffect(() => {
    if (!loading && !is_admin) navigate("/foyer", { replace: true });
  }, [loading, is_admin, navigate]);

  if (loading || !is_admin) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin")}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <div className="h-5 w-px bg-zinc-800" />
          <BookOpen className="h-5 w-5 text-zinc-400" />
          <h1 className="text-lg font-semibold">Teaching Library</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or description"
              className="pl-9"
            />
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Upload
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setTypeFilter(f.value)}
              className={
                "px-3 py-1 rounded-full text-xs transition " +
                (typeFilter === f.value
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <AssetList search={search} typeFilter={typeFilter} />
      </main>

      <AssetUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
