/* Ported verbatim from frontend/src/utils/scoring.js — the scoring rules must stay
   identical on both sides, so edit them together. */
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

const SCORERS = {
  [GAME_TYPES.DECISION_MAKING]: scoreDecisionMaking,
  [GAME_TYPES.IDENTIFICATION]: scoreIdentification,
  [GAME_TYPES.MATCHING]: scoreMatching,
  [GAME_TYPES.DRAG_AND_DROP]: scoreDragAndDrop,
  [GAME_TYPES.STRATEGY_MANAGEMENT]: scoreStrategy,
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
