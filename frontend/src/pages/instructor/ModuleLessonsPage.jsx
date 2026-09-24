import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumb } from '../../context/BreadcrumbContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { createLesson, reorderLessons } from '../../services/lessonService.js';
import { getCourseStructure, updateModuleCover, updateModuleTitle } from '../../services/moduleService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import { TextArea, TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import Modal from '../../components/common/Modal.jsx';
import ReorderableLessonList from '../../components/instructor/ReorderableLessonList.jsx';
import { ModuleCover, gameIcon } from '../../components/student/CourseMap.jsx';

/** Step 2: the lessons inside one module. */
export default function ModuleLessonsPage() {
  const { moduleId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: structure, error, isLoading, reload } = useAsync(getCourseStructure, []);
  const [addOpen, setAddOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const entry = structure?.find((item) => item.module._id === moduleId);

  /** Persist a new lesson order, then refresh so numbering comes from the server. */
  const saveOrder = async (lessonIds) => {
    setIsReordering(true);
    try {
      await reorderLessons(moduleId, lessonIds);
      await reload();
      toast.success('Lesson order updated.');
    } catch (err) {
      toast.error(err.message);
      await reload();
    } finally {
      setIsReordering(false);
    }
  };

  useDocumentTitle(entry ? `Module ${entry.module.moduleNumber}` : 'Module');
  useBreadcrumb(
    entry ? [{ label: 'Modules', to: '/instructor/modules' }, { label: `Module ${entry.module.moduleNumber}: ${entry.module.title}` }] : null,
  );

  if (isLoading && !structure) return <LoadingState label="Loading lessons…" />;
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/instructor/modules" />;
  if (!entry) return <ErrorState error={{ status: 404, message: 'Module not found.' }} backTo="/instructor/modules" />;

  const { module, lessons } = entry;
  const info = GAME_TYPE_INFO[module.gameType];

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${info.label} game`}
        title={`Module ${module.moduleNumber}: ${module.title}`}
        subtitle={`${lessons.length} lesson${lessons.length === 1 ? '' : 's'} · select a lesson to edit its content, media and missions`}
        backTo="/instructor/modules"
        backLabel="Back to modules"
        actions={<Button icon="plus" onClick={() => setAddOpen(true)}>Add Lesson</Button>}
      />

      <Card title="Lessons" icon="file" actions={<StatusPill tone="green" icon={gameIcon(module.gameType)}>{info.label}</StatusPill>}>
        {lessons.length === 0 ? (
          <EmptyState
            icon="file"
            title="No lessons yet"
            message="Add the first lesson for this module."
            action={<Button icon="plus" onClick={() => setAddOpen(true)}>Add Lesson</Button>}
          />
        ) : (
          <ReorderableLessonList
            module={module}
            lessons={lessons}
            isSaving={isReordering}
            onReorder={saveOrder}
          />

        )}
        {lessons.length > 1 && (
          <p className="text-muted text-xs lesson-rows__hint">
            <Icon name="menu" size={12} /> Press and hold a lesson to drag it into a new position, or focus the
            handle and use the arrow keys.
          </p>
        )}
      </Card>

      <ModuleSettingsCard module={module} onSaved={reload} toast={toast} />

      <AddLessonModal
        isOpen={addOpen}
        moduleTitle={`Module ${module.moduleNumber}: ${module.title}`}
        onClose={() => setAddOpen(false)}
        onCreate={async ({ title, description }) => {
          const lesson = await createLesson({
            moduleId,
            title,
            // The description becomes the lesson's opening paragraph, which is
            // also what students see as the topic summary.
            contentBody: description.trim() ? `<p>${description.trim()}</p>` : '<p>Write the lesson content here.</p>',
          });
          toast.success('Lesson created — now add its content.');
          navigate(`/instructor/modules/${moduleId}/lessons/${lesson._id}`);
        }}
      />
    </div>
  );
}

/** Module title is editable; its number and game type follow the syllabus. */
function ModuleSettingsCard({ module, onSaved, toast }) {
  const [title, setTitle] = useState(module.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverError, setCoverError] = useState('');
  const coverInputRef = useRef(null);

  useEffect(() => setTitle(module.title), [module.title]);

  const save = async () => {
    setIsSaving(true);
    try {
      await updateModuleTitle(module._id, title);
      toast.success('Module title saved.');
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const pickCover = async (event) => {
    const file = event.target.files?.[0];
    // Allow the same file to be chosen again after an error.
    event.target.value = '';
    if (!file) return;
    setCoverError('');
    setIsUploading(true);
    try {
      await updateModuleCover(module._id, file);
      toast.success('Module cover updated.');
      onSaved();
    } catch (err) {
      setCoverError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const clearCover = async () => {
    setCoverError('');
    setIsUploading(true);
    try {
      await updateModuleCover(module._id, null);
      toast.success('Module cover removed.');
      onSaved();
    } catch (err) {
      setCoverError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card title="Module settings" icon="settings">
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <TextInput label="Module title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <Button icon="save" onClick={save} disabled={title === module.title} isLoading={isSaving}>Save title</Button>
      </div>

      <h3 className="section-heading">Cover image</h3>
      <div className="module-cover-edit">
        <div className="module-cover-edit__preview">
          <ModuleCover module={module} />
        </div>
        <div className="module-cover-edit__actions">
          <p className="text-sm text-muted">
            Shown on the module card for you and for students. PNG, JPG or WebP up to 1.5 MB.
          </p>
          <div className="row">
            <Button variant="secondary" icon="image" onClick={() => coverInputRef.current?.click()} isLoading={isUploading}>
              {module.coverImage ? 'Change cover' : 'Upload cover'}
            </Button>
            {module.coverImage && (
              <Button variant="ghost" icon="trash" onClick={clearCover} disabled={isUploading}>Remove</Button>
            )}
          </div>
          {coverError && (
            <p className="form-error" role="alert"><Icon name="alert" size={16} /> {coverError}</p>
          )}
          <input ref={coverInputRef} type="file" accept="image/*" className="visually-hidden" onChange={pickCover} />
        </div>
      </div>
      <p className="text-sm text-muted" style={{ marginTop: 'var(--space-3)' }}>
        <Icon name="info" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Module numbers and game types follow
        the official syllabus and cannot be changed.
      </p>
    </Card>
  );
}

/** Title + description first, then straight into the full-page content editor. */
function AddLessonModal({ isOpen, moduleTitle, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ title: '', description: '' });
      setError('');
    }
  }, [isOpen]);

  const submit = async () => {
    if (!form.title.trim()) {
      setError('Lesson title is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onCreate(form);
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Lesson"
      description={moduleTitle}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="arrow-right" onClick={submit} isLoading={isSaving}>Create & write content</Button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
        <TextInput
          label="Lesson title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="e.g. Seed-borne Diseases"
          required
          autoFocus
        />
        <TextArea
          label="Short description"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="One or two sentences on what this lesson covers."
          rows={3}
          hint="Becomes the lesson's opening paragraph and the summary students see."
        />
        <p className="text-sm text-muted">The lesson is added at the end of the module. You can write the full content next.</p>
      </div>
    </Modal>
  );
}
