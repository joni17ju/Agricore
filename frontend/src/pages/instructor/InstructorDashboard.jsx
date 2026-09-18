import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getInstructorDashboard } from '../../services/analyticsService.js';
import Card from '../../components/common/Card.jsx';
import { CountUp, ErrorState, LoadingState } from '../../components/common/Display.jsx';
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
            <small>Learners enrolled across the sections you teach.</small>
          </div>
          <div className="banner-tile">
            <strong><CountUp value={data.summary.averageProgress} />%</strong>
            <span>Avg. Progress</span>
            <small>Share of course topics your students have completed so far.</small>
          </div>
          <div className="banner-tile banner-tile--risk">
            <strong><CountUp value={data.summary.atRiskCount} /></strong>
            <span>At Risk</span>
            <small>
              Tracking behind their own section &mdash; worth an early check-in.
              {/* suddenDropCount is already computed for the roster; surfacing it here. */}
              {data.summary.suddenDropCount > 0 && (
                <em>{data.summary.suddenDropCount} also show a sudden drop in recent scores.</em>
              )}
            </small>
          </div>
        </div>
      </section>

      {data.sections.length === 0 ? (
        <Card><p className="text-muted">You have no assigned sections yet. Ask the administrator to assign you to a section.</p></Card>
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
