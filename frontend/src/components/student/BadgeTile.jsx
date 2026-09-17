import { formatDate } from '../../utils/format.js';
import BadgeEmblem from '../illustrations/BadgeEmblem.jsx';

/** A badge; locked badges appear muted. `reveal` plays the unlock animation. */
export default function BadgeTile({ badge, index = 0, compact = false, reveal = false }) {
  const earned = badge.isEarned ?? true;
  return (
    <div
      className={`badge-tile ${earned ? 'is-earned' : 'is-locked'} ${compact ? 'badge-tile--compact' : ''} ${reveal ? 'anim-pop' : 'anim-scale-in'}`}
      style={{ '--i': index }}
      title={`${badge.name} — ${badge.description}`}
    >
      <BadgeEmblem badge={badge} size={compact ? 58 : 84} isEarned={earned} reveal={reveal} />
      <strong className="badge-tile__name">{badge.name}</strong>
      {!compact && <span className="badge-tile__desc">{badge.description}</span>}
      {!compact && earned && badge.earnedAt && <span className="badge-tile__date">Earned {formatDate(badge.earnedAt)}</span>}
    </div>
  );
}
