import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";

// AskJoshuaFab: brutalist bottom-right CTA that drops the student into the
// existing /inbox 1:1 thread with Joshua. Renders only when the student
// actually has chat access so we don't expose an action they cannot
// complete (LSATU "no dead buttons" rule).
export default function AskJoshuaFab() {
  const navigate = useNavigate();
  const { has_chat_access, is_admin, loading } = useUserPermissions();

  if (loading) return null;
  if (!has_chat_access && !is_admin) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/inbox")}
      aria-label="Ask Joshua a question"
      className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-3 bg-brutal-yellow text-brutal-ink border-4 border-brutal-ink font-black uppercase tracking-[0.18em] text-xs brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_var(--brutal-ink)] transition-transform"
    >
      <MessageSquare className="w-4 h-4" aria-hidden="true" />
      Ask Joshua
    </button>
  );
}
