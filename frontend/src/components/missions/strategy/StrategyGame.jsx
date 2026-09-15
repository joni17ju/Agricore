/**
 * Module 5 — Strategy & Management game (Proposal Table 1, Fig 22).
 * Diagnose the pest from field observations, deploy a combination of control
 * tactics while watching resource and environmental meters, and meet the
 * mission goals to save the crop.
 */
import { useState } from 'react';
import { GAME_TYPES, TACTIC_CATEGORIES } from '../../../constants/gameTypes.js';
import { computeStrategyMeters, scoreMission } from '../../../utils/scoring.js';
import Button from '../../common/Button.jsx';
import { SelectInput } from '../../common/Form.jsx';
import Icon from '../../common/Icon.jsx';
import { ProgressBar } from '../../common/Progress.jsx';
import FarmScene from '../../illustrations/FarmScene.jsx';
import GuideCharacter from '../../illustrations/GuideCharacter.jsx';
import PestIllustration from '../../illustrations/PestIllustration.jsx';
import { HudChip } from '../MissionHud.jsx';

const CATEGORY_META = {
  [TACTIC_CATEGORIES.CULTURAL]: { label: 'Cultural', icon: 'sprout' },
  [TACTIC_CATEGORIES.BIOLOGICAL]: { label: 'Biological', icon: 'bug' },
  [TACTIC_CATEGORIES.MECHANICAL]: { label: 'Mechanical', icon: 'filter' },
  [TACTIC_CATEGORIES.CHEMICAL]: { label: 'Chemical', icon: 'spray' },
};

const DEPLOY_ANIMATION_MS = 1400;
const PEST_MARKERS = [
  { x: 22, y: 62 }, { x: 38, y: 74 }, { x: 55, y: 66 }, { x: 70, y: 78 }, { x: 84, y: 64 },
];

const impactLabel = (impact) => (impact >= 30 ? 'High eco impact' : impact >= 10 ? 'Moderate eco impact' : 'Low eco impact');

