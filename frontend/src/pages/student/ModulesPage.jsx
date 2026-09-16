import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { LESSON_STATE } from '../../constants/rules.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useSeenUnlocks } from '../../hooks/useSeenUnlocks.js';
import { getStudentCurriculumMap } from '../../services/progressService.js';
import { ErrorState, LoadingState, PageHeader } from '../../components/common/Display.jsx';
import { ModuleMapCard } from '../../components/student/CourseMap.jsx';

export default function ModulesPage() {
  useDocumentTitle('Course Modules');
  const { user } = useAuth();
  const { data: curriculum, error, isLoading, reload } = useAsync(() => getStudentCurriculumMap(user._id), [user._id]);
  const unlocks = useSeenUnlocks(user._id, 'modules');

  const unlockedIds = (curriculum ?? []).filter((entry) => entry.state !== LESSON_STATE.LOCKED).map((entry) => entry.module._id);

  useEffect(() => {
    if (!curriculum) return undefined;
    const timeout = setTimeout(() => unlocks.markSeen(unlockedIds), 1800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum]);

  if (isLoading) return <LoadingState label="Loading modules…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const cleared = curriculum.filter((entry) => entry.isCleared).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Principles of Crop Protection I"
        title="Course Modules"
        subtitle={`${cleared} of ${curriculum.length} modules cleared · modules unlock in order as you clear each one`}
      />
      <div className="module-grid">
        {curriculum.map((entry, index) => (
          <ModuleMapCard
            key={entry.module._id}
            entry={entry}
            index={index}
            // First visit: no animation for everything at once. Later: animate newly opened modules.
            playUnlock={unlocks.hasSeenAny && index > 0 && unlocks.isNewlyUnlocked(entry.module._id, entry.state !== LESSON_STATE.LOCKED)}
          />
        ))}
      </div>
    </div>
  );
}
