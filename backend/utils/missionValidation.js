/* Ported verbatim from frontend/src/utils/missionValidation.js — the mission save
   endpoints run the same rules the editor shows, so edit them together. */
/**
 * What a mission's scenarioData must look like for its game to run.
 *
 * Ported verbatim to backend/utils/missionValidation.js, which the mission
 * save endpoints run — edit the two together.
 *
 * Each rule mirrors what the student game renders and what the scorer in
 * utils/scoring.js reads, so data that passes here cannot crash either. The
 * messages are written for instructors, not developers: they appear beside
 * the field in the mission editor and come back from the API as a 400.
 *
 * Unknown extra fields are left alone (missions written before a field existed
 * must round-trip losslessly), but the whole document is size-capped, so
 * nothing oversized can be stored either way.
 *
 * No DOM, no window: this has to run unchanged in Node.
 */

/** Max XP a single mission may award. Twice the highest module tier (250). */
export const MAX_XP_LIMIT = 500;

/** Countdown bounds for the games that run on a timer. */
export const TIMER_LIMITS = Object.freeze({ min: 10, max: 600 });

/** Games whose student screen runs a countdown from timeLimitSeconds. */
export const TIMED_GAME_TYPES = Object.freeze(['matching', 'drag-and-drop']);

/** Largest serialised scenarioData accepted (characters). */
export const MAX_SCENARIO_CHARS = 200_000;

const TEXT_SHORT = 160;
const TEXT_LONG = 1200;

/** Minimums the games are designed around; the editor explains each one. */
export const MATCHING_COLUMN_KEYS = Object.freeze(['classification', 'damage', 'tactic']);
export const MIN_MATCHING_DECOYS = 3;
export const MIN_DECISION_CHOICES = 3;
export const IDENTIFICATION_ZOOM_LEVELS = Object.freeze([5, 10, 20]);
export const TACTIC_CATEGORY_KEYS = Object.freeze(['cultural', 'biological', 'mechanical', 'chemical']);
export const DATA_TRENDS = Object.freeze(['up', 'down', 'flat']);

const LIMITS = {
  scenarios: 12,
  choices: 6,
  spots: 20,
  pathogens: 10,
  columnOptions: 10,
  otherPests: 12,
  targets: 12,
  labels: 20,
  pestOptions: 10,
  tactics: 12,
  observations: 12,
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isInt = (value) => Number.isInteger(value);
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/**
 * Collects problems for one document. Paths use dots ("scenarios.0.prompt"),
 * which is how the editor finds the field to show each message beside.
 */
function collector() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    error: (path, message) => errors.push({ path, message }),
    warn: (path, message) => warnings.push({ path, message }),
  };
}

function checkText(c, value, path, label, { required = true, max = TEXT_SHORT } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) c.error(path, `${label} is required.`);
    return;
  }
  if (typeof value !== 'string') c.error(path, `${label} must be text.`);
  else if (required && value.trim() === '') c.error(path, `${label} is required.`);
  else if (value.length > max) c.error(path, `${label} is too long (${value.length} of ${max} characters).`);
}

/**
 * A list must exist; `tooFew` (said when it is short of `min`) tells the
 * instructor what to add, and `noun` names the items when there are too many.
 */
function checkList(c, value, path, label, { min = 0, max, tooFew, noun = 'items' }) {
  if (!Array.isArray(value)) {
    c.error(path, `${label} is missing.`);
    return false;
  }
  if (value.length < min && tooFew) c.error(path, tooFew);
  if (value.length > max) c.error(path, `Too many ${noun} (the limit is ${max}).`);
  return true;
}

function checkIds(c, items, path, label) {
  const seen = new Set();
  items.forEach((item, index) => {
    if (!isObject(item)) return;
    if (typeof item.id !== 'string' || item.id.trim() === '' || item.id.length > 40) {
      c.error(`${path}.${index}.id`, `${label} ${index + 1} has no valid id.`);
    } else if (seen.has(item.id)) {
      c.error(`${path}.${index}.id`, `${label} ${index + 1} repeats the id "${item.id}".`);
    } else seen.add(item.id);
  });
  return seen;
}

function checkPercent(c, value, path, label, { min = 0, max = 100 } = {}) {
  if (!inRange(value, min, max)) c.error(path, `${label} must be a number from ${min} to ${max}.`);
}

// ── One function per game type ──

