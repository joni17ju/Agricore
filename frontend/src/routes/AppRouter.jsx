import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';
import { PageLoader } from '../components/common/Display.jsx';
import { ROLES } from '../constants/roles.js';
import RequireRole, { RedirectIfSignedIn } from './RequireRole.jsx';

/*
 * The landing and sign-in pages are part of the first download, because they
 * are where almost every visit starts. Everything else is split by route and
 * fetched when first opened, so a visitor on a phone no longer downloads the
 * instructor's editor and all five mission games just to see the landing page.
 * The layouts stay with their pages' chunks and show their own sidebar while a
 * page inside them loads (see AppShell's Suspense).
 */
import AuthPage from '../pages/auth/AuthPage.jsx';
import LandingPage from '../pages/LandingPage.jsx';

const LegalPage = lazy(() => import('../pages/legal/LegalPage.jsx'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

const StudentLayout = lazy(() => import('../layouts/StudentLayout.jsx'));
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard.jsx'));
const ModulesPage = lazy(() => import('../pages/student/ModulesPage.jsx'));
const ModuleDetailPage = lazy(() => import('../pages/student/ModuleDetailPage.jsx'));
const LessonViewerPage = lazy(() => import('../pages/student/LessonViewerPage.jsx'));
const MissionsPage = lazy(() => import('../pages/student/MissionsPage.jsx'));
const MissionPlayPage = lazy(() => import('../pages/student/MissionPlayPage.jsx'));
const LeaderboardPage = lazy(() => import('../pages/student/LeaderboardPage.jsx'));
const ProfilePage = lazy(() => import('../pages/student/ProfilePage.jsx'));
const AchievementsPage = lazy(() => import('../pages/student/AchievementsPage.jsx'));

const InstructorLayout = lazy(() => import('../layouts/InstructorLayout.jsx'));
const InstructorDashboard = lazy(() => import('../pages/instructor/InstructorDashboard.jsx'));
const ModulesOverviewPage = lazy(() => import('../pages/instructor/ModulesOverviewPage.jsx'));
const ModuleLessonsPage = lazy(() => import('../pages/instructor/ModuleLessonsPage.jsx'));
const LessonEditorPage = lazy(() => import('../pages/instructor/LessonEditorPage.jsx'));
const RosterPage = lazy(() => import('../pages/instructor/RosterPage.jsx'));
const AccountRequestsPage = lazy(() => import('../pages/instructor/AccountRequestsPage.jsx'));
const SectionsPage = lazy(() => import('../pages/instructor/SectionsPage.jsx'));
const StudentPerformancePage = lazy(() => import('../pages/instructor/StudentPerformancePage.jsx'));
const InstructorLeaderboardPage = lazy(() => import('../pages/instructor/InstructorLeaderboardPage.jsx'));
const InstructorProfilePage = lazy(() => import('../pages/instructor/InstructorProfilePage.jsx'));

export default function AppRouter() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public marketing page. Deliberately not behind RedirectIfSignedIn:
              it stays readable when signed in, and its navbar links to the
              dashboard instead of offering a login button. */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/terms" element={<LegalPage doc="terms" />} />
          <Route path="/privacy" element={<LegalPage doc="privacy" />} />

          {/* The landing page shows these as a dialog, but they stay addressable
              as pages too: a bookmark, a shared link or a route guard's redirect
              to /login all render the same split panel, just without a dialog
              around it. */}
          <Route element={<RedirectIfSignedIn />}>
            <Route path="/login" element={<AuthPage initialView="login" />} />
            <Route path="/register" element={<AuthPage initialView="register" />} />
          </Route>

          <Route element={<RequireRole role={ROLES.STUDENT} />}>
            {/* Missions run full-screen without the sidebar. */}
            <Route path="/student/missions/:missionId/play" element={<MissionPlayPage />} />
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<StudentDashboard />} />
              <Route path="modules" element={<ModulesPage />} />
              <Route path="modules/:moduleId" element={<ModuleDetailPage />} />
              <Route path="lessons/:lessonId" element={<LessonViewerPage />} />
              <Route path="missions" element={<MissionsPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="achievements" element={<AchievementsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          <Route element={<RequireRole role={ROLES.INSTRUCTOR} />}>
            <Route path="/instructor" element={<InstructorLayout />}>
              <Route index element={<InstructorDashboard />} />
              <Route path="modules" element={<ModulesOverviewPage />} />
              <Route path="modules/:moduleId" element={<ModuleLessonsPage />} />
              <Route path="modules/:moduleId/lessons/:lessonId" element={<LessonEditorPage />} />
              <Route path="roster" element={<RosterPage />} />
              <Route path="requests" element={<AccountRequestsPage />} />
              <Route path="sections" element={<SectionsPage />} />
              <Route path="performance" element={<StudentPerformancePage />} />
              <Route path="leaderboard" element={<InstructorLeaderboardPage />} />
              <Route path="profile" element={<InstructorProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
