import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/hooks/useInbox";
import { formatParticipantName } from "@/lib/displayName";

export interface InboxPreviewCardProps {
  conversations: Conversation[];
  unreadCount: number;
}

function otherParticipant(conv: Conversation, selfId: string) {
  return conv.participants.find((p) => p.user_id !== selfId) ?? null;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function InboxPreviewCard({ conversations, unreadCount }: InboxPreviewCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rows = conversations.slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs uppercase tracking-widest">Inbox</span>
          {unreadCount > 0 && (
            <span
              className="rounded-full bg-foreground text-background px-1.5 py-[1px] font-medium"
              style={{ fontSize: 9, minWidth: 16, textAlign: "center" }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("/inbox")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all →
        </button>
      </div>

      <ul className="mt-2 divide-y divide-border/40">
        {rows.length === 0 && (
          <li className="py-3 text-xs text-muted-foreground">No conversations yet</li>
        )}
        {rows.map((conv) => {
          const other = user ? otherParticipant(conv, user.id) : null;
          const name = other
            ? formatParticipantName(other.display_name, other.is_admin)
            : conv.subject || "Conversation";
          const preview = conv.last_message?.body ?? "No messages yet";
          const time = conv.last_message?.created_at ?? conv.last_message_at ?? null;

          return (
            <li key={conv.id}>
              <button
                type="button"
                onClick={() => navigate(`/inbox/${conv.id}`)}
                className="w-full flex items-start gap-3 py-2 px-1 -mx-1 rounded-md text-left hover:bg-muted/40 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px] font-medium">
                    {initialsFor(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate flex-1">
                      {name}
                    </span>
                    {time && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(time), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {preview}
                    </span>
                    {conv.unread && (
                      <span
                        className="shrink-0 rounded-full bg-foreground"
                        style={{ width: 6, height: 6 }}
                        aria-label="Unread"
                      />
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