function decisionMaking(c, data) {
  if (!checkList(c, data.scenarios, 'scenarios', 'The scenario list', { min: 1, max: LIMITS.scenarios, noun: 'scenarios', tooFew: 'Add at least one scenario.' })) return;
  checkIds(c, data.scenarios, 'scenarios', 'Scenario');
  data.scenarios.forEach((scenario, s) => {
    const at = `scenarios.${s}`;
    if (!isObject(scenario)) {
      c.error(at, `Scenario ${s + 1} is not readable.`);
      return;
    }
    checkText(c, scenario.prompt, `${at}.prompt`, `Scenario ${s + 1}'s situation`, { max: TEXT_LONG });
    checkText(c, scenario.explanation, `${at}.explanation`, `Scenario ${s + 1}'s explanation`, { required: false, max: TEXT_LONG });
    checkText(c, scenario.sceneKey, `${at}.sceneKey`, `Scenario ${s + 1}'s scene`, { required: false });
    // The game always draws this card (and reads its trend), so it is required.
    if (!isObject(scenario.dataVisual)) c.error(`${at}.dataVisual`, `Scenario ${s + 1} needs its data card.`);
    else {
      checkText(c, scenario.dataVisual.value, `${at}.dataVisual.value`, `Scenario ${s + 1}'s data figure`, { max: 24 });
      checkText(c, scenario.dataVisual.label, `${at}.dataVisual.label`, `Scenario ${s + 1}'s data label`, { max: 40 });
      if (!DATA_TRENDS.includes(scenario.dataVisual.trend)) c.error(`${at}.dataVisual.trend`, `Pick whether scenario ${s + 1}'s figure is rising, falling or steady.`);
    }
    if (!checkList(c, scenario.choices, `${at}.choices`, `Scenario ${s + 1}'s option list`, { min: MIN_DECISION_CHOICES, max: LIMITS.choices, noun: 'options', tooFew: `Scenario ${s + 1} needs at least ${MIN_DECISION_CHOICES} options to choose from.` })) return;
    checkIds(c, scenario.choices, `${at}.choices`, `Option`);
    scenario.choices.forEach((choice, i) => {
      const cat = `${at}.choices.${i}`;
      if (!isObject(choice)) {
        c.error(cat, `Option ${i + 1} is not readable.`);
        return;
      }
      checkText(c, choice.title, `${cat}.title`, `Option ${i + 1}'s title`);
      checkText(c, choice.description, `${cat}.description`, `Option ${i + 1}'s description`, { required: false, max: TEXT_LONG });
      checkText(c, choice.outcome, `${cat}.outcome`, `Option ${i + 1}'s feedback`, { required: false, max: TEXT_LONG });
      checkText(c, choice.icon, `${cat}.icon`, `Option ${i + 1}'s icon`, { required: false });
      if (!isInt(choice.points) || choice.points < 0 || choice.points > 100) {
        c.error(`${cat}.points`, `Option ${i + 1}'s points must be a whole number from 0 to 100.`);
      }
    });
    const best = Math.max(...scenario.choices.map((choice) => (isObject(choice) && isInt(choice.points) ? choice.points : 0)));
    if (best < 100) c.warn(`${at}.choices`, `No option in scenario ${s + 1} is worth 100, so a perfect score is impossible.`);
  });
}

