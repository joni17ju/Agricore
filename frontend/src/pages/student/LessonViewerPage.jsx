import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBreadcrumb } from '../../context/BreadcrumbContext.jsx';
import { LESSON_STATE } from '../../constants/rules.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getLessonForStudent, markLessonViewed } from '../../services/progressService.js';
import { missionCode } from '../../utils/format.js';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { ErrorState, LoadingState, PageHeader, StatusPill } from '../../components/common/Display.jsx';
import Icon from '../../components/common/Icon.jsx';
import SafeHtml from '../../components/common/SafeHtml.jsx';
import MediaAsset from '../../components/illustrations/MediaAsset.jsx';
import { LearnPracticeApply, gameIcon } from '../../components/student/CourseMap.jsx';

export default function LessonViewerPage() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useAsync(() => getLessonForStudent(user._id, lessonId), [user._id, lessonId]);
  useDocumentTitle(data?.lesson.title ?? 'Lesson');
  useBreadcrumb(
    data ? [{ label: 'Modules', to: '/student/modules' }, { label: data.lesson.title }] : null,
  );

  useEffect(() => {
    markLessonViewed(user._id, lessonId).catch(() => {});
  }, [user._id, lessonId]);

  if (isLoading) return <LoadingState label="Loading lesson…" />;
  if (error) return <ErrorState error={error} onRetry={reload} backTo="/student/modules" />;

  const { lesson, module, levels, state, previousLesson, nextLesson } = data;
  const allPassed = levels.length > 0 && levels.every((level) => level.isPassed);
  const nextLevel = levels.find((level) => !level.isPassed);

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Module ${module.moduleNumber}: ${module.title}`}
        title={`Topic ${lesson.lessonNumber}`}
        backTo={`/student/modules/${module._id}`}
        backLabel="Back to module"
        actions={<LearnPracticeApply active={allPassed ? 'apply' : 'learn'} completed={allPassed ? ['learn', 'practice'] : ['learn']} />}
      />

      <div className="lesson-layout">
        <div className="stack">
          <Card as="article" className="lesson-article anim-fade-up" padded={false}>
            <StatusPill tone={state === LESSON_STATE.COMPLETED ? 'green' : 'amber'} icon={state === LESSON_STATE.COMPLETED ? 'check' : 'book'}>
              {state === LESSON_STATE.COMPLETED ? 'Topic cleared' : 'Learn'}
            </StatusPill>
            <h1 className="lesson-article__title">{lesson.title}</h1>
            <SafeHtml html={lesson.contentBody} />
            {lesson.mediaAssets.length > 0 && (
              <div className="lesson-media">
                {lesson.mediaAssets.map((asset) => (
                  <MediaAsset key={asset.assetId} asset={asset} />
                ))}
              </div>
            )}
          </Card>

          <nav className="lesson-nav" aria-label="Lesson navigation">
            {previousLesson ? (
              <Button variant="secondary" icon="arrow-left" to={`/student/lessons/${previousLesson._id}`}>{previousLesson.title}</Button>
            ) : <span />}
            {nextLesson && (
              <Button variant="secondary" iconRight="arrow-right" to={`/student/lessons/${nextLesson._id}`}>{nextLesson.title}</Button>
            )}
          </nav>
        </div>

        <aside className="lesson-layout__aside">
          <Card title="Practice: Mission" icon={gameIcon(module.gameType)} className="anim-fade-up" style={{ '--i': 1 }}>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Finished reading? Apply what you learned in the mission for this topic.
            </p>
            <ul className="mission-list">
              {levels.map((level) => (
                <li key={level.mission._id} className={`mission-list__item ${level.isPassed ? 'is-passed' : ''}`}>
                  <span className="mission-list__icon"><Icon name={level.isPassed ? 'check' : 'target'} size={18} /></span>
                  <span className="mission-list__text">
                    <strong>{level.mission.scenarioData.title}</strong>
                    <small>
                      {missionCode(module, level.mission)} · {level.bestScore !== null ? `Best ${level.bestScore}%` : `+${level.mission.maxXP} XP`}
                    </small>
                  </span>
                  <Link to={`/student/missions/${level.mission._id}/play`} className="btn btn--soft btn--sm" aria-label={`Play ${level.mission.scenarioData.title}`}>
                    <Icon name={level.isPassed ? 'refresh' : 'play'} size={14} />
                  </Link>
                </li>
              ))}
            </ul>
            {nextLevel && (
              <Button block icon="play" style={{ marginTop: 12 }} to={`/student/missions/${nextLevel.mission._id}/play`}>
                Start {missionCode(module, nextLevel.mission)}
              </Button>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
