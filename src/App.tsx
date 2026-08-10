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
const AcademyMainhub = React.lazy(loadDrillHub);
const Drill = React.lazy(() => import("./pages/Drill"));
const Analytics = React.lazy(() => import("./pages/Analytics"));
const RcHub = React.lazy(() => import("./features/rc/pages/RcHub"));
const RcPlayer = React.lazy(() => import("./features/rc/pages/RcPlayer"));
const RcResults = React.lazy(() => import("./features/rc/pages/RcResults"));
const RcSearch = React.lazy(() => import("./features/rc/pages/RcSearch"));
const Auth = React.lazy(() => import("./pages/Auth"));
import ResetPassword from "./pages/ResetPassword";
import ClassroomAccountView from "./components/classroom/AccountView";
import Classroom from "./pages/Classroom";
import ClassroomLayout from "./components/classroom/shell/ClassroomLayout";
import {
  ClassroomAssignmentView,
  ClassroomItemView,
  ClassroomRecapsView,
  ClassroomTAAssignmentView,
  ClassroomUploadsView,
} from "./components/classroom/ClassroomRouteViews";
import {
  FlaggedIndexView,
  FlaggedQuestionView,
} from "./components/classroom/FlaggedViews";
import {
  JournalEntryView,
  JournalIndexView,
} from "@/components/classroom/JournalViews";
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
const RcEngagingPassageBootcamp = React.lazy(() => import("./pages/RcEngagingPassageBootcamp"));
import NotFound from "./pages/NotFound";
const Unsubscribe = React.lazy(() => import("./pages/Unsubscribe"));
// Hoisted out of render (were inline React.lazy(...) in the route element, which
// recreated the lazy component every render). COMPREHENSIVEAUDIT Phase 3.
const Trust = React.lazy(() => import("./pages/Trust"));
const OAuthConsent = React.lazy(() => import("./pages/OAuthConsent"));
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
const ActivityCentre = React.lazy(() => import("./pages/ActivityCentre"));
const ActivityRunner = React.lazy(() => import("./features/activity-centre/components/ActivityRunner"));

import AdminErrorBoundary from "./components/AdminErrorBoundary";
const TeacherWorkspaceShell = React.lazy(() => import("./pages/teacher/shell/TeacherWorkspaceShell"));
const DeskTodaySurface = React.lazy(() => import("./pages/teacher/shell/DeskTodaySurface"));
const TeacherDevIndex = React.lazy(() => import("./pages/teacher/shell/TeacherDevIndex"));
const DeskPeopleSurface = React.lazy(() => import("./pages/teacher/desk/DeskPeopleSurface"));
const DeskLibrarySurface = React.lazy(() => import("./pages/teacher/desk/DeskLibrarySurface"));
const TeacherInboxRoom = React.lazy(() => import("./pages/teacher/inbox/TeacherInboxRoom"));
const TeacherHomeworkDetail = React.lazy(() => import("./pages/teacher/library/TeacherHomeworkDetail"));
// TeacherStudentDetail's route is gone — the dossier replaced it and absorbed
// its session/transcript pipeline into SessionBundleList. The file stays until
// the Phase 4 purge, but nothing imports it now.
// The student dossier + its five tab surfaces (T3.2).
const StudentDossier = React.lazy(() => import("./pages/teacher/students/StudentDossier"));
const DossierOverview = React.lazy(() => import("./pages/teacher/students/DossierOverview"));
const DossierWork = React.lazy(() => import("./pages/teacher/students/DossierWork"));
const DossierNotes = React.lazy(() => import("./pages/teacher/students/DossierNotes"));
const DossierMessages = React.lazy(() => import("./pages/teacher/students/DossierMessages"));
const DossierSchedule = React.lazy(() => import("./pages/teacher/students/DossierSchedule"));
const TeacherWeeklyPlans = React.lazy(() => import("./pages/teacher/TeacherWeeklyPlans"));
const TeacherSchedule = React.lazy(() => import("./pages/teacher/TeacherSchedule"));
const TeacherSmartboard = React.lazy(() => import("./pages/teacher/TeacherSmartboard"));
const TeacherBootcampsHub = React.lazy(() => import("./pages/teacher/TeacherBootcampsHub"));
const TeacherBootcampDetail = React.lazy(() => import("./pages/teacher/TeacherBootcampDetail"));
const TeacherStudentBootcampDetail = React.lazy(() => import("./pages/teacher/TeacherStudentBootcampDetail"));
const TeacherTemplates = React.lazy(() => import("./pages/teacher/TeacherTemplates"));
const BootcampReferences = React.lazy(() => import("./pages/teacher/BootcampReferences"));
const TutorCorpus = React.lazy(() => import("./pages/teacher/TutorCorpus"));
const TeacherSessionIngest = React.lazy(() => import("./pages/teacher/TeacherSessionIngest"));

