import type { ReactNode } from "react";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import { usePracticeRating } from "@/hooks/usePracticeRating";
import { MIN_RATED_ANSWERS } from "@/lib/practiceRating";
import { launchDrill } from "@/lib/drillLaunch";

export type RatingResult = Pick<ReturnType<typeof usePracticeRating>, "profile" | "loading" | "error"> & { refresh: () => unknown };

type OrbitProps = { onOpen: (route: string) => void; children?: ReactNode };

export function HomeRatingCard(props: OrbitProps) {
  return <HomeOrbitRating {...props} result={usePracticeRating()} />;
}

export function HomeOrbitRating({ result, onOpen, children }: OrbitProps & { result: RatingResult }) {
  const track = result.profile?.LR;
  const remaining = Math.max(0, MIN_RATED_ANSWERS - (track?.count ?? 0));

  return (
    <>
      <div className="student-orbit-rating">
        <span>LR rating</span>
        {result.loading ? <span role="status">Loading</span>
          : !result.profile ? <span>Unavailable</span>
          : remaining > 0 ? <span>{remaining} more {remaining === 1 ? "question" : "questions"}</span>
          : <strong>{Math.round(track.rating)}</strong>}
      </div>
      <div className="student-orbit-stage">
        {children}
        <button
          type="button"
          className="student-orbit-drill"
          aria-label="Start LR Smart Drill"
          onClick={() => onOpen(`/drill?${launchDrill({ kind: "smart-drill", options: { returnTo: "/classroom" } })}`)}
        >
          <LightningBoltIcon aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
