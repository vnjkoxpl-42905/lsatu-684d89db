import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useInbox } from "@/hooks/useInbox";
import { cn } from "@/lib/utils";

const HIDDEN_ROUTES = ["/auth", "/onboarding", "/reset-password", "/drill"];
const DISMISS_KEY = "student-tutor-tip-dismissed";

/**
 * Bottom-left floating tutor entry point for students.
 * Tap to open the messaging surface with Joshua (the live tutor).
 * Hidden on auth screens. Mounted globally from App.tsx.
 */
export default function FloatingTutorButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authReady } = useAuth();
  const { is_admin, has_chat_access, loading: permsLoading } =
    useUserPermissions();
  const { unreadCount } = useInbox();

  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) {
        const t = setTimeout(() => setShowTip(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismissTip = () => {
    setShowTip(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!authReady || !user || permsLoading) return null;
  // Visible to anyone with chat access (and admins by the existing convention).
  if (!is_admin && !has_chat_access) return null;
  // Don't compete with the bootcamp tutor surface.
  if (location.pathname.startsWith("/bootcamp/")) return null;
  if (
    HIDDEN_ROUTES.some(
      (r) => location.pathname === r || location.pathname.startsWith(`${r}/`),
    )
  ) {
    return null;
  }

  const handleClick = () => {
    dismissTip();
    navigate("/inbox");
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Open AI tutor"
        title="Ask Joshua"
        className={cn(
          "relative h-12 w-12 rounded-full",
          "bg-foreground text-background",
          "shadow-lg shadow-black/15 border border-border",
          "flex items-center justify-center",
          "transition-transform hover:-translate-y-0.5 active:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <GraduationCap className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showTip && (
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-1.5 text-xs text-foreground shadow-md">
          <span>Stuck? Ask Joshua.</span>
          <button
            type="button"
            onClick={dismissTip}
            aria-label="Dismiss tip"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
