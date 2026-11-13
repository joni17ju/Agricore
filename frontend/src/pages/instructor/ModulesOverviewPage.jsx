import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getCourseStructure } from '../../services/moduleService.js';
import { ErrorState, LoadingState, PageHeader } from '../../components/common/Display.jsx';
import AddModuleTile from '../../components/instructor/AddModuleTile.jsx';
import InstructorModuleCard from '../../components/instructor/InstructorModuleCard.jsx';

/** Step 1 of module management: pick a module to edit. */
export default function ModulesOverviewPage() {
  useDocumentTitle('Manage Modules');
  const { data: structure, error, isLoading, reload } = useAsync(getCourseStructure, []);

  if (isLoading && !structure) return <LoadingState label="Loading modules…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const totalLessons = structure.reduce((sum, entry) => sum + entry.lessons.length, 0);
  // Counted rather than assumed: the course starts with five and can grow.
  const nextNumber = structure.reduce((highest, entry) => Math.max(highest, entry.module.moduleNumber), 0) + 1;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Principles of Crop Protection I"
        title="Manage Modules"
        subtitle={`${structure.length} modules · ${totalLessons} lessons in total. Select a module to manage its lessons.`}
      />
      <div className="module-grid">
        {structure.map((entry, index) => (
          <InstructorModuleCard
            key={entry.module._id}
            module={entry.module}
            index={index}
            lessonCount={entry.lessons.length}
            missionCount={entry.lessons.reduce((sum, item) => sum + item.missions.length, 0)}
            mediaCount={entry.lessons.reduce((sum, item) => sum + item.lesson.mediaAssets.length, 0)}
          />
        ))}
        {/* Last grid slot, so it wraps to the next row with the cards. */}
        <AddModuleTile nextNumber={nextNumber} onCreated={reload} />
      </div>
    </div>
  );
}
