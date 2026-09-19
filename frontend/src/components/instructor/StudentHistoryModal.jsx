import { useAsync } from '../../hooks/useAsync.js';
import { getStudentPerformanceDetail } from '../../services/analyticsService.js';
import { formatDateTime, formatDuration, formatRelativeDays, missionCode } from '../../utils/format.js';
import { Avatar, ErrorState, LoadingState, StatTile } from '../common/Display.jsx';
import Icon from '../common/Icon.jsx';
import Modal from '../common/Modal.jsx';
import { ProgressBar } from '../common/Progress.jsx';
import { PerformancePill } from './InstructorWidgets.jsx';

/** Full performance history of one student (instructor "view" action, Fig 27). */
export default function StudentHistoryModal({ instructorId, studentId, onClose }) {
  const { data, error, isLoading } = useAsync(
    () => (studentId ? getStudentPerformanceDetail(instructorId, studentId) : Promise.resolve(null)),
    [instructorId, studentId],
  );

  return (
    <Modal isOpen={Boolean(studentId)} onClose={onClose} title="Student Performance History" size="lg">
      {isLoading && <LoadingState compact />}
      {error && <ErrorState error={error} />}
      {data && !isLoading && (
        <div className="stack">
          <div className="history-header">
            <Avatar firstName={data.student.firstName} lastName={data.student.lastName} size={56} src={data.student.avatarUrl} />
            <div>
              <h3>{data.student.firstName} {data.student.lastName}</h3>
              <p className="text-muted text-sm">
                {data.student.schoolId ?? 'No school ID'} · {data.section?.sectionName} · last active {formatRelativeDays(data.metrics.daysInactive)}
              </p>
            </div>
            <PerformancePill status={data.status} />
          </div>

          <div className="stat-grid">
            <StatTile label="Total XP" value={data.metrics.totalXP} icon="star" tone="gold" />
            <StatTile label="Weighted score" value={data.metrics.overallWeightedScore ?? 0} suffix="%" icon="chart" />
            <StatTile label="Time spent" value={formatDuration(data.metrics.timeSpentSeconds)} icon="clock" tone="blue" />
            <StatTile label="Attempts" value={data.metrics.attemptsCount} icon="target" tone="amber" />
          </div>

          <div>
            <h4 className="history-subtitle">Module progress</h4>
            <div className="module-progress-list">
              {data.modules.map((entry) => (
                <ProgressBar
                  key={entry.module._id}
                  value={entry.totalLevels ? (entry.passedLevels / entry.totalLevels) * 100 : 0}
                  size="sm"
                  tone="dark"
                  label={`Module ${entry.module.moduleNumber}: ${entry.passedLevels}/${entry.totalLevels} missions`}
                  showValue
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="history-subtitle">Attempt history ({data.attempts.length})</h4>
            {data.attempts.length === 0 ? (
              <p className="text-muted">No attempts yet.</p>
            ) : (
              <ul className="history-list history-list--scroll">
                {data.attempts.map(({ attempt, mission, module }) => (
                  <li key={attempt._id}>
                    <span className={`history-list__icon ${attempt.isPassed ? 'is-pass' : 'is-fail'}`}>
                      <Icon name={attempt.isPassed ? 'check' : 'x'} size={14} />
                    </span>
                    <span className="history-list__text">
                      <strong>{missionCode(module, mission)} · {mission?.scenarioData.title}</strong>
                      <small>{formatDateTime(attempt.attemptedAt)} · {formatDuration(attempt.timeSpentSeconds)}</small>
                    </span>
                    <span>
                      <strong>{attempt.score}%</strong>
                      <br />
                      <small className="text-muted">+{attempt.xpEarned} XP</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
