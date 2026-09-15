import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { LESSON_STATE } from '../../constants/rules.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useSeenUnlocks } from '../../hooks/useSeenUnlocks.js';
import { getStudentModule } from '../../services/progressService.js';
import { ErrorState, LoadingState, PageHeader } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ProgressBar } from '../../components/common/Progress.jsx';
import { QuizCard, StatePill, TopicCard, gameIcon } from '../../components/student/CourseMap.jsx';

export default function ModuleDetailPage() {
  const { moduleId } = useParams();
  const { user } = useAuth();
  const { data: entry, error, isLoading, reload } = useAsync(() => getStudentModule(user._id, moduleId), [user._id, moduleId]);
  const unlocks = useSeenUnlocks(user._id, 'topics');
  useDocumentTitle(entry ? `Module ${entry.module.moduleNumber}` : 'Module');

  useEffect(() => {
    if (!entry) return undefined;
    const ids = entry.lessons.filter((l) => l.state !== LESSON_STATE.LOCKED).map((l) => l.lesson._id);
    const timeout = setTimeout(() => unlocks.markSeen(ids), 1800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  if (isLoading) return <LoadingState label="Loading module…" />;
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/student/modules" />;

  const { module } = entry;
  if (entry.state === LESSON_STATE.LOCKED) {
    return <ErrorState error={{ status: 403, message: `Clear Module ${module.moduleNumber - 1} to unlock this module.` }} backTo="/student/modules" />;
  }

  return (
    <div className="page">
      <PageHeader title="Course Modules" backTo="/student/modules" backLabel="Back to modules" />

      <section className="module-hero anim-fade-up">
        <div className="module-hero__row">
          <div>
            <h1>Module {module.moduleNumber}: {module.title}</h1>
            <p>({entry.completedLessons} of {entry.totalLessons} topics cleared)</p>
          </div>
          <StatePill state={entry.state} />
        </div>
        <ProgressBar value={entry.progressPercent} size="md" />
        <p>
          <Icon name={gameIcon(module.gameType)} size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {GAME_TYPE_INFO[module.gameType].label} game ·{' '}
          {GAME_TYPE_INFO[module.gameType].shortDescription}
        </p>
      </section>

      <div className="topic-grid">
        {entry.lessons.map((lessonEntry, index) => (
          <TopicCard
            key={lessonEntry.lesson._id}
            entry={lessonEntry}
            module={module}
            index={index + 1}
            playUnlock={unlocks.hasSeenAny && lessonEntry.lesson.lessonNumber > 1 && unlocks.isNewlyUnlocked(lessonEntry.lesson._id, lessonEntry.state !== LESSON_STATE.LOCKED)}
          />
        ))}
      </div>

      <QuizCard quiz={entry.quiz} module={module} index={entry.lessons.length + 1} />
    </div>
  );
}
