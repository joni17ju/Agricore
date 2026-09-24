import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listSections } from '../../services/sectionService.js';
import { ErrorState, LoadingState } from '../../components/common/Display.jsx';
import ProfileDetailsCard from '../ProfileDetailsCard.jsx';

/** Instructor account page: profile picture and the details we already hold. */
export default function InstructorProfilePage() {
  useDocumentTitle('Profile');
  const { user } = useAuth();
  const { data: sections, error, isLoading, reload } = useAsync(listSections, []);

  if (isLoading && !sections) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const mine = sections.filter((section) => user.assignedSectionIds?.includes(section._id));

  return (
    <div className="page">
      <ProfileDetailsCard
        showIdNumber={false}
        extraFields={
          mine.length > 0
            ? [{ label: 'Assigned sections', value: mine.map((section) => section.sectionName).join(' · '), icon: 'layers' }]
            : []
        }
      />
    </div>
  );
}
