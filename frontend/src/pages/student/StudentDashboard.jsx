import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getStudentDashboard } from '../../services/progressService.js';
import { getStudentBadges } from '../../services/badgeService.js';
import { getStudentLeaderboard } from '../../services/leaderboardService.js';
import { ErrorState, LoadingState } from '../../components/common/Display.jsx';
import {
  AchievementsCard,
  ActiveObjectives,
  CurrentModuleCard,
  LeaderboardPreview,
  WeeklyActivityChart,
  WelcomeBanner,
} from '../../components/student/DashboardWidgets.jsx';

export default function StudentDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAsync(
    () =>
      Promise.all([
        getStudentDashboard(user._id),
        getStudentBadges(user._id),
        getStudentLeaderboard(user._id, { period: 'overall' }).catch(() => null),
      ]),
    [user._id],
  );

  if (isLoading) return <LoadingState label="Loading your dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const [dashboard, badges, board] = data;

  return (
    <div className="page">
      <WelcomeBanner
        student={dashboard.student}
        totalXP={dashboard.totalXP}
        streak={dashboard.streak}
        level={dashboard.level}
        currentModule={dashboard.currentModule}
      />
      <div className="dashboard-grid">
        <div className="span-4"><CurrentModuleCard moduleEntry={dashboard.currentModule} nextStep={dashboard.nextStep} index={1} /></div>
        <div className="span-4"><AchievementsCard badges={badges} index={2} /></div>
        <div className="span-4"><LeaderboardPreview board={board} studentId={user._id} index={3} /></div>
        <div className="span-6"><ActiveObjectives objectives={dashboard.objectives} index={4} /></div>
        <div className="span-6"><WeeklyActivityChart days={dashboard.weeklyActivity} index={5} /></div>
      </div>
    </div>
  );
}
