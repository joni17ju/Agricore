/**
 * Mission scoring — one function per game type. Each returns a 0–100 score and a
 * breakdown the result screen can explain. Games may also use the helpers here
 * for live feedback while playing.
 *
 * Answer shapes:
 *   decision-making      { choices: { [scenarioId]: choiceId } }
 *   identification       { marks: [{ x, y }], pathogenGuesses: [optionId, ...] }
 *   matching             { selections: { [columnKey]: optionId }, timeRemainingSeconds }
 *   drag-and-drop        { placements: { [targetId]: labelId } }
 *   strategy-management  { pestId, tacticIds: [tacticId, ...] }
 */
import { GAME_TYPES } from '../constants/gameTypes.js';
import { getEnvironmentalGrade, isPassingScore } from './gamification.js';

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value)));

// ── Module 1: Decision-Making ──
function scoreDecisionMaking(scenarioData, { choices = {} }) {
  const results = scenarioData.scenarios.map((scenario) => {
    const choice = scenario.choices.find((item) => item.id === choices[scenario.id]);
    const bestPoints = Math.max(...scenario.choices.map((item) => item.points));
    return {
      scenarioId: scenario.id,
      choiceId: choice?.id ?? null,
      points: choice?.points ?? 0,
      isBest: Boolean(choice) && choice.points === bestPoints,
    };
  });
  const average = results.reduce((sum, result) => sum + result.points, 0) / results.length;
  return { score: clampScore(average), breakdown: { results } };
}

// ── Module 2: Identification ──
/** Ids of symptom spots covered by at least one mark. */
export function findMarkedSpotIds(symptomSpots, marks) {
  return symptomSpots
    .filter((spot) => marks.some((mark) => Math.hypot(mark.x - spot.x, mark.y - spot.y) <= spot.radius))
    .map((spot) => spot.id);
}

/** Marks that do not fall on any symptom spot. */
export function countMisplacedMarks(symptomSpots, marks) {
  return marks.filter(
    (mark) => !symptomSpots.some((spot) => Math.hypot(mark.x - spot.x, mark.y - spot.y) <= spot.radius),
  ).length;
}

const IDENTIFICATION_PENALTY = { wrongGuess: 25, misplacedMark: 5, missedSpot: 20 };

function scoreIdentification(scenarioData, { marks = [], pathogenGuesses = [] }) {
  const spotsFound = findMarkedSpotIds(scenarioData.symptomSpots, marks).length;
  const missedSpots = scenarioData.symptomSpots.length - spotsFound;
  const misplacedMarks = countMisplacedMarks(scenarioData.symptomSpots, marks);
  const identified = pathogenGuesses.includes(scenarioData.correctPathogenId);
  const wrongGuesses = pathogenGuesses.filter((id) => id !== scenarioData.correctPathogenId).length;

  const score = identified
    ? 100 -
      wrongGuesses * IDENTIFICATION_PENALTY.wrongGuess -
      misplacedMarks * IDENTIFICATION_PENALTY.misplacedMark -
      missedSpots * IDENTIFICATION_PENALTY.missedSpot
    : 0;

  return {
    score: clampScore(score),
    breakdown: {
      spotsFound,
      totalSpots: scenarioData.symptomSpots.length,
      misplacedMarks,
      wrongGuesses,
      identified,
    },
  };
}

// ── Module 3: Matching ──
const MATCHING_COLUMN_POINTS = 90;
const MATCHING_TIME_POINTS = 10;

function scoreMatching(scenarioData, { selections = {}, timeRemainingSeconds = 0 }) {
  const results = scenarioData.columns.map((column) => ({
    columnKey: column.key,
    selectedOptionId: selections[column.key] ?? null,
    isCorrect: selections[column.key] === column.correctOptionId,
  }));
  const correctColumns = results.filter((result) => result.isCorrect).length;
  const beatClock = timeRemainingSeconds > 0 && correctColumns === scenarioData.columns.length;
  const score =
    (correctColumns / scenarioData.columns.length) * MATCHING_COLUMN_POINTS +
    (beatClock ? MATCHING_TIME_POINTS : 0);

  return {
    score: clampScore(score),
    breakdown: { results, correctColumns, totalColumns: scenarioData.columns.length, beatClock },
  };
}