function identification(c, data) {
  checkText(c, data.host, 'host', 'The host plant');
  checkText(c, data.specimenKey, 'specimenKey', 'The specimen');
  checkText(c, data.explanation, 'explanation', 'The explanation', { required: false, max: TEXT_LONG });
  if (!IDENTIFICATION_ZOOM_LEVELS.includes(data.minZoomToMark)) {
    c.error('minZoomToMark', `Marking zoom must be one of ${IDENTIFICATION_ZOOM_LEVELS.map((z) => `${z}x`).join(', ')}.`);
  }
  if (checkList(c, data.symptomSpots, 'symptomSpots', 'The symptom spot list', { min: 1, max: LIMITS.spots, noun: 'symptom spots', tooFew: 'Place at least one symptom spot on the specimen.' })) {
    checkIds(c, data.symptomSpots, 'symptomSpots', 'Spot');
    data.symptomSpots.forEach((spot, i) => {
      const at = `symptomSpots.${i}`;
      if (!isObject(spot)) {
        c.error(at, `Spot ${i + 1} is not readable.`);
        return;
      }
      checkPercent(c, spot.x, `${at}.x`, `Spot ${i + 1}'s left position`);
      checkPercent(c, spot.y, `${at}.y`, `Spot ${i + 1}'s top position`);
      checkPercent(c, spot.radius, `${at}.radius`, `Spot ${i + 1}'s size`, { min: 2, max: 30 });
      checkText(c, spot.description, `${at}.description`, `Spot ${i + 1}'s description`, { required: false, max: TEXT_LONG });
    });
  }
  if (checkList(c, data.pathogenOptions, 'pathogenOptions', 'The pathogen list', { min: 2, max: LIMITS.pathogens, noun: 'pathogen choices', tooFew: 'Add at least two pathogen choices: the correct one and a wrong one.' })) {
    const ids = checkIds(c, data.pathogenOptions, 'pathogenOptions', 'Pathogen');
    data.pathogenOptions.forEach((option, i) => {
      if (!isObject(option)) {
        c.error(`pathogenOptions.${i}`, `Pathogen ${i + 1} is not readable.`);
        return;
      }
      checkText(c, option.commonName, `pathogenOptions.${i}.commonName`, `Pathogen ${i + 1}'s name`);
      checkText(c, option.scientificName, `pathogenOptions.${i}.scientificName`, `Pathogen ${i + 1}'s scientific name`, { required: false });
      checkText(c, option.group, `pathogenOptions.${i}.group`, `Pathogen ${i + 1}'s group`, { required: false });
    });
    if (!ids.has(data.correctPathogenId)) c.error('correctPathogenId', 'Pick which pathogen is the correct answer.');
    else if (data.pathogenOptions.length < 4) c.warn('pathogenOptions', 'Fewer than three wrong choices makes the guess easy.');
  }
}

function matching(c, data) {
  if (!isObject(data.target)) c.error('target', 'The target pest is missing.');
  else {
    checkText(c, data.target.commonName, 'target.commonName', 'The target pest name');
    checkText(c, data.target.scientificName, 'target.scientificName', 'The scientific name', { required: false });
    checkText(c, data.target.imageKey, 'target.imageKey', 'The pest picture', { required: false });
    checkText(c, data.target.hint, 'target.hint', 'The hint', { required: false, max: TEXT_LONG });
  }
  checkText(c, data.explanation, 'explanation', 'The explanation', { required: false, max: TEXT_LONG });
  if (checkList(c, data.columns, 'columns', 'The column list', { min: 3, max: 3, noun: 'columns', tooFew: 'Matching needs exactly three columns.' })) {
    const keys = data.columns.map((column) => (isObject(column) ? column.key : null));
    if (MATCHING_COLUMN_KEYS.some((key) => !keys.includes(key))) {
      c.error('columns', 'Matching needs the classification, damage and tactic columns.');
    }
    data.columns.forEach((column, i) => {
      const at = `columns.${i}`;
      if (!isObject(column)) {
        c.error(at, `Column ${i + 1} is not readable.`);
        return;
      }
      checkText(c, column.title, `${at}.title`, `Column ${i + 1}'s heading`);
      if (!checkList(c, column.options, `${at}.options`, `Column ${i + 1}'s choice list`, { max: LIMITS.columnOptions, noun: 'choices in one column' })) return;
      const ids = checkIds(c, column.options, `${at}.options`, 'Choice');
      column.options.forEach((option, j) => {
        if (!isObject(option)) {
          c.error(`${at}.options.${j}`, `Choice ${j + 1} is not readable.`);
          return;
        }
        checkText(c, option.label, `${at}.options.${j}.label`, `Choice ${j + 1}'s label`);
        checkText(c, option.sublabel, `${at}.options.${j}.sublabel`, `Choice ${j + 1}'s note`, { required: false });
        checkText(c, option.imageKey, `${at}.options.${j}.imageKey`, `Choice ${j + 1}'s picture`, { required: false });
      });
      if (column.options.length < 1 + MIN_MATCHING_DECOYS) {
        const decoys = Math.max(0, column.options.length - 1);
        c.error(`${at}.options`, `Matching needs at least ${MIN_MATCHING_DECOYS} wrong choices per column (column ${i + 1} has ${decoys}).`);
      }
      if (!ids.has(column.correctOptionId)) c.error(`${at}.correctOptionId`, `Mark the correct choice in column ${i + 1}.`);
    });
  }
  if (data.otherPests !== undefined && checkList(c, data.otherPests, 'otherPests', 'The look-alike list', { max: LIMITS.otherPests, noun: 'look-alike pests' })) {
    data.otherPests.forEach((pest, i) => {
      if (!isObject(pest)) {
        c.error(`otherPests.${i}`, `Look-alike ${i + 1} is not readable.`);
        return;
      }
      checkText(c, pest.name, `otherPests.${i}.name`, `Look-alike ${i + 1}'s name`);
      checkText(c, pest.group, `otherPests.${i}.group`, `Look-alike ${i + 1}'s group`, { required: false });
      checkText(c, pest.note, `otherPests.${i}.note`, `Look-alike ${i + 1}'s note`, { required: false });
      checkText(c, pest.imageKey, `otherPests.${i}.imageKey`, `Look-alike ${i + 1}'s picture`, { required: false });
    });
  }
}

