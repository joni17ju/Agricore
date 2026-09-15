/**
 * Administrator forms: create/edit accounts, change roles, sections and
 * instructor assignment (Proposal functional requirements for administrators).
 */
import { useEffect, useState } from 'react';
import { ROLE_LABELS, ROLES, USER_STATUS, USER_STATUS_LABELS } from '../../constants/roles.js';
import Button from '../common/Button.jsx';
import { SelectInput, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import Modal from '../common/Modal.jsx';

const roleOptions = Object.values(ROLES).map((role) => ({ value: role, label: ROLE_LABELS[role] }));
const statusOptions = Object.values(USER_STATUS).map((status) => ({ value: status, label: USER_STATUS_LABELS[status] }));

function useFormState(isOpen, initial) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setForm(initial);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submit = async (action) => {
    setIsSaving(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return { form, setForm, error, isSaving, submit, update: (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value })) };
}

const ErrorBanner = ({ error }) => (error ? <div className="form-error"><Icon name="alert" size={16} /> {error}</div> : null);

/** Create a new account, or edit the profile of an existing one. */
export function UserFormModal({ isOpen, user, sections, onClose, onSubmit }) {
  const isEdit = Boolean(user);
  const { form, error, isSaving, submit, update } = useFormState(isOpen, {
    role: user?.role ?? ROLES.STUDENT,
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    schoolId: user?.schoolId ?? '',
    sectionId: user?.sectionId ?? sections[0]?._id ?? '',
    status: user?.status ?? USER_STATUS.ACTIVE,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit account' : 'Create account'}
      description={isEdit ? 'Update profile details. Use Change role to switch roles.' : 'Create a student, instructor or administrator account.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={isEdit ? 'save' : 'user-plus'} isLoading={isSaving} onClick={() => submit(() => onSubmit(form))}>
            {isEdit ? 'Save changes' : 'Create account'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <ErrorBanner error={error} />
        <div className="form-grid">
          {!isEdit && <SelectInput label="Role" value={form.role} onChange={update('role')} options={roleOptions} />}
          {!isEdit && <SelectInput label="Status" value={form.status} onChange={update('status')} options={statusOptions} />}
          <TextInput label="First name" value={form.firstName} onChange={update('firstName')} required />
          <TextInput label="Last name" value={form.lastName} onChange={update('lastName')} required />
          <div className="span-2"><TextInput label="Email address" type="email" value={form.email} onChange={update('email')} required /></div>
          <TextInput label={form.role === ROLES.STUDENT ? 'School ID' : 'Employee ID'} value={form.schoolId} onChange={update('schoolId')} />
          {!isEdit && form.role === ROLES.STUDENT && (
            <SelectInput label="Section" value={form.sectionId} onChange={update('sectionId')} options={sections.map((s) => ({ value: s._id, label: s.sectionName }))} />
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Change a user's role; students also need a section. */
export function RoleModal({ user, sections, onClose, onSubmit }) {
  const { form, error, isSaving, submit, update } = useFormState(Boolean(user), {
    role: user?.role ?? ROLES.STUDENT,
    sectionId: user?.sectionId ?? sections[0]?._id ?? '',
  });

  return (
    <Modal
      isOpen={Boolean(user)}
      onClose={onClose}
      title="Change role"
      description={user ? `${user.firstName} ${user.lastName} · currently ${ROLE_LABELS[user.role]}` : ''}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="shield" isLoading={isSaving} disabled={form.role === user?.role} onClick={() => submit(() => onSubmit(form))}>Update role</Button>
        </>
      }
    >
      <div className="stack">
        <ErrorBanner error={error} />
        <SelectInput label="New role" value={form.role} onChange={update('role')} options={roleOptions} />
        {form.role === ROLES.STUDENT && (
          <SelectInput label="Section" value={form.sectionId} onChange={update('sectionId')} options={sections.map((s) => ({ value: s._id, label: s.sectionName }))} />
        )}
        <p className="text-sm text-muted">Changing a role removes section links that no longer apply (for example, an instructor&apos;s assigned sections).</p>
      </div>
    </Modal>
  );
}

/** Move a student to another section. */
export function EnrollModal({ student, sections, onClose, onSubmit }) {
  const { form, error, isSaving, submit, update } = useFormState(Boolean(student), { sectionId: student?.sectionId ?? '' });
  return (
    <Modal
      isOpen={Boolean(student)}
      onClose={onClose}
      title="Assign section"
      description={student ? `${student.firstName} ${student.lastName}` : ''}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="layers" isLoading={isSaving} onClick={() => submit(() => onSubmit(form.sectionId))}>Assign</Button>
        </>
      }
    >
      <div className="stack">
        <ErrorBanner error={error} />
        <SelectInput label="Section" value={form.sectionId} onChange={update('sectionId')} options={sections.map((s) => ({ value: s._id, label: s.sectionName }))} />
      </div>
    </Modal>
  );
}

export function SectionFormModal({ isOpen, section, instructors, onClose, onSubmit }) {
  const isEdit = Boolean(section);
  const { form, error, isSaving, submit, update } = useFormState(isOpen, { sectionName: section?.sectionName ?? '', instructorId: '' });
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Rename section' : 'Create section'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="save" isLoading={isSaving} onClick={() => submit(() => onSubmit(form))}>{isEdit ? 'Save' : 'Create section'}</Button>
        </>
      }
    >
      <div className="stack">
        <ErrorBanner error={error} />
        <TextInput label="Section name" value={form.sectionName} onChange={update('sectionName')} placeholder="BSA 3-D" required />
        {!isEdit && (
          <SelectInput
            label="Instructor (optional)"
            value={form.instructorId}
            onChange={update('instructorId')}
            options={[{ value: '', label: 'Assign later' }, ...instructors.map((i) => ({ value: i._id, label: `Prof. ${i.firstName} ${i.lastName}` }))]}
          />
        )}
      </div>
    </Modal>
  );
}

export function AssignInstructorModal({ section, instructors, onClose, onSubmit }) {
  const { form, error, isSaving, submit, update } = useFormState(Boolean(section), { instructorId: section?.instructorId ?? '' });
  return (
    <Modal
      isOpen={Boolean(section)}
      onClose={onClose}
      title="Assign instructor"
      description={section?.sectionName}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="user-check" isLoading={isSaving} onClick={() => submit(() => onSubmit(form.instructorId || null))}>Save assignment</Button>
        </>
      }
    >
      <div className="stack">
        <ErrorBanner error={error} />
        <SelectInput
          label="Instructor"
          value={form.instructorId}
          onChange={update('instructorId')}
          options={[{ value: '', label: 'No instructor (unassigned)' }, ...instructors.map((i) => ({ value: i._id, label: `Prof. ${i.firstName} ${i.lastName}` }))]}
        />
        <p className="text-sm text-muted">Only active instructors are listed. Pending instructors must be approved first.</p>
      </div>
    </Modal>
  );
}
