import * as Popover from "@radix-ui/react-popover";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import { usePracticeRating } from "@/hooks/usePracticeRating";
import { MIN_RATED_ANSWERS, type RatingProfile } from "@/lib/practiceRating";
import { launchDrill } from "@/lib/drillLaunch";

export type RatingResult = Pick<ReturnType<typeof usePracticeRating>, "profile" | "loading" | "error"> & { refresh: () => unknown };

/**
 * Home's Logical Reasoning practice rating, with Smart Drill one click away.
 * Smart Drill picks questions near this number, so the two live together.
 * Mounted only for students with drill access.
 */
export function HomeRatingCard({ onOpen }: { onOpen: (route: string) => void }) {
  return <HomeOrbitRating result={usePracticeRating()} onOpen={onOpen} />;
}

export function HomeOrbitRating({ result, onOpen }: { result: RatingResult; onOpen: (route: string) => void }) {
  const track = result.profile?.LR;
  const rating = !result.loading && track && track.count >= MIN_RATED_ANSWERS
    ? Math.round(track.rating)
    : "—";

  return (
    <Popover.Root>
      <Popover.Trigger className="student-orbit-rating">
        <span className="student-orbit-rating-readout">
          <span>LR rating</span>
          <strong>{rating}</strong>
        </span>
      </Popover.Trigger>
      <Popover.Content sideOffset={12} className="student-home-popover" aria-label="LR rating details">
        <HomeRatingCardView result={result} onOpen={onOpen} />
      </Popover.Content>
    </Popover.Root>
  );
}

export function HomeRatingCardView({ result, onOpen }: { result: RatingResult; onOpen: (route: string) => void }) {
  const { profile, loading, error, refresh } = result;
  const track: RatingProfile["LR"] | undefined = profile?.LR;
  const remaining = track ? Math.max(0, MIN_RATED_ANSWERS - track.count) : MIN_RATED_ANSWERS;
  const smartDrill = () =>
    onOpen(`/drill?${launchDrill({ kind: "smart-drill", options: { returnTo: "/classroom" } })}`);

  return (
    <section className="classroom-home-region classroom-home-rating" aria-label="Your LR rating">
      <header className="classroom-home-region-head">
        <h2>Your LR rating</h2>
      </header>

      {loading ? (
        <p className="classroom-home-state" role="status">Loading your rating…</p>
      ) : !profile ? (
        <p className="classroom-home-state" role="alert">
          Your rating could not be loaded.{" "}
          {error ? <button type="button" className="classroom-home-link" onClick={() => void refresh()}>Try again</button> : null}
        </p>
      ) : remaining > 0 ? (
        <>
          <p className="classroom-home-rating-pending">
            <strong>{remaining} more {remaining === 1 ? "question" : "questions"}</strong> until your rating appears
          </p>
          <div className="classroom-home-rating-bar" aria-hidden="true">
            <span style={{ width: `${(100 * (track?.count ?? 0)) / MIN_RATED_ANSWERS}%` }} />
          </div>
        </>
      ) : (
        <p className="classroom-home-rating-value">
          <strong>{Math.round(track.rating)}</strong>
          <span>from {track.count} first tries</span>
        </p>
      )}

      <p className="classroom-home-rating-explain">
        Only your first try on each question counts. Harder questions move the number more. Smart Drill picks questions near your rating.
      </p>

      <button type="button" className="classroom-home-rating-cta" onClick={smartDrill}>
        <LightningBoltIcon aria-hidden="true" />
        Start Smart Drill
      </button>
    </section>
  );
}