function dragAndDrop(c, data) {
  if (!isObject(data.specimen)) c.error('specimen', 'The specimen is missing.');
  else {
    checkText(c, data.specimen.commonName, 'specimen.commonName', 'The weed name');
    checkText(c, data.specimen.scientificName, 'specimen.scientificName', 'The scientific name', { required: false });
    checkText(c, data.specimen.group, 'specimen.group', 'The weed group', { required: false });
    checkText(c, data.specimen.imageKey, 'specimen.imageKey', 'The specimen picture');
  }
  checkText(c, data.explanation, 'explanation', 'The explanation', { required: false, max: TEXT_LONG });
  let labelIds = new Set();
  if (checkList(c, data.labels, 'labels', 'The label list', { min: 1, max: LIMITS.labels, noun: 'labels', tooFew: 'Add at least one label.' })) {
    labelIds = checkIds(c, data.labels, 'labels', 'Label');
    data.labels.forEach((label, i) => {
      if (!isObject(label)) {
        c.error(`labels.${i}`, `Label ${i + 1} is not readable.`);
        return;
      }
      checkText(c, label.text, `labels.${i}.text`, `Label ${i + 1}'s text`);
      checkText(c, label.hint, `labels.${i}.hint`, `Label ${i + 1}'s hint`, { required: false });
    });
  }
  if (checkList(c, data.targets, 'targets', 'The target zone list', { min: 1, max: LIMITS.targets, noun: 'target zones', tooFew: 'Place at least one target zone on the specimen.' })) {
    checkIds(c, data.targets, 'targets', 'Zone');
    const used = new Map();
    data.targets.forEach((target, i) => {
      const at = `targets.${i}`;
      if (!isObject(target)) {
        c.error(at, `Zone ${i + 1} is not readable.`);
        return;
      }
      checkPercent(c, target.x, `${at}.x`, `Zone ${i + 1}'s left position`);
      checkPercent(c, target.y, `${at}.y`, `Zone ${i + 1}'s top position`);
      if (!labelIds.has(target.correctLabelId)) c.error(`${at}.correctLabelId`, `Pick the correct label for zone ${i + 1}.`);
      else if (used.has(target.correctLabelId)) {
        c.error(`${at}.correctLabelId`, `Zones ${used.get(target.correctLabelId) + 1} and ${i + 1} need the same label; each label can go on one zone only.`);
      } else used.set(target.correctLabelId, i);
    });
    if (Array.isArray(data.labels) && data.labels.length === data.targets.length) {
      c.warn('labels', 'With no decoy labels, the last label always has only one place to go.');
    }
  }
}

