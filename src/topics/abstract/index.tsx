import { useAuth } from "@/contexts/AuthContext";
import { useBootcampProgress } from "@/hooks/useBootcampProgress";
import { ABSTRACT_BOOTCAMP_ID, completedModuleDays } from "./lib/progress";
import { AppProvider, useApp } from "./store/AppContext";
import { useEffect } from "react";
import { LECTURE_MODULES } from "./data/modules";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./components/views/Dashboard";
import ModuleView from "./components/views/ModuleView";
import LessonReader from "./components/views/LessonReader";
import DrillRunner from "./components/views/DrillRunner";
import { Flashcards } from "./components/views/Flashcards";
import { MethodsLibrary } from "./components/views/MethodsLibrary";
import TimedFinalSet from "./components/views/TimedFinalSet";
import CompletionReport from "./components/views/CompletionReport";
import "./styles/brutal.css";

export function ViewManager() {
  const { currentView, currentModuleId, openModule } = useApp();
  const retired = currentView === "module" && !LECTURE_MODULES.some((module) => module.id === currentModuleId);
  const retiredFinal = currentView === "timed_set" || currentView === "timed_final_set";
  useEffect(() => { if (retired || retiredFinal) openModule("m3"); }, [retired, retiredFinal, openModule]);
  if (retired || retiredFinal) return <Dashboard />;

  switch (currentView) {
    case "dashboard":
      return <Dashboard />;
    case "module":
      // Remount before rendering the new module. An effect reset happens too
      // late: a retained question index can exceed the new module's item count.
      return <ModuleView key={currentModuleId} />;
    case "lesson":
      return <LessonReader />;
    case "drill":
      return <DrillRunner />;
    case "flashcards":
      return <Flashcards />;
    case "methods_library":
      return <MethodsLibrary />;
    case "completion_report":
      return <CompletionReport />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-xl font-medium mb-2">Work In Progress</h2>
          <p>This section is part of the bootcamp but not fully built in this prototype view.</p>
        </div>
      );
  }
}

function HomeworkProgressSync() {
  const { user } = useAuth();
  const { bootcampState, loading, progressOwnerId } = useApp();
  useBootcampProgress({ bootcampId: ABSTRACT_BOOTCAMP_ID, completedDays: completedModuleDays(bootcampState), totalDays: 7, enabled: !loading && !!user && progressOwnerId === user.id });
  return null;
}

// AbstractBootcamp: LSATU mount component for /topics/abstract route.
// Wraps the brutalist bootcamp in a `.topic-abstract` scope so the cream
// paper background and 4px-border aesthetic stays scoped to this surface
// and does not leak into other LSATU dark-mode pages.
export default function AbstractBootcamp() {
  return (
    <div className="topic-abstract h-screen w-full">
      <AppProvider>
        <HomeworkProgressSync />
        <AppShell>
          <ViewManager />
        </AppShell>
      </AppProvider>
    </div>
  );
}
