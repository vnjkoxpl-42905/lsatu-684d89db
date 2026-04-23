import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { extractPdfText } from "@/lib/pdfExtract";

export type StudentContextType =
  | "file"
  | "screenshot"
  | "transcript"
  | "note"
  | "external_score";

export interface StudentContextItem {
  id: string;
  student_id: string;
  context_type: StudentContextType;
  title: string;
  content_text: string | null;
  file_path: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

const BUCKET = "student-context";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;

// Cast until Lovable regenerates src/integrations/supabase/types.ts.
const contextTable = () => (supabase as any).from("student_context");

export function useStudentContext(studentId: string) {
  const qc = useQueryClient();
  const query = useQuery<StudentContextItem[]>({
    queryKey: ["student-context", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await contextTable()
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[useStudentContext] fetch failed:", error);
        throw error;
      }
      return (data ?? []) as StudentContextItem[];
    },
  });

  // Realtime: refresh when any row changes for this student. Lets a
  // second open tab (or the AttachmentBar uploading from the chat)
  // reflect immediately in the Hub's Notes tab. The channel name
  // includes a random suffix so multi-mount doesn't collide.
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`student-context-${studentId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_context",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["student-context", studentId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, qc]);

  return query;
}

export interface UploadFileInput {
  studentId: string;
  file: File;
  contextType: Extract<StudentContextType, "file" | "screenshot" | "transcript">;
  title?: string;
  source?: string;
}

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    return extractPdfText(file);
  }
  if (
    file.type.startsWith("text/") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md")
  ) {
    return (await file.text()).slice(0, MAX_TEXT_CHARS);
  }
  // Images and other binary types — store without text.
  return "";
}

export function useUploadStudentContextFile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadFileInput) => {
      if (!user) throw new Error("Not signed in");
      const { studentId, file, contextType } = input;
      if (file.size > MAX_FILE_BYTES) {
        throw new Error(
          `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`
        );
      }

      const contentText = await extractTextFromFile(file);
      const title = (input.title?.trim() || file.name).slice(0, 200);

      // Insert row first so we have an id to namespace the storage path.
      const { data: inserted, error: insertError } = await contextTable()
        .insert({
          student_id: studentId,
          context_type: contextType,
          title,
          content_text: contentText || null,
          file_path: null,
          source: input.source ?? "upload",
          metadata: { size: file.size, mime: file.type || null },
          created_by: user.id,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      const id = (inserted as { id: string }).id;

      // Upload to storage; roll back the row if the upload fails so we
      // never leave a dangling context record.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${studentId}/${id}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (uploadError) {
        await contextTable().delete().eq("id", id);
        throw uploadError;
      }

      const { error: updateError } = await contextTable()
        .update({ file_path: path })
        .eq("id", id);
      if (updateError) throw updateError;

      return { id, title };
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["student-context", vars.studentId] });
    },
  });
}

export interface AddNoteInput {
  studentId: string;
  title: string;
  body: string;
  contextType?: Extract<StudentContextType, "note" | "transcript" | "external_score">;
  source?: string;
  metadata?: Record<string, unknown>;
}

export function useAddStudentContextNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddNoteInput) => {
      if (!user) throw new Error("Not signed in");
      const title = input.title.trim();
      const body = input.body.trim();
      if (!title) throw new Error("Title is required");
      if (!body) throw new Error("Content is required");

      const { data: inserted, error } = await contextTable()
        .insert({
          student_id: input.studentId,
          context_type: input.contextType ?? "note",
          title: title.slice(0, 200),
          content_text: body.slice(0, MAX_TEXT_CHARS),
          file_path: null,
          source: input.source ?? "manual",
          metadata: input.metadata ?? {},
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      return inserted as { id: string };
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["student-context", vars.studentId] });
    },
  });
}

export function useDeleteStudentContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Pick<StudentContextItem, "id" | "student_id" | "file_path">) => {
      if (item.file_path) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove([item.file_path]);
        if (storageError) throw storageError;
      }
      const { error } = await contextTable().delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["student-context", vars.student_id] });
    },
  });
}
