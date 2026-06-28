import { useRef, useEffect, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlus,
  IconHistory,
  IconSend,
  IconCopy,
  IconThumbUp,
  IconThumbDown,
  IconX,
  IconGavel,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useStudyChat } from "@/hooks/useStudyChat";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StudySidecarProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  presentation?: "floating" | "docked";
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block w-1 h-1 rounded-full bg-current opacity-60"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handle}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <IconCopy size={13} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  );
}

export default function StudySidecar({
  open,
  onClose,
  userName,
  presentation = "floating",
}: StudySidecarProps) {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    activeMessages,
    thinking,
    streamingContent,
    send,
  } = useStudyChat();

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, streamingContent]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    send(text, userName);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDocked = presentation === "docked";

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="study-sidecar"
          initial={isDocked ? { opacity: 0, x: 18 } : { x: "100%" }}
          animate={isDocked ? { opacity: 1, x: 0 } : { x: 0 }}
          exit={isDocked ? { opacity: 0, x: 18 } : { x: "100%" }}
          transition={
            isDocked
              ? { duration: 0.18, ease: [0.4, 0, 0.2, 1] }
              : { type: "spring", stiffness: 320, damping: 38 }
          }
          className={cn(
            "hidden md:flex w-96 flex-col overflow-hidden bg-background/95 backdrop-blur-md",
            isDocked
              ? "relative h-full shrink-0 rounded-xl border border-border/40 shadow-sm shadow-black/5"
              : "fixed right-0 top-0 z-40 h-svh border-l border-border/40 shadow-2xl shadow-black/20",
          )}
          aria-label="LSAT U assistant"
        >
          {/* Tab bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/30 py-1 mt-px">
            <div
              ref={tabsScrollRef}
              className="flex-1 min-w-0 overflow-x-auto no-scrollbar"
            >
              <div className="flex items-center gap-1 pl-2 pb-1 pt-0.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={cn(
                      "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                      tab.id === activeTabId
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center shrink-0 gap-0.5 px-1.5 pb-1 pt-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={addTab}
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    aria-label="New conversation"
                  >
                    <IconPlus size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">New conversation</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    aria-label="Conversation history"
                  >
                    <IconHistory size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">History</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onClose}
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    aria-label="Close LSAT U assistant"
                  >
                    <IconX size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Close</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {activeMessages.length === 0 && !thinking && !streamingContent && (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <IconGavel className="h-8 w-8 mb-2 text-foreground/80" />
                <p className="text-lg font-semibold text-foreground mb-1">LSAT U</p>
                <p className="text-xs max-w-[200px]">
                  Ask about question types, strategies, or your study plan.
                </p>
              </div>
            )}

            {activeMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/60 text-foreground rounded-tl-sm"
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === "assistant" && (
                    <div className="mt-1.5 flex items-center gap-0.5 -mb-0.5">
                      <CopyButton text={msg.content} />
                      <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                        <IconThumbUp size={13} />
                      </button>
                      <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                        <IconThumbDown size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {(thinking || streamingContent) && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                  {streamingContent ? (
                    <div className="whitespace-pre-wrap">{streamingContent}</div>
                  ) : (
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      Thinking
                      <ThinkingDots />
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-border/30 px-3 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-border/40 bg-muted/40 px-3 py-2 focus-within:border-border/70 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="How can I help?"
                className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-h-[20px] max-h-32 leading-5 py-0.5"
                style={{
                  height: "auto",
                  overflow: input.split("\n").length > 3 ? "auto" : "hidden",
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || thinking}
                className={cn(
                  "shrink-0 mb-0.5 rounded-lg p-1.5 transition-colors",
                  input.trim() && !thinking
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <IconSend size={15} />
              </button>
            </div>

          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
