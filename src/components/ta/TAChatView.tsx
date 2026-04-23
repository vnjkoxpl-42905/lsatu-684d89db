import { useEffect, useRef, useState } from "react";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTAChat, type TAInteraction } from "@/hooks/useTAChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DraftCard from "./DraftCard";

interface Props {
  studentId: string;
  studentName?: string | null;
}

function Bubble({ interaction }: { interaction: TAInteraction }) {
  const isAdmin = interaction.role === "admin";
  return (
    <div className={"flex " + (isAdmin ? "justify-end" : "justify-start")}>
      <div className="max-w-[85%] space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-1">
          {isAdmin ? "Joshua" : "TA"}
        </div>
        <div
          className={
            "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words " +
            (isAdmin
              ? "bg-zinc-100 text-zinc-900"
              : "bg-zinc-800 text-zinc-100")
          }
        >
          {interaction.message}
        </div>
      </div>
    </div>
  );
}

export default function TAChatView({ studentId, studentName }: Props) {
  const { interactions, isLoading, error, send } = useTAChat(studentId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [interactions.length]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || send.isPending) return;
    try {
      const result = await send.mutateAsync(msg);
      if (!text) setInput("");
      if (result.parse_error === "malformed_draft") {
        toast.warning("TA response had a malformed draft — raw text saved.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
  };

  const handleRevise = async (instructions: string) => {
    await handleSend(`Revise the draft: ${instructions}`);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          Student
        </div>
        <div className="text-sm font-medium text-zinc-100 truncate">
          {studentName?.trim() || "Unnamed student"}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-400">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Failed to load chat.
          </div>
        ) : interactions.length === 0 ? (
          <div className="text-center text-sm text-zinc-500 py-12">
            No messages yet. Ask the TA about this student.
          </div>
        ) : (
          interactions.map((i) => {
            if (i.draft_content && i.role === "assistant") {
              return (
                <div key={i.id} className="flex justify-start">
                  <div className="max-w-[85%] space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-1">
                      TA
                    </div>
                    <div className="rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words bg-zinc-800 text-zinc-100">
                      {i.message}
                    </div>
                    <DraftCard
                      interactionId={i.id}
                      studentId={studentId}
                      draft={i.draft_content}
                      draftStatus={i.draft_status}
                      onRevise={handleRevise}
                    />
                  </div>
                </div>
              );
            }
            return <Bubble key={i.id} interaction={i} />;
          })
        )}
        {send.isPending && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 text-sm bg-zinc-800 text-zinc-400 inline-flex items-center">
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              TA is thinking…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 p-3 bg-zinc-950 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the TA (⌘/Ctrl+Enter to send)"
            rows={1}
            className="min-h-[44px] max-h-32 resize-none flex-1"
            disabled={send.isPending}
          />
          <Button
            onClick={() => handleSend()}
            disabled={send.isPending || !input.trim()}
            size="icon"
            aria-label="Send"
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
