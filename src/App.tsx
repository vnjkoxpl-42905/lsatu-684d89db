import { preserveRedirectLocation } from "./lib/preserveRedirectLocation";
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams, useLocation } from "react-router-dom";
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
import SavedSets from "./pages/SavedSets";
// Shared with the rail's hover prefetch (src/lib/routePreload.ts) so both
// resolve the same module id and pull the same chunk.
import { loadDrillHub } from "@/lib/routePreload";
import { safeLazy } from "@/lib/safeLazy";
const AcademyMainhub = safeLazy(loadDrillHub);
const DrillSetupPreview = React.lazy(() => import('./dev/DrillSetupPreview'));
const PracticeExamsPreview = React.lazy(() => import('./dev/PracticeExamsPreview'));
const ConditionalOpeningPreview = import.meta.env.DEV
  ? safeLazy(() => import('./dev/ConditionalOpeningPreview'))
  : () => null;
const Drill = safeLazy(() => import("./pages/Drill"));
const DrillLaunchGate = safeLazy(() => import("./components/drill/DrillLaunchGate"));
const Analytics = safeLazy(() => import("./pages/Analytics"));
const DrillHistory = safeLazy(() => import("./pages/DrillHistory"));
const DrillRuns = safeLazy(() => import("./pages/DrillRuns"));
const ActivityReviewDetail = safeLazy(() => import("./pages/ActivityReviewDetail"));
const SectionReviewDetail = safeLazy(() => import("./pages/SectionReviewDetail"));
const IntroLrReviewDetail = safeLazy(() => import("./pages/IntroLrReviewDetail"));
const HardSentencesReviewDetail = safeLazy(() => import("./pages/HardSentencesReviewDetail"));
const NativeLabReviewDetail = safeLazy(() => import("./pages/NativeLabReviewDetail"));
const ProgressTopics = safeLazy(() => import("./pages/ProgressTopics"));
const RcRedirect = safeLazy(() => import("./features/rc/pages/RcRedirect"));
const RcPlayer = safeLazy(() => import("./features/rc/pages/RcPlayer"));
const RcResults = safeLazy(() => import("./features/rc/pages/RcResults"));
const RcSearch = safeLazy(() => import("./features/rc/pages/RcSearch"));
const TestingCentre = safeLazy(() => import("./pages/TestingCentre"));
const AllPracticeExams = safeLazy(() => import("./pages/PracticeExamPages").then((module) => ({ default: module.AllPracticeExams })));
const PracticeExamDetail = safeLazy(() => import("./pages/PracticeExamPages").then((module) => ({ default: module.PracticeExamDetail })));
const PracticeExamAttempts = safeLazy(() => import("./pages/PracticeExamPages").then((module) => ({ default: module.PracticeExamAttempts })));
const PracticeSectionResult = safeLazy(() => import("./pages/PracticeExamPages").then((module) => ({ default: module.PracticeSectionResult })));
const PracticeTestRunPage = safeLazy(() => import("./pages/PracticeTestRun"));
const TimedOfficialChildRunner = safeLazy(() => import("./components/testing/TimedOfficialChildRunner"));
const TimedStandaloneSectionRunner = safeLazy(() => import("./components/timed/TimedStandaloneSectionRunner"));
const SectionDirectionsPage = safeLazy(() => import("./pages/SectionDirections"));
const Auth = safeLazy(() => import("./pages/Auth"));
import ResetPassword from "./pages/ResetPassword";
import ClassroomAccountView from "./components/classroom/AccountView";
import Classroom from "./pages/Classroom";
import AdmissionsPage from "./pages/classroom/AdmissionsPage";
import ClassroomLayout, { ReviewIndexList } from "./components/classroom/shell/ClassroomLayout";
import { DestinationLinks, StudentDestination } from "./pages/StudentDestination";
import StudentLibraryLessons from "./pages/StudentLibraryLessons";
import MyWorkPage from "./pages/MyWorkPage";
import MyWorkNotesPage from "./pages/MyWorkNotesPage";
import ReviewQueuePage from "./pages/ReviewQueuePage";
import {
  ClassroomAssignmentView,
  ClassroomItemView,
  ClassroomTAAssignmentView,
  ClassroomUploadsView,
} from "./components/classroom/ClassroomRouteViews";
import {
  FlaggedQuestionView,
} from "./components/classroom/FlaggedViews";
import {
  JournalEntryView,
} from "@/components/classroom/JournalViews";
const CausationStation = safeLazy(() => import("./pages/CausationStation"));

// Abstract v2.0: brutalist bootcamp port. All sub-views (lessons, methods,
// drills, flashcards, gauntlet, final set) are switched internally by the
// bootcamp's ViewManager keyed off AppContext.currentView, so the route is
// a single mount with no nested children.
const AbstractBootcamp = safeLazy(() => import("./topics/abstract"));