// ── Module 4: Drag-and-Drop ──
function scoreDragAndDrop(scenarioData, { placements = {} }) {
  const results = scenarioData.targets.map((target) => ({
    targetId: target.id,
    labelId: placements[target.id] ?? null,
    isCorrect: placements[target.id] === target.correctLabelId,
  }));
  const correct = results.filter((result) => result.isCorrect).length;
  return {
    score: clampScore((correct / scenarioData.targets.length) * 100),
    breakdown: { results, correct, total: scenarioData.targets.length },
  };
}

// ── Module 5: Strategy & Management ──
/** Live meter values for the selected tactics. */
export function computeStrategyMeters(tactics, selectedTacticIds) {
  const selected = tactics.filter((tactic) => selectedTacticIds.includes(tactic.id));
  const resourceUsage = Math.min(
    100,
    selected.reduce((sum, tactic) => sum + tactic.resourceCost, 0),
  );
  const environmentalScore = Math.max(
    0,
    100 - selected.reduce((sum, tactic) => sum + tactic.environmentalImpact, 0),
  );
  return { resourceUsage, environmentalScore, environmentalGrade: getEnvironmentalGrade(environmentalScore) };
}

const STRATEGY_POINTS = { diagnosis: 30, tactics: 40, environment: 30 };

function scoreStrategy(scenarioData, { pestId = null, tacticIds = [] }) {
  const diagnosed = pestId === scenarioData.correctPestId;
  const selected = scenarioData.tactics.filter((tactic) => tacticIds.includes(tactic.id));
  const bestEffectiveness = scenarioData.tactics
    .filter((tactic) => scenarioData.bestTacticIds.includes(tactic.id))
    .reduce((sum, tactic) => sum + tactic.effectiveness, 0);
  const chosenEffectiveness = selected.reduce((sum, tactic) => sum + tactic.effectiveness, 0);
  const meters = computeStrategyMeters(scenarioData.tactics, tacticIds);
  const { minEnvironmentalScore } = scenarioData.goals;
  const deployedRequired = selected.length === scenarioData.requiredTacticCount;

  const tacticPoints = deployedRequired
    ? Math.min(1, chosenEffectiveness / bestEffectiveness) * STRATEGY_POINTS.tactics
    : 0;
  // The environmental goal is all-or-nothing: missing it means the plan is not eco-friendly enough.
  const environmentPoints = meters.environmentalScore >= minEnvironmentalScore ? STRATEGY_POINTS.environment : 0;

  const goals = {
    diagnosed,
    deployedRequired,
    environmentalGoalMet: deployedRequired && meters.environmentalScore >= minEnvironmentalScore,
  };

  return {
    score: clampScore((diagnosed ? STRATEGY_POINTS.diagnosis : 0) + tacticPoints + (goals.environmentalGoalMet ? environmentPoints : 0)),
    breakdown: {
      goals,
      ...meters,
      isBestCombination:
        deployedRequired && scenarioData.bestTacticIds.every((id) => tacticIds.includes(id)),
    },
  };
}


// ── Inspection (general engine) ──
/**
 * Each round: up to 50 points for the required findings marked (a mark counts
 * when it falls inside a finding's circle) together with the required
 * microscope features (a feature mark counts inside the feature's circle on
 * that finding's micrograph), 50 for the right answer, minus a small penalty
 * for each mark on nothing (leaf or microscope, capped at the round's tries)
 * and for each hint. The mission score is the average of the rounds.
 *
 * A leaf mark also carries the magnification it was made at (zoom); it only
 * counts for a finding at or above that finding's minZoom (default 2), so a
 * symptom cannot be "found" before it can be seen.
 *
 * Answers: { rounds: { [roundId]: { marks: [{ x, y, zoom }], features: [{ findingId, x, y }], choiceId, hintsUsed } } }
 */
export const INSPECTION_DEFAULTS = Object.freeze({ wrongMarkPenalty: 5, hintPenalty: 5, triesPerRound: 5, minZoom: 2 });

/** The magnification a finding needs before it can be seen and marked. */
const findingMinZoom = (finding) => Number(finding.minZoom ?? INSPECTION_DEFAULTS.minZoom);
/** A leaf mark counts for a finding only inside its circle and at (or above) its magnification. */
const marksFinding = (finding, mark) => Math.hypot(mark.x - finding.x, mark.y - finding.y) <= finding.radius && mark.zoom >= findingMinZoom(finding) - 0.01;

