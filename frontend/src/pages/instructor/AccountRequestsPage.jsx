import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listSections } from '../../services/sectionService.js';
import { approveStudent, listPendingStudents, rejectStudent } from '../../services/userService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/common/Display.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { formatDate } from '../../utils/format.js';

/**
 * Students waiting to be approved.
 *
 * Shows every pending student rather than only those in this instructor's own
 * sections: a section with no assigned instructor would otherwise leave its
 * requests invisible and the accounts stuck pending forever.
 */
export default function AccountRequestsPage() {
  useDocumentTitle('Account Requests');
  const toast = useToast();
  const requests = useAsync(listPendingStudents, []);
  const sections = useAsync(listSections, []);
  const [rejecting, setRejecting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const sectionName = (id) => sections.data?.find((section) => section._id === id)?.sectionName ?? '—';

  const approve = async (student) => {
    setBusyId(student._id);
    try {
      await approveStudent(student._id);
      toast.success(`${student.firstName} ${student.lastName} can now sign in.`);
      requests.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    try {
      await rejectStudent(rejecting._id);
      toast.success(`${rejecting.firstName}'s request was rejected.`);
      requests.reload();
    } catch (err) {
      toast.error(err.message);
    }
    setRejecting(null);
  };

  if (requests.isLoading && !requests.data) return <LoadingState label="Loading account requests…" />;
  if (requests.error) return <ErrorState error={requests.error} onRetry={requests.reload} />;

  const rows = requests.data ?? [];

  const columns = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      render: (student) => (
        <span className="cell-user">
          <Avatar firstName={student.firstName} lastName={student.lastName} size={34} src={student.avatarUrl} />
          <strong>{student.firstName} {student.lastName}</strong>
        </span>
      ),
    },
    { key: 'email', header: 'Email Address' },
    { key: 'schoolId', header: 'School ID', render: (student) => student.schoolId ?? '—' },
    { key: 'section', header: 'Section', render: (student) => sectionName(student.sectionId) },
    {
      key: 'requested',
      header: 'Requested',
      render: (student) => (student.createdAt ? formatDate(student.createdAt) : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => (
        <div className="cell-actions">
          <Button
            size="sm"
            icon="check"
            isLoading={busyId === student._id}
            onClick={() => approve(student)}
          >
            Approve
          </Button>
          <Button size="sm" variant="danger" icon="x" disabled={busyId === student._id} onClick={() => setRejecting(student)}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Account Requests"
        subtitle={
          rows.length > 0
            ? `${rows.length} student${rows.length === 1 ? '' : 's'} waiting for approval.`
            : 'Students who sign up appear here until you approve them.'
        }
      />

      <Card className="anim-fade-up">
        {rows.length === 0 ? (
          <EmptyState
            icon="user-check"
            title="No pending requests"
            message="New student sign-ups will show up here for you to approve."
          />
        ) : (
          <DataTable columns={columns} rows={rows} getRowKey={(student) => student._id} pageSize={10} />
        )}
      </Card>

      <ConfirmDialog
        isOpen={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        onConfirm={confirmReject}
        title="Reject this request?"
        message={
          rejecting
            ? `${rejecting.firstName} ${rejecting.lastName}'s pending account will be deleted. They can sign up again with the same email and school ID.`
            : ''
        }
        confirmLabel="Reject"
      />
    </div>
  );
}