import Schedule from "./pages/Schedule";
import Booking from "./pages/Booking";
import Bootcamps from "./pages/Bootcamps";
const IntroToLrBootcamp = safeLazy(() => import("./pages/IntroToLrBootcamp"));
const ConditionalBootcamp = safeLazy(() => import("./pages/ConditionalBootcamp"));
const PrincipleFlawBootcamp = safeLazy(() => import("./pages/PrincipleFlawBootcamp"));
const FallacyFlawBootcamp = safeLazy(() => import("./pages/FallacyFlawBootcamp"));
const RcEngagingPassageBootcamp = safeLazy(() => import("./pages/RcEngagingPassageBootcamp"));
import NotFound from "./pages/NotFound";
// Hoisted out of render (were inline React.lazy(...) in the route element, which
// recreated the lazy component every render). COMPREHENSIVEAUDIT Phase 3.
const Trust = safeLazy(() => import("./pages/Trust"));
const OAuthConsent = safeLazy(() => import("./pages/OAuthConsent"));
const DriveFiles = safeLazy(() => import("./pages/admin/DriveFiles"));
const Homework = safeLazy(() => import("./pages/admin/Homework"));
const HomeworkNew = safeLazy(() => import("./pages/admin/HomeworkNew"));
const HomeworkDetail = safeLazy(() => import("./pages/admin/HomeworkDetail"));
const TeachingLibrary = safeLazy(() => import("./pages/admin/TeachingLibrary"));
const TAPage = safeLazy(() => import("./pages/admin/StudentHub"));
const AdminGuidedDrills = safeLazy(() => import("./pages/admin/GuidedDrills"));
const BootcampReferenceLab = safeLazy(() => import("./pages/admin/BootcampReferenceLab"));
const AdminIntroLr = safeLazy(() => import("./pages/admin/IntroLr"));
const AdminInspector = safeLazy(() => import("./pages/admin/Inspector"));
const LsatKnowledgeImport = safeLazy(() => import("./pages/LsatKnowledgeImport"));
const GuidedDrillStart = safeLazy(() => import("./pages/GuidedDrillStart"));
const ActivityCentre = safeLazy(() => import("./pages/ActivityCentre"));
const ConditionalPractice = safeLazy(() => import("./features/activity-centre/conditionals/ConditionalPractice"));
const ConditionalPracticeLab = safeLazy(() => import("./features/activity-centre/conditionals/ConditionalPractice").then(module => ({ default: module.ConditionalPracticeLab })));
const ConditionalIndicatorsRefresher = safeLazy(() => import("./features/conditional-refresher/ConditionalIndicatorsRefresher"));
const ActivitySections = safeLazy(() => import("./pages/ActivitySections"));
const ActivityRunner = safeLazy(() => import("./features/activity-centre/components/ActivityRunner"));

import AdminErrorBoundary from "./components/AdminErrorBoundary";
const TeacherWorkspaceShell = safeLazy(() => import("./pages/teacher/shell/TeacherWorkspaceShell"));
const DeskTodaySurface = safeLazy(() => import("./pages/teacher/shell/DeskTodaySurface"));
const TeacherPayments = safeLazy(() => import("./pages/teacher/shell/TeacherPayments"));
const TeacherDevIndex = safeLazy(() => import("./pages/teacher/shell/TeacherDevIndex"));
const DeskPeopleSurface = safeLazy(() => import("./pages/teacher/desk/DeskPeopleSurface"));
const DeskLibrarySurface = safeLazy(() => import("./pages/teacher/desk/DeskLibrarySurface"));
const TeacherInboxRoom = safeLazy(() => import("./pages/teacher/inbox/TeacherInboxRoom"));
const TeacherHomeworkDetail = safeLazy(() => import("./pages/teacher/library/TeacherHomeworkDetail"));
// TeacherStudentDetail's route is gone — the dossier replaced it and absorbed
// its session/transcript pipeline into SessionBundleList. The file stays until
// the Phase 4 purge, but nothing imports it now.
// The student dossier + its five tab surfaces (T3.2).
const StudentDossier = safeLazy(() => import("./pages/teacher/students/StudentDossier"));
const DossierOverview = safeLazy(() => import("./pages/teacher/students/DossierOverview"));
const DossierWork = safeLazy(() => import("./pages/teacher/students/DossierWork"));
const DossierReview = safeLazy(() => import("./pages/teacher/students/DossierReview"));
const DossierProgress = safeLazy(() => import("./pages/teacher/students/DossierProgress"));
const DossierNotes = safeLazy(() => import("./pages/teacher/students/DossierNotes"));
const DossierMessages = safeLazy(() => import("./pages/teacher/students/DossierMessages"));
const DossierSchedule = safeLazy(() => import("./pages/teacher/students/DossierSchedule"));
const TeacherWeeklyPlans = safeLazy(() => import("./pages/teacher/TeacherWeeklyPlans"));
const TeacherAssistant = safeLazy(() => import("./pages/teacher/TeacherAssistant"));
const TeacherSmartboard = safeLazy(() => import("./pages/teacher/TeacherSmartboard"));
const TeacherBootcampsHub = safeLazy(() => import("./pages/teacher/TeacherBootcampsHub"));
const TeacherBootcampDetail = safeLazy(() => import("./pages/teacher/TeacherBootcampDetail"));
const TeacherStudentBootcampDetail = safeLazy(() => import("./pages/teacher/TeacherStudentBootcampDetail"));
const TeacherTemplates = safeLazy(() => import("./pages/teacher/TeacherTemplates"));
const BootcampReferences = safeLazy(() => import("./pages/teacher/BootcampReferences"));
const TutorCorpus = safeLazy(() => import("./pages/teacher/TutorCorpus"));
const TeacherSessionIngest = safeLazy(() => import("./pages/teacher/TeacherSessionIngest"));
const BookingAccess = safeLazy(() => import("./pages/teacher/BookingAccess"));

