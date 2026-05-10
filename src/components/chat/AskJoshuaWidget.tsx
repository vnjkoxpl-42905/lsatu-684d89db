"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Brain,
  ChevronDown,
  Grid3x3,
  MessageSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Tutor {
  id: string;
  name: string;
  role: string;
  icon: React.ElementType;
  gradient: string;
  status: "online" | "busy";
}

const TUTORS: Tutor[] = [
  {
    id: "joshua",
    name: "Joshua",
    role: "Lead Instructor",
    icon: Brain,
    gradient: "from-amber-500/20 to-yellow-500/20",
    status: "online",
  },
  {
    id: "lr",
    name: "LR Tutor",
    role: "Logical Reasoning",
    icon: Sparkles,
    gradient: "from-blue-500/20 to-cyan-500/20",
    status: "online",
  },
  {
    id: "rc",
    name: "RC Tutor",
    role: "Reading Comp",
    icon: BookOpen,
    gradient: "from-emerald-500/20 to-teal-500/20",
    status: "online",
  },
  {
    id: "lg",
    name: "LG Tutor",
    role: "Logic Games",
    icon: Grid3x3,
    gradient: "from-purple-500/20 to-violet-500/20",
    status: "busy",
  },
];

interface ChatMessage {
  id: string;
  role: "tutor" | "user";
  text: string;
  agentId: string;
}

const STORAGE_OPEN = "askjoshua.open";
const STORAGE_AGENT = "askjoshua.agent";

function readStoredOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_OPEN) === "1";
  } catch {
    return false;
  }
}

function readStoredAgent(): string {
  if (typeof window === "undefined") return TUTORS[0].id;
  try {
    const v = window.localStorage.getItem(STORAGE_AGENT);
    if (v && TUTORS.some((t) => t.id === v)) return v;
  } catch {
    /* noop */
  }
  return TUTORS[0].id;
}

