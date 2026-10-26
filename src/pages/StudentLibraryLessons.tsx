import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useFirstAnswerProgress } from "@/hooks/useFirstAnswerProgress";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { firstAnswerDetails } from "@/lib/firstAnswerDetails";
import { launchDrill } from "@/lib/drillLaunch";

const TOPIC = "Main Conclusion";
const DRILL_PATH = `/drill?${launchDrill({
  kind: "filter",
  count: 5,
  qtypes: [TOPIC],
  options: { label: TOPIC, returnTo: "/library/lessons" },
})}`;

function MainConclusionEvidence() {
  const { ledger, loading, error, resolution, refresh } = useFirstAnswerProgress("all");
  const row = useMemo(() => {
    if (!ledger) return null;
    return firstAnswerDetails(ledger.answers, "all", new Date().toISOString())
      .topics.find((topic) => topic.topic === TOPIC) ?? null;
  }, [ledger]);

  if (loading) return <p role="status">Loading your saved Main Conclusion answers…</p>;
  if (resolution.state === "denied") return <p>Your answer record is unavailable to this account.</p>;
  if (error || !ledger || ledger.coverage.includedSources.length === 0) {
    return <p role="alert">Your saved answers could not be loaded. <button type="button" className="underline" onClick={() => void refresh()}>Retry</button></p>;
  }

  return (
    <>
      {ledger.coverage.missingSources.length > 0 && <p>Some answer sources are unavailable. These counts use available saved answers only.</p>}
      {row ? (
        <p><strong>{row.correct} of {row.denominator}</strong> distinct Main Conclusion questions correct on your first saved graded answer{row.percent === null ? "." : ` (${row.percent}%).`}</p>
      ) : <p>No saved first answers with a Main Conclusion label yet.</p>}
      <Link to="/progress/topics" className="font-medium underline">See all your LR topics</Link>
    </>
  );
}

function LibraryLink({ to, title, description, available }: { to: string; title: string; description: string; available: boolean }) {
  const content = <><strong>{title}</strong><span>{description}</span><span aria-hidden="true">{available ? "Open ↗" : <Lock size={14} />}</span></>;
  return available
    ? <Link to={to} className="student-destination-link-card">{content}</Link>
    : <div className="student-destination-link-card student-destination-link-locked" aria-disabled="true" title={`${title} is locked for your account`}>{content}</div>;
}

/** First written topic hub pilot. The teaching text is drawn from Intro to LR Lesson 2. */
export default function StudentLibraryLessons() {
  const permissions = useUserPermissions();
  const canDrill = !permissions.loading && (permissions.is_admin || permissions.has_drill_access);
  const canSeeProgress = !permissions.loading && (permissions.is_admin || permissions.has_analytics_access);
  const canSeeAssigned = !permissions.loading && (permissions.is_admin || permissions.has_classroom_access);

  return (
    <div className="min-w-0 space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="library-topic-title">
        <div className="border-b border-border bg-[var(--classroom-drill-page)] px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Logical Reasoning · Written lesson</p>
          <h2 id="library-topic-title" className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">Main Conclusion</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground">Find the author’s point by separating the claim from the reasons offered for it.</p>
        </div>
        <div className="grid gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(230px,1fr)]">
          <div className="min-w-0 space-y-5">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Joshua’s rule</h3>
              <p className="mt-2 font-serif text-xl leading-relaxed text-foreground">First decide whether the stimulus is an argument at all. If it is, separate the supporting reasons from the claim they are trying to prove.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Worked example</h3>
              <blockquote className="mt-2 rounded-lg bg-muted/50 p-4 font-serif text-base leading-relaxed text-foreground">“The city should extend library hours, because evening attendance has increased steadily for three years and nearby branches with longer hours serve more students after school.”</blockquote>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-3"><dt className="font-semibold">Conclusion</dt><dd className="mt-1">The city should extend library hours.</dd></div>
                <div className="rounded-lg bg-muted/50 p-3"><dt className="font-semibold">Supporting reasons</dt><dd className="mt-1">Evening attendance has increased; nearby branches with longer hours serve more students after school.</dd></div>
              </dl>
            </div>
            <p className="text-xs text-muted-foreground">From Intro to LR, Lesson 2: Argument Anatomy.</p>
          </div>
          <aside className="min-w-0 space-y-4 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-label="Main Conclusion next steps">
            <div>
              <h3 className="font-semibold text-foreground">Try the idea</h3>
              <p className="mt-1 text-sm text-muted-foreground">Practice Main Conclusion questions, then review your first answers here.</p>
            </div>
            {canDrill ? <Link to={DRILL_PATH} className="inline-flex min-h-11 items-center justify-center rounded-md bg-foreground px-5 py-2 text-sm font-semibold text-background">Practice this topic</Link>
              : <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Lock size={14} /> Drills are locked for your account.</p>}
            <div className="border-t border-border pt-4 text-sm text-muted-foreground">
              <h4 className="mb-2 font-semibold text-foreground">Your saved evidence</h4>
              {canSeeProgress ? <MainConclusionEvidence /> : <p>Topic progress is locked for your account.</p>}
            </div>
          </aside>
        </div>
      </section>
      <section className="student-destination-links" aria-labelledby="library-more-title">
        <h2 id="library-more-title">Keep studying</h2>
        <p>Open the written exercises and programs available to your account.</p>
        <div className="student-destination-link-grid">
          <LibraryLink to="/library/activities" title="Activities" description="Short exercises assigned to your account." available={canSeeAssigned} />
          <LibraryLink to="/library/bootcamps" title="Bootcamps" description="Focused programs assigned to your account." available={canSeeAssigned} />
        </div>
      </section>
    </div>
  );
}
