import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { USER_STATUS, USER_STATUS_LABELS } from '../../constants/roles.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getStudentPerformance } from '../../services/analyticsService.js';
import { listRoster, removeRosterStudent, updateRosterStudent } from '../../services/userService.js';
import Button, { IconButton } from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import { Avatar, ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import { SearchInput, SelectInput, TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import Modal, { ConfirmDialog } from '../../components/common/Modal.jsx';
import { ProgressBar } from '../../components/common/Progress.jsx';
import { SectionFilter } from '../../components/instructor/InstructorWidgets.jsx';

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
  const [bulkOpen, setBulkOpen] = useState(false);

  const roster = useAsync(() => listRoster(user._id, { sectionId: sectionId || undefined }), [user._id, sectionId]);
  const performance = useAsync(() => getStudentPerformance(user._id, {}), [user._id]);

  const progressById = useMemo(
    () => new Map((performance.data?.rows ?? []).map((row) => [row.student._id, row.metrics.progressPercent])),
    [performance.data],
  );
  const sections = performance.data?.sections ?? [];
  const sectionName = (id) => sections.find((s) => s._id === id)?.sectionName ?? '—';

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
          <Avatar firstName={student.firstName} lastName={student.lastName} size={34} />
          <span>
            <strong>{student.firstName} {student.lastName}</strong>
          </span>
        </span>
      ),
    },
    { key: 'schoolId', header: 'School ID', render: (s) => s.schoolId ?? '—' },
    { key: 'section', header: 'Section', render: (s) => sectionName(s.sectionId) },
    { key: 'email', header: 'Email Address', hideOnMobile: true },
    {
      key: 'progress',
      header: 'Progress',
      render: (s) => (
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
          <IconButton icon="trash" label={`Remove ${s.firstName}`} size="sm" variant="danger" onClick={() => setRemoving(s)} disabled={s.status === USER_STATUS.INACTIVE} />
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Manage Roster and Enrollment" subtitle="Students enrolled in your assigned sections." />
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
      <ConfirmDialog
        isOpen={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title="Remove student from roster?"
        message={`${removing?.firstName} ${removing?.lastName} will be marked inactive. Their progress is kept and they can be reactivated later.`}
        confirmLabel="Remove"
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