export default function AskJoshuaWidget() {
  const [isOpen, setIsOpen] = useState<boolean>(readStoredOpen);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(readStoredAgent);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  const currentAgent = TUTORS.find((t) => t.id === selectedAgentId) ?? TUTORS[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_OPEN, isOpen ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_AGENT, selectedAgentId);
    } catch {
      /* noop */
    }
  }, [selectedAgentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      text,
      agentId: currentAgent.id,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);
    // Stub: real wiring (Supabase edge function) is a follow-up.
    window.setTimeout(() => {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "tutor",
          text: "Thinking...",
          agentId: currentAgent.id,
        },
      ]);
    }, 600);
  };

  const panelSpring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 28 };

  const fabSpring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 22 };

  const StatusIcon = currentAgent.icon;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={reduce ? false : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={panelSpring}
            style={{ transformOrigin: "bottom right" }}
            className={cn(
              "absolute bottom-20 right-0 w-[380px] rounded-2xl overflow-hidden",
              "bg-white/95 backdrop-blur-xl",
              "border border-black/8 ring-1 ring-white/40",
              "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)]",
            )}
            role="dialog"
            aria-label={`Ask Joshua chat with ${currentAgent.name}`}
          >
            {/* Header */}
            <div
              className={cn(
                "relative flex items-center gap-3 px-4 py-3",
                "bg-stone-50",
              )}
            >
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0 bg-gradient-to-r opacity-40 pointer-events-none",
                  currentAgent.gradient,
                )}
              />
              <Avatar className="relative h-9 w-9 border border-black/10">
                <AvatarFallback className="bg-white text-stone-800">
                  <StatusIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-stone-900 truncate">
                    {currentAgent.name}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      currentAgent.status === "online" ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                </div>
                <div className="text-xs text-stone-500 truncate">{currentAgent.role}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="relative inline-flex h-7 w-7 items-center justify-center rounded-md text-stone-500 hover:text-stone-900 hover:bg-black/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Agent selector */}
            <div className="px-4 py-3 border-b border-black/5">
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger
                  className={cn(
                    "h-12 w-full rounded-xl border-black/10 bg-white",
                    "[&>svg]:hidden text-left",
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                        currentAgent.gradient,
                      )}
                    >
                      <StatusIcon className="h-4 w-4 text-stone-800" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-semibold text-stone-900 truncate">
                        {currentAgent.name}
                      </div>
                      <div className="text-xs text-stone-500 truncate">{currentAgent.role}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
                  </div>
                  <SelectValue className="hidden" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TUTORS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <SelectItem key={t.id} value={t.id} className="py-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-md flex items-center justify-center bg-gradient-to-br",
                              t.gradient,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 text-stone-800" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{t.name}</div>
                            <div className="text-xs text-stone-500">{t.role}</div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Chat area */}
            <div
              ref={scrollRef}
              className={cn(
                "h-[320px] overflow-y-auto px-4 py-4 space-y-3",
                "bg-gradient-to-b from-white to-stone-50/40",
              )}
            >
              <motion.div
                initial={reduce ? false : "hidden"}
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.04 } },
                }}
                className="space-y-3"
              >
                {messages.length === 0 && (
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 10, x: -10 },
                      show: { opacity: 1, y: 0, x: 0 },
                    }}
                    className="flex items-start gap-2.5"
                  >
                    <Avatar className="h-7 w-7 mt-0.5 shrink-0 border border-black/10">
                      <AvatarFallback className="bg-white text-stone-700">
                        <StatusIcon className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-stone-500 mb-0.5">{currentAgent.name}</div>
                      <div className="rounded-2xl rounded-tl-md bg-stone-100 text-stone-800 px-3.5 py-2 text-sm leading-relaxed inline-block max-w-[85%]">
                        Hi — I'm {currentAgent.name}. Ask me anything about{" "}
                        {currentAgent.role.toLowerCase()}.
                      </div>
                    </div>
                  </motion.div>
                )}

                {messages.map((m) => {
                  const agent = TUTORS.find((t) => t.id === m.agentId) ?? currentAgent;
                  const Icon = agent.icon;
                  if (m.role === "tutor") {
                    return (
                      <motion.div
                        key={m.id}
                        variants={{
                          hidden: { opacity: 0, y: 10, x: -10 },
                          show: { opacity: 1, y: 0, x: 0 },
                        }}
                        className="flex items-start gap-2.5"
                      >
                        <Avatar className="h-7 w-7 mt-0.5 shrink-0 border border-black/10">
                          <AvatarFallback className="bg-white text-stone-700">
                            <Icon className="h-3.5 w-3.5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-stone-500 mb-0.5">{agent.name}</div>
                          <div className="rounded-2xl rounded-tl-md bg-stone-100 text-stone-800 px-3.5 py-2 text-sm leading-relaxed inline-block max-w-[85%]">
                            {m.text}
                          </div>
                        </div>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div
                      key={m.id}
                      variants={{
                        hidden: { opacity: 0, y: 10, x: -10 },
                        show: { opacity: 1, y: 0, x: 0 },
                      }}
                      className="flex justify-end"
                    >
                      <div className="rounded-2xl rounded-tr-md bg-stone-900 text-white px-3.5 py-2 text-sm leading-relaxed max-w-[85%]">
                        {m.text}
                      </div>
                    </motion.div>
                  );
                })}

                {isThinking && (
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-7 w-7 mt-0.5 shrink-0 border border-black/10">
                      <AvatarFallback className="bg-white text-stone-700">
                        <StatusIcon className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl rounded-tl-md bg-stone-100 px-3.5 py-2.5 inline-flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-400 animate-bounce" />
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 border-t border-black/5 bg-white/80 backdrop-blur-md"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${currentAgent.name}…`}
                className={cn(
                  "flex-1 h-10 rounded-full border border-black/10 bg-white px-4 text-sm",
                  "text-stone-900 placeholder:text-stone-400",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:border-transparent",
                )}
                aria-label={`Message ${currentAgent.name}`}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isThinking}
                className="h-10 w-10 rounded-full bg-stone-900 hover:bg-stone-800 text-white"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={reduce ? undefined : { scale: 1.05 }}
        whileTap={reduce ? undefined : { scale: 0.95 }}
        animate={reduce ? undefined : { rotate: isOpen ? 90 : 0 }}
        transition={fabSpring}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        aria-expanded={isOpen}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center",
          "shadow-[0_8px_24px_-6px_rgba(0,0,0,0.25)] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
          isOpen
            ? "bg-destructive text-destructive-foreground"
            : "bg-[#E8D08B] text-[#1A1E2B] hover:bg-[#E8D08B]/90",
        )}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </motion.button>
    </div>
  );
}