const BootcampReferenceDetail = React.lazy(() => import("./pages/teacher/BootcampReferenceDetail"));
const PublicBooking = React.lazy(() => import("./pages/PublicBooking"));
const BookingWorkspace = React.lazy(() => import("./pages/booking/BookingWorkspace"));
/** Dev-only; the route that mounts it is gated on import.meta.env.DEV. */
const ActivityLab = React.lazy(() => import("./pages/ActivityLab"));
import Inbox from "./pages/Inbox";
import ProtectedRoute from "./components/ProtectedRoute";
import BootcampGate from "./components/hub/BootcampGate";
import { FloatingMessenger } from "./components/inbox/FloatingMessenger";
import { StudentCornerBubble } from "./components/inbox/StudentCornerBubble";
import AdminChatHub from "./components/chat-hub/AdminChatHub";
import { FloatingHelpButton } from "./components/help/FloatingHelpButton";

// Surfaces that own the whole screen and must stay free of floating chrome.
// The exam players are the strict case: nothing may sit over the passage, the
// choices or the footer's primary action.
const OVERLAY_FREE_PREFIXES = ["/book/", "/classroom", "/drill", "/rc"];

function GlobalOverlayMount() {
  const { pathname } = useLocation();
  if (OVERLAY_FREE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return null;
  return (
    <>
      <FloatingMessenger />
      <StudentCornerBubble />
      <AdminChatHub />
      <FloatingHelpButton />
    </>
  );
}

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
/**
 * Redirect that carries the incoming query string to the target, merging it
 * when the target already has one. Deep links like
 * `/teacher/assignments?student=abc` keep their student context instead of
 * dropping it at the redirect.
 */
function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation();
  const incoming = new URLSearchParams(search);
  const [path, targetSearch] = to.split("?");
  const merged = new URLSearchParams(targetSearch ?? "");
  incoming.forEach((value, key) => {
    if (!merged.has(key)) merged.append(key, value);
  });
  const query = merged.toString();
  return <Navigate to={query ? `${path}?${query}` : path} replace />;
}

