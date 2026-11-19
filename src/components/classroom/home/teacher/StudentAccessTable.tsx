import { useId, useState } from "react";
import { TIER_LABELS, type ManagedUser } from "@/lib/adminUsers";
import { signupQueueRows } from "@/components/teacher/SignupQueue";
import { DeskStatus } from "./TeacherTasks";
import { eligibleAccounts } from "./TeacherAccessBooking";
import type { DeskRegion } from "./teachingDeskModel";

const dateLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function StudentAccessTable({ region, onEdit, onOpenRail, inRail = false }: {
  region: DeskRegion<ManagedUser[]>;
  onOpenRail?: (trigger: HTMLButtonElement) => void;
  inRail?: boolean;
  onEdit: (student: ManagedUser, trigger: HTMLButtonElement) => void;
}) {
  const headingId = useId();
  const [view, setView] = useState<"needs" | "all">("needs");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(6);
  const all = eligibleAccounts(region.data ?? []);
  const queue = signupQueueRows(all);
  const term = search.trim().toLowerCase();
  const rows = view === "needs" ? queue : all.filter((student) =>
    [student.display_name, student.email].some((value) => value?.toLowerCase().includes(term)),
  );
  return (
    <section id={inRail ? undefined : "home-student-access"} tabIndex={-1} className="obs-card obs-dark obs-student-access" aria-labelledby={headingId}>
      <header>
        <h2 id={headingId} className={inRail ? "sr-only" : undefined}>Student access</h2>
        {onOpenRail && <button type="button" className="obs-access-open-rail" aria-haspopup="dialog"
          onClick={(event) => onOpenRail(event.currentTarget)}>Open access panel <span aria-hidden="true">↗</span></button>}
        <div className="obs-access-views" role="group" aria-label="Student access view">
          <button type="button" aria-pressed={view === "needs"} onClick={() => { setView("needs"); setLimit(6); }}>
            Needs access{region.state === "ready" ? ` · ${queue.length}` : ""}
          </button>
          <button type="button" aria-pressed={view === "all"} onClick={() => { setView("all"); setLimit(6); }}>All students</button>
        </div>
      </header>
      <DeskStatus region={region} noun="student access" />
      {region.state === "ready" && <>
        {view === "all" && <input type="search" aria-label="Find a student" placeholder="Find a student"
          value={search} onChange={(event) => { setSearch(event.target.value); setLimit(6); }} />}
        {rows.length ? (
          <table aria-labelledby={headingId}>
            <thead><tr><th scope="col">Student</th><th scope="col">Access</th></tr></thead>
            <tbody>{rows.slice(0, limit).map((student) => {
              const name = student.display_name || student.email;
              const joined = student.created_at ? new Date(student.created_at) : null;
              return (
                <tr key={student.class_id}>
                  <th scope="row">
                    <span>{name}</span>
                    {student.display_name && <small>{student.email}</small>}
                    {view === "needs" && joined && !Number.isNaN(joined.valueOf()) && <small>Joined {dateLabel.format(joined)}</small>}
                  </th>
                  <td><button type="button" aria-label={`Edit access for ${name}`}
                    onClick={(event) => onEdit(student, event.currentTarget)}>
                    {student.access_tier ? TIER_LABELS[student.access_tier] : "Set access"} <span aria-hidden="true">↗</span>
                  </button></td>
                </tr>
              );
            })}</tbody>
          </table>
        ) : <p className="obs-access-empty">{view === "needs" ? "No students waiting for access." : "No matching students."}</p>}
        {rows.length > limit && <button className="obs-access-more" type="button" onClick={() => setLimit(limit + 12)}>Show more students</button>}
      </>}
    </section>
  );
}
