/**
 * Instructor analytics widgets (Proposal Figs 24, 27).
 */
import { Link } from 'react-router-dom';
import { PERFORMANCE_STATUS, PERFORMANCE_STATUS_LABELS } from '../../constants/rules.js';
import { Avatar, EmptyState, StatusPill } from '../common/Display.jsx';
import { SelectInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import { ProgressBar } from '../common/Progress.jsx';

const STATUS_TONES = {
  [PERFORMANCE_STATUS.ON_TRACK]: 'green',
  [PERFORMANCE_STATUS.IN_PROGRESS]: 'amber',
  [PERFORMANCE_STATUS.SUDDEN_DROP]: 'amber',
  [PERFORMANCE_STATUS.AT_RISK]: 'red',
};
const STATUS_ICONS = {
  [PERFORMANCE_STATUS.ON_TRACK]: 'check',
  [PERFORMANCE_STATUS.IN_PROGRESS]: 'clock',
  [PERFORMANCE_STATUS.SUDDEN_DROP]: 'trend-down',
  [PERFORMANCE_STATUS.AT_RISK]: 'alert',
};

export function PerformancePill({ status }) {
  return (
    <StatusPill tone={STATUS_TONES[status]} icon={STATUS_ICONS[status]}>
      {PERFORMANCE_STATUS_LABELS[status]}
    </StatusPill>
  );
}

export const progressTone = (status) =>
  status === PERFORMANCE_STATUS.AT_RISK ? 'red' : status === PERFORMANCE_STATUS.ON_TRACK ? 'dark' : 'amber';

export function SectionFilter({ sections, value, onChange, allLabel = 'All Sections' }) {
  return (
    <div className="inline-select">
      <SelectInput
        aria-label="Filter by section"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={[{ value: '', label: allLabel }, ...sections.map((section) => ({ value: section._id, label: section.sectionName }))]}
      />
    </div>
  );
}

export function SyllabusAnalytics({ summary, moduleCompletionRates }) {
  /*
   * Where the class actually stalls.
   *
   * Not simply the lowest completion rate: modules unlock in order, so the last
   * modules sit at 0% because nobody has reached them yet, not because students
   * are stuck there. The largest fall between two consecutive modules is the
   * real wall, so that is what gets reported.
   */
  const dropOff = moduleCompletionRates.reduce((worst, entry, index) => {
    if (index === 0) return worst;
    const previous = moduleCompletionRates[index - 1];
    const fall = previous.completionRate - entry.completionRate;
    return fall > (worst?.fall ?? 0) ? { previous, entry, fall } : worst;
  }, null);
  const bars = [
    { label: 'Avg. Assessment Score', value: summary.averageAssessmentScore, display: `${(summary.averageAssessmentScore / 10).toFixed(1)}` },
    { label: 'Module Completion %', value: summary.averageModuleCompletion, display: `${summary.averageModuleCompletion}%` },
  ];
  return (
    <div className="syllabus-analytics">
      <div className="big-bars" role="img" aria-label={`Average assessment score ${summary.averageAssessmentScore}%, module completion ${summary.averageModuleCompletion}%`}>
        {bars.map((bar, index) => (
          <div key={bar.label} className="big-bars__col">
            <div className="big-bars__track">
              <div className="big-bars__fill" style={{ height: `${Math.max(6, bar.value)}%`, animationDelay: `${index * 150}ms` }}>
                <span>{bar.display}</span>
              </div>
            </div>
            <span className="big-bars__label">{bar.label}</span>
          </div>
        ))}
      </div>
      <div className="module-completion">
        <h3>Module completion</h3>
        {dropOff && (
          <p className="panel-note panel-note--sub">
            Biggest drop-off: {dropOff.previous.completionRate}% cleared Module {dropOff.previous.moduleNumber},
            but only {dropOff.entry.completionRate}% cleared Module {dropOff.entry.moduleNumber}.
          </p>
        )}
        {moduleCompletionRates.map((module) => (
          <ProgressBar key={module.moduleId} value={module.completionRate} size="sm" tone="dark" label={`M${module.moduleNumber} · ${module.title}`} showValue />
        ))}
      </div>
    </div>
  );
}

export function BlindspotList({ blindspots }) {
  if (blindspots.length === 0) return <EmptyState icon="check-circle" title="No blindspots yet" message="Scores appear once students attempt missions." />;
  // No computed insight here on purpose: every row already prints its own
  // average and first-try pass rate, so a summary line would only repeat row 1.
  return (
    <>
      <p className="panel-note panel-note--sub">
        The lowest-scoring topics across your students &mdash; the ones most worth reteaching before moving on.
      </p>
      <ol className="blindspots">
        {blindspots.map((spot, index) => (
          <li key={spot.lessonId} className="anim-fade-up" style={{ '--i': index }}>
            <span className="blindspots__rank">{index + 1}</span>
            <div className="blindspots__text">
              <strong>Lesson {spot.module.moduleNumber}.{spot.lessonNumber} · {spot.title}</strong>
              <small>{spot.studentsAttempted} students · first-try pass rate {spot.firstAttemptPassRate ?? 0}%</small>
            </div>
            <StatusPill tone={spot.averageScore < 70 ? 'red' : spot.averageScore < 80 ? 'amber' : 'green'}>{spot.averageScore}%</StatusPill>
          </li>
        ))}
      </ol>
    </>
  );
}

export function StudentProgressList({ rows, limit = 6 }) {
  // Students with no mission attempt in the last week — worth chasing first.
  const inactiveCount = rows.filter((row) => (row.metrics.daysInactive ?? 0) >= 7).length;
  return (
    <>
      <p className="panel-note">
        Students who need attention first, ordered by how far behind they&rsquo;ve fallen.
        {inactiveCount > 0 && (
          <span className="panel-note__insight">
            {inactiveCount} {inactiveCount === 1 ? 'has' : 'have'}n&rsquo;t attempted a mission in over a week.
          </span>
        )}
      </p>
      <ul className="student-progress">
        {rows.slice(0, limit).map((row, index) => (
          <li key={row.student._id} className="anim-fade-up" style={{ '--i': index }}>
            <Avatar firstName={row.student.firstName} lastName={row.student.lastName} size={42} />
            <div className="student-progress__main">
              <div className="student-progress__top">
                <strong>{row.student.firstName} {row.student.lastName}</strong>
                <span>{row.metrics.progressPercent}%</span>
              </div>
              <PerformancePill status={row.status} />
              <ProgressBar value={row.metrics.progressPercent} size="sm" tone={progressTone(row.status)} />
            </div>
          </li>
        ))}
      </ul>
      <Link to="/instructor/roster" className="student-progress__more">View Full Student Roster <Icon name="arrow-right" size={14} /></Link>
    </>
  );
}

/** Topic mastery heatmap: one cell per lesson, grouped by module. */
export function MasteryHeatmap({ lessonMastery }) {
  const modules = [];
  for (const entry of lessonMastery) {
    let group = modules.find((m) => m.module._id === entry.moduleId);
    if (!group) {
      group = { module: entry.module, lessons: [] };
      modules.push(group);
    }
    group.lessons.push(entry);
  }
  return (
    <div className="heatmap">
      <div className="heatmap__legend">
        {[['mastered', 'Mastered ≥85%'], ['proficient', 'Proficient ≥70%'], ['developing', 'Developing ≥55%'], ['struggling', 'Struggling'], ['none', 'No attempts']].map(([key, label]) => (
          <span key={key}><i className={`heat heat--${key}`} /> {label}</span>
        ))}
      </div>
      {modules.map((group) => (
        <div key={group.module._id} className="heatmap__row">
          <span className="heatmap__module">M{group.module.moduleNumber}</span>
          <div className="heatmap__cells">
            {group.lessons.map((lesson, index) => (
              <div
                key={lesson.lessonId}
                className={`heatmap__cell heat--${lesson.band?.key ?? 'none'} anim-scale-in`}
                style={{ '--i': index }}
                title={`${lesson.title}: ${lesson.averageScore ?? '—'}% average · ${lesson.studentsAttempted} students`}
              >
                <strong>Lesson {group.module.moduleNumber}.{lesson.lessonNumber}</strong>
                <span>{lesson.title}</span>
                <em>{lesson.averageScore !== null ? `${lesson.averageScore}%` : '—'}</em>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
