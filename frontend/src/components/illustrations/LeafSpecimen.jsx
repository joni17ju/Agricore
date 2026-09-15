/**
 * Original SVG plant specimens for the Module 2 Identification game.
 * Lesions are drawn at the mission's symptomSpots coordinates, so what students
 * see always matches the answer data. ViewBox is 400×300 (4:3); spot x/y/radius
 * are percentages of the width/height.
 */
const SPECIMENS = {
  'peanut-leaf-spot': { shape: 'broad', leaf: '#5d9e3c', lesion: 'halo' },
  'rice-bacterial-blight': { shape: 'blades', leaf: '#6aa83e', lesion: 'streak' },
  'pepper-mosaic': { shape: 'broad', leaf: '#3f8a35', lesion: 'mosaic' },
  'cucumber-powdery-mildew': { shape: 'broad', leaf: '#4f9437', lesion: 'powder' },
  'mango-anthracnose': { shape: 'fruit', leaf: '#8fbf45', lesion: 'sunken' },
  'tomato-late-blight': { shape: 'broad', leaf: '#4c8e36', lesion: 'blight' },
  'corn-common-rust': { shape: 'blades', leaf: '#5fa33f', lesion: 'pustule' },
  'rice-blast': { shape: 'blades', leaf: '#6fae42', lesion: 'diamond' },
};

const toSvg = (spot) => ({ cx: spot.x * 4, cy: spot.y * 3, r: spot.radius * 4 * 0.72 });

function Lesion({ type, spot, index }) {
  const { cx, cy, r } = toSvg(spot);
  switch (type) {
    case 'halo':
      return (
        <g>
          <circle cx={cx} cy={cy} r={r} fill="#e8d64a" opacity="0.75" />
          <circle cx={cx} cy={cy} r={r * 0.62} fill="#6b3f1f" />
          <circle cx={cx + r * 0.1} cy={cy - r * 0.1} r={r * 0.3} fill="#3e2412" />
        </g>
      );
    case 'streak':
      return (
        <g transform={`rotate(-28 ${cx} ${cy})`}>
          <path d={`M${cx - r * 1.4} ${cy} q${r * 0.35} ${-r * 0.55} ${r * 0.7} 0 t${r * 0.7} 0 t${r * 0.7} 0 t${r * 0.7} 0 v${r * 0.5} q${-r * 0.35} ${r * 0.4} ${-r * 0.7} 0 t${-r * 0.7} 0 t${-r * 0.7} 0 t${-r * 0.7} 0 Z`} fill="#e9e1a0" />
          <circle cx={cx + r * 0.3} cy={cy + r * 0.2} r={r * 0.12} fill="#f5d36b" />
          <circle cx={cx - r * 0.4} cy={cy + r * 0.25} r={r * 0.1} fill="#f5d36b" />
        </g>
      );
    case 'mosaic':
      return (
        <g opacity="0.9">
          <path d={`M${cx - r} ${cy} q${r * 0.4} ${-r} ${r} ${-r * 0.7} q${r * 0.9} ${r * 0.1} ${r * 0.8} ${r * 0.8} q${-r * 0.3} ${r * 0.9} ${-r} ${r * 0.6} q${-r * 0.7} ${-r * 0.2} ${-r * 0.8} ${-r * 0.7} Z`} fill="#a9d66a" />
          <circle cx={cx + r * 0.3} cy={cy - r * 0.2} r={r * 0.3} fill="#c8e88d" />
          <path d={`M${cx - r * 0.6} ${cy + r * 0.3} q${r * 0.5} ${-r * 0.3} ${r} ${r * 0.1}`} stroke="#2f6d27" strokeWidth="3" fill="none" />
        </g>
      );
    case 'powder':
      return (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={cx + Math.cos(i * 1.1 + index) * r * 0.55} cy={cy + Math.sin(i * 1.3 + index) * r * 0.5} r={r * 0.45} fill="#f4f6f0" opacity="0.8" />
          ))}
          <circle cx={cx} cy={cy} r={r * 0.5} fill="#ffffff" />
        </g>
      );
    case 'sunken':
      return (
        <g>
          <ellipse cx={cx} cy={cy} rx={r * 1.05} ry={r * 0.85} fill="#3b2a1c" opacity="0.85" />
          <ellipse cx={cx - r * 0.2} cy={cy - r * 0.1} rx={r * 0.5} ry={r * 0.4} fill="#1f160f" />
          <ellipse cx={cx + r * 0.2} cy={cy + r * 0.3} rx={r * 0.25} ry={r * 0.15} fill="#d9a15a" opacity="0.6" />
        </g>
      );
    case 'blight':
      return (
        <g>
          <circle cx={cx} cy={cy} r={r * 1.15} fill="#b5c870" opacity="0.8" />
          <path d={`M${cx - r} ${cy} q${r * 0.2} ${-r * 0.9} ${r} ${-r * 0.8} q${r} ${r * 0.1} ${r * 0.9} ${r * 0.8} q${-r * 0.2} ${r * 0.9} ${-r} ${r * 0.7} q${-r * 0.8} ${-r * 0.2} ${-r * 0.9} ${-r * 0.7} Z`} fill="#4a3322" />
          <path d={`M${cx + r * 0.5} ${cy + r * 0.6} q${r * 0.3} ${-r * 0.2} ${r * 0.5} ${r * 0.1}`} stroke="#f7f7f2" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'pustule':
      return (
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <ellipse key={i} cx={cx + ((i * 13) % 5 - 2) * r * 0.28} cy={cy + ((i * 7) % 5 - 2) * r * 0.22} rx={r * 0.18} ry={r * 0.11} fill={i % 2 ? '#b5561f' : '#d0742d'} transform={`rotate(-30 ${cx} ${cy})`} />
          ))}
        </g>
      );
    case 'diamond':
      return (
        <g transform={`rotate(-30 ${cx} ${cy})`}>
          <path d={`M${cx - r * 1.3} ${cy} L${cx} ${cy - r * 0.5} L${cx + r * 1.3} ${cy} L${cx} ${cy + r * 0.5} Z`} fill="#7a4b26" />
          <path d={`M${cx - r * 0.9} ${cy} L${cx} ${cy - r * 0.3} L${cx + r * 0.9} ${cy} L${cx} ${cy + r * 0.3} Z`} fill="#cfc8b8" />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={r} fill="#6b3f1f" />;
  }
}

