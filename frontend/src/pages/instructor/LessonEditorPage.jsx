import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumb } from '../../context/BreadcrumbContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { deleteLesson, updateLesson } from '../../services/lessonService.js';
import { getCourseStructure } from '../../services/moduleService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { ErrorState, LoadingState, StatusPill } from '../../components/common/Display.jsx';
import { TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ConfirmDialog } from '../../components/common/Modal.jsx';
import { sanitizeHtml } from '../../components/common/SafeHtml.jsx';
import Tabs from '../../components/common/Tabs.jsx';
import MediaManager from '../../components/instructor/MediaManager.jsx';
import { MissionManager } from '../../components/instructor/MissionManager.jsx';
import RichTextEditor from '../../components/instructor/RichTextEditor.jsx';
import { gameIcon } from '../../components/student/CourseMap.jsx';

/** Step 3: the lesson content editor, opened as its own page. */
export default function LessonEditorPage() {
  const { moduleId, lessonId } = useParams();
  const { data: structure, error, isLoading, reload } = useAsync(getCourseStructure, []);
  const toast = useToast();
  const navigate = useNavigate();

  const moduleEntry = structure?.find((item) => item.module._id === moduleId);
  const lessonEntry = moduleEntry?.lessons.find((item) => item.lesson._id === lessonId);

  useDocumentTitle(lessonEntry?.lesson.title ?? 'Lesson');
  useBreadcrumb(
    moduleEntry && lessonEntry
      ? [
          { label: 'Modules', to: '/instructor/modules' },
          { label: `Module ${moduleEntry.module.moduleNumber}`, to: `/instructor/modules/${moduleId}` },
          { label: lessonEntry.lesson.title },
        ]
      : null,
  );

  if (isLoading && !structure) return <LoadingState label="Loading lesson…" />;
  if (error) return <ErrorState error={error} onRetry={reload} backTo={`/instructor/modules/${moduleId}`} />;
  if (!lessonEntry) {
    return <ErrorState error={{ status: 404, message: 'Lesson not found.' }} backTo={`/instructor/modules/${moduleId}`} />;
  }

  return (
    <div className="page">
      <LessonWorkspace
        key={lessonEntry.lesson._id}
        moduleEntry={moduleEntry}
        lessonEntry={lessonEntry}
        onChanged={reload}
        onDeleted={() => navigate(`/instructor/modules/${moduleId}`)}
        toast={toast}
      />
    </div>
  );
}

/** Lesson Content Editor (Proposal Fig 25) — unchanged behaviour, now full page. */
function LessonWorkspace({ moduleEntry, lessonEntry, onChanged, onDeleted, toast }) {
  const { module } = moduleEntry;
  const { lesson, missions } = lessonEntry;
  const [tab, setTab] = useState('content');
  const [title, setTitle] = useState(lesson.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [html, setHtml] = useState(lesson.contentBody);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const isDirty = html !== lesson.contentBody || title !== lesson.title;
  const templateMission = moduleEntry.lessons.flatMap((l) => l.missions)[0] ?? null;

  const save = async () => {
    setIsSaving(true);
    try {
      const clean = sanitizeHtml(html);
      await updateLesson(lesson._id, { title, contentBody: clean });
      setHtml(clean);
      toast.success('Lesson saved.');
      setIsEditingTitle(false);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    try {
      const result = await deleteLesson(lesson._id);
      toast.success(`Lesson deleted${result.removedMissions ? ` with ${result.removedMissions} mission level(s)` : ''}.`);
      onDeleted();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="anim-fade-up" padded={false}>
      <div className="workspace-header">
        <div className="workspace-header__crumbs">
          <Button variant="ghost" size="sm" icon="arrow-left" to={`/instructor/modules/${module._id}`}>Back to lessons</Button>
          <StatusPill tone="green" icon={gameIcon(module.gameType)}>Module {module.moduleNumber}</StatusPill>
          <span className="text-muted text-sm">{module.title} · Lesson {module.moduleNumber}.{lesson.lessonNumber}</span>
        </div>
        {isEditingTitle ? (
          <div className="workspace-header__title-edit">
            <TextInput aria-label="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
        ) : (
          <h2 className="workspace-header__title">{title}</h2>
        )}
        <div className="row">
          <Button variant="secondary" size="sm" icon="edit" onClick={() => setIsEditingTitle((v) => !v)}>{isEditingTitle ? 'Done' : 'Edit Title'}</Button>
          <Button variant="ghost" size="sm" icon="trash" onClick={() => setConfirmDelete(true)}>Delete</Button>
        </div>
      </div>

      <div className="workspace-tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'content', label: 'Lesson Content Editor', icon: 'file' },
            { value: 'media', label: 'Media', icon: 'image', count: lesson.mediaAssets.length },
            { value: 'missions', label: 'Missions', icon: 'target', count: missions.length },
          ]}
        />
      </div>

      <div className="workspace-body">
        {tab === 'content' && (
          <div className="stack">
            <RichTextEditor
              documentKey={`${lesson._id}-${revision}`}
              initialHtml={html}
              onChange={setHtml}
              onInsertMedia={() => {
                setTab('media');
                setUploadOpen(true);
              }}
            />
            {lesson.mediaAssets.length > 0 && (
              <div className="embed-list">
                {lesson.mediaAssets.map((asset) => (
                  <span key={asset.assetId} className="embed-list__item"><Icon name={asset.type === 'image' ? 'image' : 'video'} size={14} /> {asset.title}</span>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'media' && <MediaManager lesson={lesson} onChanged={onChanged} uploadOpen={uploadOpen} onUploadOpenChange={setUploadOpen} />}
        {tab === 'missions' && (
          <MissionManager lesson={lesson} module={module} missions={missions} templateMission={templateMission} onChanged={onChanged} />
        )}
      </div>

      {(tab === 'content' || isDirty) && (
        <footer className="workspace-footer">
          <span className={`text-sm ${isDirty ? 'workspace-footer__dirty' : 'text-muted'}`}>
            {isDirty ? '● Unsaved changes' : 'All changes saved'}
          </span>
          <Button variant="secondary" size="sm" disabled={!isDirty} onClick={() => { setTitle(lesson.title); setHtml(lesson.contentBody); setTab('content'); setRevision((r) => r + 1); }}>Discard</Button>
          <Button size="sm" icon="save" onClick={save} disabled={!isDirty} isLoading={isSaving}>Save Lesson</Button>
        </footer>
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Delete this lesson?"
        message="The lesson, its mission levels, student attempts on those levels and progress records will be deleted. Remaining lessons are renumbered."
        confirmLabel="Delete lesson"
      />
    </Card>
  );
}
