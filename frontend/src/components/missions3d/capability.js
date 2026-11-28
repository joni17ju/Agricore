/**
 * What the device can do for the 3D missions.
 *
 * Every mission with a 3D scene opens in 3D. The only exception is a device
 * without WebGL: it gets the original 2D game automatically, with a short note
 * (see MissionPlayPage), so nobody is blocked. There is no 2D/3D choice.
 *
 * Phones and weak devices still get 3D, with a lighter setup (graphicsTier).
 */
let webglCache = null;

export function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    webglCache = Boolean(context);
    context?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

let tierCache = null;

/**
 * 'high'   desktop and laptop: the full scene, as before.
 * 'medium' phones and tablets (coarse pointer or small screen), or 4 cores /
 *          4 GB: no antialiasing or real-time shadows, fewer particles.
 * 'low'    2 cores or fewer, 2 GB or less, or data saver: also a 1× pixel
 *          ratio, no particles and 30 frames per second.
 */
export function graphicsTier() {
  if (tierCache) return tierCache;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = navigator.deviceMemory ?? 4;
  const saveData = Boolean(navigator.connection?.saveData);
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = Math.min(window.screen?.width ?? 1024, window.screen?.height ?? 768) < 600;
  if (cores <= 2 || memory <= 2 || saveData) tierCache = 'low';
  else if (coarse || smallScreen || cores <= 4 || memory <= 4) tierCache = 'medium';
  else tierCache = 'high';
  return tierCache;
}

/** Scales particle counts for the device: all of them on desktop, fewer on phones. */
export function particleCount(count) {
  const tier = graphicsTier();
  if (tier === 'low') return Math.max(4, Math.round(count / 3));
  if (tier === 'medium') return Math.max(6, Math.round(count / 2));
  return count;
}

export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
