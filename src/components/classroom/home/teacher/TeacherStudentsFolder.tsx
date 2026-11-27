import { useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { DeskStatus } from "./TeacherTasks";
import type { TeacherHomeModel } from "./teacherHomeModel";
import type { DeskRegion, DeskResult } from "./teachingDeskModel";
import "./teacher-students-folder.css";

interface TeacherStudentsFolderProps {
  roster: TeacherHomeModel["roster"];
  results: DeskRegion<DeskResult[]>;
  onOpen: (route: string) => void;
  onRetryRoster: () => void;
}

const FILE_COUNT = 3;
const BACK_PATH = "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z";
const FRONT_PATH = "M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 176A22 22 0 0 1 318 198L22 198A22 22 0 0 1 0 176Z";
const resultDate = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
});

function SectionResult({ result, onOpen }: { result: DeskResult; onOpen: () => void }) {
  const completed = Date.parse(result.completed_at);
  return (
    <li>
      <button type="button" className="teacher-student-result-link" onClick={onOpen}>
        <span>{result.title.replace(/^(PT\d+ · )(\d+)$/, "$1Section $2")} · {result.score ?? "Result available"}</span>
        {Number.isFinite(completed) && (
          <time dateTime={result.completed_at}>{resultDate.format(completed)}</time>
        )}
      </button>
    </li>
  );
}

export function TeacherStudentsFolder({ roster, results, onOpen, onRetryRoster }: TeacherStudentsFolderProps) {
  const id = useId();
  const folderTrigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const files = roster.recent.slice(0, FILE_COUNT);
  const previousStudent = roster.recent.find((student) => student.id === selectedId);
  const selected = previousStudent ?? files[0];
  if (previousStudent && !files.some((student) => student.id === previousStudent.id)) {
    files[FILE_COUNT - 1] = previousStudent;
  }
  const selectedResults = results.data?.filter((result) => result.student_id === selected?.id) ?? [];
  const filesId = id + "-files";
  const frontClipId = id + "-front";

  return (
    <div className="teacher-students-folder">
      {roster.refreshFailed && (
        <p className="teacher-student-folder-status" role="status">
          Could not refresh student activity. <button type="button" onClick={onRetryRoster}>Retry</button>
        </p>
      )}
      <div className="teacher-students-folder-body">
        {/* The folder silhouettes and verdant palette come from Joshua's saved Glass Folder Cards. */}
        <div
          className="teacher-student-folder"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !open || !selected) return;
            event.stopPropagation();
            setOpen(false);
            folderTrigger.current?.focus();
          }}
        >
          <svg width="0" height="0" className="teacher-student-folder-defs" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id={frontClipId} clipPathUnits="objectBoundingBox">
                <path d={FRONT_PATH} transform="scale(.0029411765 .0050505051)" />
              </clipPath>
              <linearGradient id={id + "-verdant"} x1="0" x2="1" y1="0" y2="1" gradientUnits="objectBoundingBox">
                <stop stopColor="#173024" />
                <stop offset=".22" stopColor="#4f7a5a" />
                <stop offset=".35" stopColor="#141812" />
                <stop offset=".55" stopColor="#e9cf87" />
                <stop offset=".72" stopColor="#a7843a" />
                <stop offset="1" stopColor="#fbf3d6" />
              </linearGradient>
            </defs>
          </svg>
          <svg className="teacher-student-folder-back" viewBox="0 0 340 272" aria-hidden="true" focusable="false">
            <path d={BACK_PATH} fill={`url(#${id}-verdant)`} />
          </svg>
          <button
            type="button"
            className="teacher-student-folder-front"
            style={{ clipPath: `url("#${frontClipId}")` }}
            ref={folderTrigger}
            aria-label="Students folder"
            aria-controls={filesId}
            aria-expanded={open && Boolean(selected)}
            disabled={!selected}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="teacher-student-folder-caption">
              <span>Students</span>
              {selected && <small>{files.length} {files.length === 1 ? "student" : "students"}</small>}
            </span>
            {selected && <ChevronDown size={16} aria-hidden="true" />}
          </button>
          <ul
            id={filesId}
            className="teacher-student-folder-files"
            aria-label="Recently active students"
            hidden={!open || !selected}
          >
            {files.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  className="teacher-student-folder-file"
                  aria-pressed={selected?.id === student.id}
                  onClick={() => setSelectedId(student.id)}
                >
                  <span>{student.name}</span>
                  {selected?.id === student.id && <Check size={17} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="teacher-student-folder-detail">
          {roster.state === "error" ? (
            <p className="teacher-student-folder-status" role="alert">
              Student activity is unavailable. <button type="button" onClick={onRetryRoster}>Retry</button>
            </p>
          ) : roster.state === "loading" ? (
            <p className="teacher-student-folder-status" role="status">Loading student activity…</p>
          ) : selected ? (
            <>
              <div className="teacher-student-folder-detail-heading" aria-live="polite">
                <h3>{selected.name}</h3>
                <p>{selected.activityLabel}</p>
              </div>
              <h4>Recent sections</h4>
              <DeskStatus region={results} noun="section results" setupLabel="Section results are not connected." />
              {results.state === "ready" && (
                <div className="teacher-student-folder-results">
                  {selectedResults.length ? (
                    <ul>
                      {selectedResults.map((result) => (
                        <SectionResult
                          key={result.id}
                          result={result}
                          onOpen={() => onOpen(`${selected.route}/work`)}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p>This student does not appear in the latest classroom results.</p>
                  )}
                </div>
              )}
              <div className="teacher-student-folder-links">
                <button type="button" onClick={() => onOpen(selected.route)}>Open student</button>
                <button type="button" onClick={() => onOpen(`${selected.route}/work`)}>View all work</button>
              </div>
            </>
          ) : (
            <p className="teacher-student-folder-status">No student activity to show.</p>
          )}
        </div>
      </div>
    </div>
  );
}
