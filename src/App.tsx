import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
import { QuestionBankProvider } from "./contexts/QuestionBankContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AcademyFoyer from "./pages/AcademyFoyer";
import Drill from "./pages/Drill";
import WrongAnswerJournal from "./pages/WrongAnswerJournal";
import FlaggedQuestions from "./pages/FlaggedQuestions";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Classroom from "./pages/Classroom";
import CausationStation from "./pages/CausationStation";

import Abstraction from "./pages/Abstraction";
import Structure from "./pages/Structure";
import Schedule from "./pages/Schedule";
import Bootcamps from "./pages/Bootcamps";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
const AdminBoard = React.lazy(() => import("./pages/AdminBoard"));
const DriveFiles = React.lazy(() => import("./pages/admin/DriveFiles"));
const Homework = React.lazy(() => import("./pages/admin/Homework"));
const HomeworkNew = React.lazy(() => import("./pages/admin/HomeworkNew"));
const HomeworkDetail = React.lazy(() => import("./pages/admin/HomeworkDetail"));
const TeachingLibrary = React.lazy(() => import("./pages/admin/TeachingLibrary"));
const TAPage = React.lazy(() => import("./pages/admin/StudentHub"));
import AdminErrorBoundary from "./components/AdminErrorBoundary";
const ClassroomAssignmentDetail = React.lazy(() => import("./pages/ClassroomAssignmentDetail"));
const ClassroomTAAssignmentDetail = React.lazy(() => import("./pages/ClassroomTAAssignmentDetail"));
import Inbox from "./pages/Inbox";
import ProtectedRoute from "./components/ProtectedRoute";
import { FloatingMessenger } from "./components/inbox/FloatingMessenger";

// Module-scope remount counter (ID-9 diagnosis). Lets us detect whether the
// React root is remounting (e.g. from a service-worker replace) vs its child
// providers re-initializing.
let APP_MOUNT_COUNT = 0;

const App = () => {
  React.useEffect(() => {
    APP_MOUNT_COUNT += 1;
    console.log('[App mount]', { count: APP_MOUNT_COUNT });
    return () => {
      console.log('[App unmount]', { count: APP_MOUNT_COUNT });
    };
  }, []);
  return (
  <QueryClientProvider client={queryClient}>
  <ThemeProvider>
  <AuthProvider>
    <UserSettingsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth route - NO question bank needed */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Onboarding — username setup for new users */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Foyer — needs QuestionBankProvider for the FIND node's picker */}
            <Route path="/foyer" element={
              <QuestionBankProvider><AcademyFoyer /></QuestionBankProvider>
            } />

            {/* Admin Dashboard — no question bank needed */}
            <Route path="/admin" element={
              <AdminErrorBoundary routeLabel="/admin"><AdminDashboard /></AdminErrorBoundary>
            } />
            <Route path="/admin/board" element={
              <ProtectedRoute flag="has_classroom_access">
                <AdminErrorBoundary routeLabel="/admin/board">
                  <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <AdminBoard />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/drive-files" element={
              <AdminErrorBoundary routeLabel="/admin/drive-files">
                <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                  <DriveFiles />
                </React.Suspense>
              </AdminErrorBoundary>
            } />
            <Route path="/admin/homework" element={
              <AdminErrorBoundary routeLabel="/admin/homework">
                <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                  <Homework />
                </React.Suspense>
              </AdminErrorBoundary>
            } />
            <Route path="/admin/homework/new" element={
              <AdminErrorBoundary routeLabel="/admin/homework/new">
                <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                  <QuestionBankProvider>
                    <HomeworkNew />
                  </QuestionBankProvider>
                </React.Suspense>
              </AdminErrorBoundary>
            } />
            <Route path="/admin/homework/:setId" element={
              <AdminErrorBoundary routeLabel="/admin/homework/:setId">
                <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                  <QuestionBankProvider>
                    <HomeworkDetail />
                  </QuestionBankProvider>
                </React.Suspense>
              </AdminErrorBoundary>
            } />
            <Route path="/admin/library" element={
              <ProtectedRoute flag="has_ta_access">
                <AdminErrorBoundary routeLabel="/admin/library">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <TeachingLibrary />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/ta" element={
              <ProtectedRoute flag="has_ta_access">
                <AdminErrorBoundary routeLabel="/admin/ta">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <TAPage />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />

            {/* Inbox — messaging, no question bank needed */}
            <Route path="/inbox" element={
              <ProtectedRoute flag="has_chat_access"><Inbox /></ProtectedRoute>
            } />
            <Route path="/inbox/:conversationId" element={
              <ProtectedRoute flag="has_chat_access"><Inbox /></ProtectedRoute>
            } />

            {/* All other routes - wrapped with QuestionBankProvider */}
            <Route path="/*" element={
              <QuestionBankProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/foyer" replace />} />
                  <Route path="/practice" element={
                    <ProtectedRoute flag="has_practice_access"><Home /></ProtectedRoute>
                  } />
                  <Route path="/drill" element={
                    <ProtectedRoute flag="has_drill_access"><Drill /></ProtectedRoute>
                  } />
                  <Route path="/waj" element={
                    <ProtectedRoute flag="has_waj_access"><WrongAnswerJournal /></ProtectedRoute>
                  } />
                  <Route path="/flagged" element={
                    <ProtectedRoute flag="has_flagged_access"><FlaggedQuestions /></ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute flag="has_analytics_access"><Analytics /></ProtectedRoute>
                  } />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/classroom" element={
                    <ProtectedRoute flag="has_classroom_access"><Classroom /></ProtectedRoute>
                  } />
                  <Route path="/classroom/ta/:assignmentId" element={
                    <ProtectedRoute flag="has_classroom_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ClassroomTAAssignmentDetail />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/classroom/:assignmentId" element={
                    <ProtectedRoute flag="has_classroom_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ClassroomAssignmentDetail />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/schedule" element={
                    <ProtectedRoute flag="has_schedule_access"><Schedule /></ProtectedRoute>
                  } />
                  <Route path="/bootcamps" element={
                    <ProtectedRoute flag="has_bootcamp_access"><Bootcamps /></ProtectedRoute>
                  } />
                  <Route path="/bootcamp/causation-station" element={
                    <ProtectedRoute flag="has_bootcamp_access"><CausationStation /></ProtectedRoute>
                  } />
                  <Route path="/bootcamp/main-conclusion-role" element={<Navigate to="/bootcamp/structure" replace />} />
                  <Route path="/bootcamp/abstraction" element={
                    <ProtectedRoute flag="has_bootcamp_access"><Abstraction /></ProtectedRoute>
                  } />
                  <Route path="/bootcamp/structure" element={
                    <ProtectedRoute flag="has_bootcamp_access"><Structure /></ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QuestionBankProvider>
            } />
          </Routes>
          <FloatingMessenger />
        </BrowserRouter>
      </TooltipProvider>
    </UserSettingsProvider>
  </AuthProvider>
  </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
