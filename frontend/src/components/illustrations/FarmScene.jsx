/**
 * Original SVG farm backdrop used by the Decision-Making and Strategy games.
 * `sceneKey` values come from missions.scenarioData.sceneKey.
 */
const SCENE_VARIANTS = {
  'farm-cornfield': 'corn',
  'corn-field': 'corn',
  'rice-paddy': 'rice',
  'rice-field': 'rice',
  'tomato-farm': 'tomato',
  'tomato-field': 'tomato',
  'eggplant-field': 'eggplant',
  'banana-farm': 'banana',
  warehouse: 'warehouse',
  village: 'village',
};

const range = (count) => Array.from({ length: count }, (_, index) => index);

function CornRows({ health }) {
  return range(14).map((i) => {
    const x = 20 + i * 58;
    const height = 120 + ((i * 37) % 40);
    return (
      <g key={i} transform={`translate(${x} ${400 - height})`}>
        <path d={`M10 ${height} V10`} stroke="#4f8a2b" strokeWidth="5" />
        <path d={`M10 60 Q-25 45 -30 70 M10 40 Q45 25 52 50 M10 90 Q-20 80 -28 105 M10 75 Q40 68 46 92`} stroke={health} strokeWidth="7" fill="none" strokeLinecap="round" />
        <ellipse cx="17" cy="55" rx="6" ry="16" fill="#e7c14c" />
        <path d="M10 10 l-6 -14 M10 10 l6 -14 M10 10 l0 -16" stroke="#c9a53c" strokeWidth="2" />
      </g>
    );
  });
}

function RiceRows({ health }) {
  return (
    <>
      <rect x="0" y="265" width="800" height="135" fill="#7fb8c9" opacity="0.55" />
      {range(26).map((i) => (
        <g key={i} transform={`translate(${10 + (i % 13) * 62 + (i >= 13 ? 30 : 0)} ${i >= 13 ? 330 : 275})`}>
          {range(5).map((j) => (
            <path key={j} d={`M16 60 Q${6 + j * 5} 20 ${-4 + j * 10} 0`} stroke={health} strokeWidth="3" fill="none" />
          ))}
        </g>
      ))}
    </>
  );
}

function BushRows({ health, fruit }) {
  return range(10).map((i) => (
    <g key={i} transform={`translate(${30 + i * 80} ${i % 2 ? 300 : 280})`}>
      <path d="M40 110 V40" stroke="#4f7d2c" strokeWidth="5" />
      <ellipse cx="40" cy="45" rx="42" ry="34" fill={health} />
      <ellipse cx="22" cy="30" rx="18" ry="14" fill="#6aa84f" opacity="0.8" />
      <ellipse cx="58" cy="58" rx="20" ry="14" fill="#3f7f2e" opacity="0.7" />
      {fruit === 'tomato' && (
        <>
          <circle cx="24" cy="62" r="9" fill="#e2452f" />
          <circle cx="55" cy="36" r="8" fill="#f06a3c" />
        </>
      )}
      {fruit === 'eggplant' && (
        <>
          <ellipse cx="26" cy="68" rx="7" ry="15" fill="#5b2a6e" />
          <ellipse cx="58" cy="64" rx="6" ry="13" fill="#6d3582" />
        </>
      )}
    </g>
  ));
}

function BananaRows({ health }) {
  return range(7).map((i) => (
    <g key={i} transform={`translate(${40 + i * 115} 210)`}>
      <path d="M40 190 V40" stroke="#7a9a3a" strokeWidth="12" />
      <path d="M40 50 Q-30 20 -40 70 Q0 55 40 55 M40 50 Q110 15 125 65 Q80 50 40 55 M40 45 Q30 -10 70 -20 Q55 20 40 48" fill={health} />
    </g>
  ));
}

function Warehouse() {
  return (
    <g transform="translate(250 170)">
      <path d="M0 90 L150 20 L300 90 V230 H0 Z" fill="#c9b89a" />
      <path d="M-10 95 L150 12 L310 95" stroke="#8b5e3c" strokeWidth="14" fill="none" strokeLinejoin="round" />
      <rect x="105" y="120" width="90" height="110" fill="#6d4c33" />
      <path d="M105 120 L195 230 M195 120 L105 230" stroke="#8b6a4d" strokeWidth="5" />
      {range(4).map((i) => (
        <rect key={i} x={-120 + i * 34} y={190} width="30" height="40" rx="4" fill="#e3cf9a" stroke="#b39a5e" />
      ))}
    </g>
  );
}

function Village({ health }) {
  return (
    <>
      {range(4).map((i) => (
        <g key={i} transform={`translate(${60 + i * 190} ${200 + (i % 2) * 20})`}>
          <path d="M0 60 L60 10 L120 60 V140 H0 Z" fill={['#e9d5a8', '#d9c29a', '#efdcb5', '#dcc49b'][i]} />
          <path d="M-8 64 L60 4 L128 64" stroke="#8c3b2a" strokeWidth="10" fill="none" />
          <rect x="45" y="85" width="30" height="55" fill="#7a5134" />
        </g>
      ))}
      <BushRows health={health} fruit="none" />
    </>
  );
}

export default function FarmScene({ sceneKey, stressed = false, className = '' }) {
  const variant = SCENE_VARIANTS[sceneKey] ?? 'corn';
  const health = stressed ? '#a9a83f' : '#5a9e3a';

  return (
    <svg className={`farm-scene ${className}`} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Farm scene">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0f0" />
          <stop offset="1" stopColor="#dff3fb" />
        </linearGradient>
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9bcf5c" />
          <stop offset="1" stopColor="#6f9f3a" />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill="url(#sky)" />
      <circle cx="690" cy="70" r="36" fill="#fff3b0" opacity="0.9" />
      <g fill="#fff" opacity="0.85">
        <ellipse cx="160" cy="70" rx="46" ry="16" />
        <ellipse cx="195" cy="60" rx="30" ry="14" />
        <ellipse cx="520" cy="50" rx="38" ry="12" />
      </g>
      <path d="M0 220 Q160 150 330 205 T800 190 V400 H0 Z" fill="#b9dc8a" />
      <path d="M0 250 Q220 200 460 245 T800 235 V400 H0 Z" fill="url(#field)" />
      {variant !== 'warehouse' && variant !== 'village' && (
        <g transform="translate(560 150)">
          <path d="M0 45 L45 10 L90 45 V100 H0 Z" fill="#b7372b" />
          <path d="M-6 48 L45 4 L96 48" stroke="#7d241c" strokeWidth="8" fill="none" />
          <rect x="30" y="60" width="30" height="40" fill="#f4e7d0" />
          <path d="M30 60 L60 100 M60 60 L30 100" stroke="#b7372b" strokeWidth="3" />
        </g>
      )}
      {variant === 'corn' && <CornRows health={health} />}
      {variant === 'rice' && <RiceRows health={health} />}
      {(variant === 'tomato' || variant === 'eggplant') && <BushRows health={health} fruit={variant} />}
      {variant === 'banana' && <BananaRows health={health} />}
      {variant === 'warehouse' && <Warehouse />}
      {variant === 'village' && <Village health={health} />}
    </svg>
  );
}
