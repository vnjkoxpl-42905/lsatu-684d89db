import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface StudentRow {
  class_id: string;
  display_name: string | null;
}

interface Props {
  selectedId: string | null;
  onSelect: (studentId: string) => void;
}

export default function StudentSelector({ selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");

  const { data = [], isLoading, error } = useQuery<StudentRow[]>({
    queryKey: ["ta-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("class_id, display_name")
        .order("display_name", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((s) =>
      (s.display_name ?? "").toLowerCase().includes(q)
    );
  }, [data, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-400">Failed to load students.</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">
            {query ? "No matching students." : "No students yet."}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {filtered.map((s) => {
              const active = s.class_id === selectedId;
              return (
                <li key={s.class_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.class_id)}
                    className={
                      "w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-sm transition " +
                      (active
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-300 hover:bg-zinc-900/60")
                    }
                  >
                    <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <span className="truncate">
                      {s.display_name?.trim() || "Unnamed"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