function RedirectSmartboardToWhiteboard() {
  const { search } = useLocation();
  return <Navigate to={`/teacher/whiteboard${search}`} replace />;
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
  const { search } = useLocation();
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

  return <Navigate to={rest ? `${target}?${rest}` : target} replace />;
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
            {/* Public, no-login per-student booking link (Calendly-style). */}
            <Route path="/book/:slug" element={<React.Suspense fallback={null}><PublicBooking /></React.Suspense>} />
            {/* Admin "Booking" workspace (Calendly/Cal.com-style, burgundy theme). */}
            <Route path="/booking/admin/*" element={<ProtectedRoute requireAdmin><React.Suspense fallback={null}><BookingWorkspace /></React.Suspense></ProtectedRoute>} />
            <Route path="/teacher/booking-passes" element={<Navigate to="/booking/admin" replace />} />


            {/* Onboarding is no longer a screen of its own: the intake runs in
                the classroom's orientation card, which the student opens and
                clicks through. Kept as a redirect for older links. */}
            <Route path="/onboarding" element={<Navigate to="/classroom" replace />} />

            {/* Legacy redirect: /foyer was the original route; preserve deep links from older emails / bookmarks. */}
            <Route path="/foyer" element={<Navigate to="/classroom" replace />} />

            {/* Legacy Admin Dashboard entry now lives inside Teacher Workspace. */}
            <Route path="/admin" element={<Navigate to="/teacher/students" replace />} />
            {/* The real whiteboard is the teacher workspace's: autosave, named
                sessions, per-student scoping. /admin/board was a bare Excalidraw
                with no save and no way to get a board back, so it forwards. */}
            <Route path="/admin/board" element={<Navigate to="/teacher/whiteboard" replace />} />
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

            {/* Inbox renders inside the ClassroomLayout block below. */}

            {/* All other routes - wrapped with QuestionBankProvider */}
            <Route path="/*" element={
              <QuestionBankProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/classroom" replace />} />

                  {/* Full-screen takeovers: actual LSAT question-doing + activity
                      runner stay OUTSIDE the persistent student shell. */}
                  <Route path="/drill" element={
                    <ProtectedRoute flag="has_drill_access"><Drill /></ProtectedRoute>
                  } />
                  {/* Reading Comprehension drilling. Content is static JSON; only
                      progress touches the database. See src/features/rc/CONTEXT.md. */}
                  <Route path="/rc" element={
                    <ProtectedRoute flag="has_drill_access"><RcHub /></ProtectedRoute>
                  } />
                  <Route path="/rc/drill" element={
                    <ProtectedRoute flag="has_drill_access"><RcPlayer /></ProtectedRoute>
                  } />
                  <Route path="/rc/results/:sessionId" element={
                    <ProtectedRoute flag="has_drill_access"><RcResults /></ProtectedRoute>
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
                  <Route path="/activities/:assignmentId" element={
                    <ProtectedRoute flag="has_activity_access">
                      <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
                        <ActivityRunner />
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
                      <Route path="drill" element={
                        <ProtectedRoute flag="has_drill_access">
                          <AcademyMainhub />
                        </ProtectedRoute>
                      } />
                      <Route path="uploads" element={<ClassroomUploadsView />} />
                      <Route path="account" element={<ClassroomAccountView />} />
                      <Route path="recaps" element={<ClassroomRecapsView />} />
                      <Route path="item/:itemId" element={<ClassroomItemView />} />
                      <Route path="ta/:assignmentId" element={<ClassroomTAAssignmentView />} />
                      <Route path=":assignmentId" element={<ClassroomAssignmentView />} />
                    </Route>

                    {/* Flagged keeps its own URL and its own place in the rail;
                        only the frame that draws it has changed. */}
                    <Route path="/flagged" element={
                      <ProtectedRoute flag="has_flagged_access"><FlaggedIndexView /></ProtectedRoute>
                    } />
                    <Route path="/flagged/:qid" element={
                      <ProtectedRoute flag="has_flagged_access"><FlaggedQuestionView /></ProtectedRoute>
                    } />
                    <Route path="/journal" element={
                      <ProtectedRoute flag={["has_journal_access", "has_waj_access"]} allowSignedIn>
                        <JournalIndexView />
                      </ProtectedRoute>
                    } />
                    <Route path="/journal/:qid" element={
                      <ProtectedRoute flag={["has_journal_access", "has_waj_access"]} allowSignedIn>
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
                    <Route path="/sets" element={
                      <ProtectedRoute flag="has_practice_access"><SavedSets /></ProtectedRoute>
                    } />
                    <Route path="/activities" element={
                      <ProtectedRoute flag="has_activity_access">
                        <React.Suspense fallback={null}>
                          <ActivityCentre />
                        </React.Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                      <ProtectedRoute flag="has_analytics_access"><Analytics /></ProtectedRoute>
                    } />
                    <Route path="/schedule" element={
                      <ProtectedRoute flag="has_schedule_access" allowSignedIn><Schedule /></ProtectedRoute>
                    } />
                    <Route path="/booking" element={
                      <ProtectedRoute allowSignedIn><Booking /></ProtectedRoute>
                    } />
                    {/* The rail padlocks Bootcamps on has_bootcamp_access, so
                        the route has to enforce it too. Unguarded, the padlock
                        was decorative and the URL opened anyway. */}
                    <Route path="/bootcamps" element={
                      <ProtectedRoute flag="has_bootcamp_access"><Bootcamps /></ProtectedRoute>
                    } />
                    {/* The teacher workspace: six rooms as real nested routes
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
                      <Route path="schedule" element={
                        <React.Suspense fallback={<div />}>
                          <TeacherSchedule />
                        </React.Suspense>
                      } />
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
                      <Route path="bootcamps" element={<Navigate to="/teacher/insights" replace />} />
                      <Route path="bootcamps/:topicId" element={<RedirectBootcampToInsights />} />
                      <Route path="bootcamps/:topicId/students/:studentId" element={<RedirectBootcampStudentToInsights />} />
                      <Route path="admin" element={<RedirectWithSearch to="/teacher/students" />} />
                      <Route path="access" element={<Navigate to="/teacher/students" replace />} />
                      <Route path="permissions" element={<Navigate to="/teacher/students" replace />} />
                      <Route path="library/assignments/new" element={<RedirectWithSearch to="/teacher/library/bootcamps" />} />
                      <Route path="library/recaps" element={<Navigate to="/teacher/library" replace />} />
                      <Route path="library/uploads" element={<RedirectWithSearch to="/teacher/library" />} />
                      <Route path="library/analytics" element={<Navigate to="/teacher/library" replace />} />
                      <Route path="library/smartboard" element={<RedirectSmartboardToWhiteboard />} />
                      <Route path="assignments" element={<RedirectWithSearch to="/teacher/library/assignments" />} />
                      <Route path="recaps" element={<Navigate to="/teacher/library" replace />} />
                      <Route path="uploads" element={<Navigate to="/teacher/library" replace />} />
                      <Route path="analytics-bridge" element={<Navigate to="/teacher/library" replace />} />
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
                  <Route path="/practice" element={<Navigate to="/classroom/drill" replace />} />
                  <Route path="/practice/sets" element={<Navigate to="/sets" replace />} />
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
