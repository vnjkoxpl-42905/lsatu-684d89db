import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrbitalActiveProvider } from "@/contexts/OrbitalActiveContext";

const queryClient = new QueryClient();
import { QuestionBankProvider } from "./contexts/QuestionBankContext";
import { AuthProvider } from "./contexts/AuthContext";
import { UserSettingsProvider } from "./contexts/UserSettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AdaptiveEngineProvider } from "./contexts/AdaptiveEngineContext";
import { usePresenceHeartbeat } from "./hooks/usePresenceHeartbeat";

function PresenceHeartbeatMount() {
  usePresenceHeartbeat();
  return null;
}
// Heavy student/bootcamp routes are code-split so they stay out of the initial
// entry chunk (COMPREHENSIVEAUDIT Phase 3). A single top-level Suspense boundary
// (below, around <Routes>) provides the fallback for all of these.
const Practice = React.lazy(() => import("./pages/Practice"));
import SavedSets from "./pages/SavedSets";
const AcademyMainhub = React.lazy(() => import("./pages/AcademyMainhub"));
const Drill = React.lazy(() => import("./pages/Drill"));
import FlaggedQuestions from "./pages/FlaggedQuestions";
const Analytics = React.lazy(() => import("./pages/Analytics"));
const Auth = React.lazy(() => import("./pages/Auth"));
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import SettingsLayout from "./pages/SettingsLayout";
import Classroom from "./pages/Classroom";
const CausationStation = React.lazy(() => import("./pages/CausationStation"));

// Abstract v2.0: brutalist bootcamp port. All sub-views (lessons, methods,
// drills, flashcards, gauntlet, final set) are switched internally by the
// bootcamp's ViewManager keyed off AppContext.currentView, so the route is
// a single mount with no nested children.
const AbstractBootcamp = React.lazy(() => import("./topics/abstract"));

import Schedule from "./pages/Schedule";
import Booking from "./pages/Booking";
import Bootcamps from "./pages/Bootcamps";
const IntroToLrBootcamp = React.lazy(() => import("./pages/IntroToLrBootcamp"));
const PrincipleFlawBootcamp = React.lazy(() => import("./pages/PrincipleFlawBootcamp"));
const FallacyFlawBootcamp = React.lazy(() => import("./pages/FallacyFlawBootcamp"));
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
const Unsubscribe = React.lazy(() => import("./pages/Unsubscribe"));
// Hoisted out of render (were inline React.lazy(...) in the route element, which
// recreated the lazy component every render). COMPREHENSIVEAUDIT Phase 3.
const Trust = React.lazy(() => import("./pages/Trust"));
const OAuthConsent = React.lazy(() => import("./pages/OAuthConsent"));
const AdminBoard = React.lazy(() => import("./pages/AdminBoard"));
const DriveFiles = React.lazy(() => import("./pages/admin/DriveFiles"));
const Homework = React.lazy(() => import("./pages/admin/Homework"));
const HomeworkNew = React.lazy(() => import("./pages/admin/HomeworkNew"));
const HomeworkDetail = React.lazy(() => import("./pages/admin/HomeworkDetail"));
const TeachingLibrary = React.lazy(() => import("./pages/admin/TeachingLibrary"));
const TAPage = React.lazy(() => import("./pages/admin/StudentHub"));
const AdminGuidedDrills = React.lazy(() => import("./pages/admin/GuidedDrills"));
const BootcampReferenceLab = React.lazy(() => import("./pages/admin/BootcampReferenceLab"));
const AdminIntroLr = React.lazy(() => import("./pages/admin/IntroLr"));
const AdminInspector = React.lazy(() => import("./pages/admin/Inspector"));
const LsatKnowledgeImport = React.lazy(() => import("./pages/LsatKnowledgeImport"));
const GuidedDrillStart = React.lazy(() => import("./pages/GuidedDrillStart"));
const Journal = React.lazy(() => import("./pages/Journal"));
const ActivityCentre = React.lazy(() => import("./pages/ActivityCentre"));
const ActivityRunner = React.lazy(() => import("./features/activity-centre/components/ActivityRunner"));

