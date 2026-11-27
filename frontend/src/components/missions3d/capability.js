/**
 * Whether a device should get the 3D missions.
 *
 * 3D needs WebGL and a little horsepower. Phones and laptops without WebGL,
 * very weak devices and data-saver mode get the existing 2D games, which play
 * and score exactly the same — nobody is blocked. A player can also switch
 * between 2D and 3D; that choice is remembered on this device.
 */
const PREFERENCE_KEY = 'agricore.missions-3d';

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

/** Two or fewer CPU cores, 2 GB or less memory, or data saver: treated as too weak for 3D. */
export function isLowPowerDevice() {
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = navigator.deviceMemory ?? 4;
  const saveData = Boolean(navigator.connection?.saveData);
  return cores <= 2 || memory <= 2 || saveData;
}

export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 'on' | 'off' | null (no choice made yet). */
export function readPreference() {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY);
  } catch {
    return null;
  }
}

export function writePreference(value) {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, value);
  } catch {
    // Storage unavailable: the choice applies until the page is reloaded.
  }
}

/**
 * The mode a mission should open in. A device that cannot run 3D always
 * gets 2D; otherwise the player's last choice wins, defaulting to 3D.
 */
export function initialMissionMode() {
  if (!hasWebGL() || isLowPowerDevice()) return { mode: '2d', can3D: hasWebGL() && !isLowPowerDevice() };
  return { mode: readPreference() === 'off' ? '2d' : '3d', can3D: true };
}
