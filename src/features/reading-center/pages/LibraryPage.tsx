import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Loader2, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { PassageCard } from "../components/PassageCard";
import { ViewPanel } from "../components/ViewPanel";
import { usePassages, usePreferences, useProgressList, useSaveProgress } from "../hooks/useReadingCenterData";
import { DEFAULT_PREFERENCES } from "../lib/constants";
import { tokenize } from "../lib/tokenize";
import { RC_MANAGE_PATH, RC_STATS_PATH } from "../lib/routes";
import type { Passage } from "../lib/types";

const GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

export default function LibraryPage(): React.ReactElement {
  const passagesQuery = usePassages();
  const progressQuery = useProgressList();
  const prefs = usePreferences().data ?? DEFAULT_PREFERENCES;
  const saveProgress = useSaveProgress();
  const permissions = useUserPermissions();
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Passage | null>(null);

  const progressById = useMemo(
    () => new Map((progressQuery.data ?? []).map((p) => [p.passage_id, p])),
    [progressQuery.data],
  );

  const needle = query.trim().toLowerCase();
  const passages = useMemo(
    () =>
      (passagesQuery.data ?? [])
        .filter((p) => p.is_published)
        .filter(
          (p) => !needle || p.title.toLowerCase().includes(needle) || (p.author ?? "").toLowerCase().includes(needle),
        )
        .sort((a, b) => a.sort_order - b.sort_order),
    [passagesQuery.data, needle],
  );

  const continueReading = useMemo(
    () =>
      passages
        .filter((p) => {
          const pr = progressById.get(p.id);
          return !!pr && pr.word_index > 0 && !pr.completed_at && !pr.hidden_from_recent;
        })
        .sort((a, b) =>
          (progressById.get(b.id)!.last_opened_at ?? "").localeCompare(progressById.get(a.id)!.last_opened_at ?? ""),
        ),
    [passages, progressById],
  );

  const viewingTokens = useMemo(() => (viewing ? tokenize(viewing.body) : []), [viewing]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl tracking-tight">Reading Center</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to={RC_STATS_PATH}
            className="inline-flex h-9 items-center gap-1.5 border border-black/15 px-3 text-sm text-black/70 hover:border-black/40 hover:text-black"
          >
            <BarChart3 className="h-4 w-4" strokeWidth={1.5} />
            Stats
          </Link>
          {permissions.is_admin && (
            <Link
              to={RC_MANAGE_PATH}
              className="inline-flex h-9 items-center gap-1.5 border border-black/15 px-3 text-sm text-black/70 hover:border-black/40 hover:text-black"
            >
              <Settings2 className="h-4 w-4" strokeWidth={1.5} />
              Manage passages
            </Link>
          )}
        </div>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search passages"
        className="mt-5 max-w-sm border-black/15 bg-white/40"
      />

      {passagesQuery.isLoading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-black/55">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading passages
        </div>
      ) : passagesQuery.error ? (
        <p className="mt-10 text-sm text-red-700">Could not load passages: {passagesQuery.error.message}</p>
      ) : passages.length === 0 ? (
        <p className="mt-10 text-sm text-black/55">{needle ? "No passages match that search." : "No passages yet."}</p>
      ) : (
        <>
          {continueReading.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-black/45">Continue reading</h2>
              <div className={GRID}>
                {continueReading.map((p) => (
                  <PassageCard
                    key={p.id}
                    passage={p}
                    progress={progressById.get(p.id)}
                    wpm={prefs.wpm}
                    onViewText={() => setViewing(p)}
                    onHide={() =>
                      saveProgress.mutate({
                        passage_id: p.id,
                        word_index: progressById.get(p.id)!.word_index,
                        hidden_from_recent: true,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )}
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-black/45">All passages</h2>
            <div className={GRID}>
              {passages.map((p) => (
                <PassageCard
                  key={p.id}
                  passage={p}
                  progress={progressById.get(p.id)}
                  wpm={prefs.wpm}
                  onViewText={() => setViewing(p)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {viewing && (
        <ViewPanel
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
          title={viewing.title}
          tokens={viewingTokens}
          prefs={{ ...prefs, font_size: Math.min(prefs.font_size, 22) }}
        />
      )}
    </div>
  );
}
