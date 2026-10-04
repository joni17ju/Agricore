import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { USER_STATUS, USER_STATUS_LABELS } from '../../constants/roles.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getStudentPerformance } from '../../services/analyticsService.js';
import {
  createStudent,
  deleteUser,
  listRoster,
  removeRosterStudent,
  setUserStatus,
  updateRosterStudent,
} from '../../services/userService.js';
import Button, { IconButton } from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import { Avatar, ErrorState, LoadingState, PageHeader, Skeleton, StatusPill } from '../../components/common/Display.jsx';
import { SearchInput, SelectInput, TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import Modal, { ConfirmDialog } from '../../components/common/Modal.jsx';
import { ProgressBar } from '../../components/common/Progress.jsx';
import { SectionFilter } from '../../components/instructor/InstructorWidgets.jsx';
import { StudentFormModal } from '../../components/instructor/ManagementModals.jsx';

const STATUS_TONES = { active: 'green', inactive: 'neutral', pending: 'amber' };

export default function RosterPage() {
  useDocumentTitle('Roster and Enrollment');
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const roster = useAsync(() => listRoster(user._id, { sectionId: sectionId || undefined }), [user._id, sectionId]);
  const performance = useAsync(() => getStudentPerformance(user._id, {}), [user._id]);

  const progressById = useMemo(
    () => new Map((performance.data?.rows ?? []).map((row) => [row.student._id, row.metrics.progressPercent])),
    [performance.data],
  );
  const sections = performance.data?.sections ?? [];
  const sectionName = (id) => sections.find((s) => s._id === id)?.sectionName ?? '—';

  /*
   * The roster list and the per-student analytics load independently, and the
   * analytics call is much the slower of the two. Until it lands, the Section
   * and Progress columns have nothing real to show — rendering their empty
   * values ("—" and 0%) made a loading table look like a broken one. Falls
   * back to those values if the call fails, so an actual failure still reads
   * as missing data rather than as a placeholder that never resolves.
   */
  const analyticsPending = performance.isLoading && !performance.data;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (roster.data ?? []).filter(
      (student) =>
        (!status || student.status === status) &&
        (!term || `${student.firstName} ${student.lastName} ${student.email} ${student.schoolId ?? ''}`.toLowerCase().includes(term)),
    );
  }, [roster.data, search, status]);

  const refresh = () => {
    roster.reload();
    performance.reload();
  };

  const confirmRemove = async () => {
    try {
      await removeRosterStudent(user._id, removing._id);
      toast.success(`${removing.firstName} ${removing.lastName} was removed from the active roster.`);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
    setRemoving(null);
  };

  const addStudent = async (form) => {
    await createStudent(form);
    toast.success(`${form.firstName} ${form.lastName} was added and can sign in straight away.`);
    setIsAdding(false);
    refresh();
  };

  /** Deactivate and reactivate are the same call with a different status. */
  const changeStatus = async (student, next) => {
    try {
      await setUserStatus(student._id, next);
      toast.success(
        next === USER_STATUS.ACTIVE
          ? `${student.firstName} ${student.lastName} is active again.`
          : `${student.firstName} ${student.lastName} was deactivated.`,
      );
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteUser(deleting._id);
      toast.success(`${deleting.firstName} ${deleting.lastName} was deleted.`);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
    setDeleting(null);
  };

  const bulkDeactivate = async () => {
    try {
      await Promise.all([...selectedKeys].map((id) => removeRosterStudent(user._id, id)));
      toast.success(`${selectedKeys.size} student(s) deactivated.`);
      setSelectedKeys(new Set());
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
    setBulkOpen(false);
  };

  if (roster.isLoading && !roster.data) return <LoadingState label="Loading roster…" />;
  if (roster.error) return <ErrorState error={roster.error} onRetry={roster.reload} />;

  const columns = [
    {
      key: 'name',
      header: 'Name',
      primary: true,
      render: (student) => (
        <span className="cell-user">
          <Avatar firstName={student.firstName} lastName={student.lastName} size={34} src={student.avatarUrl} />
          <span>
            <strong>{student.firstName} {student.lastName}</strong>
          </span>
        </span>
      ),
    },
    { key: 'schoolId', header: 'School ID', render: (s) => s.schoolId ?? '—' },
    {
      key: 'section',
      header: 'Section',
      render: (s) => (analyticsPending ? <Skeleton width="4.5rem" label="Loading section" /> : sectionName(s.sectionId)),
    },
    { key: 'email', header: 'Email Address', hideOnMobile: true },
    {
      key: 'progress',
      header: 'Progress',
      render: (s) =>
        analyticsPending ? (
          <Skeleton width="100%" label="Loading progress" />
        ) : (
          <div className="cell-progress">
            <ProgressBar value={progressById.get(s._id) ?? 0} size="sm" tone="dark" label={`${progressById.get(s._id) ?? 0}%`} />
          </div>
        ),
    },
    { key: 'status', header: 'Status', render: (s) => <StatusPill tone={STATUS_TONES[s.status]}>{USER_STATUS_LABELS[s.status]}</StatusPill> },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <div className="cell-actions">
          <IconButton icon="edit" label={`Edit ${s.firstName}`} size="sm" onClick={() => setEditing(s)} />
          {s.status === USER_STATUS.INACTIVE ? (
            <IconButton
              icon="refresh"
              label={`Reactivate ${s.firstName}`}
              size="sm"
              onClick={() => changeStatus(s, USER_STATUS.ACTIVE)}
            />
          ) : (
            <IconButton
              icon="ban"
              label={`Deactivate ${s.firstName}`}
              size="sm"
              onClick={() => setRemoving(s)}
            />
          )}
          {/* Deactivating keeps their work; deleting does not, so it is separate. */}
          <IconButton icon="trash" label={`Delete ${s.firstName}`} size="sm" variant="danger" onClick={() => setDeleting(s)} />
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Manage Roster and Enrollment"
        subtitle="Students enrolled in your assigned sections."
        actions={<Button icon="user-plus" onClick={() => setIsAdding(true)}>Add student</Button>}
      />
      <Card
        title="Active Student Roster"
        icon="users"
        actions={
          selectedKeys.size > 0 && (
            <Button size="sm" variant="danger" icon="user-check" onClick={() => setBulkOpen(true)}>
              Deactivate {selectedKeys.size} selected
            </Button>
          )
        }
      >
        <div className="toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Search students…" />
          <SectionFilter sections={sections} value={sectionId} onChange={setSectionId} />
          <div className="inline-select">
            <SelectInput
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(s) => s._id}
          pageSize={10}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          emptyMessage="No students match your filters."
        />
      </Card>

      <EditStudentModal
        student={editing}
        sections={sections}
        onClose={() => setEditing(null)}
        onSave={async (changes) => {
          await updateRosterStudent(user._id, editing._id, changes);
          toast.success('Student updated.');
          setEditing(null);
          refresh();
        }}
      />
      <StudentFormModal
        isOpen={isAdding}
        student={null}
        sections={sections}
        onClose={() => setIsAdding(false)}
        onSubmit={addStudent}
      />
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete this student?"
        message={`${deleting?.firstName} ${deleting?.lastName}'s account, attempts and progress will be permanently removed. Deactivate instead if you only want to remove their access.`}
        confirmLabel="Delete permanently"
      />
      <ConfirmDialog
        isOpen={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title="Deactivate this student?"
        message={`${removing?.firstName} ${removing?.lastName} will be marked inactive. Their progress is kept and they can be reactivated later.`}
        confirmLabel="Deactivate"
      />
      <ConfirmDialog
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onConfirm={bulkDeactivate}
        title="Deactivate selected students?"
        message={`${selectedKeys.size} student(s) will be marked inactive.`}
        confirmLabel="Deactivate"
      />
    </div>
  );
}

function EditStudentModal({ student, sections, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (student && (!form || form._id !== student._id)) {
    setForm({ _id: student._id, firstName: student.firstName, lastName: student.lastName, email: student.email, schoolId: student.schoolId ?? '', sectionId: student.sectionId, status: student.status });
    setError('');
  }

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const save = async () => {
    setIsSaving(true);
    setError('');
    try {
      const { _id, ...changes } = form;
      await onSave(changes);
      setForm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(student)}
      onClose={() => { setForm(null); onClose(); }}
      title="Edit student"
      footer={
        <>
          <Button variant="secondary" onClick={() => { setForm(null); onClose(); }}>Cancel</Button>
          <Button icon="save" onClick={save} isLoading={isSaving}>Save changes</Button>
        </>
      }
    >
      {form && (
        <div className="stack">
          {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
          <div className="form-grid">
            <TextInput label="First name" value={form.firstName} onChange={update('firstName')} />
            <TextInput label="Last name" value={form.lastName} onChange={update('lastName')} />
            <div className="span-2"><TextInput label="Email address" type="email" value={form.email} onChange={update('email')} /></div>
            <TextInput label="School ID" value={form.schoolId} onChange={update('schoolId')} placeholder="2023-0101" />
            <SelectInput label="Section" value={form.sectionId} onChange={update('sectionId')} options={sections.map((s) => ({ value: s._id, label: s.sectionName }))} />
            <SelectInput
              label="Status"
              value={form.status}
              onChange={update('status')}
              options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
