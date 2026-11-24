import { Suspense, lazy, useState } from 'react';
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
import { UploadModal } from '../../components/instructor/MediaManager.jsx';
import { MissionManager } from '../../components/instructor/MissionManager.jsx';
import { gameIcon } from '../../components/student/CourseMap.jsx';
import LessonDocument, { LessonFooter } from '../../components/common/lesson/LessonDocument.jsx';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { missionCode } from '../../utils/format.js';

/**
 * The editor bundles Tiptap, so it is loaded only when an instructor actually
 * opens a lesson — students never download it.
 */
const RichTextEditor = lazy(() => import('../../components/instructor/RichTextEditor.jsx'));

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
  // An open mission editor with unsaved edits; switching tabs would unmount it.
  const [missionDirty, setMissionDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const changeTab = (next) => {
    if (tab === 'missions' && next !== 'missions' && missionDirty) setPendingTab(next);
    else setTab(next);
  };
  const [uploadOpen, setUploadOpen] = useState(false);
  // Mirrors the editor's own mode so the Media button can behave differently in it.
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    /*
     * The content tab pins the card to the viewport so the lesson text scrolls
     * on its own; the Media and Missions tabs stay as tall as they need to be.
     */
    <Card className={`anim-fade-up ${tab === 'content' ? 'workspace--editor' : ''}`} padded={false}>
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
          onChange={changeTab}
          tabs={[
            { value: 'content', label: 'Lesson Content Editor', icon: 'file' },
            { value: 'preview', label: 'Student view', icon: 'eye' },
            { value: 'media', label: 'Media', icon: 'image', count: lesson.mediaAssets.length },
            { value: 'missions', label: 'Missions', icon: 'target', count: missions.length },
          ]}
        />
      </div>

      <div className="workspace-body">
        {tab === 'content' && (
          <div className="stack">
            <Suspense fallback={<div className="rte rte--loading">Loading editor…</div>}>
              <RichTextEditor
                documentKey={`${lesson._id}-${revision}`}
                initialHtml={html}
                onChange={setHtml}
                onInsertMedia={() => {
                  /*
                   * In full screen the picker opens over the editor instead:
                   * switching tabs would unmount the editor and end the mode.
                   */
                  if (!isFullscreen) setTab('media');
                  setUploadOpen(true);
                }}
                fullscreenContext={{
                  title,
                  meta: `Module ${module.moduleNumber}, Lesson ${lesson.lessonNumber}`,
                  isDirty,
                  isSaving,
                  onSave: save,
                }}
                onFullscreenChange={setIsFullscreen}
              />
            </Suspense>
            {/* The Media picker reached from the toolbar while in full screen. */}
            <UploadModal
              lessonId={lesson._id}
              isOpen={uploadOpen && isFullscreen}
              onClose={() => setUploadOpen(false)}
              onUploaded={onChanged}
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
        {tab === 'preview' && (
          <StudentViewPreview
            moduleEntry={moduleEntry}
            lesson={lesson}
            missions={missions}
            title={title}
            html={html}
            isDirty={isDirty}
            onEditLesson={() => setTab('content')}
            onEditMissions={() => setTab('missions')}
          />
        )}
        {tab === 'media' && <MediaManager lesson={lesson} onChanged={onChanged} uploadOpen={uploadOpen} onUploadOpenChange={setUploadOpen} />}
        {tab === 'missions' && (
          <MissionManager
            lesson={lesson}
            module={module}
            missions={missions}
            templateMission={templateMission}
            moduleLevelCount={moduleEntry.lessons.reduce((sum, item) => sum + item.missions.length, 0)}
            onChanged={onChanged}
            onDirtyChange={setMissionDirty}
          />
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
        isOpen={Boolean(pendingTab)}
        onClose={() => setPendingTab(null)}
        onConfirm={() => {
          setMissionDirty(false);
          setTab(pendingTab);
          setPendingTab(null);
        }}
        title="Leave this mission without saving?"
        message="The mission you are editing has unsaved changes. Switching tabs throws them away."
        confirmLabel="Discard changes"
      />
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

/**
 * The lesson in the student reading layout, from the content being edited
 * (unsaved changes included). The student-only parts — Learn/Practice/Apply
 * and the mission side panel — are left out; the lesson's missions are
 * listed under the content instead, with instructor actions in the footer.
 */
function StudentViewPreview({ moduleEntry, lesson, missions, title, html, isDirty, onEditLesson, onEditMissions }) {
  const { module, lessons } = moduleEntry;
  const index = lessons.findIndex((item) => item.lesson._id === lesson._id);
  const neighbour = (item) => (item ? { to: `/instructor/modules/${module._id}/lessons/${item.lesson._id}`, title: item.lesson.title } : null);

  return (
    <div className="lesson-surface lesson-preview">
      <p className="lesson-preview__note">
        <Icon name="eye" size={15} />
        {isDirty ? 'Your unsaved changes, exactly as students will see them once saved.' : 'This lesson exactly as students see it.'}
        {' '}Students also see the mission panel and their progress beside it.
      </p>
      <LessonDocument
        kicker={`Module ${module.moduleNumber} · Topic ${lesson.lessonNumber}`}
        context={module.title}
        title={title}
        html={html}
        mediaAssets={lesson.mediaAssets}
        afterContent={(
          <section className="lesson-missions" aria-labelledby="lesson-missions-title">
            <h2 id="lesson-missions-title" className="lesson-missions__title">Missions for this lesson</h2>
            {missions.length === 0 ? (
              <p className="lesson-missions__empty">
                No mission yet. Students cannot complete a lesson without one.{' '}
                <button type="button" className="lesson-missions__link" onClick={onEditMissions}>Add a mission</button>
              </p>
            ) : (
              <ol className="mission-levels">
                {missions.map((mission) => (
                  <li key={mission._id}>
                    <span className="mission-levels__code">{missionCode(module, mission)}</span>
                    <span className="mission-levels__title">{mission.scenarioData.title}</span>
                    <span className="mission-levels__meta">
                      {GAME_TYPE_INFO[mission.gameType ?? module.gameType]?.label} game · {mission.maxXP} XP
                    </span>
                    <button type="button" className="mission-levels__play" onClick={onEditMissions} aria-label={`Edit ${mission.scenarioData.title}`}>
                      Edit
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
        footer={(
          <LessonFooter
            previous={neighbour(lessons[index - 1])}
            next={neighbour(lessons[index + 1])}
            previousLabel="Previous lesson"
            nextLabel="Next lesson"
            action={<Button variant="secondary" icon="edit" onClick={onEditLesson}>Edit lesson</Button>}
          />
        )}
      />
    </div>
  );
}
