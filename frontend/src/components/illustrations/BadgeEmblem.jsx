/**
 * Badge emblems — original AgriCore artwork, one distinct silhouette per badge.
 *
 * Every emblem shares the same 120×120 footprint, line weight and colour
 * treatment so the ten read as one set, while each outline is shaped to its own
 * theme (seed pod, shield, lens, carapace, thistle, target, eye, flame,
 * stopwatch, laurel). Drawn in the same flat-vector language as our other
 * illustrations: solid fills, dark theme-toned outlines and a soft white
 * highlight, with no external assets.
 *
 * Badge meaning, name and description live in constants/badges.js; this file
 * only holds the artwork for each code.
 */

/** Per-theme palette: outline, mid fill, light fill, glow colour. */
const THEMES = {
  sprout: { dark: '#14683a', mid: '#37a45f', light: '#9fdcae', glow: '55, 164, 95' },
  intro: { dark: '#175f3c', mid: '#2e8b57', light: '#a7d9b9', glow: '46, 139, 87' },
  pathology: { dark: '#1d5a72', mid: '#2f8aab', light: '#a8d8e8', glow: '47, 138, 171' },
  entomology: { dark: '#7a3a12', mid: '#c2661f', light: '#f0b681', glow: '194, 102, 31' },
  weeds: { dark: '#4a6b15', mid: '#7ba227', light: '#cbe294', glow: '123, 162, 39' },
  ipm: { dark: '#125a44', mid: '#1f8a66', light: '#9ad9c2', glow: '31, 138, 102' },
  precision: { dark: '#25397f', mid: '#3f5fc0', light: '#b4c4f2', glow: '63, 95, 192' },
  streak: { dark: '#8a4708', mid: '#df8412', light: '#f7cd8c', glow: '223, 132, 18' },
  speed: { dark: '#4a2f7d', mid: '#7c5cbe', light: '#c9b6ee', glow: '124, 92, 190' },
  champion: { dark: '#8a6207', mid: '#e0a800', light: '#f7dd8f', glow: '224, 168, 0' },
  locked: { dark: '#8d968f', mid: '#c3cbc5', light: '#e4e8e3', glow: '150, 160, 152' },
};

// ───────────────────────── Silhouettes ─────────────────────────
// Each returns the outline path data for the badge's frame.
const SHAPES = {
  /** Organic seed pod: pointed tip, full rounded base. */
  pod: 'M60 6 C86 24 104 46 104 68 C104 94 84 113 60 113 C36 113 16 94 16 68 C16 46 34 24 60 6 Z',
  /** Classic protective shield. */
  shield: 'M60 7 L103 21 V59 C103 87 84 105 60 114 C36 105 17 87 17 59 V21 Z',
  /** Rounded carapace: broad shoulders tapering to a beetle-like point. */
  carapace: 'M60 7 L98 27 C104 46 103 66 96 82 L60 114 L24 82 C17 66 16 46 22 27 Z',
  /** Jagged thistle burst for the weed badge. */
  thistle:
    'M60 4 L71 24 L92 16 L87 39 L110 48 L92 62 L107 82 L84 82 L79 106 L60 94 L41 106 L36 82 L13 82 L28 62 L10 48 L33 39 L28 16 L49 24 Z',
  /** Vesica / almond frame for the eye badge. */
  almond: 'M60 4 C96 22 112 44 112 60 C112 76 96 98 60 116 C24 98 8 76 8 60 C8 44 24 22 60 4 Z',
  /** Teardrop with a flame-licked crown. */
  flame:
    'M60 3 C64 16 72 21 76 31 C92 42 101 57 101 73 C101 95 83 113 60 113 C37 113 19 95 19 73 C19 54 33 39 48 29 C55 21 57 12 60 3 Z',
  /** Watch case: rounded hexagon with a crown stem. */
  watch: 'M60 13 L98 33 V79 L60 111 L22 79 V33 Z',
};

