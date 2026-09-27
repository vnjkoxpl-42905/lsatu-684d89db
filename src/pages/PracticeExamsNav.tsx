import { NavLink } from "react-router-dom";

export function PracticeExamsNav({ basePath = "/testing" }: { basePath?: string }) {
  const views = [
    { to: basePath, label: "Practice Exams", end: true },
    { to: `${basePath}/exams`, label: "All Exams", end: false },
    { to: `${basePath}/attempts`, label: "Attempts", end: true },
  ];
  return (
    <nav className="practice-exams-nav" aria-label="Practice Exams pages">
      {views.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => isActive ? "practice-exams-nav-link active" : "practice-exams-nav-link"}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
