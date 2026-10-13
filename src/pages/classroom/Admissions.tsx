import * as React from "react";
import { GraduationCap, Search } from "lucide-react";
import {
  ADMISSIONS_CYCLE,
  ADMISSIONS_SOURCE,
  SCHOOL_ADMISSIONS,
  findAdmissionsFor,
  searchAdmissions,
  standingFor,
  type SchoolAdmissions,
} from "@/data/schoolAdmissions";
import type { OnboardingAnswers } from "@/lib/onboarding";

/**
 * Admissions: what every accredited law school's admitted class actually looked
 * like, and where a student's own number sits against it.
 *
 * The point is not a ranking. It is the honest read a student cannot get from
 * a forum thread: half of the class that enrolled scored between these two
 * numbers, and here is which side of that you are on today. Nothing here
 * predicts an outcome, and the page says so rather than implying one.
 */

const BAND_COPY: Record<string, { label: string; tone: string }> = {
  above75: { label: "Above their 75th", tone: "admissions-band-strong" },
  at75: { label: "At their 75th", tone: "admissions-band-strong" },
  between: { label: "Inside their range", tone: "admissions-band-mid" },
  below25: { label: "Under their 25th", tone: "admissions-band-low" },
};

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export function AdmissionsView({
  score,
  targetSchools,
}: {
  /** The student's own LSAT, when we know one. */
  score: number | null;
  /** The schools they named in setup, pinned above the rest. */
  targetSchools: string[];
}) {
  const [query, setQuery] = React.useState("");

  const results = React.useMemo(() => searchAdmissions(query), [query]);

  // Their own schools lead, in the order they chose them, and are not repeated
  // in the list below.
  const pinned = React.useMemo(() => {
    const found = targetSchools
      .map((name) => findAdmissionsFor(name))
      .filter((school): school is SchoolAdmissions => !!school);
    // A student can name the same university twice under two law-school names.
    return [...new Map(found.map((school) => [school.name, school])).values()];
  }, [targetSchools]);

  const pinnedNames = new Set(pinned.map((s) => s.name));
  const rest = query ? results : results.filter((s) => !pinnedNames.has(s.name));

  return (
    <section className="classroom-admissions" aria-label="Admissions">
      <header className="classroom-admissions-head">
        <div>
          <h1>Admissions</h1>
          <p>
            Every accredited law school's {ADMISSIONS_CYCLE.toLowerCase()}, from the{" "}
            {ADMISSIONS_SOURCE}. Half of the students who enrolled scored between a
            school's 25th and 75th. These are the classes that got in, not cutoffs:
            people get in under a median every year, and get turned down above one.
          </p>
        </div>
        {score ? (
          <p className="classroom-admissions-score">
            Measured against <strong>{score}</strong>
          </p>
        ) : null}
      </header>

      <div className="classroom-orientation-search">
        <Search size={15} aria-hidden="true" />
        <input
          className="classroom-orientation-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a school or a state"
          aria-label="Search schools"
        />
      </div>

      {pinned.length > 0 && !query ? (
        <>
          <h2 className="classroom-admissions-section">
            <GraduationCap size={15} aria-hidden="true" />
            Your schools
          </h2>
          <AdmissionsTable rows={pinned} score={score} />
        </>
      ) : null}

      <h2 className="classroom-admissions-section">
        {query ? `${rest.length} matching` : "Every school, by LSAT median"}
      </h2>
      {rest.length === 0 ? (
        <p className="classroom-admissions-empty">Nothing matches "{query}".</p>
      ) : (
        <AdmissionsTable rows={rest} score={score} />
      )}
    </section>
  );
}

function AdmissionsTable({
  rows,
  score,
}: {
  rows: SchoolAdmissions[];
  score: number | null;
}) {
  return (
    <div className="classroom-admissions-scroll">
      <table className="classroom-admissions-table">
        <thead>
          <tr>
            <th scope="col">School</th>
            <th scope="col" className="classroom-admissions-num">25th</th>
            <th scope="col" className="classroom-admissions-num">Median</th>
            <th scope="col" className="classroom-admissions-num">75th</th>
            <th scope="col" className="classroom-admissions-num">GPA</th>
            <th scope="col" className="classroom-admissions-num">Accepted</th>
            {score ? <th scope="col">You</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((school) => {
            const band = score ? standingFor(score, school) : null;
            return (
              <tr key={school.name}>
                <th scope="row">
                  <span className="classroom-admissions-name">{school.name}</span>
                  <span className="classroom-admissions-state">{school.state}</span>
                </th>
                <td className="classroom-admissions-num">{school.lsat25 ?? "—"}</td>
                <td className="classroom-admissions-num classroom-admissions-median">
                  {school.lsat50}
                </td>
                <td className="classroom-admissions-num">{school.lsat75 ?? "—"}</td>
                <td className="classroom-admissions-num">{school.gpa50?.toFixed(2) ?? "—"}</td>
                <td className="classroom-admissions-num">
                  {formatPercent(school.acceptanceRate)}
                </td>
                {score ? (
                  <td>
                    <span className={`classroom-admissions-band ${BAND_COPY[band!].tone}`}>
                      {BAND_COPY[band!].label}
                    </span>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The score to measure against: what they are aiming for if they have said,
 * otherwise where they are now. A band is stored, so its top is used — a
 * student aiming at "166-170" is working towards 170.
 */
export function scoreFromAnswers(answers: OnboardingAnswers): number | null {
  const band = answers.target_score_band ?? answers.last_score_band;
  if (!band || band === "not_sure" || band === "not_taken") return null;
  if (band === "lte_150") return 150;
  const top = band.split("_")[1];
  const parsed = Number(top);
  return Number.isFinite(parsed) ? parsed : null;
}
