export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/** mm:ss for countdown timers. */
export function formatClock(totalSeconds) {
  const seconds = Math.max(0, totalSeconds);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return value ? new Date(value).toLocaleDateString('en-US', options) : '—';
}

export function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';
}

export function formatRelativeDays(days) {
  if (days === null || days === undefined) return 'Never';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "Mission 3.2" — module number and level number. */
export function missionCode(module, mission) {
  if (!module || !mission) return 'Mission';
  return `Mission ${module.moduleNumber}.${mission.levelNumber}`;
}

export const pluralize = (count, word, plural = `${word}s`) => `${count} ${count === 1 ? word : plural}`;

export const fullName = (user) => (user ? `${user.firstName} ${user.lastName}` : '');

/**
 * Short relative time for notification rows: "just now", "5m ago", "3h ago",
 * "2d ago", then an absolute date once it stops being useful as "n days ago".
 */
export function formatRelativeTime(value, now = new Date()) {
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  // Small clock differences between browser and server can make a row look
  // like it arrives from the future; treat anything within a minute as now.
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(then, { month: 'short', day: 'numeric' });
}

/** "Today" / "Yesterday" / a date, used to group notification rows. */
export function dayGroupLabel(value, now = new Date()) {
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '';

  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'Earlier this week';
  return 'Older';
}
