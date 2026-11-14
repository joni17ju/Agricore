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
