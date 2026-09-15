import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { LEADERBOARD_PERIODS, getStudentLeaderboard } from '../../services/leaderboardService.js';
import { listModules } from '../../services/moduleService.js';
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

export default function LeaderboardPage() {
  useDocumentTitle('Leaderboard');
  const { user } = useAuth();
  const [period, setPeriod] = useState(LEADERBOARD_PERIODS.OVERALL);
  const [moduleId, setModuleId] = useState('mod_1');
  const modules = useAsync(listModules, []);
  const board = useAsync(
    () => getStudentLeaderboard(user._id, { period, moduleId: period === LEADERBOARD_PERIODS.MODULE ? moduleId : undefined }),
    [user._id, period, moduleId],
  );

  const data = board.data;
  const me = data?.currentStudentRow;
  const above = me ? data.rows.filter((row) => row.xp > me.xp).at(-1) : null;

  return (
    <div className="page">
      <PageHeader
        title="Leaderboard"
        subtitle={data ? `${data.section.sectionName} · rankings are visible only within your section` : 'Section rankings'}
        actions={
          period === LEADERBOARD_PERIODS.MODULE && (
            <div className="inline-select">
              <SelectInput
                aria-label="Module"
                value={moduleId}
                onChange={(event) => setModuleId(event.target.value)}
                options={(modules.data ?? []).map((m) => ({ value: m._id, label: `Module ${m.moduleNumber}: ${m.title}` }))}
              />
            </div>
          )
        }
      />
      <Tabs tabs={PERIOD_TABS} value={period} onChange={setPeriod} label="Leaderboard period" />

      {board.isLoading && !data && <LoadingState label="Loading rankings…" />}
      {board.error && <ErrorState error={board.error} onRetry={board.reload} />}
      {data && (
        <div className="leaderboard-layout">
          <Card key={`${period}-${moduleId}`} className="anim-fade-in">
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
                Students are ranked by XP earned from missions and quizzes. Replaying a mission only adds XP when you beat your
                previous best score.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
