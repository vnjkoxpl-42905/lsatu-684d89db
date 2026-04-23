import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useTAChat, type TAInteraction } from "@/hooks/useTAChat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import DraftCard from "./DraftCard";
import SlashCommandPalette from "./SlashCommandPalette";
import TypingDots from "./TypingDots";
import { SLASH_COMMANDS, filterSlashCommands, type SlashCommand } from "./slashCommands";

interface Props {
  studentId: string;
  studentName?: string | null;
}

const TEXTAREA_MIN_PX = 60;
const TEXTAREA_MAX_PX = 200;

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [interactions.length, send.isPending]);

  // Auto-resize textarea between TEXTAREA_MIN_PX and TEXTAREA_MAX_PX. Runs
  // synchronously on input change so there is no visible layout jump.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = `${TEXTAREA_MIN_PX}px`;
    const next = Math.min(
      Math.max(el.scrollHeight, TEXTAREA_MIN_PX),
      TEXTAREA_MAX_PX
    );
    el.style.height = `${next}px`;
  }, [input]);

  const filtered = paletteOpen
    ? filterSlashCommands(input.startsWith("/") ? input.slice(1).split(/\s/)[0] ?? "" : "")
    : SLASH_COMMANDS;

  const applyCommand = (cmd: SlashCommand) => {
    setInput(cmd.prefill);
    setPaletteOpen(false);
    setPaletteIndex(0);
    // Re-focus and place caret at end so admin can edit immediately.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cmd.prefill.length, cmd.prefill.length);
    });
  };

  const handleInputChange = (next: string) => {
    setInput(next);
    // Open palette when value starts with "/" and we haven't hit a space on
    // the first token. Close once the admin has moved past `/command ` (space
    // terminator) so typing real text afterwards doesn't keep the menu up.
    if (next.startsWith("/") && !next.slice(1).includes(" ")) {
      setPaletteOpen(true);
      setPaletteIndex(0);
    } else {
      setPaletteOpen(false);
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || send.isPending) return;
    try {
      const result = await send.mutateAsync(msg);
      if (!text) setInput("");
      setPaletteOpen(false);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (paletteOpen && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPaletteIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPaletteIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        applyCommand(filtered[paletteIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPaletteOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const showChips = !input && !send.isPending;

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
            No messages yet. Ask the TA about this student, or type
            <span className="text-zinc-300"> / </span>
            for commands.
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
            <div className="max-w-[85%] space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-1">
                TA
              </div>
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-800 p-3 bg-zinc-950 shrink-0 space-y-2">
        {showChips && (
          <div className="flex flex-wrap gap-1.5">
            {SLASH_COMMANDS.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => applyCommand(cmd)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900",
                    "px-2.5 py-1 text-[11px] text-zinc-300",
                    "hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                  )}
                  aria-label={`${cmd.label} — ${cmd.description}`}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  <span>{cmd.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative flex items-end gap-2">
          <SlashCommandPalette
            value={input}
            open={paletteOpen}
            activeIndex={paletteIndex}
            onActiveIndexChange={setPaletteIndex}
            onSelect={applyCommand}
            onClose={() => setPaletteOpen(false)}
          />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the TA (⌘/Ctrl+Enter to send · / for commands)"
            rows={1}
            style={{ height: `${TEXTAREA_MIN_PX}px` }}
            className="resize-none flex-1 leading-relaxed"
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
