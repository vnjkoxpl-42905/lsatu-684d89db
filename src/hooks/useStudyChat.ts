import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface StudyTab {
  id: string;
  label: string;
  messages: ChatMessage[];
}

interface UseStudyChatResult {
  tabs: StudyTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  addTab: () => void;
  activeMessages: ChatMessage[];
  thinking: boolean;
  streamingContent: string;
  send: (text: string, userName?: string) => Promise<void>;
  clearActiveTab: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function makeTab(label: string): StudyTab {
  return { id: makeId(), label, messages: [] };
}

export function useStudyChat(): UseStudyChatResult {
  const [tabs, setTabs] = useState<StudyTab[]>(() => [makeTab("Chat 1")]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [thinking, setThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const activeMessages =
    tabs.find((t) => t.id === activeTabId)?.messages ?? [];

  const addTab = useCallback(() => {
    const newTab = makeTab(`Chat ${tabs.length + 1}`);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  const appendToTab = useCallback(
    (tabId: string, messages: ChatMessage[]) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, messages } : t))
      );
    },
    []
  );

  // Append a single message using the latest tab state, so a reply that lands
  // after the user cleared/edited the tab mid-stream does not clobber those
  // changes with a stale snapshot.
  const appendMessageToTab = useCallback(
    (tabId: string, message: ChatMessage) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, messages: [...t.messages, message] } : t
        )
      );
    },
    []
  );

  const clearActiveTab = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, messages: [] } : t))
    );
  }, [activeTabId]);

  const send = useCallback(
    async (text: string, userName?: string) => {
      if (!text.trim() || thinking) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const userMsg: ChatMessage = {
        id: makeId(),
        role: "user",
        content: text.trim(),
      };

      const currentTab = tabs.find((t) => t.id === activeTabId);
      if (!currentTab) return;

      const nextMessages = [...currentTab.messages, userMsg];
      appendToTab(activeTabId, nextMessages);
      setThinking(true);
      setStreamingContent("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Not authenticated");
        }

        const apiMessages = nextMessages.map(({ role, content }) => ({
          role,
          content,
        }));

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ messages: apiMessages, userName }),
            signal: abortRef.current.signal,
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";
        // Carry buffer: SSE frames routinely split across TCP chunks, so hold
        // the trailing partial line and only process complete lines.
        let buffer = "";

        const processLine = (line: string) => {
          if (!line.startsWith("data:")) return;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") return;
          try {
            const parsed = JSON.parse(raw);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              accumulated += delta;
              setStreamingContent(accumulated);
            }
          } catch {
            // skip malformed SSE line
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            processLine(line);
          }
        }
        // Flush any complete final line left in the buffer.
        if (buffer.length > 0) processLine(buffer);

        const assistantMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          content: accumulated,
        };

        appendMessageToTab(activeTabId, assistantMsg);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const errorMsg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          content:
            err instanceof Error
              ? `Something went wrong: ${err.message}`
              : "Something went wrong. Please try again.",
        };
        appendMessageToTab(activeTabId, errorMsg);
      } finally {
        setThinking(false);
        setStreamingContent("");
      }
    },
    [tabs, activeTabId, thinking, appendToTab, appendMessageToTab]
  );

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    activeMessages,
    thinking,
    streamingContent,
    send,
    clearActiveTab,
  };
}
