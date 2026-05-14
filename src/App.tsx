import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrbitalActiveProvider } from "@/contexts/OrbitalActiveContext";

const queryClient = new QueryClient();
import { QuestionBankProvider } from "./contexts/QuestionBankContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdaptiveEngineProvider } from "./contexts/AdaptiveEngineContext";
import Practice from "./pages/Practice";
import SavedSets from "./pages/SavedSets";
import AcademyMainhub from "./pages/AcademyMainhub";
import Drill from "./pages/Drill";
import WrongAnswerJournal from "./pages/WrongAnswerJournal";
import FlaggedQuestions from "./pages/FlaggedQuestions";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import SettingsLayout from "./pages/SettingsLayout";
import Classroom from "./pages/Classroom";
import CausationStation from "./pages/CausationStation";

const AbstractTopicPage = React.lazy(() => import("./topics/abstract/AbstractTopicPage"));
import { ChapterLanding as AbstractChapterLanding } from "./topics/abstract/ChapterLanding";
import { SlotFiller as AbstractSlotFiller } from "./topics/abstract/components/SlotFiller";
import { FlashcardDeck as AbstractFlashcardDeck } from "./topics/abstract/components/FlashcardDeck";
import { ReferenceCardView as AbstractReferenceCardView } from "./topics/abstract/components/ReferenceCardView";
import { DrillRouter as AbstractDrillRouter } from "./topics/abstract/drills/DrillRouter";
import { MethodsLibrary as AbstractMethodsLibrary } from "./topics/abstract/MethodsLibrary";

