import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { PERFORMANCE_STATUS, PERFORMANCE_STATUS_LABELS } from '../../constants/rules.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getStudentPerformance } from '../../services/analyticsService.js';
import { formatDuration } from '../../utils/format.js';
import { IconButton } from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import { Avatar, ErrorState, LoadingState, PageHeader, StatTile } from '../../components/common/Display.jsx';
import { SearchInput, SelectInput } from '../../components/common/Form.jsx';
import InfoTooltip from '../../components/common/InfoTooltip.jsx';
import { MasteryHeatmap, PerformancePill, SectionFilter } from '../../components/instructor/InstructorWidgets.jsx';
import StudentHistoryModal from '../../components/instructor/StudentHistoryModal.jsx';

export default function StudentPerformancePage() {
  useDocumentTitle('Student Performance');
  const { user } = useAuth();
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);
  const { data, error, isLoading, reload } = useAsync(
    () => getStudentPerformance(user._id, { sectionId: sectionId || undefined, status: status || undefined, search }),
    [user._id, sectionId, status, search],
  );

  if (isLoading && !data) return <LoadingState label="Loading performance…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // Map lesson ids to "Lesson m.n" labels for the best-lesson column.
  const lessonLabels = new Map(data.lessonMastery.map((l) => [l.lessonId, `Lesson ${l.module.moduleNumber}.${l.lessonNumber}`]));

  const columns = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      render: (row) => (
        <span className="cell-user">
          <Avatar firstName={row.student.firstName} lastName={row.student.lastName} size={34} src={row.student.avatarUrl} />
          <strong>{row.student.firstName} {row.student.lastName}</strong>
        </span>
      ),
    },
    { key: 'schoolId', header: 'School ID', render: (row) => row.student.schoolId ?? '—', hideOnMobile: true },
    { key: 'section', header: 'Section', render: (row) => row.section?.sectionName ?? '—' },
    { key: 'weighted', header: 'Overall Weighted', render: (row) => (row.metrics.overallWeightedScore !== null ? `${row.metrics.overallWeightedScore}%` : '—') },
    { key: 'time', header: 'Time Spent', render: (row) => formatDuration(row.metrics.timeSpentSeconds) },
    {
      key: 'best',
      header: 'Best Lesson Score',
      render: (row) =>
        row.metrics.bestLesson ? (
          <span className="best-lesson">
            <strong>{row.metrics.bestLesson.score}%</strong>
            <small>on {lessonLabels.get(row.metrics.bestLesson.lessonId)}</small>
          </span>
        ) : '—',
    },
    { key: 'status', header: 'Status', render: (row) => <PerformancePill status={row.status} /> },
    { key: 'attempted', header: 'Lessons Attempted', render: (row) => row.metrics.lessonsAttempted },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="cell-actions">
          <IconButton icon="search" label={`View full performance history for ${row.student.firstName}`} variant="outline" size="sm" onClick={() => setViewing(row.student._id)} />
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Student Performance Dashboard"
        actions={<SectionFilter sections={data.sections} value={sectionId} onChange={setSectionId} allLabel="Filter by Section" />}
      />

      <div className="stat-grid">
        <StatTile label="Students" value={data.summary.totalStudents} icon="users" index={0} />
        <StatTile label="Average progress" value={data.summary.averageProgress} suffix="%" icon="trend-up" tone="blue" index={1} />
        <StatTile label="Avg. assessment score" value={data.summary.averageAssessmentScore} suffix="%" icon="chart" tone="gold" index={2} />
        <StatTile label="Sudden drops" value={data.summary.suddenDropCount} icon="trend-down" tone="amber" index={3} />
        <StatTile label="At risk" value={data.summary.atRiskCount} icon="alert" tone="red" index={4} />
      </div>

      <Card
        title={
          /* One inline run, so the icon follows the last word instead of being
             pushed to the far edge when the flex header wraps on a phone. */
          <span className="card__title-text">
            Class Performance Overview · Topic Mastery Heatmap{' '}
            <InfoTooltip
              label="How to read the Topic Mastery Heatmap"
              text="Each cell is one topic, grouped by module, colored by your class's average best score on that topic — from Mastered down to Struggling, with a neutral color where no one has attempted it yet. Look for topics marked Struggling or No attempts to see what may need reteaching before moving on."
            />
          </span>
        }
        icon="layers"
        className="anim-fade-up"
      >
        <MasteryHeatmap lessonMastery={data.lessonMastery} />
      </Card>

      <Card title="Individual Student Lesson Records" icon="clipboard" className="anim-fade-up" style={{ '--i': 1 }}>
        <div className="toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name or school ID…" />
          <div className="inline-select">
            <SelectInput
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: '', label: 'All statuses' }, ...Object.values(PERFORMANCE_STATUS).map((s) => ({ value: s, label: PERFORMANCE_STATUS_LABELS[s] }))]}
            />
          </div>
        </div>
        <DataTable columns={columns} rows={data.rows} getRowKey={(row) => row.student._id} pageSize={10} emptyMessage="No students match your filters." />
      </Card>

      <StudentHistoryModal instructorId={user._id} studentId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
