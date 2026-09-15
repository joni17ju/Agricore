import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getStudentCurriculumMap } from '../../services/progressService.js';
import { ErrorState, LoadingState, PageHeader } from '../../components/common/Display.jsx';
import { QuizCard } from '../../components/student/CourseMap.jsx';

export default function QuizzesPage() {
  useDocumentTitle('Module Quizzes');
  const { user } = useAuth();
  const { data: curriculum, error, isLoading, reload } = useAsync(() => getStudentCurriculumMap(user._id), [user._id]);

  if (isLoading) return <LoadingState label="Loading quizzes…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const passed = curriculum.filter((entry) => entry.quiz?.isPassed).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Apply"
        title="Module Quizzes"
        subtitle={`${passed} of ${curriculum.length} passed · each quiz opens after you clear every topic in its module`}
      />
      <div className="stack">
        {curriculum.map((entry, index) => (
          <QuizCard key={entry.module._id} quiz={entry.quiz} module={entry.module} index={index} />
        ))}
      </div>
    </div>
  );
}
