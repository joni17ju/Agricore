/**
 * Inline stroke icon set (24×24). No icon library dependency.
 * Each entry is SVG child markup drawn with `currentColor`.
 */
const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 1 2-2h13" /><path d="M9 7h6" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="m9 12 2 2 4-4" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4" /><path d="M12 13v4M8 21h8M9 17h6v4H9z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'check-circle': <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></>,
  'x-circle': <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  unlock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /></>,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-up': <path d="m6 15 6-6 6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  'arrow-down': <path d="M12 5v14M6 13l6 6 6-6" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />,
  flame: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 2.5-1-3 0-5.5 1-8Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6M12 2v3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5L6 20" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" /></>,
  play: <path d="M7 4.5v15l12-7.5-12-7.5Z" />,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-5M12 16V8M16 16v-8" /></>,
  'trend-up': <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  'trend-down': <><path d="m3 7 6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  microscope: <><path d="M6 18h8M4 21h16M13 21a6 6 0 0 0 3-10.5" /><path d="m9 13 3-1.5M8 4l5-2 3 7-5 2-3-7Z" /></>,
  bug: <><rect x="8" y="7" width="8" height="13" rx="4" /><path d="M9.5 7a2.5 2.5 0 0 1 5 0M12 11v9M4 13h4M16 13h4M5 8l3 2M19 8l-3 2M5 19l3-2M19 19l-3-2" /></>,
  leaf: <><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15H5Z" /><path d="M5 19 13 11" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12c0-4 3-7 8-7 0 4.5-3 7-8 7ZM12 14c0-3.5-2.5-6-7-6 0 4 2.5 6 7 6Z" /></>,
  tractor: <><circle cx="7" cy="17" r="3" /><circle cx="18" cy="18" r="2" /><path d="M4 14V8h7l2 5h6v3h-1M10 17h6M7 8V5h3" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  axe: <><path d="m14 10-9 9-2-2 9-9" /><path d="M12 8c1-3 4-5 8-5-1 4-3 7-6 8l-2-3Z" /></>,
  ship: <><path d="M3 17c2 2 4 2 6 0s4-2 6 0 4 2 6 0" /><path d="M5 14 4 10h16l-1 4M8 10V6h8v4M12 3v3" /></>,
  basket: <><path d="M3 10h18l-2 10H5L3 10Z" /><path d="m8 10 4-6 4 6M9 14v3M15 14v3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M9 15v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.5-2-2.7-5-3" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  spray: <><rect x="7" y="9" width="8" height="12" rx="2" /><path d="M9 9V6h4v3M13 6h3M18 4h.01M20 6h.01M18 8h.01" /></>,
  hand: <><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6.5 7-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 0 1 2.5-1.5L8 13" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></>,
  flask: <><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" /><path d="M7 15h10" /></>,
  'zoom-in': <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M11 8v6M8 11h6" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  filter: <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" />,
  award: <><circle cx="12" cy="9" r="6" /><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7" /></>,
  sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
  droplet: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  home: <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10M10 20v-6h4v6" /></>,
  grip: <><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />,
  file: <><path d="M6 3h8l5 5v13H6V3Z" /><path d="M14 3v5h5M9 13h7M9 17h5" /></>,
  bold: <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7V5ZM7 12h7a3.5 3.5 0 0 1 0 7H7v-7Z" />,
  italic: <path d="M11 5h7M6 19h7M14 5l-4 14" />,
  underline: <path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" />,
  heading: <path d="M6 4v16M18 4v16M6 12h12" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  'list-ordered': <path d="M10 6h10M10 12h10M10 18h10M4 5l1-1v4M4 10.5a1 1 0 0 1 2 .5l-2 2h2M4 16h1.5a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1 0 1.5H4" />,
  quote: <path d="M7 7H4v5h3v3H4M17 7h-3v5h3v3h-3" />,
  'align-left': <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  'align-center': <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  'align-right': <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></>,
  highlight: <><path d="M14 4l6 6-9 9H5v-6Z" /><path d="M3 21h18" /><path d="m11 7 6 6" /></>,
  divider: <path d="M3 12h18M6 7h12M6 17h12" />,
  eraser: <><path d="M4 16 13 7a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-6 6H8Z" /><path d="M9 20h11M10 11l6 6" /></>,
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>,
  redo: <><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></>,
  save: <><path d="M5 3h11l3 3v15H5V3Z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  'user-check': <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 11l2 2 4-4" /></>,
  'user-plus': <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16a3 3 0 0 1 6 0M14 10h4M14 14h3" /></>,
  scale: <><path d="M12 3v18M6 21h12M4 8h16" /><path d="m4 8-2 6a3 3 0 0 0 4 0L4 8ZM20 8l-2 6a3 3 0 0 0 4 0l-2-6Z" /></>,
  net: <><path d="M3 4h18v16H3z" /><path d="M3 9h18M3 14h18M8 4v16M13 4v16M18 4v16" /></>,
  bird: <><path d="M16 7h.01M3 20l6-6M20 7l-3-3c-4 0-8 3-8 8a5 5 0 0 0 5 5h1l3-3V9l2-2Z" /></>,
  worm: <path d="M4 16c2-4 4 0 6-4s4 0 6-4 3-2 4 0" />,
  mouse: <><path d="M4 16c0-5 4-9 9-9s7 4 7 7-2 4-5 4H6a2 2 0 0 1-2-2Z" /><circle cx="15" cy="12" r="1" /><path d="M9 7a2.5 2.5 0 1 1 3-2M4 16c-1 2 0 4 2 4" /></>,
  wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" />,
  mountain: <path d="m3 20 7-12 4 6 3-4 4 10H3Z" />,
  seedling: <><path d="M12 21v-8" /><path d="M12 13C12 9 9 6 4 6c0 4 3 7 8 7ZM12 11c0-3.5 3-6.5 8-6.5 0 4-3 6.5-8 6.5Z" /></>,
  medal: <><circle cx="12" cy="15" r="6" /><path d="M8 3h8l-2 6h-4L8 3ZM12 12v6M10 15h4" /></>,
};

export default function Icon({ name, size = 20, strokeWidth = 1.9, className = '', title, ...props }) {
  const content = PATHS[name] ?? PATHS.help;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {content}
    </svg>
  );
}
