import { AppProvider, useApp } from "./store/AppContext";
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

function ViewManager() {
  const { currentView } = useApp();

  switch (currentView) {
    case "dashboard":
      return <Dashboard />;
    case "module":
      return <ModuleView />;
    case "lesson":
      return <LessonReader />;
    case "drill":
      return <DrillRunner />;
    case "flashcards":
      return <Flashcards />;
    case "methods_library":
      return <MethodsLibrary />;
    case "timed_set":
      return <TimedFinalSet />;
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

// AbstractBootcamp: LSATU mount component for /topics/abstract route.
// Wraps the brutalist bootcamp in a `.topic-abstract` scope so the cream
// paper background and 4px-border aesthetic stays scoped to this surface
// and does not leak into other LSATU dark-mode pages.
export default function AbstractBootcamp() {
  return (
    <div className="topic-abstract h-screen w-full">
      <AppProvider>
        <AppShell>
          <ViewManager />
        </AppShell>
      </AppProvider>
    </div>
  );
}