const BootcampReferenceDetail = safeLazy(() => import("./pages/teacher/BootcampReferenceDetail"));
const PublicBooking = safeLazy(() => import("./pages/PublicBooking"));
const SingleSession = safeLazy(() => import("./pages/SingleSession"));
const OneOffBooking = safeLazy(() => import("./pages/OneOffBooking"));
/** Dev-only; the route that mounts it is gated on import.meta.env.DEV. */
const ActivityLab = safeLazy(() => import("./pages/ActivityLab"));
import Inbox from "./pages/Inbox";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  ActivityAssignmentGate,
  DrillAssignmentGate,
  PracticeTestRunGate,
  TAAssignmentGate,
  TestingCentreGate,
} from "@/components/AssignmentGate";
import BootcampGate from "./components/hub/BootcampGate";
import { FloatingHelpButton } from "./components/help/FloatingHelpButton";
import { isOfficialTimedChildPath } from "@/lib/officialTimedRoute";

// Surfaces that own the whole screen and must stay free of floating chrome.
// The exam players are the strict case: nothing may sit over the passage, the
// choices or the footer's primary action.
const OVERLAY_FREE_PREFIXES = ["/book/", "/classroom", "/drill", "/rc", "/section/"];

function GlobalOverlayMount() {
  const { pathname } = useLocation();
  if (isOfficialTimedChildPath(pathname) || OVERLAY_FREE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return null;
  return (
    <>
      <FloatingHelpButton />
    </>
  );
}

// Param/query-preserving redirects for the teacher IA rebuild (ADR 0001).
// The old surfaces still resolve; they just forward to their new home so no
// bookmarked /teacher/* URL 404s.
function RedirectBootcampToInsights() {
  const { topicId } = useParams();
  return <RedirectWithSearch to={`/teacher/insights/${topicId}`} />;
}
function RedirectBootcampStudentToInsights() {
  const { topicId, studentId } = useParams();
  return <RedirectWithSearch to={`/teacher/insights/${topicId}/students/${studentId}`} />;
}
/**
 * Redirect that carries the incoming query string to the target, merging it
 * when the target already has one. Deep links like
 * `/teacher/assignments?student=abc` keep their student context instead of
 * dropping it at the redirect.
 */
function RedirectWithSearch({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={preserveRedirectLocation(to, search, hash)} replace />;
}

function RedirectLegacyExamDetail() {
  const { pt } = useParams<{ pt: string }>();
  return <RedirectWithSearch to={`/practice/exams/${pt}`} />;
}

function RedirectLegacyDrill() {
  const { search } = useLocation();
  const stage = new URLSearchParams(search).get("stage");
  return <RedirectWithSearch to={stage === "full-section" ? "/practice/exams" : stage === "analytics" ? "/progress/overview" : "/practice/drills"} />;
}

function RedirectSmartboardToWhiteboard() {
  return <RedirectWithSearch to="/teacher/whiteboard" />;
}
/**
 * The Desk used `?ws=` (and `?tab=`) instead of routes. Those URLs are in
 * bookmarks, in old emails, and in stored to-do `openPath`s, so `/teacher`
 * translates them to the room they now mean before falling back to Today.
 * Deleted in Phase 4 with the rest of the redirect stubs.
 */
const LEGACY_WORKSPACE_ROOMS: Record<string, string> = {
  today: "/teacher/today",
  people: "/teacher/students",
  students: "/teacher/students",
  admin: "/teacher/students",
  messages: "/teacher/inbox",
  inbox: "/teacher/inbox",
  gmail: "/teacher/inbox",
  drive: "/teacher/inbox",
  library: "/teacher/library",
};

function TeacherWorkspaceIndex() {
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  const ws = params.get("ws");
  const tab = params.get("tab");

  let target = (ws && LEGACY_WORKSPACE_ROOMS[ws]) || "/teacher/today";
  if (target === "/teacher/library" && tab) target = `/teacher/library/${tab}`;

  // The room is in the path now; everything else (student, thread, query) is
  // still context the target surface wants.
  params.delete("ws");
  params.delete("tab");
  params.delete("pane");
  const rest = params.toString();

  return <Navigate to={preserveRedirectLocation(target, rest, hash)} replace />;
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
            {import.meta.env.DEV && <Route path="/dev/drill-setup-preview" element={<DrillSetupPreview />} />}
            {import.meta.env.DEV && <Route path="/dev/conditional-opening-preview" element={<ConditionalOpeningPreview />} />}
            {import.meta.env.DEV && <Route path="/dev/practice-exams-preview/*" element={<PracticeExamsPreview />} />}
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/trust" element={<React.Suspense fallback={null}><Trust /></React.Suspense>} />

            <Route path="/.lovable/oauth/consent" element={<React.Suspense fallback={null}><OAuthConsent /></React.Suspense>} />
            {/* Static Single Session route must precede the bearer-slug route. */}
            <Route path="/book/session" element={<React.Suspense fallback={null}><SingleSession /></React.Suspense>} />
            {/* The consultation runs on the same engine as the session: same
                slot policy, same calendar, same cancel flow. It differs only by
                what booking_event_types says it is -- 30 minutes, buffered, and
                free, so it books without a Stripe leg. */}
            <Route path="/book/consultation" element={<React.Suspense fallback={null}><SingleSession event="consultation" /></React.Suspense>} />
            {/* A one-off link. The slug names a booking_event_types row minted for
                one person -- its own price, length, notice and sometimes one
                pinned time -- and it sells exactly one session. Nested under
                /book/x/ so it cannot collide with the bearer-slug route below. */}
            <Route path="/book/x/:slug" element={<React.Suspense fallback={null}><OneOffBooking /></React.Suspense>} />
            {/* Public, no-login per-student booking link (Calendly-style). */}
            <Route path="/book/:slug" element={<React.Suspense fallback={null}><PublicBooking /></React.Suspense>} />
            {/* Legacy booking-workspace URLs used to mount a second app shell.
                Passes now live on each student's in-shell dossier. */}
            <Route path="/booking/admin/*" element={<RedirectWithSearch to="/teacher/students" />} />
            <Route path="/teacher/booking-passes" element={<RedirectWithSearch to="/teacher/students" />} />


            {/* Onboarding is no longer a screen of its own: the intake runs in
                the classroom's orientation card, which the student opens and
                clicks through. Kept as a redirect for older links. */}
            <Route path="/onboarding" element={<Navigate to="/classroom" replace />} />

            {/* Legacy redirect: /foyer was the original route; preserve deep links from older emails / bookmarks. */}
            <Route path="/foyer" element={<Navigate to="/classroom" replace />} />

            {/* Legacy Admin Dashboard entry now lives inside Teacher Workspace. */}
            <Route path="/admin" element={<RedirectWithSearch to="/teacher/students" />} />
            {/* The real whiteboard is the teacher workspace's: autosave, named
                sessions, per-student scoping. /admin/board was a bare Excalidraw
                with no save and no way to get a board back, so it forwards. */}
            <Route path="/admin/board" element={<RedirectWithSearch to="/teacher/whiteboard" />} />
            {/* The board is a teaching surface, not a workspace room: Joshua
                teaches off it, so it takes the whole viewport with no rail and
                no workspace header. That is why it sits here rather than as a
                child of /teacher, which would draw it inside the shell. */}
            <Route path="/teacher/whiteboard" element={
              <ProtectedRoute requireAdmin>
                <React.Suspense fallback={<div className="min-h-screen bg-white" />}>
                  <TeacherSmartboard />
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/admin/drive-files" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/drive-files">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <DriveFiles />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/homework" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/homework">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <Homework />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/homework/new" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/homework/new">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <QuestionBankProvider>
                      <HomeworkNew />
                    </QuestionBankProvider>
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/homework/:setId" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/homework/:setId">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <QuestionBankProvider>
                      <HomeworkDetail />
                    </QuestionBankProvider>
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/library" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/library">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <TeachingLibrary />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/ta" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/ta">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <TAPage />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/inspector" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/inspector">
                  <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                    <AdminInspector />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/guided-drills" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/guided-drills">
                  <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <QuestionBankProvider>
                      <AdminGuidedDrills />
                    </QuestionBankProvider>
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
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
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/bootcamp-reference-lab">
                  <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <BootcampReferenceLab />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/admin/intro-lr" element={
              <ProtectedRoute requireAdmin>
                <AdminErrorBoundary routeLabel="/admin/intro-lr">
                  <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                    <AdminIntroLr />
                  </React.Suspense>
                </AdminErrorBoundary>
              </ProtectedRoute>
            } />
            {/* Guided drills reach here from an assignment, a bootcamp's
                practice drills, or an emailed link. None of those is a reason
                to skip the flag check: unguarded, "Revoke All Access" left
                every guided-drill URL a student had ever been sent wide open.
                A drill, classroom or bootcamp door is enough to run one. */}
            <Route path="/guided/:assignmentId" element={
              <ProtectedRoute flag={["has_drill_access", "has_classroom_access", "has_bootcamp_access"]}>
                <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <QuestionBankProvider>
                    <GuidedDrillStart />
                  </QuestionBankProvider>
                </React.Suspense>
              </ProtectedRoute>
            } />
            <Route path="/guided-drills/:slug" element={
              <ProtectedRoute flag={["has_drill_access", "has_classroom_access", "has_bootcamp_access"]}>
                <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <QuestionBankProvider>
                    <GuidedDrillStart />
                  </QuestionBankProvider>
                </React.Suspense>
              </ProtectedRoute>
            } />

            {/* Inbox renders inside the ClassroomLayout block below. */}

            {/* All other routes - wrapped with QuestionBankProvider */}
            <Route path="/*" element={
              <QuestionBankProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/classroom" replace />} />

                  {/* Full-screen takeovers: actual LSAT question-doing + activity
                      runner stay OUTSIDE the persistent student shell. */}
                  <Route path="/drill" element={
                    <DrillAssignmentGate><DrillLaunchGate><Drill /></DrillLaunchGate></DrillAssignmentGate>
                  } />
                  <Route path="/testing/test/:runId/lr/:legIndex" element={
                    <PracticeTestRunGate><TimedOfficialChildRunner kind="lr" /></PracticeTestRunGate>
                  } />
                  <Route path="/testing/test/:runId/rc/:legIndex" element={
                    <PracticeTestRunGate><TimedOfficialChildRunner kind="rc" /></PracticeTestRunGate>
                  } />
                  <Route path="/testing/sections/:sittingId" element={
                    <ProtectedRoute flag="has_drill_access"><TimedStandaloneSectionRunner /></ProtectedRoute>
                  } />
                  {/* Reading Comprehension drilling. Content is static JSON; only
                      progress touches the database. See src/features/rc/CONTEXT.md. */}
                  {/* The RC hub is a section of the drill hub now, chosen by
                      the LR/RC switch. This route survives as a
                      query-preserving adapter — see RcRedirect. */}
                  <Route path="/rc" element={
                    <DrillAssignmentGate><RcRedirect /></DrillAssignmentGate>
                  } />
                  {/* The directions screen before an assigned section. Outside
                      the Classroom shell on purpose: it takes the whole screen,
                      like the section it leads into. */}
                  <Route path="/section/:assignmentId" element={
                    <ProtectedRoute flag="has_classroom_access"><SectionDirectionsPage /></ProtectedRoute>
                  } />
                  <Route path="/rc/drill" element={
                    <DrillAssignmentGate><RcPlayer /></DrillAssignmentGate>
                  } />
                  <Route path="/rc/results/:sessionId" element={
                    <ProtectedRoute allowSignedIn><RcResults /></ProtectedRoute>
                  } />
                  <Route path="/rc/search" element={
                    <ProtectedRoute flag="has_drill_access"><RcSearch /></ProtectedRoute>
                  } />
                  {/* Legacy path — the Wrong Answer Journal is now the Wrong Answers section of the Journal. */}
                  <Route path="/waj" element={<Navigate to="/journal" replace />} />
                  {/* Dev-only harness for the Activity Centre worlds. The runner
                      is behind auth + a feature flag, which makes a world
                      impossible to look at while building it; this renders one
                      directly against the real seeded content. Never registered
                      in a production bundle. */}
                  {import.meta.env.DEV && (
                    <Route path="/activity-lab" element={
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ActivityLab />
                      </React.Suspense>
                    } />
                  )}
                  {import.meta.env.DEV && (
                    <Route path="/conditional-lab" element={
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ConditionalPracticeLab />
                      </React.Suspense>
                    } />
                  )}
                  {/* Teacher preview. Runs off the activity DEFINITION and
                      writes nothing, so looking at an activity never puts it on
                      the teacher's own "Assigned to you" list. Admin only. */}
                  <Route path="/activities/preview/:activityId" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ActivityRunner preview />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  {/* The Read, Recall, Colour door at a permanent address, so
                      a student can pick a section without having been assigned
                      the library. Must sit before :assignmentId. */}
                  <Route path="/activities/sections" element={
                    <ProtectedRoute flag="has_activity_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ActivitySections />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="/activities/:assignmentId" element={
                    <ActivityAssignmentGate>
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ActivityRunner />
                      </React.Suspense>
                    </ActivityAssignmentGate>
                  } />
                  <Route path="/activities/conditionals" element={
                    <ProtectedRoute flag="has_activity_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ConditionalPractice />
                      </React.Suspense>
                    </ProtectedRoute>
                  } />

                  {/* The Classroom frame. Every route drawn by it hangs off
                      THIS ONE pathless layout route, which is what keeps the
                      rail mounted across navigations — two sibling routes each
                      holding their own <ClassroomLayout /> would unmount and
                      remount it, which is exactly the shell-swap this design
                      exists to eliminate.

                      Each branch keeps its own guard, so /flagged still needs
                      has_flagged_access and nothing about who can reach what
                      has changed. */}
                  <Route element={<ClassroomLayout />}>
                    <Route path="/classroom" element={
                      <ProtectedRoute flag="has_classroom_access" allowSignedIn><Outlet /></ProtectedRoute>
                    }>
                      <Route index element={<Classroom />} />
                      <Route path="drill" element={<RedirectLegacyDrill />} />
                      {/* Uploads are coursework too: what the student hands in
                          and what Joshua hands back. Same door as the rest. */}
                      <Route path="uploads" element={
                        <ProtectedRoute flag="has_classroom_access"><ClassroomUploadsView /></ProtectedRoute>
                      } />
                      <Route path="account" element={<ClassroomAccountView />} />
                      {/* The outlet above lets any signed-in user through so a
                          fresh signup can reach the intake and their account.
                          Coursework does not ride on that: notes, recaps and
                          assigned work are what has_classroom_access buys. */}
                      <Route path="recaps" element={<RedirectWithSearch to="/my-work/notes" />} />
                      {/* Admissions is unfinished. Keep the rail entry visible,
                          but only Joshua and admins can open the page. */}
                      <Route path="admissions" element={<RedirectWithSearch to="/library/admissions" />} />
                      <Route path="item/:itemId" element={
                        <ProtectedRoute flag="has_classroom_access"><ClassroomItemView /></ProtectedRoute>
                      } />
                      <Route path="ta/:assignmentId" element={
                        <TAAssignmentGate><ClassroomTAAssignmentView /></TAAssignmentGate>
                      } />
                      <Route path=":assignmentId" element={
                        <ProtectedRoute flag="has_classroom_access"><ClassroomAssignmentView /></ProtectedRoute>
                      } />
                    </Route>

                    <Route path="/my-work" element={<ProtectedRoute allowSignedIn><StudentDestination destination="my-work" /></ProtectedRoute>}>
                      <Route index element={<RedirectWithSearch to="/my-work/to-do" />} />
                      <Route path="to-do" element={<ProtectedRoute flag="has_classroom_access"><MyWorkPage completed={false} /></ProtectedRoute>} />
                      <Route path="completed" element={<ProtectedRoute flag="has_classroom_access"><MyWorkPage completed /></ProtectedRoute>} />
                      <Route path="notes" element={<ProtectedRoute flag="has_classroom_access"><MyWorkNotesPage /></ProtectedRoute>} />
                    </Route>

                    <Route path="/practice" element={<ProtectedRoute allowSignedIn><StudentDestination destination="practice" /></ProtectedRoute>}>
                      <Route index element={<RedirectWithSearch to="/practice/drills" />} />
                      <Route path="drills" element={<ProtectedRoute flag="has_drill_access"><AcademyMainhub /></ProtectedRoute>} />
                      <Route path="drills/runs/:runId" element={<ProtectedRoute flag="has_drill_access"><DrillRuns /></ProtectedRoute>} />
                      <Route path="drills/saved" element={<ProtectedRoute flag="has_drill_access"><SavedSets /></ProtectedRoute>} />
                      <Route path="exams" element={<TestingCentreGate><TestingCentre /></TestingCentreGate>} />
                      <Route path="exams/all" element={<TestingCentreGate><AllPracticeExams /></TestingCentreGate>} />
                      <Route path="exams/:pt" element={<TestingCentreGate><PracticeExamDetail /></TestingCentreGate>} />
                      <Route path="exams/attempts" element={<ProtectedRoute allowSignedIn><PracticeExamAttempts /></ProtectedRoute>} />
                    </Route>

                    <Route path="/review" element={<ProtectedRoute allowSignedIn><StudentDestination destination="review" /></ProtectedRoute>}>
                      <Route index element={<RedirectWithSearch to="/review/to-review" />} />
                      <Route path="to-review" element={<ProtectedRoute allowSignedIn><ReviewQueuePage /></ProtectedRoute>} />
                      <Route path="activity/:assignmentId/:itemOrder" element={<ProtectedRoute flag="has_activity_access"><ActivityReviewDetail /></ProtectedRoute>} />
                      <Route path="section/:historyId/:qid" element={<ProtectedRoute flag="has_drill_access"><SectionReviewDetail /></ProtectedRoute>} />
                      <Route path="intro-lr/:attemptId" element={<ProtectedRoute flag="has_bootcamp_access"><IntroLrReviewDetail /></ProtectedRoute>} />
                      <Route path="hard-sentences/:sourceKind/:attemptKey" element={<ProtectedRoute flag="has_bootcamp_access"><HardSentencesReviewDetail /></ProtectedRoute>} />
                      <Route path="native-lab/:attemptId" element={<ProtectedRoute flag="has_bootcamp_access"><NativeLabReviewDetail /></ProtectedRoute>} />
                      <Route path="wrong" element={<ProtectedRoute flag="has_journal_access"><ReviewIndexList section="journal" /></ProtectedRoute>} />
                      <Route path="flagged" element={<ProtectedRoute flag="has_flagged_access"><ReviewIndexList section="flagged" /></ProtectedRoute>} />
                    </Route>

                    <Route path="/progress" element={<ProtectedRoute allowSignedIn><StudentDestination destination="progress" /></ProtectedRoute>}>
                      <Route index element={<RedirectWithSearch to="/progress/overview" />} />
                      <Route path="overview" element={<ProtectedRoute flag="has_analytics_access"><Analytics /></ProtectedRoute>} />
                      <Route path="history" element={<ProtectedRoute flag="has_analytics_access"><DrillHistory /></ProtectedRoute>} />
                      <Route path="topics" element={<ProtectedRoute flag="has_analytics_access"><ProgressTopics /></ProtectedRoute>} />
                    </Route>

                    <Route path="/library" element={<ProtectedRoute allowSignedIn><StudentDestination destination="library" /></ProtectedRoute>}>
                      <Route index element={<RedirectWithSearch to="/library/lessons" />} />
                      <Route path="lessons" element={<ProtectedRoute flag={["has_activity_access", "has_bootcamp_access", "has_drill_access", "has_analytics_access"]}><StudentLibraryLessons /></ProtectedRoute>} />
                      <Route path="activities" element={<ProtectedRoute flag="has_activity_access"><ActivityCentre /></ProtectedRoute>} />
                      <Route path="bootcamps" element={<ProtectedRoute flag="has_bootcamp_access"><Bootcamps /></ProtectedRoute>} />
                      <Route path="admissions" element={<ProtectedRoute requireAdmin><AdmissionsPage /></ProtectedRoute>} />
                    </Route>

                    {/* The Testing Centre sits inside the classroom frame on
                        purpose: choosing a section is still classroom time, and
                        the rail has to stay reachable right up to the moment the
                        clock starts. The runners themselves are full-screen
                        takeovers registered above, outside this shell. */}
                    <Route path="/testing" element={<RedirectWithSearch to="/practice/exams" />} />
                    <Route path="/testing/exams" element={<RedirectWithSearch to="/practice/exams/all" />} />
                    <Route path="/testing/exams/:pt" element={<RedirectLegacyExamDetail />} />
                    <Route path="/testing/attempts" element={<RedirectWithSearch to="/practice/exams/attempts" />} />
                    <Route path="/testing/attempts/section/lr/:sessionId" element={
                      <ProtectedRoute allowSignedIn><PracticeSectionResult /></ProtectedRoute>
                    } />
                    <Route path="/testing/test/:runId" element={
                      <PracticeTestRunGate><PracticeTestRunPage /></PracticeTestRunGate>
                    } />

                    {/* Review keeps both historic URL families. The shared tabs
                        switch between them while each route retains its own
                        permission gate and data surface. */}
                    <Route path="/flagged" element={<RedirectWithSearch to="/review/flagged" />} />
                    <Route path="/flagged/:qid" element={
                      <ProtectedRoute flag="has_flagged_access"><FlaggedQuestionView /></ProtectedRoute>
                    } />
                    <Route path="/journal" element={<RedirectWithSearch to="/review/wrong" />} />
                    <Route path="/journal/:qid" element={
                      <ProtectedRoute flag="has_journal_access">
                        <JournalEntryView />
                      </ProtectedRoute>
                    } />

                    {/* Messages is reached from the classroom rail's Support
                        group, so it draws inside this frame. Routing it under
                        StudentShell swapped the whole rail out from under the
                        user mid-navigation. */}
                    {/* One splat route, not /inbox + /inbox/:conversationId as
                        siblings: two Route elements make React unmount and
                        remount Inbox on every list↔thread move, which flashes
                        the skeleton and re-runs the whole inbox load each time
                        a thread is opened or backed out of. */}
                    <Route path="/inbox/*" element={
                      <ProtectedRoute flag="has_chat_access"><Inbox /></ProtectedRoute>
                    } />

                    {/* These five were the last routes under StudentShell, so
                        reaching any of them from the rail swapped the whole
                        frame: a different sidebar, a different item set, and
                        each page's own header on top. They are ordinary stage
                        content like everything else here now. */}
                    <Route path="/sets" element={<RedirectWithSearch to="/practice/drills/saved" />} />
                    <Route path="/activities" element={<RedirectWithSearch to="/library/activities" />} />
                    {/* Teaching content, so it closes with the doors that
                        teach: the Activities and Drill flags. Any signed-in
                        user used to pass, which meant a revoked account could
                        still study here. */}
                    <Route path="/conditional-indicators-refresher" element={
                      <ProtectedRoute flag={["has_activity_access", "has_drill_access"]}>
                        <ConditionalIndicatorsRefresher />
                      </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={<RedirectWithSearch to="/progress/overview" />} />
                    <Route path="/history" element={<RedirectWithSearch to="/progress/history" />} />
                    <Route path="/schedule" element={
                      <ProtectedRoute flag="has_schedule_access" allowSignedIn><Schedule /></ProtectedRoute>
                    } />
                    <Route path="/booking" element={
                      <ProtectedRoute allowSignedIn><Booking /></ProtectedRoute>
                    } />
                    {/* The rail padlocks Bootcamps on has_bootcamp_access, so
                        the route has to enforce it too. Unguarded, the padlock
                        was decorative and the URL opened anyway. */}
                    <Route path="/bootcamps" element={<RedirectWithSearch to="/library/bootcamps" />} />
                    {/* The teacher workspace rooms use real nested routes
                        (spec D1/D3), rendering into the shell's <Outlet/> so
                        room-to-room navigation is real browser history.

                        It hangs off the ClassroomLayout route deliberately.
                        Opening it from the classroom rail is entering a room,
                        not leaving for another app: the classroom rail stays
                        mounted and the workspace draws into the stage beside
                        it. As its own top-level route it swapped the entire
                        frame out — the same shell-swap Messages and Flagged
                        were moved in here to stop.

                        requireAdmin still guards it; nesting changed the
                        frame, not who can reach it. */}
                    <Route path="/teacher" element={
                      <ProtectedRoute requireAdmin>
                        <React.Suspense fallback={<div className="min-h-screen bg-[#c3cace]" />}>
                          <TeacherWorkspaceShell />
                        </React.Suspense>
                      </ProtectedRoute>
                    }>
                      <Route index element={<TeacherWorkspaceIndex />} />

                      <Route path="today" element={
                        <React.Suspense fallback={<div />}>
                          <DeskTodaySurface />
                        </React.Suspense>
                      } />
                      <Route path="payments" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherPayments />
                        </React.Suspense>
                      } />
                      <Route path="students" element={
                        <React.Suspense fallback={<div />}>
                          <DeskPeopleSurface />
                        </React.Suspense>
                      } />
                      {/* The dossier (T3.2): one URL per student, five real
                          child routes so each surface is linkable and
                          back/forward work. */}
                      <Route path="students/:studentId" element={
                        <React.Suspense fallback={<div />}>
                          <StudentDossier />
                        </React.Suspense>
                      }>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={
                          <React.Suspense fallback={<div />}><DossierOverview /></React.Suspense>
                        } />
                        <Route path="work" element={
                          <React.Suspense fallback={<div />}><DossierWork /></React.Suspense>
                        } />
                        <Route path="review" element={
                          <React.Suspense fallback={<div />}><DossierReview /></React.Suspense>
                        } />
                        <Route path="progress" element={
                          <React.Suspense fallback={<div />}><DossierProgress /></React.Suspense>
                        } />
                        <Route path="notes" element={
                          <React.Suspense fallback={<div />}><DossierNotes /></React.Suspense>
                        } />
                        <Route path="messages" element={
                          <React.Suspense fallback={<div />}><DossierMessages /></React.Suspense>
                        } />
                        <Route path="schedule" element={
                          <React.Suspense fallback={<div />}><DossierSchedule /></React.Suspense>
                        } />
                      </Route>
                      {/* The unified Inbox (T3.3): platform threads and Gmail in
                          one pull-driven queue. The splat carries the selected
                          thread key (`platform:<id>` / `email:<id>`) so opening a
                          thread is real history without remounting the room. */}
                      <Route path="inbox/*" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherInboxRoom />
                        </React.Suspense>
                      } />
                      {/* Library's tab is a path segment, not a query param, so
                          each tab is its own linkable URL. */}
                      <Route path="library" element={
                        <React.Suspense fallback={<div />}>
                          <DeskLibrarySurface />
                        </React.Suspense>
                      } />
                      {/* Static segment ranks above library/:tab, so this wins
                          for a set id and Library still owns every other tab. */}
                      <Route path="library/homework/:setId" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherHomeworkDetail />
                        </React.Suspense>
                      } />
                      <Route path="library/:tab" element={
                        <React.Suspense fallback={<div />}>
                          <DeskLibrarySurface />
                        </React.Suspense>
                      } />
                      {/* Student schedules are owned by each student's dossier.
                          Keep the former URL working, but send teachers to the
                          roster instead of presenting a competing workspace. */}
                      <Route path="schedule" element={<RedirectWithSearch to="/teacher/students" />} />
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
                      {/* Teaching Assistant: the full-page action agent room.
                          Runs `ta-agent` (Gemini 3.8 Flash on GEMINI_API_KEY);
                          every platform action is confirmed before it fires. */}
                      <Route path="assistant" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherAssistant />
                        </React.Suspense>
                      } />
                      <Route path="dev" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherDevIndex />
                        </React.Suspense>
                      } />
                      <Route path="templates" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherTemplates />
                        </React.Suspense>
                      } />

                      {/* Weekly plans is the only place a student's week gets
                          authored, and /teacher/schedule is availability, not
                          plans. Redirecting here left no way to build a week
                          at all, so it is a real route again. */}
                      <Route path="weekly-plans" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherWeeklyPlans />
                        </React.Suspense>
                      } />

                      {/* ── Legacy paths → their new room. Deleted in Phase 4. ── */}
                      <Route path="command" element={<RedirectWithSearch to="/teacher/today" />} />
                      <Route path="ai-ta" element={<RedirectWithSearch to="/teacher/today" />} />
                      <Route path="desk-preview" element={<RedirectWithSearch to="/teacher/today" />} />
                      <Route path="conversations" element={<RedirectWithSearch to="/teacher/inbox" />} />
                      <Route path="bootcamps" element={<RedirectWithSearch to="/teacher/insights" />} />
                      <Route path="bootcamps/:topicId" element={<RedirectBootcampToInsights />} />
                      <Route path="bootcamps/:topicId/students/:studentId" element={<RedirectBootcampStudentToInsights />} />
                      <Route path="admin" element={<RedirectWithSearch to="/teacher/students" />} />
                      <Route path="access" element={<RedirectWithSearch to="/teacher/students" />} />
                      <Route path="permissions" element={<RedirectWithSearch to="/teacher/students" />} />
                      <Route path="library/assignments/new" element={<RedirectWithSearch to="/teacher/library/bootcamps" />} />
                      <Route path="library/recaps" element={<RedirectWithSearch to="/teacher/library" />} />
                      <Route path="library/uploads" element={<RedirectWithSearch to="/teacher/library" />} />
                      <Route path="library/analytics" element={<RedirectWithSearch to="/teacher/library" />} />
                      <Route path="library/smartboard" element={<RedirectSmartboardToWhiteboard />} />
                      <Route path="assignments" element={<RedirectWithSearch to="/teacher/library/assignments" />} />
                      <Route path="recaps" element={<RedirectWithSearch to="/teacher/library" />} />
                      <Route path="uploads" element={<RedirectWithSearch to="/teacher/library" />} />
                      <Route path="analytics-bridge" element={<RedirectWithSearch to="/teacher/library" />} />
                    </Route>
                  </Route>

                  {/* Retired surfaces. Bare redirects, no shell of their own:
                      whatever frame the destination uses is the frame you get.
                      /mainhub was the old *home*, so it goes to the classroom,
                      not to the drill hub. */}
                  <Route path="/mainhub" element={<Navigate to="/classroom" replace />} />
                  {/* The /practice hub was removed; its Full Section and
                      Build a Set launchers now live on the drill hub as
                      ?stage= panels. Redirects keep old links alive. */}
                  <Route path="/practice/sets" element={<RedirectWithSearch to="/practice/drills/saved" />} />
                  {/* Old standalone pages now live inside the classroom
                      Account stage; redirects keep bookmarks alive. */}
                  <Route path="/profile" element={<Navigate to="/classroom/account" replace />} />
                  <Route path="/settings/layout" element={<Navigate to="/classroom/account?section=layout" replace />} />


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

                  {/* Who can book what, and at what price. Writes straight to
                      the booking tables under admin RLS, so what this screen
                      shows is what the booking page reads. */}
                  <Route path="/teacher/booking-access" element={
                    <ProtectedRoute requireAdmin>
                      <React.Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
                        <BookingAccess />
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
                  <Route path="/bootcamp/conditionals/*" element={
                    <BootcampGate routePath="/bootcamp/conditionals" title="Conditional Logic Bootcamp">
                      <ConditionalBootcamp />
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
                  <Route path="/bootcamp/rc-engaging-with-the-passage" element={
                    <BootcampGate routePath="/bootcamp/rc-engaging-with-the-passage" title="Engaging With The Passage">
                      <React.Suspense fallback={<div className="min-h-screen bg-[hsl(38_36%_93%)]" />}>
                        <RcEngagingPassageBootcamp />
                      </React.Suspense>
                    </BootcampGate>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </QuestionBankProvider>
            } />
          </Routes>
          </React.Suspense>
          <GlobalOverlayMount />
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
