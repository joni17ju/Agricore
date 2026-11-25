import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { LEADERBOARD_PERIODS, getStudentLeaderboard, isBoardFor } from '../../services/leaderboardService.js';
import { listModules } from '../../services/moduleService.js';
import Card from '../../components/common/Card.jsx';
import { EmptyState, ErrorState, PageHeader, SkeletonBlock } from '../../components/common/Display.jsx';
import { SelectInput } from '../../components/common/Form.jsx';
import Tabs from '../../components/common/Tabs.jsx';
import { LeaderboardTable, Podium } from '../../components/leaderboard/Leaderboard.jsx';

const PERIOD_TABS = [
  { value: LEADERBOARD_PERIODS.OVERALL, label: 'Overall Rank', icon: 'trophy' },
  { value: LEADERBOARD_PERIODS.WEEK, label: 'This Week', icon: 'flame' },
  { value: LEADERBOARD_PERIODS.MODULE, label: 'By Module', icon: 'book' },
];

export default function LeaderboardPage() {
  useDocumentTitle('Leaderboard');
  const { user } = useAuth();
  const [period, setPeriod] = useState(LEADERBOARD_PERIODS.OVERALL);
  /*
   * Empty until the modules load, then the first one. It used to default to
   * the mock id "mod_1", which no longer exists in the database — the By
   * Module board asked for a module that could never be found. Deriving it
   * from the list also means the filter works whatever modules the course has.
   */
  const [moduleId, setModuleId] = useState('');
  const modules = useAsync(listModules, []);
  const selectedModuleId = moduleId || modules.data?.[0]?._id || '';
  const isModuleBoard = period === LEADERBOARD_PERIODS.MODULE;
  // The By Module board waits for the module list instead of asking for "no module".
  const canLoad = !isModuleBoard || Boolean(selectedModuleId);
  const board = useAsync(
    () =>
      canLoad
        ? getStudentLeaderboard(user._id, { period, moduleId: isModuleBoard ? selectedModuleId : undefined })
        : Promise.resolve(null),
    [user._id, period, isModuleBoard ? selectedModuleId : '', canLoad],
  );

  // Only ever show the board that matches the current tab and module.
  const data = isBoardFor(board.data, { period, moduleId: selectedModuleId }) ? board.data : null;
  const me = data?.currentStudentRow;
  const above = me ? data.rows.filter((row) => row.xp > me.xp).at(-1) : null;
  const moduleError = isModuleBoard && modules.error;

  return (
    <div className="page">
      <PageHeader
        title="Leaderboard"
        subtitle={data ? `${data.section.sectionName} · rankings are visible only within your section` : 'Section rankings'}
        actions={
          isModuleBoard && (
            <div className="inline-select">
              <SelectInput
                aria-label="Module"
                value={selectedModuleId}
                onChange={(event) => setModuleId(event.target.value)}
                options={(modules.data ?? []).map((m) => ({ value: m._id, label: `Module ${m.moduleNumber}: ${m.title}` }))}
                disabled={!modules.data}
              />
            </div>
          )
        }
      />
      <Tabs tabs={PERIOD_TABS} value={period} onChange={setPeriod} label="Leaderboard period" />

      {moduleError && <ErrorState error={modules.error} onRetry={modules.reload} />}
      {!moduleError && board.error && <ErrorState error={board.error} onRetry={board.reload} />}
      {!moduleError && !board.error && !data && <SkeletonBlock variant="list" rows={6} label="Loading rankings" />}
      {data && (
        <div className="leaderboard-layout">
          <Card key={`${period}-${selectedModuleId}`} className="anim-fade-in">
            {data.rows.every((row) => row.xp === 0) ? (
              <EmptyState icon="trophy" title="No XP earned yet" message="Rankings appear as students in your section complete missions." />
            ) : (
              <>
                <Podium rows={data.rows} highlightId={user._id} />
                <LeaderboardTable rows={data.rows} highlightId={user._id} showMovement={period === LEADERBOARD_PERIODS.OVERALL} />
              </>
            )}
          </Card>
          <div className="stack">
            {me && (
              <Card title="Your Rank" icon="medal" className="rank-card anim-fade-up">
                <div key={`${period}-${me.rank}`} className="rank-card__rank">#{me.rank}</div>
                <p className="text-muted">of {data.totalStudents} students</p>
                <div className="rank-card__gap">
                  {me.rank === 1
                    ? 'You are leading your section. Keep it up!'
                    : above
                      ? `${(above.xp - me.xp + 1).toLocaleString()} XP to pass ${above.student.firstName} ${above.student.lastName[0]}.`
                      : 'Earn XP to climb the ranks.'}
                </div>
              </Card>
            )}
            <Card title="How ranking works" icon="info" className="anim-fade-up" style={{ '--i': 1 }}>
              <p className="text-sm text-muted">
                Students are ranked by XP earned from missions. Replaying a mission only adds XP when you beat your
                previous best score.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
