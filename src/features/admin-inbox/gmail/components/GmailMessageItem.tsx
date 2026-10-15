import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { GmailMessage } from "../api";
import { parseAddress } from "../api";
import { formatMessageDate } from "../utils/formatDate";
import { GmailMessageBody } from "./GmailMessageBody";
import { GmailAttachmentCard } from "./GmailAttachmentCard";

interface GmailMessageItemProps {
  message: GmailMessage;
  isLatest: boolean;
  adminEmail: string | null;
}

function initialOf(displayName: string, email: string): string {
  const name = displayName?.trim();
  if (name && name !== email) return name[0]?.toUpperCase() ?? "?";
  return email[0]?.toUpperCase() ?? "?";
}

export function GmailMessageItem({ message, isLatest, adminEmail }: GmailMessageItemProps) {
  const [expanded, setExpanded] = useState(isLatest);
  const sender = parseAddress(message.from);
  const isFromMe = adminEmail && sender.email.toLowerCase() === adminEmail.toLowerCase();

  return (
    <div className="border-b border-border last:border-b-0">
      <div
        className={cn(
          "flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-muted/30",
          expanded ? "pb-1" : "pb-3",
        )}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            {initialOf(sender.name, sender.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">
              {isFromMe ? "me" : (sender.name || sender.email)}
            </span>
            {sender.name && sender.name !== sender.email ? (
              <span className="text-[11px] text-muted-foreground truncate">&lt;{sender.email}&gt;</span>
            ) : null}
            <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
              {formatMessageDate(message.internalDate ?? message.date)}
            </span>
          </div>
          {expanded ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              to {message.to || "(no recipient)"}{message.cc ? `, cc ${message.cc}` : ""}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{message.snippet}</p>
          )}
        </div>
        {!expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1.5" />
        ) : null}
      </div>

      {expanded ? (
        <div className="px-5 pb-5 pl-[68px]">
          <GmailMessageBody html={message.html} text={message.text} />
          {message.attachments.length ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {message.attachments.map((a) => (
                <GmailAttachmentCard
                  key={a.attachmentId}
                  messageId={message.id}
                  attachment={a}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
