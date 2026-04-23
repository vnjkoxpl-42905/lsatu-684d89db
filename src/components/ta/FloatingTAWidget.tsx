import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { GraduationCap, ExternalLink, X, ArrowLeft, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import StudentSelector from "./StudentSelector";
import TAChatView from "./TAChatView";

const LS_KEY = "ta-selected-student";

export default function FloatingTAWidget() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { is_admin, has_ta_access, loading: permsLoading } = useUserPermissions();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (selected) localStorage.setItem(LS_KEY, selected);
    } catch {
      /* ignore */
    }
  }, [selected]);

  const { data: selectedProfile } = useQuery<{ display_name: string | null } | null>({
    queryKey: ["ta-student-name", selected],
    enabled: !!selected && open,
    queryFn: async () => {
      if (!selected) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("class_id", selected)
        .maybeSingle();
      return data ?? null;
    },
  });

  const selectedName = useMemo(
    () => selectedProfile?.display_name ?? null,
    [selectedProfile]
  );

  if (!authReady || !user || permsLoading) return null;
  // Admins always get the widget; has_ta_access is for any future non-admin
  // staff role. Mirrors ProtectedRoute's `is_admin || flag` convention.
  if (!is_admin && !has_ta_access) return null;

  const openFullPage = () => {
    setOpen(false);
    navigate("/admin/ta");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-24 z-40",
          "h-12 w-12 rounded-full",
          "bg-background/90 backdrop-blur border border-border shadow-lg",
          "flex items-center justify-center",
          "text-foreground/80 hover:text-foreground",
          "hover:bg-background transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label="Open Teaching Assistant"
      >
        <GraduationCap className="w-5 h-5" strokeWidth={1.75} />
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex flex-col",
              "w-full sm:max-w-md",
              "bg-zinc-950 text-zinc-100 border-l border-zinc-800 shadow-2xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
              "data-[state=closed]:duration-250 data-[state=open]:duration-300",
              "focus:outline-none"
            )}
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">Teaching Assistant</Dialog.Title>

            <div className="flex items-center gap-2 px-4 h-14 border-b border-zinc-800 shrink-0">
              {selected ? (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
                  aria-label="Back to student list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-md bg-zinc-900 flex items-center justify-center shrink-0">
                  <GraduationCap
                    className="w-4 h-4 text-zinc-400"
                    strokeWidth={1.75}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {selected
                    ? selectedName?.trim() || "Student"
                    : "Teaching Assistant"}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {selected ? "Chat" : "Pick a student"}
                </div>
              </div>
              <button
                type="button"
                onClick={openFullPage}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-1 rounded-md hover:bg-zinc-900"
                title="Open full page"
              >
                <span className="hidden sm:inline">Full page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <Dialog.Close
                className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Dialog.Close>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {selected ? (
                <TAChatView studentId={selected} studentName={selectedName} />
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 shrink-0">
                    <Users className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                      Students
                    </span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <StudentSelector
                      selectedId={selected}
                      onSelect={(id) => setSelected(id)}
                    />
                  </div>
                  <div className="p-3 border-t border-zinc-800 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                      onClick={openFullPage}
                    >
                      Open full page
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
