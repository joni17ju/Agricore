import { Route, Routes } from 'react-router-dom';
import { ROLES } from '../constants/roles.js';
import RequireRole, { RedirectIfSignedIn } from './RequireRole.jsx';

import StudentLayout from '../layouts/StudentLayout.jsx';
import InstructorLayout from '../layouts/InstructorLayout.jsx';

import AuthPage from '../pages/auth/AuthPage.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import NotificationsPage from '../pages/NotificationsPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import ModulesPage from '../pages/student/ModulesPage.jsx';
import ModuleDetailPage from '../pages/student/ModuleDetailPage.jsx';
import LessonViewerPage from '../pages/student/LessonViewerPage.jsx';
import MissionsPage from '../pages/student/MissionsPage.jsx';
import MissionPlayPage from '../pages/student/MissionPlayPage.jsx';
import LeaderboardPage from '../pages/student/LeaderboardPage.jsx';
import ProfilePage from '../pages/student/ProfilePage.jsx';
import InstructorProfilePage from '../pages/instructor/InstructorProfilePage.jsx';
import AchievementsPage from '../pages/student/AchievementsPage.jsx';

import InstructorDashboard from '../pages/instructor/InstructorDashboard.jsx';
import ModulesOverviewPage from '../pages/instructor/ModulesOverviewPage.jsx';
import ModuleLessonsPage from '../pages/instructor/ModuleLessonsPage.jsx';
import LessonEditorPage from '../pages/instructor/LessonEditorPage.jsx';
import RosterPage from '../pages/instructor/RosterPage.jsx';
import AccountRequestsPage from '../pages/instructor/AccountRequestsPage.jsx';
import SectionsPage from '../pages/instructor/SectionsPage.jsx';
import StudentPerformancePage from '../pages/instructor/StudentPerformancePage.jsx';
import InstructorLeaderboardPage from '../pages/instructor/InstructorLeaderboardPage.jsx';


export default function AppRouter() {
  return (
    <Routes>
      {/* Public marketing page. Deliberately not behind RedirectIfSignedIn:
          it stays readable when signed in, and its navbar links to the
          dashboard instead of offering a login button. */}
      <Route path="/" element={<LandingPage />} />

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
  );
}
