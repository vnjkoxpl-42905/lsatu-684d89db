import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/useUserPermissions";

/**
 * What a student sees when a route's feature flag is false.
 *
 * It renders as ordinary stage content, not a full-viewport takeover: both
 * shells mount this inside their <Outlet/>, so `min-h-screen` plus a hard zinc
 * background painted a slab over the frame it is meant to sit inside. Tokens
 * only, so it reads in light and dark — the old `text-zinc-300` landed on the
 * outline variant's light `bg-background` and came out at 1.44:1.
 *
 * The old copy ("Premium Content Locked ... contact administration") named no
 * one and led nowhere. A locked door has to say who opens it.
 *
 * Two states, because "Revoke All Access" now turns off the classroom flag too.
 * One locked feature on an otherwise open account sends the student back to
 * their classroom. A revoked account has no classroom to go back to, so
 * offering the button would loop them straight onto this same screen.
 */
export default function LockedModule() {
  const navigate = useNavigate();
  const permissions = useUserPermissions();
  const canReachClassroom = permissions.has_classroom_access || permissions.is_admin;
  const canMessage = permissions.has_chat_access || permissions.is_admin;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          {canReachClassroom ? "Not open yet" : "Your access is paused"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {canReachClassroom
            ? "This part of the classroom isn't in your plan right now. If that looks wrong, send Joshua a message and he'll sort it out."
            : "Your account is still here and so is your work. Joshua has paused access for now. Reach out to him and he'll turn it back on."}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {canReachClassroom ? (
            <Button onClick={() => navigate("/classroom")}>
              Back to your classroom
            </Button>
          ) : null}
          {/* Only offered when the student can actually reach Messages.
              Otherwise the one next step we hand them is another locked door. */}
          {canMessage ? (
            <Button variant={canReachClassroom ? "outline" : "default"} onClick={() => navigate("/inbox")}>
              Message Joshua
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
