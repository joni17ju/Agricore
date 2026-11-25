import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBreadcrumb } from '../../context/BreadcrumbContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getLessonForStudent, markLessonViewed } from '../../services/progressService.js';
import { ErrorState, LoadingState } from '../../components/common/Display.jsx';
import LessonDocument from '../../components/common/lesson/LessonDocument.jsx';
import StudentLessonFooter from '../../components/student/LessonNextStep.jsx';
import LessonMissionPanel, { useMissionPanelState } from '../../components/student/LessonMissionPanel.jsx';

/**
 * A lesson as the student reads it: the shared lesson layout (see
 * components/common/lesson/) with the mission panel beside it and, below it,
 * one clear next step that follows the student's progress (take the mission,
 * next topic, next module or back to the dashboard; see lessonNextStep).
 */
export default function LessonViewerPage() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAsync(() => getLessonForStudent(user._id, lessonId), [user._id, lessonId]);
  const [panelClosed, togglePanel] = useMissionPanelState();
  useDocumentTitle(data?.lesson.title ?? 'Lesson');
  useBreadcrumb(
    data ? [{ label: 'Modules', to: '/student/modules' }, { label: data.lesson.title }] : null,
  );

  useEffect(() => {
    markLessonViewed(user._id, lessonId).catch(() => {});
  }, [user._id, lessonId]);

  if (isLoading) return <LoadingState label="Loading lesson…" />;
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/student/modules" />;

  const { lesson, module, levels, nextStep } = data;

  return (
    <div className="page lesson-page">
      <LessonDocument
        kicker={`Module ${module.moduleNumber} · Topic ${lesson.lessonNumber}`}
        context={module.title}
        title={lesson.title}
        html={lesson.contentBody}
        mediaAssets={lesson.mediaAssets}
        aside={<LessonMissionPanel module={module} levels={levels} closed={panelClosed} onToggle={togglePanel} />}
        asideClosed={panelClosed}
        footer={<StudentLessonFooter step={nextStep} />}
      />
    </div>
  );
}
