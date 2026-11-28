/**
 * Microscope view for the inspection engine: placeholder micrographs drawn in
 * code, and the round eyepiece (vignette, soft edge, faint colour fringe,
 * centre glow, pointer, scale bar and magnification label).
 *
 * Nothing here knows about leaves or diseases: what a micrograph shows comes
 * from the content ("placeholder.kind" and each feature's "look").
 */

export const OBJECTIVES = [4, 10, 40, 100];
/** How much bigger the slide looks with each objective (4× shows the whole micrograph). */
export const VIEW_SCALE = { 4: 1, 10: 1.9, 40: 3.4, 100: 5.6 };
/** Each objective focuses at a slightly different point, as on a real microscope. */
export const FOCUS_SHIFT = { 4: 0, 10: 7, 40: -9, 100: 12 };

const SIZE = 1600;

/** roundRect where the browser has it (older Safari draws a plain rectangle). */
const roundRect = (g, x, y, w, h, r) => (g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h));

function seeded(text) {
  let s = [...String(text)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ── Building blocks of the placeholder slides ── */

function cells(g, rand, { x0 = 0, y0 = 0, w = SIZE, h = SIZE, size = 70, fill, chloroplasts = 0, chloroColor = 'rgba(60,140,70,0.75)', wall = 'rgba(70,110,90,0.55)' }) {
  for (let y = y0 - size; y < y0 + h + size; y += size * 0.62) {
    const shift = (Math.round(y / (size * 0.62)) % 2) * size * 0.5;
    for (let x = x0 - size + shift; x < x0 + w + size; x += size * 1.05) {
      const cw = size * (0.95 + rand() * 0.2);
      const ch = size * (0.56 + rand() * 0.12);
      g.fillStyle = typeof fill === 'function' ? fill(x, y, rand) : fill;
      g.strokeStyle = wall;
      g.lineWidth = 3;
      g.beginPath();
      roundRect(g, x + rand() * 6, y + rand() * 6, cw, ch, size * 0.18);
      g.fill();
      g.stroke();
      for (let i = 0; i < chloroplasts; i += 1) {
        g.fillStyle = chloroColor;
        g.beginPath();
        g.ellipse(x + 10 + rand() * (cw - 20), y + 8 + rand() * (ch - 16), 6, 4, rand() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}

function hyphae(g, rand, cx, cy, spread, count) {
  g.lineCap = 'round';
  for (let i = 0; i < count; i += 1) {
    let x = cx + (rand() - 0.5) * spread;
    let y = cy + (rand() - 0.5) * spread;
    let a = rand() * Math.PI * 2;
    g.strokeStyle = `rgba(55, 70, 105, ${0.45 + rand() * 0.3})`;
    g.lineWidth = 3 + rand() * 2;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 14; s += 1) {
      a += (rand() - 0.5) * 0.6;
      x += Math.cos(a) * 22;
      y += Math.sin(a) * 22;
      g.lineTo(x, y);
      // Septa (cross walls) and the odd branch.
      if (s % 4 === 2) {
        g.moveTo(x + Math.cos(a + 1.57) * 4, y + Math.sin(a + 1.57) * 4);
        g.lineTo(x - Math.cos(a + 1.57) * 4, y - Math.sin(a + 1.57) * 4);
        g.moveTo(x, y);
      }
    }
    g.stroke();
  }
}

function spores(g, rand, cx, cy, spread, chains) {
  for (let c = 0; c < chains; c += 1) {
    let x = cx + (rand() - 0.5) * spread;
    let y = cy + (rand() - 0.5) * spread;
    const a = rand() * Math.PI * 2;
    for (let i = 0; i < 6; i += 1) {
      g.fillStyle = 'rgba(95, 75, 140, 0.55)';
      g.strokeStyle = 'rgba(40, 30, 80, 0.8)';
      g.lineWidth = 2;
      g.beginPath();
      // Pear-shaped spores (conidia) in a short chain.
      g.ellipse(x, y, 11, 17, a, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(x - Math.sin(a) * 8, y + Math.cos(a) * 8);
      g.lineTo(x + Math.sin(a) * 8, y - Math.cos(a) * 8);
      g.stroke();
      x += Math.cos(a) * 30;
      y += Math.sin(a) * 30;
    }
  }
}

function bacteria(g, rand, cx, cy, spread, count) {
  for (let i = 0; i < count; i += 1) {
    const x = cx + (rand() - 0.5) * spread;
    const y = cy + (rand() - 0.5) * spread;
    g.save();
    g.translate(x, y);
    g.rotate(rand() * Math.PI);
    g.fillStyle = 'rgba(150, 60, 120, 0.7)';
    g.beginPath();
    roundRect(g, -9, -3.5, 18, 7, 3.5);
    g.fill();
    g.restore();
  }
}

function ooze(g, rand, cx, cy, spread) {
  // The cut edge of the tissue, with a milky stream of bacteria flowing out.
  g.strokeStyle = 'rgba(70, 95, 70, 0.8)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(cx - spread * 0.6, cy - spread);
  g.lineTo(cx - spread * 0.5, cy + spread);
  g.stroke();
  for (let i = 0; i < 9; i += 1) {
    const y = cy + (i / 8 - 0.5) * spread * 1.6;
    const grad = g.createLinearGradient(cx - spread * 0.5, y, cx + spread, y);
    grad.addColorStop(0, 'rgba(250, 248, 235, 0.85)');
    grad.addColorStop(1, 'rgba(250, 248, 235, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx + spread * 0.2, y + (rand() - 0.5) * 20, spread * 0.75, 18 + rand() * 14, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 260; i += 1) {
    g.fillStyle = 'rgba(150, 70, 120, 0.45)';
    g.fillRect(cx - spread * 0.45 + rand() * spread * 1.3, cy - spread * 0.8 + rand() * spread * 1.6, 3, 2);
  }
}

const LOOKS = {
  hyphae: (g, rand, x, y, r) => hyphae(g, rand, x, y, r * 1.6, 18),
  spores: (g, rand, x, y, r) => spores(g, rand, x, y, r * 1.4, 9),
  bacteria: (g, rand, x, y, r) => bacteria(g, rand, x, y, r * 1.6, 260),
  ooze: (g, rand, x, y, r) => ooze(g, rand, x, y, r),
  'pale-cells': (g, rand, x, y, r) => cells(g, rand, { x0: x - r, y0: y - r, w: r * 2, h: r * 2, size: 64, fill: 'rgba(222, 226, 150, 0.95)', chloroplasts: 2, chloroColor: 'rgba(150,170,80,0.6)' }),
  'dark-cells': (g, rand, x, y, r) => cells(g, rand, { x0: x - r, y0: y - r, w: r * 2, h: r * 2, size: 64, fill: 'rgba(80, 150, 85, 0.95)', chloroplasts: 9, chloroColor: 'rgba(25,95,40,0.85)' }),
  'dead-cells': (g, rand, x, y, r) => cells(g, rand, { x0: x - r, y0: y - r, w: r * 2, h: r * 2, size: 58, fill: () => `rgba(${120 + rand() * 30}, ${78 + rand() * 20}, 40, 0.95)`, wall: 'rgba(70,40,20,0.8)' }),
  'healthy-cells': (g, rand, x, y, r) => cells(g, rand, { x0: x - r, y0: y - r, w: r * 2, h: r * 2, size: 66, fill: 'rgba(150, 200, 140, 0.95)', chloroplasts: 6 }),
};

/** Background tissue per kind of slide. */
const BACKGROUNDS = {
  fungus: (g, rand) => {
    cells(g, rand, { fill: () => `rgba(${165 + rand() * 25}, ${150 + rand() * 20}, 105, 0.55)`, chloroplasts: 1 });
    hyphae(g, rand, SIZE / 2, SIZE / 2, SIZE, 10);
  },
  bacteria: (g, rand) => cells(g, rand, { fill: () => `rgba(120, ${150 + rand() * 20}, 120, 0.45)`, chloroplasts: 2 }),
  virus: (g, rand) => cells(g, rand, { fill: () => (rand() > 0.5 ? 'rgba(205, 215, 140, 0.7)' : 'rgba(110, 170, 100, 0.7)'), chloroplasts: 4 }),
  abiotic: (g, rand) => cells(g, rand, { fill: 'rgba(150, 200, 140, 0.7)', chloroplasts: 5 }),
};

/** A clearly labelled placeholder micrograph, until a real image is added. */
export function paintPlaceholderMicrograph(micrograph, key) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d');
  const rand = seeded(key);
  // Blue-tinted slide under transmitted light.
  const bg = g.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.1, SIZE / 2, SIZE / 2, SIZE * 0.75);
  bg.addColorStop(0, '#e6f0f6');
  bg.addColorStop(1, '#b7cde0');
  g.fillStyle = bg;
  g.fillRect(0, 0, SIZE, SIZE);
  (BACKGROUNDS[micrograph.placeholder?.kind] ?? BACKGROUNDS.abiotic)(g, rand);
  for (const f of micrograph.features ?? []) {
    const draw = LOOKS[f.look];
    if (draw) draw(g, rand, (f.x / 100) * SIZE, (f.y / 100) * SIZE, (f.radius / 100) * SIZE);
  }
  g.fillStyle = 'rgba(20, 40, 70, 0.78)';
  g.font = 'bold 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('PLACEHOLDER micrograph — add your image', SIZE / 2, SIZE - 70);
  return canvas;
}

/** A repeating patch of leaf cells, faded in when the scope magnifies past the photo's own detail. */
let tissue = null;
export function tissueTexture() {
  if (tissue) return tissue;
  tissue = document.createElement('canvas');
  tissue.width = 256;
  tissue.height = 256;
  const g = tissue.getContext('2d');
  g.fillStyle = 'rgba(120, 170, 95, 0.0)';
  g.fillRect(0, 0, 256, 256);
  cells(g, seeded('tissue'), { w: 256, h: 256, size: 40, fill: 'rgba(140, 190, 110, 0.35)', chloroplasts: 3, chloroColor: 'rgba(40,110,45,0.45)', wall: 'rgba(60,100,60,0.45)' });
  return tissue;
}

/* ── The eyepiece ── */

let scratch = null;
let ring = null;
const canvasOf = (holder, w, h) => {
  const c = holder ?? document.createElement('canvas');
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  return c;
};

/** Picks a round scale-bar length (µm) that is 50–130 px long. */
function scaleBar(pxPerUm) {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  return steps.find((um) => um * pxPerUm >= 50) ?? 1000;
}

/**
 * Draws the microscope view. The caller has cleared the canvas.
 * view: { cx, cy, R, image, objective, scale, pan:{x,y}, blurPx, light, fieldWidthUm, flash }
 * Returns the mapping from image fractions to the screen, for marks and hit tests.
 */
export function drawEyepiece(g, view) {
  const { cx, cy, R, image, objective, scale, pan, blurPx, light, fieldWidthUm, flash = 0 } = view;
  const iw = image.width;
  const ih = image.height;
  const Wd = 2 * R * scale;
  const Hd = (Wd * ih) / iw;
  const left = cx - pan.x * Wd;
  const top = cy - pan.y * Hd;
  const toScreen = (fx, fy) => ({ x: left + fx * Wd, y: top + fy * Hd });

  g.save();
  g.fillStyle = '#050505';
  g.fillRect(cx - R * 4, cy - R * 4, R * 8, R * 8);
  g.beginPath();
  g.arc(cx, cy, R, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#b7cde0';
  g.fillRect(cx - R, cy - R, R * 2, R * 2);

  // The slide, softened by the focus: drawn small, then scaled up.
  const sx = ((cx - R - left) / Wd) * iw;
  const sy = ((cy - R - top) / Hd) * ih;
  const sw = ((2 * R) / Wd) * iw;
  const sh = ((2 * R) / Hd) * ih;
  const blur = Math.max(0, blurPx);
  if (blur > 0.6) {
    const n = Math.max(24, Math.round((2 * R) / (1 + blur * 0.55)));
    scratch = canvasOf(scratch, n, n);
    const sg = scratch.getContext('2d');
    sg.imageSmoothingEnabled = true;
    sg.clearRect(0, 0, n, n);
    sg.drawImage(image, sx, sy, sw, sh, 0, 0, n, n);
    g.imageSmoothingEnabled = true;
    g.drawImage(scratch, 0, 0, n, n, cx - R, cy - R, 2 * R, 2 * R);
  } else {
    g.imageSmoothingQuality = 'high';
    g.drawImage(image, sx, sy, sw, sh, cx - R, cy - R, 2 * R, 2 * R);
  }

  if (!light) {
    // Soft edge: a much blurrier copy fades in towards the rim.
    const size = Math.max(32, Math.round(R * 2));
    ring = canvasOf(ring, size, size);
    const rg = ring.getContext('2d');
    rg.globalCompositeOperation = 'source-over';
    rg.clearRect(0, 0, size, size);
    const n = Math.max(16, Math.round(size / 7));
    scratch = canvasOf(scratch, n, n);
    const sg = scratch.getContext('2d');
    sg.clearRect(0, 0, n, n);
    sg.drawImage(image, sx, sy, sw, sh, 0, 0, n, n);
    rg.drawImage(scratch, 0, 0, n, n, 0, 0, size, size);
    rg.globalCompositeOperation = 'destination-in';
    const mask = rg.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size / 2);
    mask.addColorStop(0, 'rgba(0,0,0,0)');
    mask.addColorStop(1, 'rgba(0,0,0,1)');
    rg.fillStyle = mask;
    rg.fillRect(0, 0, size, size);
    g.drawImage(ring, cx - R, cy - R, 2 * R, 2 * R);
    // Gentle light glow in the centre.
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
    glow.addColorStop(0, 'rgba(255, 252, 236, 0.22)');
    glow.addColorStop(1, 'rgba(255, 252, 236, 0)');
    g.fillStyle = glow;
    g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  }

  // Vignette.
  const vig = g.createRadialGradient(cx, cy, R * 0.62, cx, cy, R);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.82)');
  g.fillStyle = vig;
  g.fillRect(cx - R, cy - R, 2 * R, 2 * R);

  if (!light) {
    // Faint chromatic aberration at the rim.
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(255, 40, 90, 0.16)';
    g.beginPath();
    g.arc(cx + 1.5, cy, R - 4, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(30, 150, 255, 0.16)';
    g.beginPath();
    g.arc(cx - 1.5, cy, R - 5, 0, Math.PI * 2);
    g.stroke();
  }

  // Eyepiece pointer: its tip is where Enter (and the "Mark here" button) marks.
  g.strokeStyle = 'rgba(15, 15, 15, 0.85)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - R, cy);
  g.lineTo(cx - 6, cy);
  g.stroke();

  if (flash > 0) {
    g.fillStyle = `rgba(0,0,0,${flash})`;
    g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  }
  g.restore();

  // Rim.
  g.save();
  g.lineWidth = Math.max(6, R * 0.05);
  g.strokeStyle = '#1b1b1b';
  g.beginPath();
  g.arc(cx, cy, R + g.lineWidth / 2, 0, Math.PI * 2);
  g.stroke();

  // Scale bar and magnification label.
  const pxPerUm = Wd / (fieldWidthUm || 200);
  const um = scaleBar(pxPerUm);
  const len = um * pxPerUm;
  const bx = cx + R * 0.55 - len;
  const by = cy + R * 0.62;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillRect(bx, by, len, 4);
  g.font = `600 ${Math.max(11, Math.round(R * 0.055))}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.fillText(`${um} µm`, bx + len / 2, by - 6);
  g.font = `700 ${Math.max(12, Math.round(R * 0.06))}px system-ui, sans-serif`;
  g.fillText(`${objective}× objective · ${objective * 10}× total`, cx, cy - R * 0.8);
  g.restore();
  return { toScreen, Wd, Hd, left, top };
}