import AdminErrorBoundary from "./components/AdminErrorBoundary";
const ClassroomAssignmentDetail = React.lazy(() => import("./pages/ClassroomAssignmentDetail"));
const ClassroomTAAssignmentDetail = React.lazy(() => import("./pages/ClassroomTAAssignmentDetail"));
const ClassroomItem = React.lazy(() => import("./pages/ClassroomItem"));
const ClassroomUploads = React.lazy(() => import("./pages/ClassroomUploads"));
const ClassroomRecaps = React.lazy(() => import("./pages/ClassroomRecaps"));
const TeacherShell = React.lazy(() => import("./pages/teacher/TeacherShell"));
const TeacherDeskPreview = React.lazy(() => import("./pages/teacher/TeacherDeskPreview"));
const TeacherToday = React.lazy(() => import("./pages/teacher/TeacherToday"));
const TeacherStudentDetail = React.lazy(() => import("./pages/teacher/TeacherStudentDetail"));
const TeacherAITA = React.lazy(() => import("./pages/teacher/TeacherAITA"));
const TeacherWeeklyPlans = React.lazy(() => import("./pages/teacher/TeacherWeeklyPlans"));
const TeacherSchedule = React.lazy(() => import("./pages/teacher/TeacherSchedule"));
const TeacherSmartboard = React.lazy(() => import("./pages/teacher/TeacherSmartboard"));
const TeacherConversations = React.lazy(() => import("./pages/teacher/TeacherConversations"));
const TeacherBootcampsHub = React.lazy(() => import("./pages/teacher/TeacherBootcampsHub"));
const TeacherBootcampDetail = React.lazy(() => import("./pages/teacher/TeacherBootcampDetail"));
const TeacherStudentBootcampDetail = React.lazy(() => import("./pages/teacher/TeacherStudentBootcampDetail"));
const TeacherTemplates = React.lazy(() => import("./pages/teacher/TeacherTemplates"));
const BootcampReferences = React.lazy(() => import("./pages/teacher/BootcampReferences"));
const TutorCorpus = React.lazy(() => import("./pages/teacher/TutorCorpus"));
const TeacherSessionIngest = React.lazy(() => import("./pages/teacher/TeacherSessionIngest"));

const BootcampReferenceDetail = React.lazy(() => import("./pages/teacher/BootcampReferenceDetail"));
const BookingPass = React.lazy(() => import("./pages/BookingPass"));
const BookingPasses = React.lazy(() => import("./pages/teacher/BookingPasses"));
import Inbox from "./pages/Inbox";
import StudentShell from "./components/mainhub/StudentShell";
import ProtectedRoute from "./components/ProtectedRoute";
import BootcampGate from "./components/hub/BootcampGate";
import { FloatingMessenger } from "./components/inbox/FloatingMessenger";
import { StudentCornerBubble } from "./components/inbox/StudentCornerBubble";
import AdminChatHub from "./components/chat-hub/AdminChatHub";
import { FloatingHelpButton } from "./components/help/FloatingHelpButton";
import GuidedTour from "./components/mainhub/GuidedTour";

// Param/query-preserving redirects for the teacher IA rebuild (ADR 0001).
// The old surfaces still resolve; they just forward to their new home so no
// bookmarked /teacher/* URL 404s.
function RedirectBootcampToInsights() {
  const { topicId } = useParams();
  return <Navigate to={`/teacher/insights/${topicId}`} replace />;
}
function RedirectBootcampStudentToInsights() {
  const { topicId, studentId } = useParams();
  return <Navigate to={`/teacher/insights/${topicId}/students/${studentId}`} replace />;
}
function RedirectSmartboardToWhiteboard() {
  const { search } = useLocation();
  return <Navigate to={`/teacher/whiteboard${search}`} replace />;
}
function RedirectAiTaToCommand() {
  const { search } = useLocation();
  return <Navigate to={`/teacher/command${search}`} replace />;
}

