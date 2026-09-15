import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLES, USER_STATUS } from '../../constants/roles.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { assignInstructor, createSection, deleteSection, listSectionsWithDetails, updateSection } from '../../services/sectionService.js';
import { listUsers } from '../../services/userService.js';
import Button, { IconButton } from '../../components/common/Button.jsx';
import { Avatar, EmptyState, ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { AssignInstructorModal, SectionFormModal } from '../../components/admin/AdminModals.jsx';

export default function SectionManagementPage() {
  useDocumentTitle('Sections');
  const toast = useToast();
  const sections = useAsync(listSectionsWithDetails, []);
  const instructors = useAsync(() => listUsers({ role: ROLES.INSTRUCTOR, status: USER_STATUS.ACTIVE }), []);
  const [modal, setModal] = useState(null); // { type: 'create' | 'rename' | 'assign' | 'delete', section? }

  const run = async (action, message) => {
    await action();
    toast.success(message);
    setModal(null);
    sections.reload();
    instructors.reload();
  };

  if (sections.isLoading && !sections.data) return <LoadingState label="Loading sections…" />;
  if (sections.error) return <ErrorState error={sections.error} onRetry={sections.reload} />;

  return (
    <div className="page">
      <PageHeader
        title="Section Management"
        subtitle="Academic sections and instructor assignment. Leaderboards are grouped by section."
        actions={<Button icon="plus" onClick={() => setModal({ type: 'create' })}>Create Section</Button>}
      />

      {sections.data.length === 0 ? (
        <EmptyState icon="layers" title="No sections yet" action={<Button icon="plus" onClick={() => setModal({ type: 'create' })}>Create Section</Button>} />
      ) : (
        <div className="section-grid">
          {sections.data.map(({ section, instructor, studentCount, activeStudentCount }, index) => (
            <article key={section._id} className="section-card anim-fade-up" style={{ '--i': index }}>
              <header className="section-card__header">
                <span className="section-card__icon"><Icon name="layers" size={22} /></span>
                <div>
                  <h2>{section.sectionName}</h2>
                  <p className="text-sm text-muted">{studentCount} students · {activeStudentCount} active</p>
                </div>
                <div className="cell-actions">
                  <IconButton icon="edit" label="Rename section" size="sm" onClick={() => setModal({ type: 'rename', section })} />
                  <IconButton icon="trash" label="Delete section" size="sm" variant="danger" onClick={() => setModal({ type: 'delete', section })} />
                </div>
              </header>
              <div className={`section-card__instructor ${instructor ? '' : 'is-empty'}`}>
                {instructor ? (
                  <>
                    <Avatar firstName={instructor.firstName} lastName={instructor.lastName} size={38} />
                    <div>
                      <strong>Prof. {instructor.firstName} {instructor.lastName}</strong>
                      <small>{instructor.email}</small>
                    </div>
                  </>
                ) : (
                  <>
                    <Icon name="alert" size={20} />
                    <div>
                      <strong>No instructor assigned</strong>
                      <small>Students in this section have no monitoring instructor</small>
                    </div>
                  </>
                )}
              </div>
              <footer className="section-card__footer">
                {instructor ? <StatusPill tone="green" icon="user-check">Assigned</StatusPill> : <StatusPill tone="amber" icon="alert">Unassigned</StatusPill>}
                <Button size="sm" variant="soft" icon="user-check" onClick={() => setModal({ type: 'assign', section })}>
                  {instructor ? 'Change instructor' : 'Assign instructor'}
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <SectionFormModal
        isOpen={modal?.type === 'create' || modal?.type === 'rename'}
        section={modal?.type === 'rename' ? modal.section : null}
        instructors={instructors.data ?? []}
        onClose={() => setModal(null)}
        onSubmit={(form) =>
          modal.type === 'rename'
            ? run(() => updateSection(modal.section._id, form), 'Section renamed.')
            : run(() => createSection({ sectionName: form.sectionName, instructorId: form.instructorId || null }), 'Section created.')
        }
      />
      <AssignInstructorModal
        section={modal?.type === 'assign' ? modal.section : null}
        instructors={instructors.data ?? []}
        onClose={() => setModal(null)}
        onSubmit={(instructorId) => run(() => assignInstructor(modal.section._id, instructorId), instructorId ? 'Instructor assigned.' : 'Instructor unassigned.')}
      />
      <ConfirmDialog
        isOpen={modal?.type === 'delete'}
        onClose={() => setModal(null)}
        onConfirm={() => run(() => deleteSection(modal.section._id), 'Section deleted.').catch((err) => { toast.error(err.message); setModal(null); })}
        title="Delete section?"
        message={`${modal?.section?.sectionName} can only be deleted when no students are enrolled in it.`}
        confirmLabel="Delete section"
      />
    </div>
  );
}
