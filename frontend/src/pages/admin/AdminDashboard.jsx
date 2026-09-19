import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { USER_STATUS } from '../../constants/roles.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getAdminOverview } from '../../services/analyticsService.js';
import { resetDatabase } from '../../services/mockDb.js';
import { deleteUser, setUserStatus } from '../../services/userService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader, StatTile } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';

export default function AdminDashboard() {
  useDocumentTitle('Admin Dashboard');
  const toast = useToast();
  const { data, error, isLoading, reload } = useAsync(getAdminOverview, []);
  const [resetOpen, setResetOpen] = useState(false);
  const [rejecting, setRejecting] = useState(null);

  if (isLoading && !data) return <LoadingState label="Loading overview…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const approve = async (instructor) => {
    try {
      await setUserStatus(instructor._id, USER_STATUS.ACTIVE);
      toast.success(`Prof. ${instructor.lastName} approved.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const reject = async () => {
    try {
      await deleteUser(rejecting._id);
      toast.success('Registration rejected and removed.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
    setRejecting(null);
  };

  return (
    <div className="page">
      <PageHeader eyebrow="AgriCore Administration" title="Admin Dashboard" subtitle="Accounts, roles and academic sections for Principles of Crop Protection I." />

      <div className="stat-grid">
        <StatTile label="Students" value={data.students} hint={`${data.activeStudents} active`} icon="users" index={0} />
        <StatTile label="Instructors" value={data.instructors} hint={`${data.pendingInstructors.length} pending approval`} icon="user-check" tone="blue" index={1} />
        <StatTile label="Sections" value={data.sections} hint={`${data.sectionsWithoutInstructor.length} without instructor`} icon="layers" tone="gold" index={2} />
        <StatTile label="Inactive accounts" value={data.inactiveUsers} icon="alert" tone="amber" index={3} />
        <StatTile label="Administrators" value={data.administrators} icon="shield" index={4} />
      </div>

      <div className="dashboard-grid">
        <Card title="Pending Instructor Approvals" icon="user-check" className="span-6 anim-fade-up" style={{ '--i': 1 }}>
          {data.pendingInstructors.length === 0 ? (
            <EmptyState icon="check-circle" title="No pending registrations" />
          ) : (
            <ul className="admin-list">
              {data.pendingInstructors.map((instructor) => (
                <li key={instructor._id}>
                  <Avatar firstName={instructor.firstName} lastName={instructor.lastName} size={38} src={instructor.avatarUrl} />
                  <div className="admin-list__text">
                    <strong>{instructor.firstName} {instructor.lastName}</strong>
                    <small>{instructor.email}</small>
                  </div>
                  <Button size="sm" icon="check" onClick={() => approve(instructor)}>Approve</Button>
                  <Button size="sm" variant="ghost" icon="x" onClick={() => setRejecting(instructor)}>Reject</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Needs Attention" icon="alert" className="span-6 anim-fade-up" style={{ '--i': 2 }}>
          <ul className="admin-list">
            {data.sectionsWithoutInstructor.map((section) => (
              <li key={section._id}>
                <span className="admin-list__icon"><Icon name="layers" size={18} /></span>
                <div className="admin-list__text">
                  <strong>{section.sectionName}</strong>
                  <small>No instructor assigned</small>
                </div>
                <Button size="sm" variant="soft" to="/admin/sections">Assign</Button>
              </li>
            ))}
            {data.studentsWithoutSection > 0 && (
              <li>
                <span className="admin-list__icon"><Icon name="users" size={18} /></span>
                <div className="admin-list__text">
                  <strong>{data.studentsWithoutSection} student(s) without a section</strong>
                  <small>Assign them so they appear on a leaderboard</small>
                </div>
                <Button size="sm" variant="soft" to="/admin/users">Review</Button>
              </li>
            )}
            {data.sectionsWithoutInstructor.length === 0 && data.studentsWithoutSection === 0 && (
              <EmptyState icon="check-circle" title="Everything is assigned" />
            )}
          </ul>
        </Card>

        <Card title="Course Content" icon="book" className="span-6 anim-fade-up" style={{ '--i': 3 }}>
          <div className="admin-content-stats">
            <div><strong>{data.modules}</strong><span>Modules</span></div>
            <div><strong>{data.lessons}</strong><span>Lessons</span></div>
            <div><strong>{data.missions}</strong><span>Mission levels</span></div>
          </div>
          <p className="text-sm text-muted">Lesson content is managed by instructors.</p>
        </Card>

        <Card title="Quick Actions" icon="settings" className="span-6 anim-fade-up" style={{ '--i': 4 }}>
          <div className="quick-actions">
            <Link to="/admin/users" className="quick-action"><Icon name="user-plus" size={22} /> Manage users & roles</Link>
            <Link to="/admin/sections" className="quick-action"><Icon name="layers" size={22} /> Sections & instructor assignment</Link>
            <button type="button" className="quick-action quick-action--danger" onClick={() => setResetOpen(true)}>
              <Icon name="refresh" size={22} /> Reset demo data
            </button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetDatabase();
          setResetOpen(false);
          toast.success('Demo data restored to the original seed.');
          reload();
        }}
        title="Reset demo data?"
        message="All changes made in this browser (accounts, lessons, attempts, uploads) will be replaced with the original mock data."
        confirmLabel="Reset data"
      />
      <ConfirmDialog
        isOpen={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        onConfirm={reject}
        title="Reject registration?"
        message={`The pending account for ${rejecting?.firstName} ${rejecting?.lastName} will be deleted.`}
        confirmLabel="Reject"
      />
    </div>
  );
}
