/**
 * Original stylized pest and pathogen illustrations (placeholders for the real
 * photographs the proposal calls for). `imageKey` values come from mission data.
 */
const PEST_TYPES = {
  'rhinoceros-beetle': { type: 'beetle', color: '#4a2f1d', horn: true },
  beetle: { type: 'beetle', color: '#2f5d3a' },
  aphid: { type: 'aphid', color: '#9ccf5a' },
  'field-rat': { type: 'rodent', color: '#7d6a58' },
  'field-mouse': { type: 'rodent', color: '#9a8672' },
  sparrow: { type: 'bird', color: '#8a5a3a' },
  'fall-armyworm': { type: 'caterpillar', color: '#6b6a48' },
  armyworm: { type: 'caterpillar', color: '#7c7b52' },
  fruitworm: { type: 'caterpillar', color: '#8aa04a' },
  'shoot-borer': { type: 'caterpillar', color: '#e4a3a8' },
  'corn-borer': { type: 'caterpillar', color: '#d6c29a' },
  'stem-borer': { type: 'caterpillar', color: '#e8d9ae' },
  moth: { type: 'moth', color: '#a58c6a' },
  bug: { type: 'bug', color: '#5c8a3a' },
  'rice-bug': { type: 'bug', color: '#8b7a3a', slim: true },
  leafhopper: { type: 'hopper', color: '#8fc45a' },
  planthopper: { type: 'hopper', color: '#8a6a3e' },
  'spider-mite': { type: 'mite', color: '#c9372c' },
  fly: { type: 'fly', color: '#4f5a3a' },
  'leaf-miner': { type: 'mine', color: '#e9e2a8' },
  whitefly: { type: 'fly', color: '#f3f2ea', white: true },
  grasshopper: { type: 'grasshopper', color: '#7aa43a' },
  'early-blight': { type: 'disease', color: '#5a3a20' },
  'bacterial-blight': { type: 'disease', color: '#d8cf8a' },
  'bacterial-wilt': { type: 'wilt', color: '#8a8a3a' },
  'downy-mildew': { type: 'disease', color: '#e7e6b4' },
};

