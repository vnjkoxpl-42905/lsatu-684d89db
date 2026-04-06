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
import Profile from "./pages/Profile";
import Classroom from "./pages/Classroom";
import CausationStation from "./pages/CausationStation";
import MainConclusionRole from "./pages/MainConclusionRole";
import Schedule from "./pages/Schedule";
import Bootcamps from "./pages/Bootcamps";
import NotFound from "./pages/NotFound";

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

            {/* Foyer — arrival layer, no question bank needed */}
            <Route path="/foyer" element={<AcademyFoyer />} />

            {/* All other routes - wrapped with QuestionBankProvider */}
            <Route path="/*" element={
              <QuestionBankProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/foyer" replace />} />
                  <Route path="/drill" element={<Drill />} />
                  <Route path="/waj" element={<WrongAnswerJournal />} />
                  <Route path="/flagged" element={<FlaggedQuestions />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/classroom" element={<Classroom />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/bootcamps" element={<Bootcamps />} />
                  <Route path="/bootcamp/causation-station" element={<CausationStation />} />
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