function strategyManagement(c, data) {
  checkText(c, data.crop, 'crop', 'The crop');
  checkText(c, data.sceneKey, 'sceneKey', 'The farm scene', { required: false });
  checkText(c, data.guideMessage, 'guideMessage', 'The guide message', { required: false, max: TEXT_LONG });
  checkText(c, data.explanation, 'explanation', 'The explanation', { required: false, max: TEXT_LONG });
  if (data.observations !== undefined && checkList(c, data.observations, 'observations', 'The clue list', { max: LIMITS.observations, noun: 'field clues' })) {
    data.observations.forEach((clue, i) => checkText(c, clue, `observations.${i}`, `Clue ${i + 1}`, { max: TEXT_LONG }));
  }
  if (checkList(c, data.pestOptions, 'pestOptions', 'The pest list', { min: 2, max: LIMITS.pestOptions, noun: 'pest choices', tooFew: 'Add at least two pest choices: the correct one and a wrong one.' })) {
    const ids = checkIds(c, data.pestOptions, 'pestOptions', 'Pest');
    data.pestOptions.forEach((pest, i) => {
      if (!isObject(pest)) {
        c.error(`pestOptions.${i}`, `Pest ${i + 1} is not readable.`);
        return;
      }
      checkText(c, pest.name, `pestOptions.${i}.name`, `Pest ${i + 1}'s name`);
      checkText(c, pest.scientificName, `pestOptions.${i}.scientificName`, `Pest ${i + 1}'s scientific name`, { required: false });
      checkText(c, pest.imageKey, `pestOptions.${i}.imageKey`, `Pest ${i + 1}'s picture`, { required: false });
    });
    if (!ids.has(data.correctPestId)) c.error('correctPestId', 'Pick which pest is the correct diagnosis.');
  }
  let tacticIds = new Set();
  if (checkList(c, data.tactics, 'tactics', 'The tactic list', { min: 2, max: LIMITS.tactics, noun: 'tactics', tooFew: 'Add at least two tactics to choose from.' })) {
    tacticIds = checkIds(c, data.tactics, 'tactics', 'Tactic');
    data.tactics.forEach((tactic, i) => {
      const at = `tactics.${i}`;
      if (!isObject(tactic)) {
        c.error(at, `Tactic ${i + 1} is not readable.`);
        return;
      }
      checkText(c, tactic.name, `${at}.name`, `Tactic ${i + 1}'s name`);
      checkText(c, tactic.description, `${at}.description`, `Tactic ${i + 1}'s description`, { required: false, max: TEXT_LONG });
      if (!TACTIC_CATEGORY_KEYS.includes(tactic.category)) c.error(`${at}.category`, `Pick a category for tactic ${i + 1}.`);
      checkPercent(c, tactic.effectiveness, `${at}.effectiveness`, `Tactic ${i + 1}'s effectiveness`);
      checkPercent(c, tactic.environmentalImpact, `${at}.environmentalImpact`, `Tactic ${i + 1}'s environmental impact`);
      checkPercent(c, tactic.resourceCost, `${at}.resourceCost`, `Tactic ${i + 1}'s resource cost`);
    });
  }
  const tacticCount = Array.isArray(data.tactics) ? data.tactics.length : 0;
  if (!isInt(data.requiredTacticCount) || data.requiredTacticCount < 1 || data.requiredTacticCount > Math.max(1, tacticCount)) {
    c.error('requiredTacticCount', `Tactics to deploy must be a whole number from 1 to ${Math.max(1, tacticCount)}.`);
  }
  if (!Array.isArray(data.bestTacticIds)) c.error('bestTacticIds', 'Mark the best tactics.');
  else {
    if (data.bestTacticIds.some((id) => !tacticIds.has(id))) c.error('bestTacticIds', 'A best tactic no longer exists.');
    if (new Set(data.bestTacticIds).size !== data.bestTacticIds.length) c.error('bestTacticIds', 'A tactic is marked best twice.');
    if (isInt(data.requiredTacticCount) && data.bestTacticIds.length !== data.requiredTacticCount) {
      c.error('bestTacticIds', `Mark exactly ${data.requiredTacticCount} best tactic${data.requiredTacticCount === 1 ? '' : 's'}, one per tactic students deploy.`);
    }
    const effective = Array.isArray(data.tactics)
      ? data.tactics.filter((t) => isObject(t) && data.bestTacticIds.includes(t.id)).reduce((sum, t) => sum + (Number(t.effectiveness) || 0), 0)
      : 0;
    if (data.bestTacticIds.length > 0 && effective <= 0) c.error('bestTacticIds', 'The best tactics need some effectiveness, or no plan can earn tactic points.');
  }
  if (!isObject(data.goals) || !inRange(data.goals.minEnvironmentalScore, 0, 100)) {
    c.error('goals.minEnvironmentalScore', 'The environmental goal must be a number from 0 to 100.');
  }
}

const VALIDATORS = {
  'decision-making': decisionMaking,
  identification,
  matching,
  'drag-and-drop': dragAndDrop,
  'strategy-management': strategyManagement,
};

/**
 * Validate a mission's scenarioData for its game type.
 * @returns {{ errors: {path: string, message: string}[], warnings: {path: string, message: string}[] }}
 */