const App = () => {
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
          <PresenceHeartbeatMount />
          {/* Top-level Suspense: covers the routes that are now code-split at
              module scope (Drill, Auth, Mainhub, Practice, Analytics,
              CausationStation, IntroToLr). Nested per-route Suspense boundaries
              still apply for their own fallbacks. COMPREHENSIVEAUDIT Phase 3. */}
          <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            {/* Auth route - NO question bank needed */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<React.Suspense fallback={null}><Unsubscribe /></React.Suspense>} />
            <Route path="/trust" element={<React.Suspense fallback={null}><Trust /></React.Suspense>} />
            <Route path="/.lovable/oauth/consent" element={<React.Suspense fallback={null}><OAuthConsent /></React.Suspense>} />
            <Route path="/schedule/pass/:token" element={<React.Suspense fallback={null}><BookingPass /></React.Suspense>} />
            <Route path="/teacher/booking-passes" element={<ProtectedRoute requireAdmin><React.Suspense fallback={null}><BookingPasses /></React.Suspense></ProtectedRoute>} />


            {/* Onboarding. Name + placement intake for new signups (one-time gate). */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* Mainhub + all student sections now live inside the persistent
                StudentShell layout route (in the /* block below). */}
            {/* Legacy redirect: /foyer was the original route; preserve deep links from older emails / bookmarks. */}
            <Route path="/foyer" element={<Navigate to="/mainhub" replace />} />

            {/* Legacy Admin Dashboard entry now lives inside Teacher Workspace. */}
            <Route path="/admin" element={<Navigate to="/teacher?ws=people" replace />} />
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
            <Route path="/admin/inspector" element={
              <ProtectedRoute flag="has_ta_access">
                <AdminErrorBoundary routeLabel="/admin/inspector">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <AdminInspector />
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
            <Route path="/admin/lsat-knowledge-import" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/lsat-knowledge-import">
                  <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <LsatKnowledgeImport />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/bootcamp-reference-lab" element={
              <AdminErrorBoundary routeLabel="/admin/bootcamp-reference-lab">
                <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <BootcampReferenceLab />
                </React.Suspense>
              </AdminErrorBoundary>
            } />
            <Route path="/admin/intro-lr" element={
              <AdminErrorBoundary routeLabel="/admin/intro-lr">
                <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <AdminIntroLr />
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
            <Route path="/guided-drills/:slug" element={
              <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                <QuestionBankProvider>
                  <GuidedDrillStart />
                </QuestionBankProvider>
              </React.Suspense>
            } />

            {/* Inbox now renders inside StudentShell (in the /* block below). */}

            {/* Canonical Teacher Desk (Today). Rendered full-bleed outside
                TeacherShell so ProtectedRoute's localhost dev bypass makes it
                reachable for local preview without TeacherShell's admin gate. */}
            <Route path="/teacher" element={
              <ProtectedRoute requireAdmin>
                <QuestionBankProvider>
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <TeacherDeskPreview />
                  </React.Suspense>
                </QuestionBankProvider>
              </ProtectedRoute>
            } />

            {/* All other routes - wrapped with QuestionBankProvider */}
            <Route path="/*" element={
              <QuestionBankProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/mainhub" replace />} />

                  {/* Full-screen takeovers: actual LSAT question-doing + activity
                      runner stay OUTSIDE the persistent student shell. */}
                  <Route path="/drill" element={
                    <ProtectedRoute flag="has_drill_access"><Drill /></ProtectedRoute>
                  } />
                  {/* Legacy path — the Wrong Answer Journal is now the Wrong Answers section of the Journal. */}
                  <Route path="/waj" element={<Navigate to="/journal" replace />} />
                  <Route path="/activities/:assignmentId" element={
                    <ProtectedRoute flag="has_activity_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ActivityRunner />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Persistent student shell. Sidebar + study chat stay mounted;
                      these pages swap the center stage instead of redirecting. */}
                  <Route element={<StudentShell />}>
                    <Route path="/mainhub" element={<AcademyMainhub />} />
                    <Route path="/practice" element={
                      <ProtectedRoute flag="has_practice_access"><Practice /></ProtectedRoute>
                    } />
                    <Route path="/practice/sets" element={
                      <ProtectedRoute flag="has_practice_access"><SavedSets /></ProtectedRoute>
                    } />
                    <Route path="/journal" element={
                      <ProtectedRoute flag={["has_journal_access", "has_waj_access"]} allowSignedIn>
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <Journal />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/activities" element={
                      <ProtectedRoute flag="has_activity_access">
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <ActivityCentre />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/flagged" element={
                      <ProtectedRoute flag="has_flagged_access"><FlaggedQuestions /></ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                      <ProtectedRoute flag="has_analytics_access"><Analytics /></ProtectedRoute>
                    } />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings/layout" element={<SettingsLayout />} />
                    <Route path="/inbox" element={
                      <ProtectedRoute flag="has_chat_access"><Inbox /></ProtectedRoute>
                    } />
                    <Route path="/inbox/:conversationId" element={
                      <ProtectedRoute flag="has_chat_access"><Inbox /></ProtectedRoute>
                    } />
                    <Route path="/classroom" element={
                      <ProtectedRoute flag="has_classroom_access" allowSignedIn><Classroom /></ProtectedRoute>
                    } />
                    <Route path="/classroom/uploads" element={
                      <ProtectedRoute flag="has_classroom_access" allowSignedIn>
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <ClassroomUploads />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/classroom/recaps" element={
                      <ProtectedRoute flag="has_classroom_access" allowSignedIn>
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <ClassroomRecaps />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/classroom/item/:itemId" element={
                      <ProtectedRoute flag="has_classroom_access" allowSignedIn>
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <ClassroomItem />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/classroom/ta/:assignmentId" element={
                      <ProtectedRoute flag="has_classroom_access" allowSignedIn>
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <ClassroomTAAssignmentDetail />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/classroom/:assignmentId" element={
                      <ProtectedRoute flag="has_classroom_access" allowSignedIn>
                        <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                          <ClassroomAssignmentDetail />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/schedule" element={
                      <ProtectedRoute flag="has_schedule_access" allowSignedIn><Schedule /></ProtectedRoute>
                    } />
                    <Route path="/booking" element={
                      <ProtectedRoute allowSignedIn><Booking /></ProtectedRoute>
                    } />
                    <Route path="/bootcamps" element={
                      <Bootcamps />
                    } />
                  </Route>

                  <Route path="/teacher" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                        <TeacherShell />
                      </React.Suspense>
                    </ProtectedRoute>
                  }>
                    {/* The desk is owned by the canonical full-bleed /teacher
                        route above; this index only redirects there so there is
                        a single Teacher Desk mount and one canonical Today URL. */}
                    <Route index element={<Navigate to="/teacher" replace />} />
                    <Route path="command" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherAITA />
                      </React.Suspense>
                    } />
                    <Route path="ai-ta" element={<RedirectAiTaToCommand />} />
                    {/* Legacy preview path now folds into the canonical /teacher desk. */}
                    <Route path="desk-preview" element={<Navigate to="/teacher" replace />} />
                    <Route path="today" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherToday />
                      </React.Suspense>
                    } />
                    <Route path="students" element={<Navigate to="/teacher?ws=people" replace />} />
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
                    {/* Insights = bootcamp/topic analytics. Renamed from the old
                        top-level "Bootcamps" which collided with the assign action. */}
                    <Route path="insights" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherBootcampsHub />
                      </React.Suspense>
                    } />
                    <Route path="insights/:topicId" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherBootcampDetail />
                      </React.Suspense>
                    } />
                    <Route path="insights/:topicId/students/:studentId" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherStudentBootcampDetail />
                      </React.Suspense>
                    } />
                    {/* Whiteboard = top-level teaching canvas (was Library > Smartboard). */}
                    <Route path="whiteboard" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherSmartboard />
                      </React.Suspense>
                    } />
                    {/* legacy bootcamp-analytics paths -> Insights */}
                    <Route path="bootcamps" element={<Navigate to="/teacher/insights" replace />} />
                    <Route path="bootcamps/:topicId" element={<RedirectBootcampToInsights />} />
                    <Route path="bootcamps/:topicId/students/:studentId" element={<RedirectBootcampStudentToInsights />} />
                    <Route path="admin" element={<Navigate to="/teacher?ws=people" replace />} />
                    <Route path="templates" element={
                      <React.Suspense fallback={<div />}>
                        <TeacherTemplates />
                      </React.Suspense>
                    } />
                    <Route path="access" element={<Navigate to="/teacher?ws=people" replace />} />
                    <Route path="permissions" element={<Navigate to="/teacher?ws=people" replace />} />
                    {/* Library moved into the Teacher Desk. All /teacher/library/*
                        routes redirect to the desk-native Library workspace. */}
                    <Route path="library" element={<Navigate to="/teacher?ws=library" replace />} />
                    <Route path="library/assignments" element={<Navigate to="/teacher?ws=library&tab=assignments" replace />} />
                    <Route path="library/assignments/new" element={<Navigate to="/teacher?ws=library&tab=bootcamps" replace />} />
                    <Route path="library/bootcamps" element={<Navigate to="/teacher?ws=library&tab=bootcamps" replace />} />
                    <Route path="library/guided-drills" element={<Navigate to="/teacher?ws=library&tab=guided-drills" replace />} />
                    <Route path="library/activities" element={<Navigate to="/teacher?ws=library&tab=activities" replace />} />
                    <Route path="library/recaps" element={<Navigate to="/teacher?ws=library" replace />} />
                    <Route path="library/uploads" element={<Navigate to="/teacher?ws=library" replace />} />
                    <Route path="library/analytics" element={<Navigate to="/teacher?ws=library" replace />} />
                    <Route path="library/smartboard" element={<RedirectSmartboardToWhiteboard />} />
                    {/* legacy top-level aliases */}
                    <Route path="assignments" element={<Navigate to="/teacher?ws=library&tab=assignments" replace />} />
                    <Route path="recaps" element={<Navigate to="/teacher?ws=library" replace />} />
                    <Route path="uploads" element={<Navigate to="/teacher?ws=library" replace />} />
                    <Route path="analytics-bridge" element={<Navigate to="/teacher?ws=library" replace />} />
                  </Route>

                  {/* Admin-only Bootcamp Reference Library. Never exposed to students. Moved outside nesting to fix 404. */}
                  <Route path="/teacher/reference-library" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                        <BootcampReferences />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/teacher/reference-library/:refId" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                        <BootcampReferenceDetail />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Admin-only tutor corpus review (grade / edit / propagate tone). */}
                  <Route path="/teacher/tutor-corpus" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                        <TutorCorpus />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />

                  {/* Admin-only Phase 1A manual session-note ingest. Internal tool;
                      stores transcripts admin-side only, never student-facing. */}
                  <Route path="/teacher/session-ingest" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                        <TeacherSessionIngest />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />

                  <Route path="/bootcamp/causation-station" element={
                    <BootcampGate routePath="/bootcamp/causation-station" title="Causation Station">
                      <CausationStation />
                    </BootcampGate>
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
                  <Route path="/topics/abstract/*" element={
                    <BootcampGate
                      routePath="/topics/abstract"
                      bootcampIdOverride="abstraction"
                      legacyRoutePaths={["/bootcamp/abstraction"]}
                      title="Abstract"
                    >
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <AbstractBootcamp />
                      </React.Suspense>
                    </BootcampGate>
                  } />
                  <Route path="/bootcamp/intro-to-lr/*" element={
                    <BootcampGate routePath="/bootcamp/intro-to-lr" title="Intro to LR">
                      <IntroToLrBootcamp />
                    </BootcampGate>
                  } />
                  <Route path="/bootcamp/principle-flaw" element={
                    <BootcampGate routePath="/bootcamp/principle-flaw" title="Principle and Flaw">
                      <React.Suspense fallback={<div className="min-h-screen bg-[#030303]" />}>
                        <PrincipleFlawBootcamp />
                      </React.Suspense>
                    </BootcampGate>
                  } />
                  <Route path="/bootcamp/fallacy-flaw" element={
                    <BootcampGate routePath="/bootcamp/fallacy-flaw" title="Flaw and Famous Flaws">
                      <React.Suspense fallback={<div className="min-h-screen bg-[#FAF8F3]" />}>
                        <FallacyFlawBootcamp />
                      </React.Suspense>
                    </BootcampGate>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QuestionBankProvider>
            } />
          </Routes>
          </React.Suspense>
          <FloatingMessenger />
          <StudentCornerBubble />
          <AdminChatHub />
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
