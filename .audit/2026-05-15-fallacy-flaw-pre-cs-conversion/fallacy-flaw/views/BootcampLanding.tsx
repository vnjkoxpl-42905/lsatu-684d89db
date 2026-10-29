import { Button } from '../components/ui/Button';
import { BootcampProgress } from '../components/bootcamp/BootcampProgress';
import { Mindmap } from '../components/bootcamp/Mindmap';
import { InfographicViewer } from '../components/bootcamp/InfographicViewer';
import { AudioOverview } from '../components/bootcamp/AudioOverview';
import { VideoOverview } from '../components/bootcamp/VideoOverview';
import type { DayId } from '../lib/store';

export function BootcampLanding({ onSelectDay }: { onSelectDay: (day: DayId) => void }) {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="protocol text-ink-mute">
              Module · Bootcamp · 6 days
            </div>
            <h1 className="mt-3 display-title text-5xl leading-[1.05] text-ink md:text-6xl">
              Flaw{' '}
              <span className="italic text-ink-mute">in</span>{' '}
              six days.
            </h1>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-soft">
              An intensive, coach-led path through the entire Flaw curriculum.
              Each day teaches a single move, weaves reps through the lesson,
              and ends with a calibration drill that tells you whether the move
              landed. Day 6 is live fire: a full mixed-difficulty drill whose
              misses seed your spaced-repetition queue.
            </p>
            <p className="mt-4 max-w-prose protocol text-ink-mute">
              The contract · &ge;80% on the Day 06 live-fire drill.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="verdict" onClick={() => onSelectDay(1)}>
                Begin · Day 01 · Hostile Mode &amp; the Key
              </Button>
              <Button variant="ghost" disabled>
                Self-paced approach instead
              </Button>
            </div>
          </div>
          <aside className="border-t border-rule-soft pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <div className="protocol text-ink-mute">House rules</div>
            <ul className="mt-3 space-y-3 text-[0.95rem] leading-snug text-ink-soft">
              <li>
                <span className="display-title text-ink">Calibrate, never gatekeep.</span>{' '}
                Every day is reachable from this page. The verdict tells you
                where you are. The choice to advance is yours.
              </li>
              <li>
                <span className="display-title text-ink">No streak guilt.</span>{' '}
                Re-runs are free. The bootcamp is a loop, not a ladder.
              </li>
              <li>
                <span className="display-title text-ink">Read with hostility.</span>{' '}
                Every stimulus, every day, hostile mode on. Day 01 teaches the
                switch.
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-rule px-6 py-10">
        <div className="protocol mb-3 text-ink-mute">6-day track</div>
        <BootcampProgress onSelectDay={onSelectDay} />
      </section>

      <section className="mx-auto max-w-6xl border-t border-rule-soft px-6 py-10">
        <details className="group border border-rule bg-paper-bright/40">
          <summary className="cursor-pointer list-none px-5 py-4 transition-colors hover:bg-paper-bright">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="protocol text-ink-mute">Optional · Deep-dive overview</div>
                <h2 className="mt-1 display-title text-2xl text-ink">
                  Listen first, or jump straight in
                </h2>
                <p className="mt-1 text-sm leading-snug text-ink-soft">
                  43 minutes of audio plus a video walkthrough that surveys all six days.
                  Listen at 1.25x if you are in a hurry, or skip and start Day 01 now.
                </p>
              </div>
              <span className="protocol text-xs text-ink-mute group-open:hidden">
                Expand
              </span>
              <span className="protocol hidden text-xs text-ink-mute group-open:inline">
                Collapse
              </span>
            </div>
          </summary>
          <div className="grid gap-6 border-t border-rule px-5 py-6">
            <AudioOverview />
            <VideoOverview />
          </div>
        </details>
      </section>

      <section className="mx-auto max-w-6xl border-t border-rule-soft px-6 py-10">
        <div className="protocol mb-2 text-ink-mute">Map of the module</div>
        <p className="mb-5 max-w-prose text-sm leading-snug text-ink-soft">
          Two ways to see the whole. The mindmap below expands every branch of
          the catalog. The infographic on the right is a one-pager you can
          screenshot and keep open while you drill.
        </p>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Mindmap />
          <InfographicViewer />
        </div>
      </section>
    </>
  );
}
