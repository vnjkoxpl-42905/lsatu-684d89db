import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppShell, useAppTheme } from "./components/AppShell";
import LibraryPage from "./pages/LibraryPage";
import ReaderPage from "./pages/ReaderPage";
import ProfilePage from "./pages/ProfilePage";
import TagsPage from "./pages/TagsPage";
import CoursesPage from "./pages/CoursesPage";
import AdminPassagesPage from "./pages/AdminPassagesPage";
import "./reading-center.css";

export default function ReadingCenter() {
  useAppTheme();
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
        <Route element={<AppShell />}>
          <Route index element={<LibraryPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="tags/:tag" element={<LibraryPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="stats" element={<Navigate to="../profile" replace />} />
          <Route path="manage" element={<ProtectedRoute requireAdmin><AdminPassagesPage /></ProtectedRoute>} />
        </Route>
        <Route path="read/:slug" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/reading-center" replace />} />
      </Routes>
    </div>
  );
}
