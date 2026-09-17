import { useId } from 'react';

/**
 * Podium trophy for the section leaderboard: cup, handles, stem and base drawn
 * in our flat-vector style with a gold gradient and a shine sweep (the sweep is
 * animated in CSS via .trophy-emblem__shine).
 */
export default function TrophyEmblem({ size = 72, className = '' }) {
  const id = useId().replace(/:/g, '');
  const gold = `gold-${id}`;
  const rim = `rim-${id}`;
  const cupClip = `cup-${id}`;

  return (
    <svg
      className={`trophy-emblem ${className}`}
      width={size}
      height={size * 1.12}
      viewBox="0 0 100 112"
      role="img"
      aria-label="First place trophy"
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.35" stopColor="#f7cc3d" />
          <stop offset="0.72" stopColor="#e0a100" />
          <stop offset="1" stopColor="#b87d00" />
        </linearGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e0a100" />
          <stop offset="0.5" stopColor="#ffe9a3" />
          <stop offset="1" stopColor="#e0a100" />
        </linearGradient>
        <clipPath id={cupClip}>
          <path d="M28 20h44v18c0 16-9 27-22 27S28 54 28 38Z" />
        </clipPath>
      </defs>

      {/* handles */}
      <path d="M28 24H16v10c0 11 7 17 14 18" fill="none" stroke={`url(#${gold})`} strokeWidth="7" strokeLinecap="round" />
      <path d="M72 24h12v10c0 11-7 17-14 18" fill="none" stroke={`url(#${gold})`} strokeWidth="7" strokeLinecap="round" />

      {/* cup */}
      <path d="M28 20h44v18c0 16-9 27-22 27S28 54 28 38Z" fill={`url(#${gold})`} stroke="#a06c00" strokeWidth="2.5" strokeLinejoin="round" />
      <g clipPath={`url(#${cupClip})`}>
        <rect className="trophy-emblem__shine" x="-40" y="10" width="18" height="70" fill="#fff" opacity="0.55" transform="skewX(-18)" />
      </g>

      {/* rim */}
      <rect x="24" y="14" width="52" height="9" rx="4.5" fill={`url(#${rim})`} stroke="#a06c00" strokeWidth="2" />

      {/* star on the cup */}
      <path
        d="M50 30l4.2 8.5 9.4 1.4-6.8 6.6 1.6 9.3L50 51.4l-8.4 4.4 1.6-9.3-6.8-6.6 9.4-1.4Z"
        fill="#fff8db"
        opacity="0.92"
      />

      {/* stem + base */}
      <path d="M46 65h8v12h-8Z" fill={`url(#${gold})`} stroke="#a06c00" strokeWidth="2" />
      <path d="M34 77h32l4 10H30Z" fill={`url(#${gold})`} stroke="#a06c00" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="26" y="87" width="48" height="12" rx="4" fill={`url(#${gold})`} stroke="#a06c00" strokeWidth="2.5" />
      <rect x="34" y="90" width="32" height="5" rx="2.5" fill="#a06c00" opacity="0.35" />
    </svg>
  );
}
