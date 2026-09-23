import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABELS } from '../../constants/roles.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getStudentBadges } from '../../services/badgeService.js';
import { getStudentCurriculumMap, getStudentDashboard } from '../../services/progressService.js';
import { formatDateTime, missionCode } from '../../utils/format.js';
import AvatarUploader from '../../components/common/AvatarUploader.jsx';
import AccountDetails from '../../components/common/AccountDetails.jsx';
import Card from '../../components/common/Card.jsx';
import SecurityCard from '../../components/common/SecurityCard.jsx';
import { ErrorState, LoadingState, StatTile } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ProgressBar } from '../../components/common/Progress.jsx';
import BadgeTile from '../../components/student/BadgeTile.jsx';

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAsync(
    () => Promise.all([getStudentDashboard(user._id), getStudentBadges(user._id)]),
    [user._id],
  );
  const curriculum = useAsync(() => getStudentCurriculumMap(user._id), [user._id]);

  if (isLoading || curriculum.isLoading) return <LoadingState label="Loading profile…" />;
  if (error || curriculum.error) return <ErrorState error={error ?? curriculum.error} onRetry={reload} />;

  const [dashboard, badges] = data;
  const earned = badges.filter((badge) => badge.isEarned).length;
  const lessonModule = new Map(curriculum.data.flatMap((entry) => entry.lessons.map((l) => [l.lesson._id, entry.module])));

  return (
    <div className="page">
      <Card className="anim-fade-up">
        <div className="profile-hero">
          <AvatarUploader size={80} />
          <div className="profile-hero__info">
            <h1>{user.firstName} {user.lastName}</h1>
            <span className="profile-hero__role">{ROLE_LABELS[user.role]}</span>
            <div style={{ maxWidth: 420, marginTop: 8 }}>
              <ProgressBar
                value={dashboard.level.progressPercent}
                tone="gold"
                label={`Level ${dashboard.level.level}`}
                showValue
              />
            </div>
          </div>
        </div>

        <h2 className="section-heading">Account information</h2>
        <AccountDetails
          fields={[
            { label: 'Full name', value: `${user.firstName} ${user.lastName}`, icon: 'user' },
            { label: 'Email address', value: user.email, icon: 'mail' },
            { label: 'ID number', value: user.schoolId, icon: 'id' },
            { label: 'Section', value: dashboard.section?.sectionName, icon: 'layers' },
            { label: 'Role', value: ROLE_LABELS[user.role], icon: 'shield' },
          ]}
        />
      </Card>

      <SecurityCard />

      <div className="stat-grid">
        <StatTile label="Total XP" value={dashboard.totalXP} icon="star" tone="gold" index={0} />
        <StatTile label="Level" value={dashboard.level.level} icon="trend-up" index={1} />
        <StatTile label="Day streak" value={dashboard.streak} icon="flame" tone="amber" index={2} />
        <StatTile label="Topics cleared" value={`${dashboard.completedLessons}/${dashboard.totalLessons}`} icon="book" tone="blue" index={3} />
        <StatTile label="Badges" value={`${earned}/${badges.length}`} icon="award" index={4} />
      </div>

      <Card
        title="Badges"
        icon="award"
        actions={
          <>
            <span className="chip">{earned} of {badges.length} earned</span>
            <Link to="/student/achievements" className="text-sm">View all</Link>
          </>
        }
      >
        <div className="badge-grid badge-grid--profile">
          {badges.slice(0, 8).map((badge, index) => (
            <BadgeTile key={badge.code} badge={badge} index={index} compact />
          ))}
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card title="Module Progress" icon="book" className="span-6">
          <div className="module-progress-list">
            {curriculum.data.map((entry) => (
              <ProgressBar
                key={entry.module._id}
                value={entry.progressPercent}
                label={`Module ${entry.module.moduleNumber}: ${entry.module.title}`}
                showValue
                tone={entry.isCleared ? 'green' : 'dark'}
              />
            ))}
          </div>
        </Card>
        <Card title="Recent Missions" icon="clock" className="span-6">
          {dashboard.recentAttempts.length === 0 ? (
            <p className="text-muted">No missions played yet.</p>
          ) : (
            <ul className="history-list">
              {dashboard.recentAttempts.map(({ attempt, mission }) => {
                const module = mission ? lessonModule.get(mission.lessonId) : null;
                return (
                  <li key={attempt._id}>
                    <span className={`history-list__icon ${attempt.isPassed ? 'is-pass' : 'is-fail'}`}>
                      <Icon name={attempt.isPassed ? 'check' : 'refresh'} size={14} />
                    </span>
                    <span className="history-list__text">
                      <strong>{mission?.scenarioData.title ?? 'Mission'}</strong>
                      <small>{missionCode(module, mission)} · {formatDateTime(attempt.attemptedAt)}</small>
                    </span>
                    <span className="text-right">
                      <strong>{attempt.score}%</strong>
                      <br />
                      <small className="text-muted">+{attempt.xpEarned} XP</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