import Schedule from "./pages/Schedule";
import Bootcamps from "./pages/Bootcamps";
import IntroToLrBootcamp from "./pages/IntroToLrBootcamp";
const PrincipleFlawBootcamp = React.lazy(() => import("./pages/PrincipleFlawBootcamp"));
const FallacyFlawBootcamp = React.lazy(() => import("./pages/FallacyFlawBootcamp"));
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
const Unsubscribe = React.lazy(() => import("./pages/Unsubscribe"));
import AdminDashboard from "./pages/AdminDashboard";
const AdminBoard = React.lazy(() => import("./pages/AdminBoard"));
const DriveFiles = React.lazy(() => import("./pages/admin/DriveFiles"));
const Homework = React.lazy(() => import("./pages/admin/Homework"));
const HomeworkNew = React.lazy(() => import("./pages/admin/HomeworkNew"));
const HomeworkDetail = React.lazy(() => import("./pages/admin/HomeworkDetail"));
const TeachingLibrary = React.lazy(() => import("./pages/admin/TeachingLibrary"));
const TAPage = React.lazy(() => import("./pages/admin/StudentHub"));
const AdminGuidedDrills = React.lazy(() => import("./pages/admin/GuidedDrills"));
const GuidedDrillStart = React.lazy(() => import("./pages/GuidedDrillStart"));
import AdminErrorBoundary from "./components/AdminErrorBoundary";
const ClassroomAssignmentDetail = React.lazy(() => import("./pages/ClassroomAssignmentDetail"));
const ClassroomTAAssignmentDetail = React.lazy(() => import("./pages/ClassroomTAAssignmentDetail"));
const ClassroomItem = React.lazy(() => import("./pages/ClassroomItem"));
const ClassroomUploads = React.lazy(() => import("./pages/ClassroomUploads"));
const ClassroomRecaps = React.lazy(() => import("./pages/ClassroomRecaps"));
const TeacherShell = React.lazy(() => import("./pages/teacher/TeacherShell"));
const TeacherToday = React.lazy(() => import("./pages/teacher/TeacherToday"));
const TeacherStudents = React.lazy(() => import("./pages/teacher/TeacherStudents"));
const TeacherStudentDetail = React.lazy(() => import("./pages/teacher/TeacherStudentDetail"));
const TeacherAITA = React.lazy(() => import("./pages/teacher/TeacherAITA"));
const TeacherWeeklyPlans = React.lazy(() => import("./pages/teacher/TeacherWeeklyPlans"));
const TeacherSchedule = React.lazy(() => import("./pages/teacher/TeacherSchedule"));
const TeacherSmartboard = React.lazy(() => import("./pages/teacher/TeacherSmartboard"));
const TeacherAssignments = React.lazy(() => import("./pages/teacher/TeacherAssignments"));
const TeacherAssignmentsOverview = React.lazy(() => import("./pages/teacher/TeacherAssignmentsOverview"));
const TeacherBootcamps = React.lazy(() => import("./pages/teacher/TeacherBootcamps"));
const TeacherUploads = React.lazy(() => import("./pages/teacher/TeacherUploads"));
const TeacherRecaps = React.lazy(() => import("./pages/teacher/TeacherRecaps"));
const TeacherAnalyticsBridge = React.lazy(() => import("./pages/teacher/TeacherAnalyticsBridge"));
const TeacherConversations = React.lazy(() => import("./pages/teacher/TeacherConversations"));
const TeacherLibrary = React.lazy(() => import("./pages/teacher/TeacherLibrary"));
const TeacherBootcampsHub = React.lazy(() => import("./pages/teacher/TeacherBootcampsHub"));
const TeacherBootcampDetail = React.lazy(() => import("./pages/teacher/TeacherBootcampDetail"));
const TeacherStudentBootcampDetail = React.lazy(() => import("./pages/teacher/TeacherStudentBootcampDetail"));
import Inbox from "./pages/Inbox";
import ProtectedRoute from "./components/ProtectedRoute";
import BootcampGate from "./components/hub/BootcampGate";
import { FloatingMessenger } from "./components/inbox/FloatingMessenger";
import { FloatingWhiteboard } from "./components/whiteboard/FloatingWhiteboard";
import { FloatingHelpButton } from "./components/help/FloatingHelpButton";
import GuidedTour from "./components/mainhub/GuidedTour";

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
    <AdaptiveEngineProvider>
    <OrbitalActiveProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth route - NO question bank needed */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<React.Suspense fallback={null}><Unsubscribe /></React.Suspense>} />

            {/* Onboarding. Username setup for new users. */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Mainhub. Needs QuestionBankProvider for the FIND node's picker. */}
            <Route path="/mainhub" element={
              <QuestionBankProvider><AcademyMainhub /></QuestionBankProvider>
            } />
            {/* Legacy redirect: /foyer was the original route; preserve deep links from older emails / bookmarks. */}
            <Route path="/foyer" element={<Navigate to="/mainhub" replace />} />

            {/* Admin Dashboard. No question bank needed. */}
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
            <Route path="/admin/guided-drills" element={
              <AdminErrorBoundary routeLabel="/admin/guided-drills">
                <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <QuestionBankProvider>
                    <AdminGuidedDrills />
                  </QuestionBankProvider>
                </React.Suspense>
              </AdminErrorBoundary>
            } />
            <Route path="/guided/:assignmentId" element={
              <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                <QuestionBankProvider>
                  <GuidedDrillStart />
                </QuestionBankProvider>
              </React.Suspense>
            } />

            {/* Inbox. Messaging, no question bank needed. */}
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
                  <Route path="/" element={<Navigate to="/mainhub" replace />} />
                  <Route path="/practice" element={
                    <ProtectedRoute flag="has_practice_access"><Practice /></ProtectedRoute>
                  } />
                  <Route path="/practice/sets" element={
                    <ProtectedRoute flag="has_practice_access"><SavedSets /></ProtectedRoute>
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
                  <Route path="/settings/layout" element={<SettingsLayout />} />
                  <Route path="/classroom" element={
                    <ProtectedRoute flag="has_classroom_access"><Classroom /></ProtectedRoute>
                  } />
                  <Route path="/classroom/uploads" element={
                    <ProtectedRoute flag="has_classroom_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ClassroomUploads />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/classroom/recaps" element={
                    <ProtectedRoute flag="has_classroom_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ClassroomRecaps />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/classroom/item/:itemId" element={
                    <ProtectedRoute flag="has_classroom_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ClassroomItem />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/teacher" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                        <TeacherShell />
                      </React.Suspense>
                    </ProtectedRoute>
                  }>
                    <Route index element={
                      <React.Suspense fallback={<div />}>
                        <TeacherAITA />
                      </React.Suspense>
                    } />
                    <Route path="ai-ta" element={<Navigate to="/teacher" replace />} />
                    <Route path="today" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherToday />
                      </React.Suspense>
                    } />
                    <Route path="students" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherStudents />
                      </React.Suspense>
                    } />
                    <Route path="students/:studentId" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherStudentDetail />
                      </React.Suspense>
                    } />
                    <Route path="conversations" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherConversations />
                      </React.Suspense>
                    } />
                    <Route path="schedule" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherSchedule />
                      </React.Suspense>
                    } />
                    <Route path="weekly-plans" element={<Navigate to="/teacher/schedule" replace />} />
                    <Route path="bootcamps" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherBootcampsHub />
                      </React.Suspense>
                    } />
                    <Route path="bootcamps/:topicId" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherBootcampDetail />
                      </React.Suspense>
                    } />
                    <Route path="bootcamps/:topicId/students/:studentId" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherStudentBootcampDetail />
                      </React.Suspense>
                    } />
                    <Route path="library" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherLibrary />
                      </React.Suspense>
                    }>
                      <Route path="assignments" element={
                        <React.Suspense fallback={<div />}><TeacherAssignmentsOverview /></React.Suspense>
                      } />
                      <Route path="assignments/new" element={
                        <React.Suspense fallback={<div />}><TeacherAssignments /></React.Suspense>
                      } />
                      <Route path="recaps" element={
                        <React.Suspense fallback={<div />}><TeacherRecaps /></React.Suspense>
                      } />
                      <Route path="uploads" element={
                        <React.Suspense fallback={<div />}><TeacherUploads /></React.Suspense>
                      } />
                      <Route path="bootcamps" element={
                        <React.Suspense fallback={<div />}><TeacherBootcamps /></React.Suspense>
                      } />
                      <Route path="smartboard" element={
                        <React.Suspense fallback={<div />}><TeacherSmartboard /></React.Suspense>
                      } />
                      <Route path="analytics" element={
                        <React.Suspense fallback={<div />}><TeacherAnalyticsBridge /></React.Suspense>
                      } />
                    </Route>
                    {/* legacy redirects */}
                    <Route path="assignments" element={<Navigate to="/teacher/library/assignments" replace />} />
                    <Route path="recaps" element={<Navigate to="/teacher/library/recaps" replace />} />
                    <Route path="uploads" element={<Navigate to="/teacher/library/uploads" replace />} />
                    <Route path="bootcamps" element={<Navigate to="/teacher/library/bootcamps" replace />} />
                    <Route path="smartboard" element={<Navigate to="/teacher/library/smartboard" replace />} />
                    <Route path="analytics-bridge" element={<Navigate to="/teacher/library/analytics" replace />} />
                  </Route>
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
                    <ProtectedRoute flag="has_bootcamp_access">
                      <BootcampGate routePath="/bootcamp/causation-station" title="Causation Station">
                        <CausationStation />
                      </BootcampGate>
                    </ProtectedRoute>
                  } />
                  {/* Retired bootcamp slugs. Bounce back to the bootcamp index so the
                      old "Structure" name can never be confused with the active bootcamp. */}
                  <Route path="/bootcamp/structure" element={<Navigate to="/bootcamps" replace />} />
                  <Route path="/bootcamp/structure/*" element={<Navigate to="/bootcamps" replace />} />
                  <Route path="/bootcamp/structure-v2" element={<Navigate to="/bootcamps" replace />} />
                  <Route path="/bootcamp/structure-v2/*" element={<Navigate to="/bootcamps" replace />} />
                  {/* Retired legacy Abstraction slug. New v2 topic lives at /topics/abstract. */}
                  <Route path="/bootcamp/abstraction" element={<Navigate to="/topics/abstract" replace />} />
                  <Route path="/bootcamp/abstraction/*" element={<Navigate to="/topics/abstract" replace />} />
                  <Route path="/topics/abstract" element={
                    <ProtectedRoute flag="has_bootcamp_access">
                      <BootcampGate
                        routePath="/topics/abstract"
                        bootcampIdOverride="abstraction"
                        legacyRoutePaths={["/bootcamp/abstraction"]}
                        title="Abstract"
                      >
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <AbstractTopicPage />
                        </React.Suspense>
                      </BootcampGate>
                    </ProtectedRoute>
                  }>
                    <Route index element={<AbstractChapterLanding />} />
                    <Route path="playground" element={<AbstractSlotFiller />} />
                    <Route path="methods" element={<AbstractMethodsLibrary />} />
                    <Route path="drills/:drillId" element={<AbstractDrillRouter />} />
                    <Route path="flashcards" element={<AbstractFlashcardDeck />} />
                    <Route path="reference/:cardId" element={<AbstractReferenceCardView />} />
                  </Route>
                  <Route path="/bootcamp/intro-to-lr/*" element={
                    <ProtectedRoute flag="has_bootcamp_access">
                      <BootcampGate routePath="/bootcamp/intro-to-lr" title="Intro to LR">
                        <IntroToLrBootcamp />
                      </BootcampGate>
                    </ProtectedRoute>
                  } />
                  <Route path="/bootcamp/principle-flaw" element={
                    <ProtectedRoute flag="has_bootcamp_access">
                      <BootcampGate routePath="/bootcamp/principle-flaw" title="Principle and Flaw">
                        <React.Suspense fallback={<div className="min-h-screen bg-[#030303]" />}>
                          <PrincipleFlawBootcamp />
                        </React.Suspense>
                      </BootcampGate>
                    </ProtectedRoute>
                  } />
                  <Route path="/bootcamp/fallacy-flaw" element={
                    <ProtectedRoute flag="has_bootcamp_access">
                      <BootcampGate routePath="/bootcamp/fallacy-flaw" title="Flaw and Famous Flaws">
                        <React.Suspense fallback={<div className="min-h-screen bg-[#FAF8F3]" />}>
                          <FallacyFlawBootcamp />
                        </React.Suspense>
                      </BootcampGate>
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QuestionBankProvider>
            } />
          </Routes>
          <FloatingMessenger />
          <FloatingWhiteboard />
          <FloatingHelpButton />
          <GuidedTour />
        </BrowserRouter>
      </TooltipProvider>
    </OrbitalActiveProvider>
    </AdaptiveEngineProvider>
    </UserSettingsProvider>
  </AuthProvider>
  </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