/** Frames drawn from primitives rather than a single path. */
function LensFrame({ theme }) {
  return (
    <>
      <circle cx="60" cy="60" r="51" fill={theme.mid} stroke={theme.dark} strokeWidth="4" />
      <circle cx="60" cy="60" r="42" fill={theme.light} />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6;
        return (
          <rect
            key={i}
            x="57.5"
            y="2"
            width="5"
            height="10"
            rx="2"
            fill={theme.dark}
            transform={`rotate(${(angle * 180) / Math.PI} 60 60)`}
          />
        );
      })}
    </>
  );
}

function TargetFrame({ theme }) {
  return (
    <>
      <circle cx="60" cy="60" r="50" fill={theme.mid} stroke={theme.dark} strokeWidth="4" />
      <circle cx="60" cy="60" r="41" fill={theme.light} />
      {[0, 90, 180, 270].map((angle) => (
        <path
          key={angle}
          d="M52 2 L68 2 L64 14 L56 14 Z"
          fill={theme.dark}
          transform={`rotate(${angle} 60 60)`}
        />
      ))}
    </>
  );
}

function LaurelFrame({ theme }) {
  const leaf = (x, y, rotate, scale = 1) => (
    <ellipse
      key={`${x}-${y}-${rotate}`}
      cx={x}
      cy={y}
      rx={7 * scale}
      ry={12 * scale}
      fill={theme.mid}
      stroke={theme.dark}
      strokeWidth="2"
      transform={`rotate(${rotate} ${x} ${y})`}
    />
  );
  return (
    <>
      <circle cx="60" cy="60" r="43" fill={theme.light} stroke={theme.dark} strokeWidth="4" />
      {/* left branch */}
      {leaf(14, 78, 35)} {leaf(12, 60, 10)} {leaf(17, 42, -20)} {leaf(28, 27, -45)}
      {/* right branch */}
      {leaf(106, 78, -35)} {leaf(108, 60, -10)} {leaf(103, 42, 20)} {leaf(92, 27, 45)}
      <path d="M22 88 Q8 66 26 24" stroke={theme.dark} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M98 88 Q112 66 94 24" stroke={theme.dark} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </>
  );
}

