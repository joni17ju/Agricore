import { useState } from 'react';
import { PASSING_SCORE } from '../../../constants/rules.js';
import { isPassingScore, xpForScore } from '../../../utils/gamification.js';
import { scoreMission } from '../../../utils/scoring.js';
import Button from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import Modal from '../../common/Modal.jsx';
import DecisionGame from '../../missions/decision/DecisionGame.jsx';
import DragDropGame from '../../missions/dragdrop/DragDropGame.jsx';
import IdentificationGame from '../../missions/identification/IdentificationGame.jsx';
import MatchingGame from '../../missions/matching/MatchingGame.jsx';
import StrategyGame from '../../missions/strategy/StrategyGame.jsx';

const GAMES = {
  'decision-making': DecisionGame,
  identification: IdentificationGame,
  matching: MatchingGame,
  'drag-and-drop': DragDropGame,
  'strategy-management': StrategyGame,
};

/**
 * "Preview as student": the real game component, run on the unsaved draft.
 *
 * The games only report answers through onComplete — none of them calls the
 * API — and here those answers are scored in the browser by the same scorer
 * the server uses. Nothing is submitted: no attempt, no XP, no progress, no
 * notification. Mounted only while open, so every preview starts fresh.
 */
export default function PreviewModal({ onClose, draft, maxXP, module, levelNumber, totalLevels }) {
  const [run, setRun] = useState(0);
  const [result, setResult] = useState(null);
  const Game = GAMES[module.gameType];

  const finish = (answers) => {
    const scored = scoreMission({ gameType: module.gameType, scenarioData: draft, answers });
    setResult({ score: scored.score, passed: isPassingScore(scored.score), xp: xpForScore(maxXP, scored.score) });
  };
  const again = () => {
    setResult(null);
    setRun((value) => value + 1);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="preview"
      title={`Preview: ${draft.title || 'Untitled mission'}`}
      description="The real game with your unsaved changes. Nothing you do here is submitted or counted."
      footer={
        <>
          {result && <Button variant="secondary" icon="refresh" onClick={again}>Play again</Button>}
          <Button onClick={onClose}>Back to the editor</Button>
        </>
      }
    >
      <div className={`me-preview mission-page--${module.gameType}`}>
        {result ? (
          <div className={`me-preview__result ${result.passed ? 'is-pass' : 'is-fail'}`} role="status">
            <span className="me-preview__score">{result.score}%</span>
            <strong>{result.passed ? 'Passed' : 'Not passed'}</strong>
            <span className="text-muted">
              Pass mark {PASSING_SCORE}%. A first attempt like this would earn {result.passed ? result.xp : 0} XP.
            </span>
            <span className="me-note"><Icon name="shield" size={14} /> Preview only — no attempt was recorded.</span>
          </div>
        ) : (
          <Game
            key={run}
            mission={{ levelNumber, maxXP, scenarioData: draft }}
            module={module}
            totalLevels={totalLevels}
            onComplete={finish}
          />
        )}
      </div>
    </Modal>
  );
}
