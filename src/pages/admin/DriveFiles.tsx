import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cloud, ExternalLink, File as FileIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  loadGooglePickerApi,
  openPicker,
  type PickedFile,
} from "@/lib/googleDrive";

interface DriveFileRow {
  id: string;
  admin_user_id: string;
  google_file_id: string;
  file_name: string;
  mime_type: string | null;
  thumbnail_url: string | null;
  web_view_link: string;
  picked_at: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DriveFiles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { is_admin, loading: permLoading } = useUserPermissions();

  const [rows, setRows] = useState<DriveFileRow[] | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (!permLoading && !is_admin) {
      navigate("/foyer", { replace: true });
    }
  }, [permLoading, is_admin, navigate]);

  const loadRows = useCallback(async () => {
    if (!user) return;
    // TODO: drop `as any` after next supabase type regen (drive_files table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("drive_files")
      .select("*")
      .eq("admin_user_id", user.id)
      .order("picked_at", { ascending: false });
    if (error) {
      console.error("Failed to load drive_files", error);
      toast.error("Failed to load files");
      setRows([]);
      return;
    }
    setRows((data || []) as DriveFileRow[]);
  }, [user]);

  useEffect(() => {
    if (is_admin && user) void loadRows();
  }, [is_admin, user, loadRows]);

  const handlePicked = useCallback(
    async (files: PickedFile[]) => {
      if (!user || files.length === 0) return;
      const inserts = files.map((f) => ({
        admin_user_id: user.id,
        google_file_id: f.id,
        file_name: f.name,
        mime_type: f.mimeType || null,
        thumbnail_url: f.thumbnailUrl || null,
        web_view_link: f.url,
      }));
      // TODO: drop `as any` after next supabase type regen (drive_files table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("drive_files")
        .upsert(inserts, { onConflict: "admin_user_id,google_file_id", ignoreDuplicates: true });
      if (error) {
        console.error("Failed to save drive files", error);
        toast.error("Failed to save files");
        return;
      }
      toast.success(`${files.length} file${files.length === 1 ? "" : "s"} added`);
      await loadRows();
    },
    [user, loadRows],
  );

  const handlePickClick = useCallback(async () => {
    if (picking) return;
    setPicking(true);
    try {
      await loadGooglePickerApi();
      openPicker((files) => {
        void handlePicked(files);
      });
    } catch (err) {
      console.error("Failed to open Google Picker", err);
      toast.error("Failed to open Google Picker");
    } finally {
      setPicking(false);
    }
  }, [picking, handlePicked]);

  const handleRemove = useCallback(
    async (id: string) => {
      // TODO: drop `as any` after next supabase type regen (drive_files table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("drive_files")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Failed to remove drive file", error);
        toast.error("Failed to remove file");
        return;
      }
      toast.success("File removed");
      setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    },
    [],
  );

  if (permLoading) return null;
  if (!is_admin) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Back to Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Cloud className="w-5 h-5 text-sky-400/70" />
          <h1 className="text-lg font-semibold tracking-tight">Google Drive Files</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <div>
          <p className="text-sm text-zinc-400">
            Pick files from Google Drive to attach to student work later.
          </p>
        </div>

        <div>
          <Button onClick={handlePickClick} disabled={picking}>
            <Cloud className="w-4 h-4 mr-2" />
            {picking ? "Opening picker..." : "Pick Files from Google Drive"}
          </Button>
        </div>

        <div className="space-y-3">
          {rows === null && (
            <>
              <Skeleton className="h-16 w-full bg-zinc-900" />
              <Skeleton className="h-16 w-full bg-zinc-900" />
              <Skeleton className="h-16 w-full bg-zinc-900" />
            </>
          )}

          {rows !== null && rows.length === 0 && (
            <div className="border border-zinc-800 rounded-lg p-6 text-center text-sm text-zinc-400">
              No files picked yet. Click "Pick Files from Google Drive" above to
              add some.
            </div>
          )}

          {rows !== null && rows.length > 0 && (
            <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-4 px-4 py-3"
                >
                  <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {row.thumbnail_url ? (
                      <img
                        src={row.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <FileIcon className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100 truncate">
                      {row.file_name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                      <span className="truncate">{row.mime_type || "unknown type"}</span>
                      <span>·</span>
                      <span className="shrink-0">{relativeTime(row.picked_at)}</span>
                    </div>
                  </div>

                  <a
                    href={row.web_view_link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0"
                  >
                    Open
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-zinc-900"
                        aria-label="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the reference from LSAT U. The file stays
                          in your Google Drive.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleRemove(row.id)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
