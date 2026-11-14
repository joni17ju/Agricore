/**
 * Figures the editors show about a mission, measured with the real scorer
 * (utils/scoring.js — the same rules the server scores attempts with) rather
 * than restated, so they can never drift from what students actually get.
 */
import { scoreMission } from '../../../../utils/scoring.js';

/**
 * Matching's clock bonus: a fully correct board with time left, minus the
 * same board at zero.
 */
export function matchingClockBonus(data) {
  try {
    const selections = Object.fromEntries(data.columns.map((column) => [column.key, column.correctOptionId]));
    const score = (timeRemainingSeconds) =>
      scoreMission({ gameType: 'matching', scenarioData: data, answers: { selections, timeRemainingSeconds } }).score;
    return score(1) - score(0);
  } catch {
    return null;
  }
}

/** Every way of choosing `size` items from a list, in order. */
function* combinations(items, size, start = 0, chosen = []) {
  if (chosen.length === size) {
    yield [...chosen];
    return;
  }
  for (let i = start; i <= items.length - (size - chosen.length); i += 1) {
    chosen.push(items[i]);
    yield* combinations(items, size, i + 1, chosen);
    chosen.pop();
  }
}

/**
 * What a Strategy mission can actually score, by running the scorer on the
 * marked best plan and on every plan of the required size (at most 924 for
 * twelve tactics, so this is cheap enough to do live).
 *
 * @returns {null | {
 *   marked: { score: number, environmentalScore: number, grade: string, goalMet: boolean },
 *   best: { score: number, tacticIds: string[] },
 *   bestEnvironmentalScore: number,
 *   goalReachable: boolean,
 *   plans: number,
 * }}
 */
export function strategyInsights(data) {
  try {
    const size = data.requiredTacticCount;
    const ids = data.tactics.map((tactic) => tactic.id);
    if (!Number.isInteger(size) || size < 1 || size > ids.length || ids.length > 12) return null;
    const run = (tacticIds) =>
      scoreMission({ gameType: 'strategy-management', scenarioData: data, answers: { pestId: data.correctPestId, tacticIds } });

    const marked = run(data.bestTacticIds);
    let best = null;
    let bestEnvironmentalScore = -1;
    let goalReachable = false;
    let plans = 0;
    for (const plan of combinations(ids, size)) {
      plans += 1;
      const result = run(plan);
      if (!best || result.score > best.score) best = { score: result.score, tacticIds: plan };
      bestEnvironmentalScore = Math.max(bestEnvironmentalScore, result.breakdown.environmentalScore);
      if (result.breakdown.goals.environmentalGoalMet) goalReachable = true;
    }
    return {
      marked: {
        score: marked.score,
        environmentalScore: marked.breakdown.environmentalScore,
        grade: marked.breakdown.environmentalGrade,
        goalMet: marked.breakdown.goals.environmentalGoalMet,
      },
      best,
      bestEnvironmentalScore,
      goalReachable,
      plans,
    };
  } catch {
    return null;
  }
}
