/**
 * The leaf-hooded guide character that presents scenarios (Proposal Table 1:
 * "scenario presented by the guide character"). Original artwork.
 */
export default function GuideCharacter({ mood = 'neutral', size = 150, className = '' }) {
  const mouth =
    mood === 'happy' ? 'M52 70 Q60 80 68 70' : mood === 'worried' ? 'M52 75 Q60 68 68 75' : 'M53 72 Q60 77 67 72';

  return (
    <svg
      className={`guide-character ${className}`}
      width={size}
      height={size * 1.25}
      viewBox="0 0 120 150"
      role="img"
      aria-label="Guide character"
    >
      {/* body */}
      <path d="M30 150 Q28 100 60 94 Q92 100 90 150 Z" fill="#2f7d3b" />
      <path d="M48 104 L60 126 L72 104" fill="#f2b33d" />
      <path d="M36 150 Q40 122 60 118 Q80 122 84 150" fill="#27682f" opacity="0.6" />
      {/* hood */}
      <path d="M60 8 Q100 20 100 62 Q100 98 60 100 Q20 98 20 62 Q20 20 60 8 Z" fill="#3f9b45" />
      <path d="M60 8 Q66 -2 80 2 Q72 8 66 16" fill="#5cbf5a" />
      <path d="M60 14 V40" stroke="#2c7a34" strokeWidth="2" />
      {/* face */}
      <ellipse cx="60" cy="64" rx="28" ry="27" fill="#f6d6b4" />
      <path d="M34 54 Q60 30 86 54 Q74 44 60 44 Q46 44 34 54 Z" fill="#3f9b45" />
      <ellipse cx="50" cy="62" rx="4" ry="5" fill="#243a2a" />
      <ellipse cx="70" cy="62" rx="4" ry="5" fill="#243a2a" />
      <circle cx="51.5" cy="60" r="1.4" fill="#fff" />
      <circle cx="71.5" cy="60" r="1.4" fill="#fff" />
      <ellipse cx="43" cy="72" rx="4" ry="2.4" fill="#f0a58f" opacity="0.7" />
      <ellipse cx="77" cy="72" rx="4" ry="2.4" fill="#f0a58f" opacity="0.7" />
      <path d={mouth} stroke="#8a4a36" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* arm with leaf */}
      <path d="M88 118 Q104 108 108 94" stroke="#2f7d3b" strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M108 94 Q98 80 110 70 Q120 84 108 94 Z" fill="#7cd36e" />
    </svg>
  );
}
