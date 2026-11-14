/**
 * Plain helpers shared by the mission editor's components. Kept out of the
 * .jsx files so those export components only (React fast refresh).
 */

/** The module XP tiers the course is built on, offered as quick picks. */
export const XP_TIERS = Object.freeze([100, 150, 200, 250]);

/** "rice-bacterial-blight" → "Rice bacterial blight" */
export function humanize(key) {
  const text = String(key ?? '').replace(/[-_]+/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : '—';
}

/**
 * Where a JSON.parse error is, in words. Engines report a character offset
 * ("at position 132") or a line and column; both become "line X, column Y".
 */
export function describeJsonError(text, error) {
  const message = String(error?.message ?? error);
  const lineCol = /line (\d+) column (\d+)/i.exec(message);
  let line;
  let column;
  if (lineCol) {
    line = Number(lineCol[1]);
    column = Number(lineCol[2]);
  } else {
    const position = /position (\d+)/i.exec(message);
    if (position) {
      const before = text.slice(0, Number(position[1]));
      line = before.split('\n').length;
      column = before.length - before.lastIndexOf('\n');
    }
  }
  const reason = /Unexpected end/i.test(message)
    ? 'The JSON ends too early — a closing } or ] is probably missing'
    : /Unexpected token|Unexpected non-whitespace|Expected/i.test(message)
      ? 'There is an unexpected character — often a missing or extra comma, or a missing quote'
      : 'The JSON could not be read';
  return line ? `${reason} (line ${line}, column ${column}).` : `${reason}.`;
}

/**
 * Parse editor text into scenarioData.
 * @returns {{ ok: true, value: object } | { ok: false, message: string }}
 */
export function parseScenarioJson(text) {
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, message: 'The content must be a JSON object, starting with { and ending with }.' };
    }
    return { ok: true, value };
  } catch (error) {
    return { ok: false, message: describeJsonError(text, error) };
  }
}
