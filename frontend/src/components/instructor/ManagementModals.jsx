/**
 * Instructor management forms: add and edit students, move them between
 * sections, and create, rename and assign sections.
 *
 * These were the administrator's forms before that role was removed. Roles can
 * no longer be changed from the UI at all — the server refuses it — so the
 * role picker and the change-role modal went with it.
 */
import { useEffect, useState } from 'react';
import Button from '../common/Button.jsx';
import { SelectInput, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import Modal from '../common/Modal.jsx';


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

/** Add a student, or edit an existing one's details. */
export function StudentFormModal({ isOpen, student, sections, onClose, onSubmit }) {
  const isEdit = Boolean(student);
  const { form, error, isSaving, submit, update } = useFormState(isOpen, {
    firstName: student?.firstName ?? '',
    lastName: student?.lastName ?? '',
    email: student?.email ?? '',
    schoolId: student?.schoolId ?? '',
    sectionId: student?.sectionId ?? sections[0]?._id ?? '',
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit student' : 'Add student'}
      description={
        isEdit
          ? 'Update their details or move them to another section.'
          : 'The account is active straight away — adding it here counts as approving it.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={isEdit ? 'save' : 'user-plus'} isLoading={isSaving} onClick={() => submit(() => onSubmit(form))}>
            {isEdit ? 'Save changes' : 'Add student'}
          </Button>
        </>
      }
    >
      <div className="stack">
        <ErrorBanner error={error} />
        <div className="form-grid">
          <TextInput label="First name" value={form.firstName} onChange={update('firstName')} required />
          <TextInput label="Last name" value={form.lastName} onChange={update('lastName')} required />
          <div className="span-2"><TextInput label="Email address" type="email" value={form.email} onChange={update('email')} required /></div>
          <TextInput label="School ID" value={form.schoolId} onChange={update('schoolId')} placeholder="2023-0795" />
          <SelectInput
            label="Section"
            value={form.sectionId}
            onChange={update('sectionId')}
            options={sections.map((section) => ({ value: section._id, label: section.sectionName }))}
          />
        </div>
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
        <TextInput label="Section name" value={form.sectionName} onChange={update('sectionName')} placeholder="BSA 1-D" required />
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
