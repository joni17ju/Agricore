/**
 * Original SVG weed specimens for the Module 4 Drag-and-Drop game.
 * ViewBox 400×400; each structure is drawn where the mission's target zone
 * (x%, y%) points.
 */
const range = (count) => Array.from({ length: count }, (_, i) => i);

function Goosegrass() {
  return (
    <g>
      {range(9).map((i) => (
        <path key={i} d={`M165 318 Q${140 - i * 8} ${345 + (i % 3) * 8} ${95 + i * 12} ${380 - (i % 2) * 12}`} stroke="#c9b48a" strokeWidth="2.5" fill="none" />
      ))}
      <path d="M150 320 Q170 280 178 250 Q182 232 188 220" stroke="#6f9a3e" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M166 300 L186 244" stroke="#9cc46a" strokeWidth="4" />
      <ellipse cx="188" cy="220" rx="11" ry="5" fill="#f1f0dc" stroke="#cfd0a8" />
      <path d="M190 218 Q240 160 280 112 Q310 76 345 52" stroke="#5f9e3a" strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M190 218 Q240 160 280 112 Q310 76 345 52" stroke="#86bd5b" strokeWidth="2" fill="none" />
      <path d="M186 222 Q130 170 90 150" stroke="#5f9e3a" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M184 226 Q150 140 160 60" stroke="#6ba845" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M160 60 l-6 -30 M160 60 l8 -28 M160 60 l0 -34" stroke="#789a4a" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function Nutsedge() {
  return (
    <g>
      <path d="M90 346 Q150 340 200 340 Q260 342 320 352" stroke="#8b6b45" strokeWidth="5" fill="none" />
      {[[152, 352], [262, 350], [310, 360]].map(([x, y]) => (
        <ellipse key={x} cx={x} cy={y} rx="16" ry="11" fill="#7a5533" stroke="#5a3d22" strokeWidth="2" />
      ))}
      {range(6).map((i) => (
        <path key={i} d={`M200 342 Q${190 + i * 4} 365 ${170 + i * 12} 392`} stroke="#c9b48a" strokeWidth="2" fill="none" />
      ))}
      <path d="M200 330 L205 70" stroke="#5e8f36" strokeWidth="8" />
      <path d="M197 330 L203 70" stroke="#8cbf5c" strokeWidth="2" />
      <path d="M200 320 Q150 280 120 240 Q100 210 80 200" stroke="#5c9d3c" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M200 320 Q260 270 300 250" stroke="#5c9d3c" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M200 320 Q210 260 240 220" stroke="#6caa48" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M205 72 Q170 60 140 80 M205 72 Q240 60 270 78 M205 72 Q200 90 180 110" stroke="#5c9d3c" strokeWidth="5" fill="none" strokeLinecap="round" />
      {range(7).map((i) => (
        <ellipse key={i} cx={190 + (i % 4) * 9} cy={40 + (i % 3) * 12} rx="5" ry="12" fill={i % 2 ? '#8f3f4d' : '#a44f5a'} transform={`rotate(${-30 + i * 10} 208 56)`} />
      ))}
    </g>
  );
}

function Amaranth() {
  return (
    <g>
      <path d="M200 330 Q196 360 200 392" stroke="#c79f7a" strokeWidth="14" strokeLinecap="round" fill="none" />
      {range(5).map((i) => (
        <path key={i} d={`M200 ${345 + i * 9} q${i % 2 ? 20 : -20} 8 ${i % 2 ? 36 : -36} 18`} stroke="#d4b896" strokeWidth="2" fill="none" />
      ))}
      <path d="M200 335 V70" stroke="#a24f4f" strokeWidth="8" />
      <path d="M200 210 Q150 190 118 200 Q150 232 200 214" fill="#4f9a3c" />
      <path d="M200 212 L130 204" stroke="#2f6d27" strokeWidth="2" />
      <path d="M176 206 l-10 10 M168 202 l-8 -12" stroke="#e8dcc0" strokeWidth="3" strokeLinecap="round" />
      <path d="M202 176 Q250 110 330 150 Q290 225 202 180 Z" fill="#58a743" />
      <path d="M204 178 Q260 150 322 152" stroke="#2f6d27" strokeWidth="2.5" fill="none" />
      {range(4).map((i) => (
        <g key={i} stroke="#3d7f30" strokeWidth="1.4" fill="none">
          <path d={`M${226 + i * 22} ${170 - i * 4} q6 -16 16 -22`} />
          <path d={`M${226 + i * 22} ${170 - i * 4} q10 12 20 14`} />
        </g>
      ))}
      <path d="M200 270 Q250 250 280 270 Q240 300 200 276 Z" fill="#4f9a3c" />
      <path d="M200 262 Q150 245 125 262 Q160 290 200 268 Z" fill="#5aa645" />
      <path d="M200 110 Q160 90 150 105 Q170 130 200 116 Z" fill="#58a743" />
      <path d="M200 80 Q196 50 200 24" stroke="#88a45a" strokeWidth="14" strokeLinecap="round" />
      {range(6).map((i) => (
        <circle key={i} cx={196 + (i % 2) * 8} cy={30 + i * 9} r="3" fill="#b9c77e" />
      ))}
    </g>
  );
}

function Hagonoy() {
  return (
    <g>
      <path d="M200 392 V68" stroke="#7d6a3e" strokeWidth="8" />
      {range(12).map((i) => (
        <path key={i} d={`M${i % 2 ? 204 : 196} ${260 + i * 8} l${i % 2 ? 7 : -7} -4`} stroke="#b7a57a" strokeWidth="1.6" />
      ))}
      <path d="M198 190 L140 150 L88 190 L140 222 Z" fill="#4e9a3b" />
      <path d="M198 190 L100 190 M160 186 L130 160 M160 192 L130 214" stroke="#2f6d27" strokeWidth="2" fill="none" />
      <path d="M202 192 L270 150 L330 196 L268 232 Z" fill="#55a340" />
      <path d="M202 192 L320 195 M250 192 L276 160 M250 194 L276 226" stroke="#2f6d27" strokeWidth="2.2" fill="none" />
      {range(5).map((i) => (
        <path key={i} d={`M${282 + i * 9} ${160 + i * 7} l6 -2 M${282 + i * 9} ${226 - i * 7} l6 2`} stroke="#3f8030" strokeWidth="2" />
      ))}
      <path d="M198 120 L160 96 L128 122 L160 140 Z" fill="#5aa645" />
      <path d="M202 120 L240 96 L272 122 L240 140 Z" fill="#5aa645" />
      <path d="M200 70 Q180 55 170 40 M200 70 Q220 55 236 42 M200 70 V38" stroke="#7d6a3e" strokeWidth="4" fill="none" />
      {[[170, 38], [208, 30], [236, 40], [190, 52], [224, 56]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="11" fill="#c9b6dd" />
          <circle cx={x} cy={y} r="6" fill="#e5dbf0" />
        </g>
      ))}
    </g>
  );
}