function BroadLeaf({ color }) {
  return (
    <g>
      <path d="M28 158 Q70 40 210 36 Q350 40 386 150 Q350 262 210 266 Q70 262 28 158 Z" fill={color} />
      <path d="M28 158 Q200 150 386 150" stroke="#2f6a26" strokeWidth="4" fill="none" />
      {[90, 150, 210, 270, 330].map((x, i) => (
        <g key={x} stroke="#3c7a2d" strokeWidth="2.2" fill="none" opacity="0.8">
          <path d={`M${x} ${154 - i} Q${x + 30} ${110 - i * 2} ${x + 50} ${70 + i * 4}`} />
          <path d={`M${x} ${154 - i} Q${x + 30} ${200 + i * 2} ${x + 50} ${238 - i * 4}`} />
        </g>
      ))}
      <path d="M0 162 Q14 158 28 158" stroke="#4e7c2c" strokeWidth="7" />
    </g>
  );
}

/** One blade passes through every symptom spot so lesions always sit on leaf tissue. */
function Blades({ color, spots }) {
  const decorative = [{ x: 12, y: 80 }, { x: 88, y: 20 }];
  return (
    <g>
      {[...decorative, ...spots].map((spot, index) => {
        const cx = spot.x * 4;
        const cy = spot.y * 3;
        const angle = -28 + (index % 3) * 6;
        return (
          <g key={index} transform={`rotate(${angle} ${cx} ${cy})`}>
            <path d={`M${cx - 260} ${cy + 6} Q${cx} ${cy - 30} ${cx + 260} ${cy - 2} Q${cx} ${cy + 34} ${cx - 260} ${cy + 6} Z`} fill={index < 2 ? '#7fb452' : color} />
            <path d={`M${cx - 250} ${cy + 5} Q${cx} ${cy + 1} ${cx + 250} ${cy - 1}`} stroke="#4a8a2e" strokeWidth="2" fill="none" />
            <path d={`M${cx - 250} ${cy - 5} Q${cx} ${cy - 12} ${cx + 250} ${cy - 6}`} stroke="#5d9c3c" strokeWidth="1" fill="none" opacity="0.7" />
          </g>
        );
      })}
    </g>
  );
}

function Fruit({ color }) {
  return (
    <g>
      <path d="M300 40 Q350 10 390 30 Q350 60 300 40 Z" fill="#3f7f2e" />
      <path d="M290 50 Q300 44 312 38" stroke="#6a4a2a" strokeWidth="5" />
      <ellipse cx="200" cy="152" rx="160" ry="112" fill={color} transform="rotate(-8 200 152)" />
      <ellipse cx="200" cy="152" rx="160" ry="112" fill="#e0a73c" opacity="0.35" transform="rotate(-8 200 152)" />
      <ellipse cx="150" cy="95" rx="50" ry="20" fill="#fff" opacity="0.18" transform="rotate(-20 150 95)" />
    </g>
  );
}

export default function LeafSpecimen({ specimenKey, spots, className = '' }) {
  const config = SPECIMENS[specimenKey] ?? SPECIMENS['peanut-leaf-spot'];
  return (
    <svg className={`leaf-specimen ${className}`} viewBox="0 0 400 300" preserveAspectRatio="none" role="img" aria-label="Plant specimen">
      <defs>
        <radialGradient id={`bg-${specimenKey}`} cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#f3efe2" />
          <stop offset="1" stopColor="#d9cfb4" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#bg-${specimenKey})`} />
      {config.shape === 'broad' && <BroadLeaf color={config.leaf} />}
      {config.shape === 'blades' && <Blades color={config.leaf} spots={spots} />}
      {config.shape === 'fruit' && <Fruit color={config.leaf} />}
      {spots.map((spot, index) => (
        <Lesion key={spot.id} type={config.lesion} spot={spot} index={index} />
      ))}
    </svg>
  );
}
