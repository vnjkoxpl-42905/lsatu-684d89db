import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, Send, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { useTAChat, type TABackend, type TAInteraction } from "@/hooks/useTAChat";
import { useInspector } from "@/hooks/useInspector";
import InspectorReport from "@/components/inspector/InspectorReport";
import ActionCard from "./ActionCard";
import type { ActionProposal } from "@/lib/agentActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import DraftCard from "./DraftCard";
import SlashCommandPalette from "./SlashCommandPalette";
import MentionStudentPalette from "./MentionStudentPalette";
import TypingDots from "./TypingDots";
import AttachmentBar from "./AttachmentBar";
import { SLASH_COMMANDS, filterSlashCommands, type SlashCommand } from "./slashCommands";
import { getCurrentComposerToken, replaceComposerToken } from "./composerTokens";
import {
  commandRequiresComingSoon,
  normalizeTACommand,
  type ComposerMention,
} from "./commandNormalization";
import { useTAStudents, type TAStudentRow } from "@/hooks/useTAStudents";

interface Props {
  /** null = global agent thread; student resolved by name from the message. */
  studentId: string | null;
  studentName?: string | null;
  /** "ta-chat" (default) = per-student draft workflow. "ta-agent" = action agent. */
  backend?: TABackend;
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

export default function TAChatView({ studentId, studentName, backend = "ta-chat" }: Props) {
  const { interactions, isLoading, error, send, confirmAction, cancelAction, clearThread } =
    useTAChat(studentId, backend);
  const inspect = useInspector();
  const [inspectOpen, setInspectOpen] = useState(false);
  const [input, setInput] = useState("");
  const [caret, setCaret] = useState(0);
  const [mentions, setMentions] = useState<ComposerMention[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: students = [] } = useTAStudents();

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

  const currentToken = useMemo(
    () => getCurrentComposerToken(input, caret),
    [input, caret],
  );

  const filtered = paletteOpen
    ? filterSlashCommands(currentToken.text.startsWith("/") ? currentToken.text.slice(1) : "")
    : SLASH_COMMANDS;

  const mentionCandidates = useMemo(() => {
    const q = currentToken.text.startsWith("@")
      ? currentToken.text.slice(1).toLowerCase()
      : "";
    const named = students.filter((student) => student.display_name?.trim());
    if (!q) return named.slice(0, 8);
    return named
      .filter((student) =>
        (student.display_name ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [currentToken.text, students]);

  const commandPreview = useMemo(
    () =>
      input.trim()
        ? normalizeTACommand({
            text: input,
            backend,
            mentions,
            students,
          })
        : null,
    [backend, input, mentions, students],
  );

  const focusComposer = (nextCaret: number) => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
      setCaret(nextCaret);
    });
  };

  const applyCommand = (cmd: SlashCommand, mode: "replace-token" | "replace-all" = "replace-token") => {
    const next =
      mode === "replace-token"
        ? replaceComposerToken(input, currentToken, cmd.prefill)
        : { value: cmd.prefill, caret: cmd.prefill.length };
    setInput(next.value);
    setCaret(next.caret);
    setPaletteOpen(false);
    setMentionOpen(false);
    setPaletteIndex(0);
    focusComposer(next.caret);
  };

  const applyMention = (student: TAStudentRow) => {
    const displayName = student.display_name?.trim() || "Student";
    const token = `@${displayName.split(/\s+/)[0] ?? displayName}`;
    const next = replaceComposerToken(input, currentToken, token);
    setInput(next.value);
    setCaret(next.caret);
    setMentions((prev) => [
      ...prev.filter((m) => m.studentId !== student.class_id),
      { studentId: student.class_id, displayName, token },
    ]);
    setMentionOpen(false);
    setPaletteOpen(false);
    setMentionIndex(0);
    focusComposer(next.caret);
  };

  const updatePaletteState = (next: string, nextCaret: number) => {
    const token = getCurrentComposerToken(next, nextCaret);
    if (token.text.startsWith("/") && !token.text.slice(1).includes(" ")) {
      setPaletteOpen(true);
      setMentionOpen(false);
      setPaletteIndex(0);
      return;
    }
    if (token.text.startsWith("@") && !token.text.slice(1).includes(" ")) {
      setMentionOpen(true);
      setPaletteOpen(false);
      setMentionIndex(0);
      return;
    }
    setPaletteOpen(false);
    setMentionOpen(false);
  };

  const handleInputChange = (next: string, nextCaret: number) => {
    setInput(next);
    setCaret(nextCaret);
    updatePaletteState(next, nextCaret);
  };

  const handleSend = async (text?: string) => {
    const source = (text ?? input).trim();
    const normalizedIntent =
      text != null
        ? null
        : normalizeTACommand({ text: source, backend, mentions, students });
    if (normalizedIntent && commandRequiresComingSoon(normalizedIntent)) {
      toast.info("That command is coming soon. No action was taken.");
      return;
    }
    const msg = (normalizedIntent?.sendText ?? source).trim();
    if (!msg || send.isPending || inspect.isPending) return;

    // /clear wipes this conversation instead of sending anything to the model.
    if (/^\/clear\b/i.test(msg)) {
      if (!text) {
        setInput("");
        setMentions([]);
      }
      setPaletteOpen(false);
      setMentionOpen(false);
      setInspectOpen(false);
      try {
        await clearThread.mutateAsync();
        toast.success("Conversation cleared");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not clear the conversation");
      }
      return;
    }


    // /inspect routes to the Platform Inspector instead of the TA chat. The
    // structured report renders in an overlay so the persisted ta_interactions
    // thread stays focused on student work.
    const inspectMatch = msg.match(/^\/inspect\b\s*(.*)$/is);
    if (inspectMatch) {
      const target = inspectMatch[1].trim();
      if (!target) {
        toast.error("Name what to inspect, e.g. /inspect Negation Station");
        return;
      }
      if (!text) setInput("");
      setPaletteOpen(false);
      setInspectOpen(true);
      try {
        await inspect.mutateAsync({ target });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Inspection failed");
      }
      return;
    }

    try {
      await send.mutateAsync(msg);
      if (!text) setInput("");
      if (!text) setMentions([]);
      setPaletteOpen(false);
      setMentionOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
  };

  const handleRevise = async (instructions: string) => {
    await handleSend(`Revise the draft: ${instructions}`);
  };

  const handleConfirmAction = async (
    interactionId: string,
    proposal: ActionProposal,
  ) => {
    const res = await confirmAction.mutateAsync({ interactionId, proposal });
    toast.success(res.summary);
  };

  const handleCancelAction = async (interactionId: string) => {
    await cancelAction.mutateAsync(interactionId);
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
    if (mentionOpen && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        applyMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
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
          {studentId ? "Student" : "Agent"}
        </div>
        <div className="text-sm font-medium text-zinc-100 truncate">
          {studentId
            ? studentName?.trim() || "Unnamed student"
            : "Resolve students by name — e.g. “assign Negation Station to Maya”"}
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
            if (i.action_proposal && i.role === "assistant") {
              return (
                <div key={i.id} className="flex justify-start">
                  <div className="max-w-[85%] space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-1">
                      TA
                    </div>
                    <div className="rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words bg-zinc-800 text-zinc-100">
                      {i.message}
                    </div>
                    <ActionCard
                      interactionId={i.id}
                      proposal={i.action_proposal}
                      actionStatus={i.action_status}
                      onConfirm={handleConfirmAction}
                      onCancel={handleCancelAction}
                      onPick={(label) => handleSend(label)}
                    />
                  </div>
                </div>
              );
            }
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
        {studentId && (
          <AttachmentBar studentId={studentId} studentName={studentName} />
        )}

        {showChips && (
          <div className="flex flex-wrap gap-1.5">
            {SLASH_COMMANDS.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => applyCommand(cmd, "replace-all")}
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
            caret={caret}
            open={paletteOpen}
            activeIndex={paletteIndex}
            onActiveIndexChange={setPaletteIndex}
            onSelect={applyCommand}
            onClose={() => setPaletteOpen(false)}
          />
          <MentionStudentPalette
            value={input}
            caret={caret}
            open={mentionOpen}
            activeIndex={mentionIndex}
            onActiveIndexChange={setMentionIndex}
            onSelect={applyMention}
            onClose={() => setMentionOpen(false)}
          />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value, e.target.selectionStart)}
            onSelect={(e) => {
              const nextCaret = e.currentTarget.selectionStart;
              setCaret(nextCaret);
              updatePaletteState(e.currentTarget.value, nextCaret);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask the TA · / for commands · @ for students"
            rows={1}
            style={{ height: `${TEXTAREA_MIN_PX}px` }}
            className="resize-none flex-1 leading-relaxed"
            disabled={send.isPending}
          />
          <Button
            onClick={() => handleSend()}
            disabled={send.isPending || inspect.isPending || !input.trim()}
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
        {commandPreview?.preview && (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-[12px] text-zinc-300">
            <span className="text-zinc-500">TA understands: </span>
            <span className="text-zinc-100">{commandPreview.preview}</span>
            {commandRequiresComingSoon(commandPreview) && (
              <span className="ml-2 rounded-full border border-zinc-700 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                Coming soon
              </span>
            )}
          </div>
        )}
      </div>

      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-100">
              <ScanSearch className="h-4 w-4 text-zinc-400" />
              Platform Inspector
            </DialogTitle>
          </DialogHeader>
          {inspect.isPending ? (
            <div className="flex items-center justify-center gap-2 py-12 text-zinc-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Exploring the codebase and sampling data…
            </div>
          ) : inspect.data ? (
            <InspectorReport report={inspect.data} />
          ) : (
            <div className="py-8 text-center text-sm text-zinc-500">
              Nothing to show.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
