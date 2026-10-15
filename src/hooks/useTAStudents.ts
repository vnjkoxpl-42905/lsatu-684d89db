import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TAStudentRow {
  class_id: string;
  display_name: string | null;
}

export function useTAStudents() {
  return useQuery<TAStudentRow[]>({
    queryKey: ["ta-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("class_id, display_name")
        .order("display_name", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as TAStudentRow[];
    },
  });
}