function Drawing({ type, color, horn, slim, white }) {
  switch (type) {
    case 'beetle':
      return (
        <g>
          <path d="M60 30 l-18 -14 M60 30 l18 -14" stroke="#2b1c10" strokeWidth="3" strokeLinecap="round" />
          {[44, 58, 72].map((y) => (
            <path key={y} d={`M40 ${y} l-18 ${y > 60 ? 10 : -4} M80 ${y} l18 ${y > 60 ? 10 : -4}`} stroke="#2b1c10" strokeWidth="3.5" strokeLinecap="round" />
          ))}
          <ellipse cx="60" cy="36" rx="14" ry="11" fill={color} />
          {horn && <path d="M60 28 Q58 12 66 6" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />}
          <ellipse cx="60" cy="68" rx="24" ry="30" fill={color} />
          <path d="M60 40 V98" stroke="#000" strokeOpacity="0.35" strokeWidth="2" />
          <ellipse cx="50" cy="56" rx="7" ry="12" fill="#fff" opacity="0.18" />
        </g>
      );
    case 'aphid':
      return (
        <g>
          {[50, 60, 70].map((y) => (
            <path key={y} d={`M46 ${y} l-14 8 M74 ${y} l14 8`} stroke="#5d8a33" strokeWidth="2.5" strokeLinecap="round" />
          ))}
          <path d="M52 32 l-10 -18 M62 32 l8 -18" stroke="#5d8a33" strokeWidth="2" />
          <path d="M60 30 Q86 42 84 72 Q80 98 60 98 Q40 98 36 72 Q34 42 60 30 Z" fill={color} />
          <path d="M44 90 l-8 10 M76 90 l8 10" stroke="#5d8a33" strokeWidth="4" strokeLinecap="round" />
          <circle cx="54" cy="40" r="3" fill="#2d3a1f" />
          <circle cx="66" cy="40" r="3" fill="#2d3a1f" />
        </g>
      );
    case 'rodent':
      return (
        <g>
          <path d="M22 80 Q6 90 12 104" stroke="#c9a896" strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="54" cy="74" rx="34" ry="22" fill={color} />
          <path d="M80 60 Q108 64 104 78 Q100 88 80 86 Z" fill={color} />
          <circle cx="82" cy="54" r="10" fill="#c9a896" />
          <circle cx="94" cy="68" r="3" fill="#1f1a15" />
          <circle cx="104" cy="77" r="3" fill="#e79a9a" />
          <path d="M104 78 l12 -4 M104 78 l12 4" stroke="#5a4a3a" strokeWidth="1.2" />
          <path d="M40 94 v8 M66 94 v8" stroke="#c9a896" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'bird':
      return (
        <g>
          <path d="M26 84 L8 96 L28 92" fill="#5a3a24" />
          <ellipse cx="54" cy="72" rx="32" ry="24" fill={color} />
          <ellipse cx="60" cy="82" rx="20" ry="12" fill="#e9dcc6" />
          <path d="M34 66 Q54 54 74 72 Q54 80 34 66 Z" fill="#5a3a24" />
          <circle cx="82" cy="50" r="17" fill={color} />
          <path d="M72 40 Q82 32 94 42 Q84 44 72 40 Z" fill="#6b3b28" />
          <ellipse cx="86" cy="58" rx="8" ry="5" fill="#f4f0e6" />
          <circle cx="88" cy="48" r="2.8" fill="#111" />
          <path d="M98 50 L110 54 L98 57 Z" fill="#3a3a3a" />
          <path d="M50 96 v10 M60 96 v10" stroke="#8a6a4a" strokeWidth="3" />
        </g>
      );
    case 'caterpillar':
      return (
        <g>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <circle key={i} cx={22 + i * 12} cy={70 - Math.sin(i / 1.4) * 14} r="11" fill={color} stroke="#000" strokeOpacity="0.15" />
          ))}
          <circle cx="100" cy="56" r="12" fill="#5a4a2a" />
          <path d="M94 50 l6 8 l6 -8 M100 58 v6" stroke="#f0e6c8" strokeWidth="2" fill="none" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={22 + i * 12} cy={66 - Math.sin(i / 1.4) * 14} r="2" fill="#2a2a1a" />
          ))}
        </g>
      );
    case 'moth':
      return (
        <g>
          <path d="M60 50 L20 26 Q10 60 56 70 Z M60 50 L100 26 Q110 60 64 70 Z" fill={color} />
          <path d="M58 68 L30 94 Q48 100 58 80 Z M62 68 L90 94 Q72 100 62 80 Z" fill="#8b7355" />
          <ellipse cx="60" cy="64" rx="5" ry="22" fill="#5a4a3a" />
          <path d="M58 44 Q50 26 42 22 M62 44 Q70 26 78 22" stroke="#5a4a3a" strokeWidth="2" fill="none" />
        </g>
      );
    case 'bug':
      return (
        <g>
          <path d="M56 30 l-12 -16 M64 30 l12 -16" stroke="#333" strokeWidth="2" />
          {[52, 66, 80].map((y) => (
            <path key={y} d={`M44 ${y} l-16 6 M76 ${y} l16 6`} stroke="#333" strokeWidth="3" strokeLinecap="round" />
          ))}
          {slim ? (
            <ellipse cx="60" cy="64" rx="12" ry="38" fill={color} />
          ) : (
            <path d="M60 30 L88 50 Q86 92 60 102 Q34 92 32 50 Z" fill={color} />
          )}
          <path d="M60 50 L60 100" stroke="#000" strokeOpacity="0.25" strokeWidth="2" />
        </g>
      );
    case 'hopper':
      return (
        <g>
          <path d="M44 84 L22 104 M76 84 L98 104" stroke="#555" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 24 Q80 40 78 90 L60 104 L42 90 Q40 40 60 24 Z" fill={color} />
          <path d="M60 36 Q72 60 70 92 M60 36 Q48 60 50 92" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" fill="none" />
          <circle cx="52" cy="34" r="3.5" fill="#b33" />
          <circle cx="68" cy="34" r="3.5" fill="#b33" />
        </g>
      );
    case 'mite':
      return (
        <g>
          {[46, 56, 66, 76].map((y, i) => (
            <path key={y} d={`M46 ${y} q-14 ${-6 + i * 4} -22 ${i * 6 - 4} M74 ${y} q14 ${-6 + i * 4} 22 ${i * 6 - 4}`} stroke="#7a2019" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ))}
          <ellipse cx="60" cy="64" rx="22" ry="26" fill={color} />
          <circle cx="50" cy="56" r="4" fill="#3a0f0c" />
          <circle cx="70" cy="56" r="4" fill="#3a0f0c" />
        </g>
      );
    case 'fly':
      return (
        <g>
          <ellipse cx="38" cy="50" rx="22" ry="12" fill={white ? '#fff' : '#cfe3ef'} opacity="0.85" transform="rotate(-25 38 50)" stroke="#9fb3bf" />
          <ellipse cx="82" cy="50" rx="22" ry="12" fill={white ? '#fff' : '#cfe3ef'} opacity="0.85" transform="rotate(25 82 50)" stroke="#9fb3bf" />
          <ellipse cx="60" cy="68" rx="12" ry="24" fill={white ? '#e9e4c8' : color} />
          <circle cx="60" cy="42" r="10" fill={white ? '#e9e4c8' : color} />
          <circle cx="54" cy="40" r="4" fill="#b3342b" />
          <circle cx="66" cy="40" r="4" fill="#b3342b" />
          {[62, 72, 82].map((y) => (
            <path key={y} d={`M50 ${y} Q54 64 60 64 Q66 64 70 ${y}`} stroke="#000" strokeOpacity="0.25" fill="none" />
          ))}
        </g>
      );
    case 'grasshopper':
      return (
        <g>
          <path d="M40 70 Q58 36 94 58 L96 72 Q64 80 40 70 Z" fill={color} />
          <circle cx="94" cy="60" r="12" fill={color} />
          <circle cx="98" cy="56" r="3" fill="#222" />
          <path d="M58 70 L40 40 L30 96 M72 72 L64 98" stroke="#5d7f2c" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M96 50 Q110 26 118 22" stroke="#5d7f2c" strokeWidth="2" fill="none" />
        </g>
      );
    case 'mine':
      return (
        <g>
          <path d="M14 64 Q50 10 108 30 Q100 96 30 100 Q12 90 14 64 Z" fill="#4f9a3c" />
          <path d="M28 80 Q40 60 54 70 T78 60 T70 40 T92 44" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="92" cy="44" r="4" fill="#6b5a2a" />
        </g>
      );
    case 'wilt':
      return (
        <g>
          <path d="M60 104 V50 Q60 30 40 26" stroke="#7a7a3a" strokeWidth="5" fill="none" />
          <path d="M60 60 Q30 70 22 96 Q48 90 60 64 Z M60 50 Q90 60 96 90 Q72 82 60 54 Z" fill={color} />
          <path d="M40 26 Q20 36 18 58 Q34 46 40 28 Z" fill="#a8a04a" />
        </g>
      );
    case 'disease':
    default:
      return (
        <g>
          <path d="M14 64 Q50 10 108 30 Q100 96 30 100 Q12 90 14 64 Z" fill="#4f9a3c" />
          <path d="M20 94 Q60 56 104 34" stroke="#2f6d27" strokeWidth="2.5" fill="none" />
          {[[44, 58], [70, 48], [60, 78], [84, 66]].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="7" fill={color} stroke="#e8d66a" strokeWidth="2" />
          ))}
        </g>
      );
  }
}

export default function PestIllustration({ imageKey, size = 96, className = '', label }) {
  const config = PEST_TYPES[imageKey] ?? { type: 'bug', color: '#6b8a4a' };
  return (
    <svg
      className={`pest-illustration ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label ?? imageKey}
    >
      <circle cx="60" cy="60" r="58" fill="#eef5e6" />
      <Drawing {...config} />
    </svg>
  );
}

export const hasPestIllustration = (imageKey) => imageKey in PEST_TYPES;