// ───────────────────────── Glyphs ─────────────────────────
// Sized for a ~46×46 area centred near (60, 52).
const GLYPHS = {
  /** Sprout breaking out of a seed. */
  sprout: (t) => (
    <g>
      <path d="M60 70 V44" stroke={t.dark} strokeWidth="5" strokeLinecap="round" />
      <path d="M60 50c0-11 8-19 21-19 0 12-9 20-21 19Z" fill={t.mid} stroke={t.dark} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 58c0-10-8-17-19-17 0 11 8 18 19 17Z" fill={t.light} stroke={t.dark} strokeWidth="3" strokeLinejoin="round" />
      <path d="M48 70h24l-4 12H52Z" fill={t.dark} opacity="0.85" />
    </g>
  ),
  /** Shield with a check: protection achieved. */
  guard: (t) => (
    <g>
      <path d="M60 26 L82 33v18c0 14-9 23-22 28-13-5-22-14-22-28V33Z" fill={t.light} stroke={t.dark} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M50 52l7 8 14-16" stroke={t.dark} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  /** Magnifier over a leaf: diagnosis. */
  diagnose: (t) => (
    <g>
      <path d="M38 66c0-18 12-30 34-31-1 19-14 31-34 31Z" fill={t.mid} stroke={t.dark} strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 65 66 40" stroke={t.dark} strokeWidth="2.4" />
      <circle cx="66" cy="54" r="15" fill="#fff" fillOpacity="0.55" stroke={t.dark} strokeWidth="4" />
      <path d="M77 65 L88 76" stroke={t.dark} strokeWidth="6" strokeLinecap="round" />
      <circle cx="61" cy="49" r="4" fill="#fff" opacity="0.7" />
    </g>
  ),
  /** Beetle seen from above. */
  beetle: (t) => (
    <g>
      <path d="M44 42l-9-8M76 42l9-8M40 56H28M80 56h12M42 70l-10 8M78 70l10 8" stroke={t.dark} strokeWidth="3.4" strokeLinecap="round" />
      <ellipse cx="60" cy="38" rx="10" ry="8" fill={t.dark} />
      <path d="M52 30l-4-8M68 30l4-8" stroke={t.dark} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="60" cy="63" rx="20" ry="24" fill={t.light} stroke={t.dark} strokeWidth="3.5" />
      <path d="M60 41v45" stroke={t.dark} strokeWidth="3" />
      <circle cx="51" cy="56" r="3.4" fill={t.dark} />
      <circle cx="69" cy="68" r="3.4" fill={t.dark} />
    </g>
  ),
  /** Spiky weed with a taproot. */
  weed: (t) => (
    <g>
      <path d="M60 80V50" stroke={t.dark} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M60 58c-9-3-14-11-15-22 10 3 15 11 15 22Z" fill={t.mid} stroke={t.dark} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 52c8-4 12-13 12-24-9 4-13 13-12 24Z" fill={t.light} stroke={t.dark} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 70c-10-2-16-8-18-17 10 1 17 7 18 17Z" fill={t.mid} stroke={t.dark} strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 80c-4 6-6 12-5 18M60 80c4 5 7 10 8 16" stroke={t.dark} strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),
  /** Target with a dart in the bullseye: IPM strategy. */
  target: (t) => (
    <g>
      <circle cx="58" cy="58" r="22" fill="#fff" fillOpacity="0.5" stroke={t.dark} strokeWidth="3.5" />
      <circle cx="58" cy="58" r="13" fill={t.mid} stroke={t.dark} strokeWidth="3" />
      <circle cx="58" cy="58" r="5" fill={t.dark} />
      <path d="M58 58 L86 32" stroke={t.dark} strokeWidth="5" strokeLinecap="round" />
      <path d="M86 32l-2-10 12 0-2 10Z" fill={t.mid} stroke={t.dark} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  ),
  /** Open eye with a highlight: perfect observation. */
  eye: (t) => (
    <g>
      <path d="M32 56c8-12 17-18 28-18s20 6 28 18c-8 12-17 18-28 18s-20-6-28-18Z" fill="#fff" fillOpacity="0.65" stroke={t.dark} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="60" cy="56" r="11" fill={t.mid} stroke={t.dark} strokeWidth="3" />
      <circle cx="60" cy="56" r="4.5" fill={t.dark} />
      <circle cx="64" cy="51" r="3" fill="#fff" opacity="0.9" />
      <path d="M40 38l6 6M80 38l-6 6M60 32v7" stroke={t.dark} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  /** Flame for the daily streak. */
  flame: (t) => (
    <g>
      <path d="M60 28c4 12 18 17 18 31a18 18 0 0 1-36 0c0-7 3-12 7-16 1 5 4 8 7 8-4-10 0-17 4-23Z" fill={t.mid} stroke={t.dark} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M60 48c3 6 8 8 8 14a8 8 0 0 1-16 0c0-5 5-8 8-14Z" fill={t.light} />
    </g>
  ),
  /** Stopwatch with the hand near the top: beat the clock. */
  stopwatch: (t) => (
    <g>
      <circle cx="60" cy="58" r="23" fill="#fff" fillOpacity="0.6" stroke={t.dark} strokeWidth="3.5" />
      <path d="M52 30h16" stroke={t.dark} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M60 58V44M60 58l10 7" stroke={t.dark} strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="58" r="3.5" fill={t.dark} />
      <path d="M79 40l6-5" stroke={t.dark} strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  /** Trophy cup for the section leaderboard. */
  trophy: (t) => (
    <g>
      <path d="M46 34h28v14c0 9-6 15-14 15s-14-6-14-15Z" fill={t.mid} stroke={t.dark} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M46 38h-8v5c0 6 4 9 8 9M74 38h8v5c0 6-4 9-8 9" stroke={t.dark} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M60 63v9M50 80h20l-2-8H52Z" stroke={t.dark} strokeWidth="3.5" fill={t.light} strokeLinejoin="round" />
      <path d="M60 41l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z" fill="#fff" opacity="0.85" />
    </g>
  ),
};

/** Shape + theme + glyph + headline value for each badge code. */
const EMBLEMS = {
  FIRST_HARVEST: { shape: 'pod', theme: 'sprout', glyph: 'sprout', value: '1' },
  CROP_GUARDIAN: { shape: 'shield', theme: 'intro', glyph: 'guard', value: '1' },
  DIAGNOSTICIAN: { shape: 'lens', theme: 'pathology', glyph: 'diagnose', value: '2' },
  PEST_TRACKER: { shape: 'carapace', theme: 'entomology', glyph: 'beetle', value: '3' },
  WEED_SPECIALIST: { shape: 'thistle', theme: 'weeds', glyph: 'weed', value: '4' },
  IPM_STRATEGIST: { shape: 'target', theme: 'ipm', glyph: 'target', value: '5' },
  SHARP_EYE: { shape: 'almond', theme: 'precision', glyph: 'eye', value: '100%' },
  STEADY_GROWER: { shape: 'flame', theme: 'streak', glyph: 'flame', value: '5' },
  QUICK_SCOUT: { shape: 'watch', theme: 'speed', glyph: 'stopwatch', value: '50%' },
  TOP_GROWER: { shape: 'laurel', theme: 'champion', glyph: 'trophy', value: '#3' },
};

const FALLBACK = { shape: 'shield', theme: 'sprout', glyph: 'guard', value: '' };

function Frame({ shape, theme }) {
  if (shape === 'lens') return <LensFrame theme={theme} />;
  if (shape === 'target') return <TargetFrame theme={theme} />;
  if (shape === 'laurel') return <LaurelFrame theme={theme} />;
  return (
    <>
      <path d={SHAPES[shape]} fill={theme.mid} stroke={theme.dark} strokeWidth="4" strokeLinejoin="round" />
      <path
        d={SHAPES[shape]}
        fill={theme.light}
        stroke="none"
        transform="translate(60 60) scale(0.84) translate(-60 -60)"
      />
    </>
  );
}

/**
 * @param {object} props
 * @param {{ code: string, name: string }} props.badge
 * @param {number} props.size          rendered width/height in px
 * @param {boolean} props.isEarned     locked badges render muted with a padlock
 * @param {boolean} props.reveal       plays the unlock pop + glow burst
 * @param {boolean} props.showValue    headline number (auto-hidden when small)
 */
export default function BadgeEmblem({ badge, size = 96, isEarned = true, reveal = false, showValue, className = '' }) {
  const config = EMBLEMS[badge.code] ?? FALLBACK;
  const theme = isEarned ? THEMES[config.theme] : THEMES.locked;
  const withValue = (showValue ?? size >= 60) && Boolean(config.value);

  return (
    <span
      className={`badge-emblem ${isEarned ? 'is-earned' : 'is-locked'} ${reveal ? 'is-reveal' : ''} ${className}`}
      style={{ width: size, height: size, '--badge-glow': theme.glow }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={badge.name}>
        <Frame shape={config.shape} theme={theme} />
        {isEarned ? GLYPHS[config.glyph](theme) : (
          <g>
            <rect x="46" y="54" width="28" height="22" rx="5" fill={theme.dark} opacity="0.75" />
            <path d="M52 54v-6a8 8 0 0 1 16 0v6" stroke={theme.dark} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.75" />
          </g>
        )}
        {withValue && isEarned && (
          <text
            x="60"
            y="103"
            textAnchor="middle"
            className="badge-emblem__value"
            fill="#fff"
            stroke={theme.dark}
            strokeWidth="5"
            paintOrder="stroke"
          >
            {config.value}
          </text>
        )}
        {/* soft top highlight, matching our other illustrations */}
        <ellipse cx="46" cy="30" rx="14" ry="7" fill="#fff" opacity={isEarned ? 0.22 : 0.1} transform="rotate(-25 46 30)" />
      </svg>
      {isEarned && (
        <>
          <span className="badge-emblem__spark badge-emblem__spark--a" />
          <span className="badge-emblem__spark badge-emblem__spark--b" />
          <span className="badge-emblem__spark badge-emblem__spark--c" />
        </>
      )}
    </span>
  );
}
