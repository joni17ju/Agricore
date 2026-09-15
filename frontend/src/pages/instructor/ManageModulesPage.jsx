import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { createLesson, deleteLesson, updateLesson } from '../../services/lessonService.js';
import { getCourseStructure, updateModuleTitle } from '../../services/moduleService.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import { SelectInput, TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import Modal, { ConfirmDialog } from '../../components/common/Modal.jsx';
import { sanitizeHtml } from '../../components/common/SafeHtml.jsx';
import Tabs from '../../components/common/Tabs.jsx';
import CurriculumTree from '../../components/instructor/CurriculumTree.jsx';
import MediaManager from '../../components/instructor/MediaManager.jsx';
import { MissionManager, QuizEditorModal } from '../../components/instructor/MissionManager.jsx';
import RichTextEditor from '../../components/instructor/RichTextEditor.jsx';
import { gameIcon } from '../../components/student/CourseMap.jsx';

export default function ManageModulesPage() {
  useDocumentTitle('Manage Modules');
  const toast = useToast();
  const { data: structure, error, isLoading, reload } = useAsync(getCourseStructure, []);
  const [selected, setSelected] = useState({ type: 'lesson', id: 'les_1_1' });
  const [addLessonOpen, setAddLessonOpen] = useState(false);

  const found = useMemo(() => {
    if (!structure) return null;
    for (const entry of structure) {
      if (selected.type === 'module' && entry.module._id === selected.id) return { moduleEntry: entry };
      const lessonEntry = entry.lessons.find((l) => l.lesson._id === selected.id);
      if (selected.type === 'lesson' && lessonEntry) return { moduleEntry: entry, lessonEntry };
    }
    return null;
  }, [structure, selected]);

  useEffect(() => {
    if (structure && !found) setSelected({ type: 'module', id: structure[0].module._id });
  }, [structure, found]);

  if (isLoading && !structure) return <LoadingState label="Loading curriculum…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="page">
      <PageHeader
        title="Manage Modules"
        subtitle="The five syllabus modules are fixed. Edit their lessons, media, missions and quizzes."
        actions={<Button icon="plus" onClick={() => setAddLessonOpen(true)}>Add New Lesson</Button>}
      />

      <div className="manage-layout">
        <div className="manage-layout__main">
          {found?.lessonEntry && (
            <LessonWorkspace
              key={found.lessonEntry.lesson._id}
              moduleEntry={found.moduleEntry}
              lessonEntry={found.lessonEntry}
              onChanged={reload}
              onDeleted={() => {
                reload();
                setSelected({ type: 'module', id: found.moduleEntry.module._id });
              }}
              toast={toast}
            />
          )}
          {found && !found.lessonEntry && (
            <ModuleWorkspace key={found.moduleEntry.module._id} moduleEntry={found.moduleEntry} onChanged={reload} onSelectLesson={(id) => setSelected({ type: 'lesson', id })} toast={toast} />
          )}
        </div>
        <Card title="Curriculum Navigation" icon="layers" className="manage-layout__tree">
          <CurriculumTree structure={structure} selected={selected} onSelect={setSelected} />
        </Card>
      </div>

      <AddLessonModal
        isOpen={addLessonOpen}
        onClose={() => setAddLessonOpen(false)}
        modules={structure.map((entry) => entry.module)}
        defaultModuleId={found?.moduleEntry.module._id}
        onCreated={(lesson) => {
          setAddLessonOpen(false);
          reload();
          setSelected({ type: 'lesson', id: lesson._id });
          toast.success('Lesson created.');
        }}
      />
    </div>
  );
}

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

function ModuleWorkspace({ moduleEntry, onChanged, onSelectLesson, toast }) {
  const { module, lessons, quiz } = moduleEntry;
  const [title, setTitle] = useState(module.title);
  const [isSaving, setIsSaving] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const info = GAME_TYPE_INFO[module.gameType];

  const saveTitle = async () => {
    setIsSaving(true);
    try {
      await updateModuleTitle(module._id, title);
      toast.success('Module title saved.');
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="anim-fade-up">
      <div className="stack">
        <div className="module-workspace__head">
          <span className="game-section__icon"><Icon name={gameIcon(module.gameType)} size={26} /></span>
          <div>
            <span className="page-header__eyebrow">Module {module.moduleNumber} · {info.label} game</span>
            <h2>{module.title}</h2>
            <p className="text-sm text-muted">{info.shortDescription}</p>
          </div>
        </div>

        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <TextInput label="Module title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <Button icon="save" onClick={saveTitle} disabled={title === module.title} isLoading={isSaving}>Save title</Button>
        </div>
        <p className="text-sm text-muted"><Icon name="info" size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Module numbers and game types follow the official syllabus and cannot be changed.</p>

        <h3 className="history-subtitle">Lessons ({lessons.length})</h3>
        <ul className="manage-list">
          {lessons.map(({ lesson, missions }) => (
            <li key={lesson._id}>
              <span className="manage-list__icon"><Icon name="file" size={18} /></span>
              <div className="manage-list__text">
                <strong>Lesson {module.moduleNumber}.{lesson.lessonNumber} · {lesson.title}</strong>
                <small>{missions.length} mission level(s) · {lesson.mediaAssets.length} media</small>
              </div>
              <Button size="sm" variant="soft" icon="edit" onClick={() => onSelectLesson(lesson._id)}>Edit</Button>
            </li>
          ))}
        </ul>

        {quiz && (
          <div className="quiz-card">
            <span className="quiz-card__icon"><Icon name="clipboard" size={24} /></span>
            <div className="quiz-card__text">
              <h3>{quiz.scenarioData.title}</h3>
              <p className="text-sm text-muted">{quiz.scenarioData.questions.length} questions · {quiz.maxXP} XP</p>
            </div>
            <Button size="sm" icon="edit" onClick={() => setQuizOpen(true)}>Edit Quiz</Button>
          </div>
        )}
      </div>
      <QuizEditorModal
        quiz={quiz}
        module={module}
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
        onSaved={() => {
          setQuizOpen(false);
          onChanged();
        }}
      />
    </Card>
  );
}

function AddLessonModal({ isOpen, onClose, modules, defaultModuleId, onCreated }) {
  const [moduleId, setModuleId] = useState(defaultModuleId ?? modules[0]?._id);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setModuleId(defaultModuleId ?? modules[0]?._id);
      setTitle('');
      setError('');
    }
  }, [isOpen, defaultModuleId, modules]);

  const create = async () => {
    setIsSaving(true);
    setError('');
    try {
      const lesson = await createLesson({ moduleId, title, contentBody: '<p>Write the lesson content here.</p>' });
      onCreated(lesson);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Lesson"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="plus" onClick={create} isLoading={isSaving}>Create lesson</Button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
        <SelectInput
          label="Module"
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
          options={modules.map((m) => ({ value: m._id, label: `Module ${m.moduleNumber}: ${m.title}` }))}
        />
        <TextInput label="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Seed-borne Diseases" required />
        <p className="text-sm text-muted">The lesson is added at the end of the module. Add mission levels from the Missions tab.</p>
      </div>
    </Modal>
  );
}
