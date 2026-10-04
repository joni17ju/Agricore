import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getInstructorDashboard } from '../../services/analyticsService.js';
import { listPendingStudents } from '../../services/userService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { Avatar, CountUp, ErrorState, LoadingState } from '../../components/common/Display.jsx';
import {
  BlindspotList,
  SectionFilter,
  StudentProgressList,
  SyllabusAnalytics,
} from '../../components/instructor/InstructorWidgets.jsx';

export default function InstructorDashboard() {
  useDocumentTitle('Instructor Dashboard');
  const { user } = useAuth();
  const [sectionId, setSectionId] = useState('');
  const { data, error, isLoading, reload } = useAsync(
    () => getInstructorDashboard(user._id, { sectionId: sectionId || undefined }),
    [user._id, sectionId],
  );
  /*
   * Separate from the dashboard analytics on purpose: account requests are not
   * section-scoped, so the section filter above must not hide them.
   */
  const pending = useAsync(listPendingStudents, []);

  if (isLoading && !data) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const sectionLabel = sectionId ? data.sections.find((s) => s._id === sectionId)?.sectionName : 'All assigned sections';

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 className="page-header__title anim-fade-up">Dashboard Overview</h1>
        {data.sections.length > 1 && <SectionFilter sections={data.sections} value={sectionId} onChange={setSectionId} />}
      </div>

      <section className="instructor-banner anim-fade-up">
        <div>
          <h2>Welcome back, Prof. {user.lastName} <span aria-hidden="true">🌾</span></h2>
          <p>Principles of Crop Protection I · {sectionLabel}</p>
        </div>
        <div className="instructor-banner__tiles">
          <div className="banner-tile">
            <strong><CountUp value={data.summary.totalStudents} /></strong>
            <span>Students</span>
          </div>
          <div className="banner-tile">
            <strong><CountUp value={data.summary.averageProgress} />%</strong>
            <span>Avg. Progress</span>
          </div>
          <div className="banner-tile banner-tile--risk">
            <strong><CountUp value={data.summary.atRiskCount} /></strong>
            <span>At Risk</span>
          </div>
        </div>
      </section>

      {/* Only shown when something is actually waiting, so the dashboard does
          not carry a permanent empty box. */}
      {(pending.data ?? []).length > 0 && (
        <Card
          title="Pending approvals"
          icon="user-check"
          className="anim-fade-up pending-approvals"
          actions={
            <Button size="sm" to="/instructor/requests" iconRight="arrow-right">
              Review {pending.data.length} request{pending.data.length === 1 ? '' : 's'}
            </Button>
          }
        >
          <p className="text-sm text-muted pending-approvals__intro">
            These students cannot sign in until you approve them.
          </p>
          <ul className="pending-approvals__list">
            {pending.data.slice(0, 4).map((student) => (
              <li key={student._id}>
                <Avatar firstName={student.firstName} lastName={student.lastName} size={30} src={student.avatarUrl} />
                <span>
                  <strong>{student.firstName} {student.lastName}</strong>
                  <small>{student.email}</small>
                </span>
              </li>
            ))}
          </ul>
          {pending.data.length > 4 && (
            <Link to="/instructor/requests" className="text-sm">
              and {pending.data.length - 4} more
            </Link>
          )}
        </Card>
      )}

      {data.sections.length === 0 ? (
        <Card><p className="text-muted">You have no assigned sections yet. Assign yourself to one from the Sections page.</p></Card>
      ) : (
        <div className="dashboard-grid">
          <Card title="Syllabus Descriptive Analytics" icon="chart" className="span-8 anim-fade-up" style={{ '--i': 1 }}>
            <p className="panel-note">Class-wide averages across the whole syllabus, and how far each module has been cleared.</p>
            <div className="analytics-split">
              <SyllabusAnalytics summary={data.summary} moduleCompletionRates={data.moduleCompletionRates} />
              <div>
                <h3 className="analytics-split__title">Top Diagnostic Blindspots</h3>
                <BlindspotList blindspots={data.blindspots} />
              </div>
            </div>
          </Card>
          <Card title="Students Progress" icon="users" className="span-4 anim-fade-up" style={{ '--i': 2 }}>
            <StudentProgressList rows={data.rows} />
          </Card>
        </div>
      )}
    </div>
  );
}