export default function StrategyGame({ mission, module, totalLevels, onComplete }) {
  const data = mission.scenarioData;
  const [pestId, setPestId] = useState('');
  const [tacticIds, setTacticIds] = useState([]);
  const [warning, setWarning] = useState('');
  const [phase, setPhase] = useState('planning'); // planning | deploying | outcome
  const [outcome, setOutcome] = useState(null);

  const meters = computeStrategyMeters(data.tactics, tacticIds);
  const required = data.requiredTacticCount;
  const selectedPest = data.pestOptions.find((pest) => pest.id === pestId);
  const goals = [
    { label: 'Diagnose specific pest', done: Boolean(pestId), icon: 'search' },
    { label: `Deploy ${required} control tactics`, done: tacticIds.length === required, icon: 'target' },
    {
      label: `Achieve A+ Environmental Score`,
      done: tacticIds.length === required && meters.environmentalScore >= data.goals.minEnvironmentalScore,
      icon: 'globe',
    },
  ];
  const isLocked = phase !== 'planning';

  const toggleTactic = (tacticId) => {
    if (isLocked) return;
    setWarning('');
    if (tacticIds.includes(tacticId)) {
      setTacticIds(tacticIds.filter((id) => id !== tacticId));
    } else if (tacticIds.length >= required) {
      setWarning(`Select only ${required} tactics — deselect one first.`);
    } else {
      setTacticIds([...tacticIds, tacticId]);
    }
  };

  const deploy = () => {
    const result = scoreMission({ gameType: GAME_TYPES.STRATEGY_MANAGEMENT, scenarioData: data, answers: { pestId, tacticIds } });
    setOutcome(result);
    setPhase('deploying');
    setTimeout(() => setPhase('outcome'), DEPLOY_ANIMATION_MS);
  };

  const cropSaved = outcome?.isPassed;

  return (
    <div className="strategy-game">
      <header className="game-header">
        <h1>Module {module.moduleNumber}: {module.title}</h1>
        <div className="game-header__chips">
          <HudChip icon="layers">Level {mission.levelNumber} of {totalLevels}</HudChip>
          <HudChip icon="sprout">Crop: {data.crop}</HudChip>
        </div>
      </header>

      <section className={`strategy-hero strategy-hero--${phase} ${phase === 'outcome' ? (cropSaved ? 'is-saved' : 'is-lost') : ''}`}>
        <FarmScene sceneKey={data.sceneKey} className={phase === 'outcome' && cropSaved ? '' : 'is-stressed'} />

        <div className="strategy-hero__pests" aria-hidden="true">
          {PEST_MARKERS.map((marker, index) => (
            <span key={index} style={{ left: `${marker.x}%`, top: `${marker.y}%`, animationDelay: `${index * 180}ms` }}>
              <Icon name="bug" size={18} />
            </span>
          ))}
        </div>

        <div className="strategy-hero__guide">
          <GuideCharacter size={110} mood={phase === 'outcome' ? (cropSaved ? 'happy' : 'worried') : 'neutral'} />
          <div className="speech-bubble speech-bubble--small">
            {phase === 'outcome'
              ? cropSaved
                ? 'The crop is recovering! Your strategy worked.'
                : 'The pests are still spreading. Rethink your plan.'
              : data.guideMessage}
          </div>
        </div>

        <div className="strategy-meters">
          <div className="strategy-meter">
            <span><Icon name="leaf" size={16} /> Resource Usage</span>
            <ProgressBar value={meters.resourceUsage} tone={meters.resourceUsage > 80 ? 'amber' : 'dark'} size="md" />
            <strong>{meters.resourceUsage}%</strong>
          </div>
          <div className="strategy-meter">
            <span><Icon name="globe" size={16} /> Environmental Score ({meters.environmentalGrade})</span>
            <ProgressBar value={meters.environmentalScore} tone={meters.environmentalScore >= data.goals.minEnvironmentalScore ? 'green' : meters.environmentalScore >= 70 ? 'amber' : 'red'} size="md" />
            <strong>{meters.environmentalScore}%</strong>
          </div>
        </div>

        {phase === 'deploying' && (
          <div className="strategy-deploy" role="status">
            <div className="strategy-deploy__sweep" />
            <span><Icon name="sparkles" size={20} /> Deploying tactics…</span>
          </div>
        )}
      </section>

      <div className="strategy-panels">
        <section className="strategy-panel">
          <h2><span className="strategy-panel__step">1</span> Select Pest to Manage</h2>
          <SelectInput
            aria-label="Pest to manage"
            value={pestId}
            onChange={(event) => setPestId(event.target.value)}
            placeholder="Choose a pest…"
            options={data.pestOptions.map((pest) => ({ value: pest.id, label: pest.name }))}
            disabled={isLocked}
          />
          <div className="strategy-diagnosis">
            {selectedPest ? (
              <div key={selectedPest.id} className="strategy-diagnosis__pest anim-scale-in">
                <PestIllustration imageKey={selectedPest.imageKey} size={72} />
                <div>
                  <strong>{selectedPest.name}</strong>
                  <em>{selectedPest.scientificName}</em>
                </div>
              </div>
            ) : (
              <p className="text-muted text-sm">Read the field observations before diagnosing.</p>
            )}
          </div>
          <h3 className="strategy-panel__subtitle"><Icon name="clipboard" size={15} /> Field observations</h3>
          <ul className="strategy-observations">
            {data.observations.map((observation) => (
              <li key={observation}><Icon name="eye" size={14} /> {observation}</li>
            ))}
          </ul>
        </section>

        <section className="strategy-panel strategy-panel--tactics">
          <h2><span className="strategy-panel__step">2</span> Choose Control Tactics (Select {required})</h2>
          <div className={`tactic-grid ${warning ? 'anim-shake' : ''}`} key={warning}>
            {data.tactics.map((tactic) => {
              const meta = CATEGORY_META[tactic.category];
              const selected = tacticIds.includes(tactic.id);
              const isBest = phase === 'outcome' && data.bestTacticIds.includes(tactic.id);
              return (
                <button
                  key={tactic.id}
                  type="button"
                  className={`tactic-card tactic-card--${tactic.category} ${selected ? 'is-selected' : ''} ${isBest ? 'is-best' : ''}`}
                  onClick={() => toggleTactic(tactic.id)}
                  aria-pressed={selected}
                  disabled={isLocked}
                >
                  {selected && <span className="tactic-card__check"><Icon name="check" size={14} strokeWidth={3} /></span>}
                  <span className="tactic-card__icon"><Icon name={meta.icon} size={28} /></span>
                  <strong>{meta.label}</strong>
                  <span className="tactic-card__name">{tactic.name}</span>
                  <small>{tactic.description}</small>
                  <span className="tactic-card__stats">
                    <span><Icon name="coins" size={12} /> {tactic.resourceCost}%</span>
                    <span className={`impact impact--${tactic.environmentalImpact >= 30 ? 'high' : tactic.environmentalImpact >= 10 ? 'mid' : 'low'}`}>
                      {impactLabel(tactic.environmentalImpact)}
                    </span>
                  </span>
                  {isBest && <span className="tactic-card__best">Best choice</span>}
                </button>
              );
            })}
          </div>
          {warning && <p className="game-message game-message--warn"><Icon name="alert" size={16} /> {warning}</p>}
        </section>

        <section className="strategy-panel">
          <h2><span className="strategy-panel__step">3</span> Mission Goals</h2>
          <ul className="strategy-goals">
            {goals.map((goal, index) => (
              <li key={goal.label} className={goal.done ? 'is-done' : ''}>
                <span className="strategy-goals__icon"><Icon name={goal.icon} size={16} /></span>
                <span>{index + 1}. {goal.label}</span>
                <span className="strategy-goals__check">{goal.done && <Icon name="check" size={13} strokeWidth={3} />}</span>
              </li>
            ))}
          </ul>

          {phase === 'outcome' && outcome && (
            <div className={`strategy-outcome ${cropSaved ? 'is-success' : 'is-failure'} anim-pop`}>
              <strong>{cropSaved ? 'Crop saved!' : 'Crop still at risk'}</strong>
              <span>{outcome.breakdown.goals.diagnosed ? 'Diagnosis correct.' : 'Diagnosis incorrect.'} {outcome.breakdown.isBestCombination ? 'Best tactic combination.' : 'A more effective combination exists.'}</span>
              <span className="strategy-outcome__score">Strategy score: {outcome.score}%</span>
            </div>
          )}
        </section>
      </div>

      <div className="game-actions">
        {phase === 'outcome' ? (
          <Button size="lg" iconRight="chevron-right" className="next-level-btn is-ready" onClick={() => onComplete({ pestId, tacticIds })}>
            NEXT LEVEL
          </Button>
        ) : (
          <Button size="lg" icon="shield" onClick={deploy} disabled={!pestId || tacticIds.length !== required || isLocked} isLoading={phase === 'deploying'}>
            Deploy Strategy
          </Button>
        )}
      </div>
    </div>
  );
}
