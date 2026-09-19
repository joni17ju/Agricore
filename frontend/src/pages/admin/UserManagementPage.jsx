import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLE_LABELS, ROLES, USER_STATUS, USER_STATUS_LABELS } from '../../constants/roles.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listSections } from '../../services/sectionService.js';
import { changeUserRole, createUser, deleteUser, enrollStudent, listUsers, setUserStatus, updateUser } from '../../services/userService.js';
import Button, { IconButton } from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import { Avatar, ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import { SearchInput, SelectInput } from '../../components/common/Form.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import Tabs from '../../components/common/Tabs.jsx';
import { EnrollModal, RoleModal, UserFormModal } from '../../components/admin/AdminModals.jsx';

const ROLE_TONES = { student: 'green', instructor: 'blue', admin: 'dark' };
const STATUS_TONES = { active: 'green', pending: 'amber', inactive: 'neutral' };

export default function UserManagementPage() {
  useDocumentTitle('User Management');
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { type: 'create' | 'edit' | 'role' | 'enroll' | 'delete', user? }

  const users = useAsync(() => listUsers({}), []);
  const sections = useAsync(listSections, []);
  const sectionName = (id) => sections.data?.find((s) => s._id === id)?.sectionName;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) =>
        (!role || u.role === role) &&
        (!status || u.status === status) &&
        (!term || `${u.firstName} ${u.lastName} ${u.email} ${u.schoolId ?? ''}`.toLowerCase().includes(term)),
    );
  }, [users.data, role, status, search]);

  const counts = useMemo(() => {
    const all = users.data ?? [];
    return Object.fromEntries(Object.values(ROLES).map((r) => [r, all.filter((u) => u.role === r).length]));
  }, [users.data]);

  const run = async (action, message) => {
    await action();
    toast.success(message);
    setModal(null);
    users.reload();
  };

  const changeStatus = async (target, next) => {
    try {
      await setUserStatus(target._id, next);
      toast.success(`${target.firstName} ${target.lastName} is now ${USER_STATUS_LABELS[next].toLowerCase()}.`);
      users.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if ((users.isLoading && !users.data) || sections.isLoading) return <LoadingState label="Loading users…" />;
  if (users.error) return <ErrorState error={users.error} onRetry={users.reload} />;

  const columns = [
    {
      key: 'name',
      header: 'User',
      primary: true,
      render: (u) => (
        <span className="cell-user">
          <Avatar firstName={u.firstName} lastName={u.lastName} size={34} src={u.avatarUrl} />
          <span>
            <strong>{u.firstName} {u.lastName}</strong>
            <small>{u.email}</small>
          </span>
        </span>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <StatusPill tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</StatusPill> },
    { key: 'schoolId', header: 'ID', render: (u) => u.schoolId ?? '—', hideOnMobile: true },
    {
      key: 'section',
      header: 'Section(s)',
      render: (u) =>
        u.role === ROLES.STUDENT
          ? sectionName(u.sectionId) ?? <StatusPill tone="amber">None</StatusPill>
          : u.role === ROLES.INSTRUCTOR
            ? u.assignedSectionIds.map(sectionName).filter(Boolean).join(', ') || '—'
            : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <div className="inline-select inline-select--compact">
          <SelectInput
            aria-label={`Status for ${u.firstName}`}
            value={u.status}
            onChange={(e) => changeStatus(u, e.target.value)}
            options={Object.values(USER_STATUS).map((s) => ({ value: s, label: USER_STATUS_LABELS[s] }))}
            className={`status-select status-select--${STATUS_TONES[u.status]}`}
            disabled={u._id === currentUser._id}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="cell-actions">
          <IconButton icon="edit" label="Edit profile" size="sm" onClick={() => setModal({ type: 'edit', user: u })} />
          <IconButton icon="shield" label="Change role" size="sm" onClick={() => setModal({ type: 'role', user: u })} disabled={u._id === currentUser._id} />
          {u.role === ROLES.STUDENT && <IconButton icon="layers" label="Assign section" size="sm" onClick={() => setModal({ type: 'enroll', user: u })} />}
          <IconButton icon="trash" label="Delete account" size="sm" variant="danger" onClick={() => setModal({ type: 'delete', user: u })} disabled={u._id === currentUser._id} />
        </div>
      ),
    },
  ];

  const sectionList = sections.data ?? [];

  return (
    <div className="page">
      <PageHeader
        title="User Management"
        subtitle="Create and manage student, instructor and administrator accounts."
        actions={<Button icon="user-plus" onClick={() => setModal({ type: 'create' })}>Create Account</Button>}
      />
      <Tabs
        value={role}
        onChange={setRole}
        label="Filter by role"
        tabs={[
          { value: '', label: 'All', count: users.data.length },
          { value: ROLES.STUDENT, label: 'Students', count: counts.student },
          { value: ROLES.INSTRUCTOR, label: 'Instructors', count: counts.instructor },
          { value: ROLES.ADMIN, label: 'Administrators', count: counts.admin },
        ]}
      />
      <Card>
        <div className="toolbar">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or ID…" />
          <div className="inline-select">
            <SelectInput
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[{ value: '', label: 'All statuses' }, ...Object.values(USER_STATUS).map((s) => ({ value: s, label: USER_STATUS_LABELS[s] }))]}
            />
          </div>
        </div>
        <DataTable columns={columns} rows={rows} getRowKey={(u) => u._id} pageSize={10} emptyMessage="No accounts match your filters." />
      </Card>

      <UserFormModal
        isOpen={modal?.type === 'create' || modal?.type === 'edit'}
        user={modal?.type === 'edit' ? modal.user : null}
        sections={sectionList}
        onClose={() => setModal(null)}
        onSubmit={(form) =>
          modal.type === 'edit'
            ? run(() => updateUser(modal.user._id, form), 'Account updated.')
            : run(() => createUser(form), 'Account created.')
        }
      />
      <RoleModal
        user={modal?.type === 'role' ? modal.user : null}
        sections={sectionList}
        onClose={() => setModal(null)}
        onSubmit={(form) => run(() => changeUserRole(modal.user._id, form.role, { sectionId: form.sectionId }), 'Role updated.')}
      />
      <EnrollModal
        student={modal?.type === 'enroll' ? modal.user : null}
        sections={sectionList}
        onClose={() => setModal(null)}
        onSubmit={(sectionId) => run(() => enrollStudent(modal.user._id, sectionId), 'Section assigned.')}
      />
      <ConfirmDialog
        isOpen={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        onConfirm={() => run(() => deleteUser(modal.user._id), 'Account deleted.').catch((err) => { toast.error(err.message); setModal(null); })}
        title="Delete account?"
        message={`${modal?.user?.firstName} ${modal?.user?.lastName}'s account will be deleted${modal?.user?.role === ROLES.STUDENT ? ', together with their mission attempts and progress' : ''}. This cannot be undone.`}
        confirmLabel="Delete account"
      />
    </div>
  );
}
