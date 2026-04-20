import { useNavigate } from "react-router-dom";
import { Inbox, Bell, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { useInbox } from "@/hooks/useInbox";

export default function FoyerDock() {
  const navigate = useNavigate();
  const { unreadCount } = useInbox();

  const buttonClass =
    "group relative flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 p-2 shadow-lg shadow-black/30 backdrop-blur-md"
      role="toolbar"
      aria-label="Foyer dock"
    >
      <button
        type="button"
        onClick={() => navigate("/inbox")}
        aria-label={
          unreadCount > 0 ? `Inbox, ${unreadCount} unread` : "Inbox"
        }
        className={buttonClass}
      >
        <Inbox className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => toast.info("Notifications coming soon")}
        aria-label="Notifications"
        className={buttonClass}
      >
        <Bell className="h-5 w-5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => toast.info("Help center coming soon")}
        aria-label="Help"
        className={buttonClass}
      >
        <LifeBuoy className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