function scoreInspection(scenarioData, { rounds: answered = {} } = {}) {
  const wrongMarkPenalty = Number(scenarioData.wrongMarkPenalty ?? INSPECTION_DEFAULTS.wrongMarkPenalty);
  const hintPenalty = Number(scenarioData.hintPenalty ?? INSPECTION_DEFAULTS.hintPenalty);
  const tries = Number(scenarioData.triesPerRound ?? INSPECTION_DEFAULTS.triesPerRound);
  const results = scenarioData.rounds.map((round) => {
    const answer = (answered && typeof answered === 'object' ? answered[round.id] : null) ?? {};
    const marks = (Array.isArray(answer.marks) ? answer.marks : [])
      .filter((m) => m && Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.y)))
      .slice(0, 50)
      // The magnification the mark was made at; a mark without one counts as 1×.
      .map((m) => ({ x: Number(m.x), y: Number(m.y), zoom: Number.isFinite(Number(m.zoom)) ? Number(m.zoom) : 1 }));
    // Decoys look like a symptom but are not one: a mark on a decoy is a mark on nothing.
    const real = round.findings.filter((f) => !f.decoy);
    const required = real.filter((f) => f.required !== false);
    // A mark below a finding's magnification is on what still looks like healthy leaf: it does not count.
    const foundIds = real.filter((f) => marks.some((m) => marksFinding(f, m))).map((f) => f.id);
    const misplacedLeaf = marks.filter((m) => !real.some((f) => marksFinding(f, m))).length;
    const foundRequired = required.filter((f) => foundIds.includes(f.id)).length;
    // Microscope features, marked on each finding's micrograph.
    const featureMarks = (Array.isArray(answer.features) ? answer.features : [])
      .filter((m) => m && Number.isFinite(Number(m.x)) && Number.isFinite(Number(m.y)))
      .slice(0, 50)
      .map((m) => ({ findingId: String(m.findingId ?? ''), x: Number(m.x), y: Number(m.y) }));
    let featuresRequired = 0;
    let featuresFound = 0;
    let misplacedFeatures = featureMarks.filter((m) => !round.findings.some((f) => f.id === m.findingId && f.micrograph?.features?.length)).length;
    const foundFeatureIds = [];
    for (const finding of round.findings) {
      const features = finding.micrograph?.features ?? [];
      if (!features.length) continue;
      const own = featureMarks.filter((m) => m.findingId === finding.id);
      const seen = findMarkedSpotIds(features, own);
      const needed = features.filter((x) => x.required !== false);
      featuresRequired += needed.length;
      featuresFound += needed.filter((x) => seen.includes(x.id)).length;
      misplacedFeatures += countMisplacedMarks(features, own);
      foundFeatureIds.push(...seen.map((id) => `${finding.id}:${id}`));
    }
    const misplaced = Math.min(tries, misplacedLeaf + misplacedFeatures);
    const totalRequired = required.length + featuresRequired;
    const hintsUsed = Math.max(0, Math.min(totalRequired, Math.floor(Number(answer.hintsUsed) || 0)));
    const correct = answer.choiceId === round.correctChoiceId;
    const findingsPoints = totalRequired ? (50 * (foundRequired + featuresFound)) / totalRequired : 50;
    const roundScore = clampScore(findingsPoints + (correct ? 50 : 0) - misplaced * wrongMarkPenalty - hintsUsed * hintPenalty);
    return { roundId: round.id, foundRequired, required: required.length, foundIds, featuresFound, featuresRequired, foundFeatureIds, misplaced, hintsUsed, correct, choiceId: answer.choiceId ?? null, roundScore };
  });
  const score = results.length ? results.reduce((sum, r) => sum + r.roundScore, 0) / results.length : 0;
  return { score: clampScore(score), breakdown: { rounds: results } };
}

const SCORERS = {
  [GAME_TYPES.DECISION_MAKING]: scoreDecisionMaking,
  [GAME_TYPES.IDENTIFICATION]: scoreIdentification,
  [GAME_TYPES.MATCHING]: scoreMatching,
  [GAME_TYPES.DRAG_AND_DROP]: scoreDragAndDrop,
  [GAME_TYPES.STRATEGY_MANAGEMENT]: scoreStrategy,
  [GAME_TYPES.INSPECTION]: scoreInspection,
};

/**
 * Score a mission attempt.
 * @returns {{ score: number, isPassed: boolean, breakdown: object }}
 */
export function scoreMission({ gameType, scenarioData, answers }) {
  const scorer = SCORERS[gameType];
  if (!scorer) throw new Error(`No scorer for game type "${gameType}"`);
  const { score, breakdown } = scorer(scenarioData, answers ?? {});
  return { score, isPassed: isPassingScore(score), breakdown };
}
