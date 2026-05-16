import type { BootcampDay } from '../../content/bootcamp/days';

/**
 * Daily cold-open block. Coach voice — pushy, specific, no fluff.
 * Drop cap on the lead, follow-up sits in italic to mark register break.
 */
export function CoachOpener({ day }: { day: BootcampDay }) {
  return (
    <section
      aria-label="Coach cold-open"
      className="mx-auto max-w-3xl px-6 pt-10"
    >
      <div className="protocol text-ink-mute">Coach</div>
      <p className="drop-cap mt-3 text-[1.15rem] leading-[1.65] text-ink">
        {day.coachOpener.lead}
      </p>
      <p className="mt-5 max-w-prose font-display text-xl italic leading-snug text-verdigris-deep">
        {day.coachOpener.followup}
      </p>
      <hr className="rule-line" />
    </section>
  );
}
