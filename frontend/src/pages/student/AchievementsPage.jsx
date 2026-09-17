import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useBreadcrumb } from '../../context/BreadcrumbContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getStudentAchievements } from '../../services/badgeService.js';
import { formatDate } from '../../utils/format.js';
import Card from '../../components/common/Card.jsx';
import { CountUp, ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ProgressBar } from '../../components/common/Progress.jsx';
import BadgeEmblem from '../../components/illustrations/BadgeEmblem.jsx';

/** Personal records strip (Longest Streak, Perfect Missions, Best XP Day, Section Rank). */
function RecordTile({ icon, tone, value, label, hint, index }) {
  return (
    <div className={`record-tile record-tile--${tone} anim-fade-up`} style={{ '--i': index }}>
      <span className="record-tile__icon"><Icon name={icon} size={22} /></span>
      <strong className="record-tile__value">{value}</strong>
      <span className="record-tile__label">{label}</span>
      <span className="record-tile__hint">{hint}</span>
    </div>
  );
}

export default function AchievementsPage() {
  useDocumentTitle('Achievements');
  useBreadcrumb([{ label: 'Profile', to: '/student/profile' }, { label: 'Achievements' }]);
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAsync(() => getStudentAchievements(user._id), [user._id]);

  if (isLoading && !data) return <LoadingState label="Loading achievements…" />;
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/student/profile" />;

  const { records, badges } = data;
  const earned = badges.filter((badge) => badge.isEarned);
  const locked = badges.filter((badge) => !badge.isEarned);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Your progress"
        title="Achievements"
        subtitle={`${earned.length} of ${badges.length} badges earned`}
        backTo="/student/profile"
        backLabel="Back to profile"
      />

      <section>
        <h2 className="section-heading">Personal Records</h2>
        <div className="record-grid">
          <RecordTile
            index={0}
            icon="flame"
            tone="streak"
            value={records.longestStreak.days}
            label="Longest Streak"
            hint={records.longestStreak.endedOn ? `to ${formatDate(records.longestStreak.endedOn)}` : 'No streak yet'}
          />
          <RecordTile
            index={1}
            icon="check-circle"
            tone="perfect"
            value={records.perfectMissions}
            label="Perfect Missions"
            hint="scored 100%"
          />
          <RecordTile
            index={2}
            icon="star"
            tone="xp"
            value={records.bestXpDay.xp}
            label="Best XP Day"
            hint={records.bestXpDay.day ? formatDate(records.bestXpDay.day) : 'No XP yet'}
          />
          <RecordTile
            index={3}
            icon="trophy"
            tone="rank"
            value={records.rank ? `#${records.rank}` : '—'}
            label="Section Rank"
            hint={records.sectionSize ? `of ${records.sectionSize} students` : 'Not enrolled'}
          />
        </div>
      </section>

      <section>
        <div className="section-heading-row">
          <h2 className="section-heading">Awards</h2>
          <StatusPill tone="green" icon="award">{earned.length} earned</StatusPill>
        </div>
        <ProgressBar value={(earned.length / badges.length) * 100} size="sm" tone="gold" />

        <div className="award-grid">
          {[...earned, ...locked].map((badge, index) => (
            <article
              key={badge.code}
              className={`award-card ${badge.isEarned ? 'is-earned' : 'is-locked'} anim-fade-up`}
              style={{ '--i': Math.min(index, 10) }}
            >
              <BadgeEmblem badge={badge} size={132} isEarned={badge.isEarned} showValue />
              <h3>{badge.name}</h3>
              <p>{badge.description}</p>
              {badge.isEarned ? (
                <span className="award-card__earned">
                  <Icon name="check-circle" size={14} /> Earned {formatDate(badge.earnedAt)}
                </span>
              ) : (
                <span className="award-card__locked">
                  <Icon name="lock" size={14} /> Not earned yet
                </span>
              )}
            </article>
          ))}
        </div>
      </section>

      <Card title="Total XP earned" icon="star" className="anim-fade-up">
        <p className="achievements-total">
          <CountUp value={data.totalXP} /> XP
        </p>
        <p className="text-sm text-muted">
          XP comes from passing missions. Replaying a mission adds XP only when you beat your previous best score.
        </p>
      </Card>
    </div>
  );
}
