import React from "react";
import { TopBar } from "../components/AppShell";
import { Icon } from "../components/Icon";

/** Courses: Spreeder shows this empty state when no class courses are assigned. */
export default function CoursesPage(): React.ReactElement {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="flex flex-col items-center justify-center px-5 pt-32 text-center">
        <Icon name="school" size={84} style={{ color: "var(--rc-text-2)" }} />
        <p className="mt-6 text-lg" style={{ color: "var(--rc-text)" }}>No curriculums or courses assigned to your class yet.</p>
      </div>
    </div>
  );
}
