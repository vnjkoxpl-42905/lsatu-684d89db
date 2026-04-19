import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

export interface InboxPreviewCardProps {
  // Push-1: stub. Push-2 wires to useInbox().
  href?: string;
}

export default function InboxPreviewCard({ href = "/inbox" }: InboxPreviewCardProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
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
      </div>
      <div className="mt-1.5 font-medium text-foreground" style={{ fontSize: 12 }}>
        No messages
      </div>
      <div className="truncate text-muted-foreground" style={{ fontSize: 11 }}>
        Placeholder preview
      </div>
    </button>
  );
}
