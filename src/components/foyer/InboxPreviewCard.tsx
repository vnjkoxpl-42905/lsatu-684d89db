import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/hooks/useInbox";
import { formatParticipantName } from "@/lib/displayName";

export interface InboxPreviewCardProps {
  conversations: Conversation[];
  unreadCount: number;
}

function otherPartyName(conv: Conversation, selfId: string): string | null {
  const other = conv.participants.find((p) => p.user_id !== selfId);
  if (!other) return null;
  return formatParticipantName(other.display_name, other.is_admin);
}

export default function InboxPreviewCard({ conversations, unreadCount }: InboxPreviewCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const latest = conversations[0] ?? null;

  const title = latest
    ? (latest.subject || (user ? otherPartyName(latest, user.id) : null) || "Conversation")
    : "Inbox";
  const snippet = latest?.last_message?.body ?? (latest ? "No messages yet" : "No threads yet");
  const time = latest?.last_message?.created_at ?? latest?.last_message_at ?? null;

  return (
    <button
      type="button"
      onClick={() => navigate(latest ? `/inbox/${latest.id}` : "/inbox")}
      className="w-full text-left rounded-md border border-border/60 px-[9px] py-[8px] hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Mail size={11} strokeWidth={1.6} />
          <span
            className="uppercase font-medium"
            style={{ fontSize: 10, letterSpacing: "0.16em" }}
          >
            Inbox
          </span>
        </div>
        {unreadCount > 0 ? (
          <span
            className="rounded-full bg-foreground text-background px-1.5 py-[1px] font-medium"
            style={{ fontSize: 9, minWidth: 16, textAlign: "center" }}
          >
            {unreadCount}
          </span>
        ) : null}
      </div>
      <div
        className="mt-1.5 font-medium text-foreground truncate"
        style={{ fontSize: 12 }}
      >
        {title}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-muted-foreground" style={{ fontSize: 11 }}>
          {snippet}
        </div>
        {time ? (
          <div className="shrink-0 text-muted-foreground" style={{ fontSize: 10 }}>
            {formatDistanceToNow(new Date(time), { addSuffix: false })}
          </div>
        ) : null}
      </div>
    </button>
  );
}
