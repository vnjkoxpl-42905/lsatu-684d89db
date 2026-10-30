import { Lock } from "lucide-react";
import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { DestinationHeadingContext } from "@/contexts/DestinationHeadingContext";

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
 * A missing feature flag does not establish that the account was paused.
 * Keep the explanation neutral and offer only reachable next steps.
 */
export default function LockedModule({ staffOnly = false }: { staffOnly?: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const permissions = useUserPermissions();
  const canReachClassroom = permissions.has_classroom_access || permissions.is_admin;
  const canMessage = permissions.has_chat_access || permissions.is_admin;
  const canReachAttempts = pathname.startsWith("/practice/exams") && pathname !== "/practice/exams/attempts";
  const withinDestination = useContext(DestinationHeadingContext);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>

        {withinDestination
          ? <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">Not open yet</h2>
          : <h1 className="mb-2 text-xl font-semibold tracking-tight text-foreground">Not open yet</h1>}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {staffOnly
            ? "This section is available to Joshua and administrators only."
            : `This section isn't available to your account.${canMessage ? " If that looks wrong, message Joshua." : ""}`}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {canReachAttempts ? (
            <Button onClick={() => navigate("/practice/exams/attempts")}>
              View exam attempts
            </Button>
          ) : null}
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
