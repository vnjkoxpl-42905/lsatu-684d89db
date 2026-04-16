import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import MainConclusionRole from "./pages/MainConclusionRole";
import Abstraction from "./pages/Abstraction";
import Schedule from "./pages/Schedule";
import Bootcamps from "./pages/Bootcamps";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => (
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

            {/* Foyer — arrival layer, no question bank needed */}
            <Route path="/foyer" element={<AcademyFoyer />} />

            {/* Admin Dashboard — no question bank needed */}
            <Route path="/admin" element={<AdminDashboard />} />

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
                  <Route path="/schedule" element={
                    <ProtectedRoute flag="has_schedule_access"><Schedule /></ProtectedRoute>
                  } />
                  <Route path="/bootcamps" element={
                    <ProtectedRoute flag="has_bootcamp_access"><Bootcamps /></ProtectedRoute>
                  } />
                  <Route path="/bootcamp/causation-station" element={
                    <ProtectedRoute flag="has_bootcamp_access"><CausationStation /></ProtectedRoute>
                  } />
                  <Route path="/bootcamp/main-conclusion-role" element={
                    <ProtectedRoute flag="has_bootcamp_access"><MainConclusionRole /></ProtectedRoute>
                  } />
                  <Route path="/bootcamp/abstraction" element={
                    <ProtectedRoute flag="has_bootcamp_access"><Abstraction /></ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QuestionBankProvider>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserSettingsProvider>
  </AuthProvider>
  </ThemeProvider>
);

export default App;
