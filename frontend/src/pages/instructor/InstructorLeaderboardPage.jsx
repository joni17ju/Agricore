import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { LEADERBOARD_PERIODS, getSectionLeaderboard } from '../../services/leaderboardService.js';
import { listModules } from '../../services/moduleService.js';
import { listSections } from '../../services/sectionService.js';
import Card from '../../components/common/Card.jsx';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/common/Display.jsx';
import { SelectInput } from '../../components/common/Form.jsx';
import Tabs from '../../components/common/Tabs.jsx';
import { LeaderboardTable, Podium } from '../../components/leaderboard/Leaderboard.jsx';

const PERIOD_TABS = [
  { value: LEADERBOARD_PERIODS.OVERALL, label: 'Overall Rank', icon: 'trophy' },
  { value: LEADERBOARD_PERIODS.WEEK, label: 'This Week', icon: 'flame' },
  { value: LEADERBOARD_PERIODS.MODULE, label: 'By Module', icon: 'book' },
];

/** Instructor view of section leaderboards (Proposal Fig 23, "viewing as instructor"). */
export default function InstructorLeaderboardPage() {
  useDocumentTitle('Section Leaderboard');
  const { user } = useAuth();
  const sections = useAsync(async () => (await listSections()).filter((s) => user.assignedSectionIds.includes(s._id)), [user._id]);
  const modules = useAsync(listModules, []);
  const [sectionId, setSectionId] = useState('');
  const [period, setPeriod] = useState(LEADERBOARD_PERIODS.OVERALL);
  const [moduleId, setModuleId] = useState('mod_1');

  useEffect(() => {
    if (!sectionId && sections.data?.length) setSectionId(sections.data[0]._id);
  }, [sections.data, sectionId]);

  const board = useAsync(
    () => (sectionId ? getSectionLeaderboard(user._id, sectionId, { period, moduleId: period === LEADERBOARD_PERIODS.MODULE ? moduleId : undefined }) : Promise.resolve(null)),
    [user._id, sectionId, period, moduleId],
  );

  if (sections.isLoading) return <LoadingState />;
  if (sections.data.length === 0) return <EmptyState icon="trophy" title="No assigned sections" message="Leaderboards appear once you are assigned to a section." />;

  return (
    <div className="page">
      <PageHeader
        title="Section Leaderboard"
        subtitle="Rankings students see within their own section."
        actions={
          <div className="row">
            <div className="inline-select">
              <SelectInput aria-label="Section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections.data.map((s) => ({ value: s._id, label: s.sectionName }))} />
            </div>
            {period === LEADERBOARD_PERIODS.MODULE && (
              <div className="inline-select">
                <SelectInput aria-label="Module" value={moduleId} onChange={(e) => setModuleId(e.target.value)} options={(modules.data ?? []).map((m) => ({ value: m._id, label: `Module ${m.moduleNumber}` }))} />
              </div>
            )}
          </div>
        }
      />
      <Tabs tabs={PERIOD_TABS} value={period} onChange={setPeriod} label="Leaderboard period" />
      {board.error && <ErrorState error={board.error} onRetry={board.reload} />}
      {board.isLoading && !board.data && <LoadingState />}
      {board.data && (
        <Card key={`${sectionId}-${period}-${moduleId}`} className="anim-fade-in">
          <Podium rows={board.data.rows} />
          <LeaderboardTable rows={board.data.rows} showMovement={period === LEADERBOARD_PERIODS.OVERALL} />
        </Card>
      )}
    </div>
  );
}
