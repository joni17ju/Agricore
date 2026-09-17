import { Navigate, Route, Routes } from 'react-router-dom';
import { ROLES } from '../constants/roles.js';
import RequireRole, { RedirectIfSignedIn } from './RequireRole.jsx';

import StudentLayout from '../layouts/StudentLayout.jsx';
import InstructorLayout from '../layouts/InstructorLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';

import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import ModulesPage from '../pages/student/ModulesPage.jsx';
import ModuleDetailPage from '../pages/student/ModuleDetailPage.jsx';
import LessonViewerPage from '../pages/student/LessonViewerPage.jsx';
import MissionsPage from '../pages/student/MissionsPage.jsx';
import MissionPlayPage from '../pages/student/MissionPlayPage.jsx';
import LeaderboardPage from '../pages/student/LeaderboardPage.jsx';
import ProfilePage from '../pages/student/ProfilePage.jsx';
import AchievementsPage from '../pages/student/AchievementsPage.jsx';

import InstructorDashboard from '../pages/instructor/InstructorDashboard.jsx';
import ModulesOverviewPage from '../pages/instructor/ModulesOverviewPage.jsx';
import ModuleLessonsPage from '../pages/instructor/ModuleLessonsPage.jsx';
import LessonEditorPage from '../pages/instructor/LessonEditorPage.jsx';
import RosterPage from '../pages/instructor/RosterPage.jsx';
import StudentPerformancePage from '../pages/instructor/StudentPerformancePage.jsx';
import InstructorLeaderboardPage from '../pages/instructor/InstructorLeaderboardPage.jsx';

import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import UserManagementPage from '../pages/admin/UserManagementPage.jsx';
import SectionManagementPage from '../pages/admin/SectionManagementPage.jsx';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<RedirectIfSignedIn />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
        </Route>
      </Route>

      <Route element={<RequireRole role={ROLES.INSTRUCTOR} />}>
        <Route path="/instructor" element={<InstructorLayout />}>
          <Route index element={<InstructorDashboard />} />
          <Route path="modules" element={<ModulesOverviewPage />} />
          <Route path="modules/:moduleId" element={<ModuleLessonsPage />} />
          <Route path="modules/:moduleId/lessons/:lessonId" element={<LessonEditorPage />} />
          <Route path="roster" element={<RosterPage />} />
          <Route path="performance" element={<StudentPerformancePage />} />
          <Route path="leaderboard" element={<InstructorLeaderboardPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role={ROLES.ADMIN} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="sections" element={<SectionManagementPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
