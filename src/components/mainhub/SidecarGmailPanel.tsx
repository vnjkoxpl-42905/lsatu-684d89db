import { useMemo, useState } from "react";
import { IconInbox, IconSend } from "@tabler/icons-react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGmailProfile,
  useGmailSend,
  useGmailThread,
  useGmailThreads,
} from "@/features/admin-inbox/gmail/hooks";
import { parseAddress } from "@/features/admin-inbox/gmail/api";
import { formatThreadDate } from "@/features/admin-inbox/gmail/utils/formatDate";
import { GmailMessageItem } from "@/features/admin-inbox/gmail/components/GmailMessageItem";

/**
 * Compact Gmail surface for the right-side sidecar. Mirrors the internal
 * messaging flow: thread list -> selected thread history -> gated reply box.
 * Truthful loading / empty / error / not-connected states; never fabricates
 * threads and never crashes when the connector is unavailable.
 */
export default function SidecarGmailPanel() {
  const profile = useGmailProfile();
  const adminEmail = profile.data?.emailAddress ?? null;
  const connected = profile.isSuccess;

  const threadsQuery = useGmailThreads({
    labelIds: ["INBOX"],
    maxResults: 25,
    enabled: connected,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const threadQuery = useGmailThread(activeId);

  // Connection gate — surface the real connector error, do not fake anything.
  if (profile.isError) {
    const message =
      profile.error instanceof Error ? profile.error.message : "Gmail isn't reachable right now.";
    return (
      <GmailNotice
        title="Gmail isn't connected"
        body={message}
        onRetry={() => void profile.refetch()}
      />
    );
  }

  if (profile.isLoading) {
    return <GmailCentered icon={<Loader2 className="h-4 w-4 animate-spin" />} label="Connecting to Gmail…" />;
  }

  if (activeId) {
    return (
      <GmailThreadView
        threadId={activeId}
        adminEmail={adminEmail}
        isLoading={threadQuery.isLoading}
        isError={threadQuery.isError}
        errorMessage={
          threadQuery.error instanceof Error ? threadQuery.error.message : undefined
        }
        messages={threadQuery.data?.messages ?? []}
        onBack={() => setActiveId(null)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-white text-foreground">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">Gmail</div>
          <div className="truncate text-[11px] text-zinc-500">
            {adminEmail ?? "Connected inbox"}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] text-foreground">
        {threadsQuery.isLoading ? (
          <GmailCentered icon={<Loader2 className="h-4 w-4 animate-spin" />} label="Loading Gmail…" dark={false} />
        ) : threadsQuery.isError ? (
          <GmailNotice
            inline
            title="Couldn't load Gmail"
            body={
              threadsQuery.error instanceof Error
                ? threadsQuery.error.message
                : "Gmail threads failed to load."
            }
            onRetry={() => void threadsQuery.refetch()}
          />
        ) : (threadsQuery.data?.threads.length ?? 0) === 0 ? (
          <GmailCentered icon={<IconInbox size={20} />} label="No Gmail threads." dark={false} />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {threadsQuery.data!.threads.map((t) => {
              const from = parseAddress(t.from);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-zinc-100"
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          t.unread ? "font-semibold text-zinc-900" : "font-medium text-zinc-600",
                        )}
                      >
                        {from.name || from.email}
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-400">
                        {formatThreadDate(t.internalDate ?? t.date)}
                      </span>
                      {t.unread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#18181b]" aria-label="Unread" />
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-zinc-600">
                      {t.subject || "(no subject)"}
                    </div>
                    <div className="truncate text-[11px] text-zinc-400">{t.snippet}</div>
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

function GmailThreadView({
  threadId,
  adminEmail,
  isLoading,
  isError,
  errorMessage,
  messages,
  onBack,
}: {
  threadId: string;
  adminEmail: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  messages: import("@/features/admin-inbox/gmail/api").GmailMessage[];
  onBack: () => void;
}) {
  const send = useGmailSend();
  const [body, setBody] = useState("");

  const last = messages[messages.length - 1];
  const subject = messages[0]?.subject ?? "(no subject)";
  const canSend = !!last && body.trim().length > 0 && !send.isPending;

  const replyTo = useMemo(() => (last ? parseAddress(last.from) : null), [last]);

  const handleSend = () => {
    if (!last) return;
    const refs = last.references
      ? `${last.references} ${last.messageIdHeader}`.trim()
      : last.messageIdHeader || undefined;
    const subjectBase = last.subject ?? subject ?? "";
    const replySubject = subjectBase.toLowerCase().startsWith("re:")
      ? subjectBase
      : `Re: ${subjectBase}`;
    send.mutate(
      {
        to: parseAddress(last.from).email || last.from,
        subject: replySubject,
        text: body,
        threadId,
        inReplyTo: last.messageIdHeader || undefined,
        references: refs,
      },
      { onSuccess: () => setBody("") },
    );
  };

  return (
    <div className="flex h-full flex-col bg-white text-foreground">
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-200 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Back to Gmail list"
        >
          <IconInbox size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900">{subject}</div>
          <div className="truncate text-[11px] text-zinc-500">
            {replyTo ? replyTo.name || replyTo.email : "Gmail thread"}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] text-foreground">
        {isLoading ? (
          <GmailCentered icon={<Loader2 className="h-4 w-4 animate-spin" />} label="Loading conversation…" dark={false} />
        ) : isError || !messages.length ? (
          <GmailNotice
            inline
            title="Couldn't load this thread"
            body={errorMessage ?? "The Gmail thread failed to load."}
            onRetry={onBack}
            retryLabel="Back to list"
          />
        ) : (
          messages.map((m, i) => (
            <GmailMessageItem
              key={m.id}
              message={m}
              isLatest={i === messages.length - 1}
              adminEmail={adminEmail}
            />
          ))
        )}
      </div>

      {!isLoading && !isError && messages.length ? (
        <div className="shrink-0 border-t border-zinc-200 bg-white px-3 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-zinc-300">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) handleSend();
                }
              }}
              rows={1}
              placeholder={replyTo ? `Reply to ${replyTo.name || replyTo.email}…` : "Write a reply…"}
              className="max-h-32 min-h-[20px] flex-1 resize-none bg-transparent py-0.5 text-sm leading-5 text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                "mb-0.5 shrink-0 rounded-lg p-1.5 transition-colors",
                canSend
                  ? "bg-[#18181b] text-white hover:bg-[#27272a]"
                  : "cursor-not-allowed text-zinc-300",
              )}
              aria-label="Send reply"
            >
              {send.isPending ? <Loader2 className="h-[15px] w-[15px] animate-spin" /> : <IconSend size={15} />}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GmailCentered({ icon, label, dark = true }: { icon: React.ReactNode; label: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-2 text-sm",
        dark ? "bg-white text-zinc-400" : "text-zinc-500",
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function GmailNotice({
  title,
  body,
  onRetry,
  retryLabel = "Try again",
  inline = false,
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        inline ? "h-full text-zinc-500" : "h-full bg-white",
      )}
    >
      <div className="rounded-full bg-zinc-100 p-3 text-zinc-500">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="mt-4 text-sm font-semibold text-zinc-900">{title}</div>
      {body ? (
        <div className="mt-1 max-w-[280px] text-xs leading-5 text-zinc-500">
          {body}
        </div>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
