/**
 * Section leaderboard UI (Proposal Fig 23) shared by students and instructors.
 */
import { Avatar } from '../common/Display.jsx';
import Icon from '../common/Icon.jsx';
import TrophyEmblem from '../illustrations/TrophyEmblem.jsx';

const PODIUM_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd
const CONFETTI = Array.from({ length: 14 }, (_, i) => i);
const LEAVES = Array.from({ length: 6 }, (_, i) => i);

export function Podium({ rows, highlightId }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div className="podium-stage">
      {/* Decorative backdrop: spotlight, light rays and drifting leaves (CSS only). */}
      <span className="podium-stage__glow" aria-hidden="true" />
      <span className="podium-stage__rays" aria-hidden="true" />
      <span className="podium-stage__leaves" aria-hidden="true">
        {LEAVES.map((i) => (
          <span key={i} style={{ '--i': i }} />
        ))}
      </span>

      <div className="podium" aria-label="Top three students">
        {PODIUM_ORDER.map((position) => {
          const row = top[position];
          if (!row) return <div key={position} className="podium__slot" />;
          return (
            <div
              key={row.student._id}
              className={`podium__slot podium__slot--${position + 1} ${row.student._id === highlightId ? 'is-me' : ''}`}
              style={{ '--i': position }}
            >
              {position === 0 && (
                <span className="podium__trophy">
                  <span className="podium__trophy-burst" aria-hidden="true" />
                  <TrophyEmblem size={74} />
                  <span className="podium__confetti" aria-hidden="true">
                    {CONFETTI.map((i) => (
                      <span key={i} style={{ '--i': i }} />
                    ))}
                  </span>
                </span>
              )}
              <Avatar firstName={row.student.firstName} lastName={row.student.lastName} size={position === 0 ? 64 : 52} className="podium__avatar" src={row.student.avatarUrl} />
              <strong className="podium__name">{row.student.firstName} {row.student.lastName[0]}.</strong>
              <span className="podium__xp">{row.xp.toLocaleString()} XP</span>
              <div className="podium__block">
                <span>{row.rank}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RankChange({ value }) {
  if (!value) return <span className="rank-change rank-change--same" title="No change this week">—</span>;
  const up = value > 0;
  return (
    <span className={`rank-change rank-change--${up ? 'up' : 'down'}`} title={`${up ? 'Up' : 'Down'} ${Math.abs(value)} this week`}>
      <Icon name={up ? 'arrow-up' : 'arrow-down'} size={13} strokeWidth={2.6} />
      {Math.abs(value)}
    </span>
  );
}

export function LeaderboardTable({ rows, highlightId, showMovement = true }) {
  return (
    <ol className="leaderboard-table">
      <li className="leaderboard-table__head" aria-hidden="true">
        <span>#</span>
        <span>Student</span>
        <span className="hide-sm">Level</span>
        <span className="hide-sm">Badges</span>
        <span>XP</span>
      </li>
      {rows.map((row, index) => (
        <li
          key={row.student._id}
          className={`leaderboard-table__row anim-fade-up ${row.student._id === highlightId ? 'is-me' : ''} ${row.rank <= 3 ? `is-top is-top-${row.rank}` : ''}`}
          style={{ '--i': Math.min(index, 12) }}
        >
          <span className="leaderboard-table__rank">
            <span className={`rank-badge rank-badge--${row.rank}`}>{row.rank}</span>
            {showMovement && <RankChange value={row.rankChange} />}
          </span>
          <span className="cell-user">
            <Avatar firstName={row.student.firstName} lastName={row.student.lastName} size={32} src={row.student.avatarUrl} />
            <strong>
              {row.student.firstName} {row.student.lastName}
              {row.student._id === highlightId && <span className="leaderboard-table__you"> (You)</span>}
            </strong>
          </span>
          <span className="hide-sm">Lv {row.level}</span>
          <span className="hide-sm leaderboard-table__badges"><Icon name="award" size={14} /> {row.student.badgeCount}</span>
          <strong className="leaderboard-table__xp">{row.xp.toLocaleString()}</strong>
        </li>
      ))}
    </ol>
  );
}