export function validateScenario(gameType, data) {
  const c = collector();
  const validate = VALIDATORS[gameType];
  if (!validate) {
    c.error('', `Unknown game type "${gameType}".`);
    return { errors: c.errors, warnings: c.warnings };
  }
  if (!isObject(data)) {
    c.error('', 'The mission content is missing.');
    return { errors: c.errors, warnings: c.warnings };
  }
  let size = Infinity;
  try {
    size = JSON.stringify(data).length;
  } catch {
    // Circular or otherwise unserialisable: rejected below.
  }
  if (size > MAX_SCENARIO_CHARS) {
    c.error('', `The mission content is too large (${Number.isFinite(size) ? size : 'unreadable'} characters; the limit is ${MAX_SCENARIO_CHARS}).`);
    return { errors: c.errors, warnings: c.warnings };
  }

  checkText(c, data.title, 'title', 'The mission title');
  checkText(c, data.instructions, 'instructions', 'The instructions', { required: false, max: TEXT_LONG });

  if (TIMED_GAME_TYPES.includes(gameType)) {
    if (!isInt(data.timeLimitSeconds) || data.timeLimitSeconds < TIMER_LIMITS.min || data.timeLimitSeconds > TIMER_LIMITS.max) {
      c.error('timeLimitSeconds', `This game runs on a countdown: set it between ${TIMER_LIMITS.min} seconds and ${TIMER_LIMITS.max / 60} minutes.`);
    }
  } else if (data.timeLimitSeconds !== undefined && (!isInt(data.timeLimitSeconds) || data.timeLimitSeconds < 0 || data.timeLimitSeconds > TIMER_LIMITS.max)) {
    c.error('timeLimitSeconds', `The time limit must be a whole number of seconds up to ${TIMER_LIMITS.max}.`);
  }

  validate(c, data);
  return { errors: c.errors, warnings: c.warnings };
}

/** Max XP must be a whole number from 0 to MAX_XP_LIMIT. */
export function validateMaxXP(value) {
  return isInt(value) && value >= 0 && value <= MAX_XP_LIMIT
    ? null
    : `Max XP must be a whole number from 0 to ${MAX_XP_LIMIT}.`;
}

/**
 * Whether the visual editor can display this document at all.
 *
 * Validation errors are fine — a half-finished mission is still editable —
 * but the visual editors walk these containers, so they must exist with the
 * right shape. Anything else stays in the JSON view, with the reason.
 */
export function visualEditability(gameType, data) {
  if (!isObject(data)) return { ok: false, reason: 'The content is not an object.' };
  const needs = {
    'decision-making': [['scenarios', 'array', 'scenarios']],
    identification: [['symptomSpots', 'array', 'symptom spots'], ['pathogenOptions', 'array', 'pathogen choices']],
    matching: [['columns', 'array', 'columns'], ['target', 'object', 'target pest']],
    'drag-and-drop': [['targets', 'array', 'target zones'], ['labels', 'array', 'labels'], ['specimen', 'object', 'specimen']],
    'strategy-management': [['pestOptions', 'array', 'pest choices'], ['tactics', 'array', 'tactics'], ['bestTacticIds', 'ids', 'best tactics']],
  }[gameType] ?? [];
  for (const [key, type, label] of needs) {
    const value = data[key];
    const ok =
      type === 'array' ? Array.isArray(value) && value.every(isObject)
        : type === 'ids' ? Array.isArray(value) && value.every((id) => typeof id === 'string')
          : isObject(value);
    if (!ok) return { ok: false, reason: `The ${label} ${type === 'object' ? 'section' : 'list'} is missing or not in the expected shape.` };
  }
  if (gameType === 'decision-making' && data.scenarios.some((s) => !Array.isArray(s.choices) || !s.choices.every(isObject))) {
    return { ok: false, reason: 'A scenario has no readable list of options.' };
  }
  if (gameType === 'matching' && data.columns.some((col) => !Array.isArray(col.options) || !col.options.every(isObject))) {
    return { ok: false, reason: 'A column has no readable list of choices.' };
  }
  if (gameType === 'strategy-management' && data.goals !== undefined && !isObject(data.goals)) {
    return { ok: false, reason: 'The goals section is not in the expected shape.' };
  }
  return { ok: true, reason: null };
}
