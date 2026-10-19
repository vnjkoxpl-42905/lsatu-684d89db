import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import ReadingCenterGate from "@/components/ReadingCenterGate";
import { ReadingCenterRrcGate } from "@/components/AssignmentGate";
import { AppShell, useAppTheme } from "./components/AppShell";
import LibraryPage from "./pages/LibraryPage";
import ReaderPage from "./pages/ReaderPage";
import ProfilePage from "./pages/ProfilePage";
import TagsPage from "./pages/TagsPage";
import CoursesPage from "./pages/CoursesPage";
import AdminPassagesPage from "./pages/AdminPassagesPage";
import ReadingCenterHome from "./pages/ReadingCenterHome";
import RrcPage from "./pages/RrcPage";
import RcRecallPage from "./rc-recall/RcRecallPage";
import RcTrainingInstructions from "./rc-recall/RcTrainingInstructions";
import "./reading-center.css";

/** Hub pages are gated by the Reading Center grant, inside the shared shell. */
const hub = (page: ReactNode) => <ReadingCenterGate embedded>{page}</ReadingCenterGate>;

export default function ReadingCenter() {
  const { pathname } = useLocation();
  useAppTheme(pathname.startsWith('/reading-center/read/'));
  useEffect(() => {
    const fonts = document.createElement("link");
    fonts.rel = "stylesheet";
    fonts.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Fira+Mono&family=Material+Icons&display=swap";
    document.head.appendChild(fonts);
    return () => fonts.remove();
  }, []);
  return (
    <div id="reading-center-root" className="rc-root" data-rc-theme="light">
      <Routes>
        {/* One shell for every destination, so moving between LR and RC keeps the sidebar in place.
            Each page keeps its own access check; sharing the shell grants nothing. */}
        <Route element={<AppShell />}>
          <Route index element={hub(<ReadingCenterHome />)} />
          <Route path="rc-recall" element={hub(<RcRecallPage />)} />
          <Route path="rc-recall/instructions" element={hub(<RcTrainingInstructions />)} />
          <Route path="speed-reading" element={hub(<LibraryPage />)} />
          <Route path="tags" element={hub(<TagsPage />)} />
          <Route path="tags/:tag" element={hub(<LibraryPage />)} />
          <Route path="courses" element={hub(<CoursesPage />)} />
          <Route path="profile" element={hub(<ProfilePage />)} />
          <Route path="stats" element={<Navigate to="../profile" replace />} />
          <Route path="manage" element={hub(<ProtectedRoute requireAdmin><AdminPassagesPage /></ProtectedRoute>)} />
          <Route path="rrc" element={<ReadingCenterRrcGate embedded><RrcPage /></ReadingCenterRrcGate>} />
        </Route>
        <Route path="read/:slug" element={<ReadingCenterGate><ReaderPage /></ReadingCenterGate>} />
        <Route path="*" element={<Navigate to="/reading-center" replace />} />
      </Routes>
    </div>
  );
}
