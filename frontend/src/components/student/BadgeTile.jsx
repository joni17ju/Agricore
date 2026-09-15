import { formatDate } from '../../utils/format.js';
import Icon from '../common/Icon.jsx';

/** A badge; locked badges appear muted. `reveal` plays the pop-in animation. */
export default function BadgeTile({ badge, index = 0, compact = false, reveal = false }) {
  const earned = badge.isEarned ?? true;
  return (
    <div
      className={`badge-tile ${earned ? 'is-earned' : 'is-locked'} ${compact ? 'badge-tile--compact' : ''} ${reveal ? 'anim-pop' : 'anim-scale-in'}`}
      style={{ '--i': index }}
      title={`${badge.name} — ${badge.description}`}
    >
      <span className="badge-tile__medal">
        <Icon name={earned ? badge.icon : 'lock'} size={compact ? 20 : 26} />
      </span>
      <strong className="badge-tile__name">{badge.name}</strong>
      {!compact && <span className="badge-tile__desc">{badge.description}</span>}
      {!compact && earned && badge.earnedAt && <span className="badge-tile__date">Earned {formatDate(badge.earnedAt)}</span>}
    </div>
  );
}