function WaterHyacinth() {
  return (
    <g>
      <rect x="0" y="270" width="400" height="130" fill="#9ccbe0" opacity="0.6" />
      <path d="M0 270 Q50 262 100 270 T200 270 T300 270 T400 270" stroke="#6fa9c4" strokeWidth="3" fill="none" />
      {range(10).map((i) => (
        <g key={i} stroke="#3a4a52" strokeWidth="1.6" fill="none" opacity="0.85">
          <path d={`M${170 + i * 7} 285 Q${160 + i * 9} 330 ${150 + i * 11} 392`} />
          <path d={`M${162 + i * 9} 330 l-6 6 M${158 + i * 10} 350 l7 5`} />
        </g>
      ))}
      <ellipse cx="168" cy="240" rx="20" ry="30" fill="#6fae55" />
      <ellipse cx="238" cy="236" rx="20" ry="30" fill="#6fae55" />
      <ellipse cx="200" cy="250" rx="16" ry="24" fill="#7dbb61" />
      <path d="M165 212 Q140 180 110 160" stroke="#5c9d3c" strokeWidth="6" fill="none" />
      <ellipse cx="104" cy="144" rx="44" ry="36" fill="#3e9442" />
      <ellipse cx="92" cy="132" rx="16" ry="8" fill="#fff" opacity="0.25" />
      <path d="M240 208 Q265 180 290 160" stroke="#5c9d3c" strokeWidth="6" fill="none" />
      <ellipse cx="296" cy="150" rx="44" ry="36" fill="#3e9442" />
      <ellipse cx="284" cy="138" rx="16" ry="8" fill="#fff" opacity="0.25" />
      <path d="M205 228 L240 40" stroke="#5c9d3c" strokeWidth="5" />
      {range(6).map((i) => (
        <g key={i} transform={`translate(${224 + (i % 2) * 22} ${30 + i * 18})`}>
          <ellipse cx="0" cy="0" rx="14" ry="9" fill="#b59ad9" />
          <circle cx="0" cy="-2" r="3" fill="#f2c94c" />
        </g>
      ))}
    </g>
  );
}

const DRAWINGS = {
  goosegrass: Goosegrass,
  'purple-nutsedge': Nutsedge,
  'spiny-amaranth': Amaranth,
  hagonoy: Hagonoy,
  'water-hyacinth': WaterHyacinth,
};

export default function WeedSpecimen({ imageKey, className = '' }) {
  const Drawing = DRAWINGS[imageKey] ?? Goosegrass;
  return (
    <svg className={`weed-specimen ${className}`} viewBox="0 0 400 400" role="img" aria-label="Weed specimen">
      <defs>
        <radialGradient id="weed-bg" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#fbfaf4" />
          <stop offset="1" stopColor="#e6e1cf" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#weed-bg)" />
      <Drawing />
    </svg>
  );
}
