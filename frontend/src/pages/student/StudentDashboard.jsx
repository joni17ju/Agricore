import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getCachedDashboard, loadDashboard } from '../../services/progressService.js';
import { LEADERBOARD_PERIODS, getStudentLeaderboard } from '../../services/leaderboardService.js';
import { ErrorState, SproutLoader } from '../../components/common/Display.jsx';
import {
  AchievementsCard,
  ActiveObjectives,
  CurrentModuleCard,
  LeaderboardPreview,
  WeeklyActivityChart,
  WelcomeBanner,
} from '../../components/student/DashboardWidgets.jsx';

/** Placeholder in the dashboard's own layout, shown until its first data arrives. */
function DashboardSkeleton() {
  const card = (rows, span, key) => (
    <div className={span} key={key}>
      <div className="dash-skeleton__card">
        <span className="skeleton" style={{ width: '45%', height: '1.1em' }} />
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="skeleton" style={{ width: `${88 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="page dash-skeleton" role="status" aria-label="Loading your dashboard">
      <div className="dash-skeleton__banner">
        <SproutLoader size={40} />
        <div className="dash-skeleton__banner-text">
          <span className="skeleton" style={{ width: '55%', height: '1.6em' }} />
          <span className="skeleton" style={{ width: '75%' }} />
          <span className="skeleton" style={{ width: '40%' }} />
        </div>
      </div>
      <div className="dashboard-grid">
        {card(4, 'span-4', 'a')}
        {card(4, 'span-4', 'b')}
        {card(4, 'span-4', 'c')}
        {card(3, 'span-6', 'd')}
        {card(3, 'span-6', 'e')}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  /*
   * Stale-while-revalidate: a dashboard already loaded this session (or
   * prefetched at sign-in) shows at once, and a fresh copy replaces it as soon
   * as it arrives. One request (GET /dashboard) brings everything.
   */
  const cached = getCachedDashboard(user._id);
  const { data, error, reload } = useAsync(() => loadDashboard(user._id), [user._id]);
  const view = data ?? cached;
  /*
   * The dashboard's leaderboard preview arrives without profile pictures (they
   * are large). Once the page is on screen, the full ranking is fetched — it
   * also warms the Leaderboard page — and the card switches to it.
   */
  const fullBoard = useAsync(
    () => (view ? getStudentLeaderboard(user._id, { period: LEADERBOARD_PERIODS.OVERALL }).catch(() => null) : Promise.resolve(null)),
    [user._id, Boolean(view)],
  );

  if (!view && error) return <ErrorState error={error} onRetry={reload} />;
  if (!view) return <DashboardSkeleton />;
  const { dashboard, badges } = view;
  const board = fullBoard.data ?? view.board;

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
