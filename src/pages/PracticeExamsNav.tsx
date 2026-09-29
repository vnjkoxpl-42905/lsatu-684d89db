import { NavLink, useLocation } from "react-router-dom";

export function PracticeExamsNav({ basePath = "/practice/exams" }: { basePath?: string }) {
  const { pathname } = useLocation();
  const detail = pathname.match(new RegExp(`^${basePath}/(\\d+)/?$`));
  const views = [
    { to: basePath, label: "Practice Exams", end: true },
    { to: `${basePath}/all`, label: "All Exams", end: false },
    { to: `${basePath}/attempts`, label: "Attempts", end: true },
  ];
  return (
    <nav className="practice-exams-nav" aria-label="Practice Exams pages">
      {views.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => isActive || (label === "All Exams" && detail)
            ? "practice-exams-nav-link active"
            : "practice-exams-nav-link"}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
