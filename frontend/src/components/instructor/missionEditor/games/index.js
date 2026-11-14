/**
 * The visual editor for each game type. A type with no entry here opens in the
 * Advanced (JSON) view instead.
 */
import DecisionEditor from './DecisionEditor.jsx';
import MatchingEditor from './MatchingEditor.jsx';
import StrategyEditor from './StrategyEditor.jsx';
import { matchingClockBonus } from './scoringInsights.js';

export const GAME_EDITORS = {
  'decision-making': DecisionEditor,
  matching: MatchingEditor,
  'strategy-management': StrategyEditor,
};

/** One line under the countdown explaining what the clock decides. */
export const TIMER_RULES = {
  matching: (data) => {
    const bonus = matchingClockBonus(data);
    return bonus
      ? `Finish all columns correctly with time left to earn the +${bonus} bonus.`
      : 'Finish all columns correctly with time left to earn the clock bonus.';
  },
  'drag-and-drop': () => 'When time runs out, the placements are checked as they stand.',
};
