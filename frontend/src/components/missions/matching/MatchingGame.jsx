/**
 * Module 3 — Matching game (Proposal Table 1, Fig 20).
 * Match the target pest to its classification, damage characteristics and
 * management tactic before the countdown ends.
 */
import { useState } from 'react';
import { useCountdown } from '../../../hooks/useCountdown.js';
import Button from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import PestIllustration, { hasPestIllustration } from '../../illustrations/PestIllustration.jsx';
import { CountdownTimer, HudChip } from '../MissionHud.jsx';

const OPTION_ICONS = {
  'damage-chewing': 'bug',
  'damage-sucking': 'droplet',
  'damage-boring': 'target',
  'damage-gnawing': 'mouse',
  'damage-mining': 'worm',
  'damage-rasping': 'layers',
  'tactic-trap': 'filter',
  'tactic-sticky': 'layers',
  'tactic-water': 'droplet',
  'tactic-spray': 'spray',
  'tactic-biological': 'bug',
  'tactic-cultural': 'sprout',
  'tactic-net': 'net',
  'tactic-barrier': 'shield',
  'tactic-owl': 'bird',
};

function OptionThumb({ imageKey }) {
  if (hasPestIllustration(imageKey)) return <PestIllustration imageKey={imageKey} size={40} />;
  return (
    <span className="match-option__icon">
      <Icon name={OPTION_ICONS[imageKey] ?? 'leaf'} size={20} />
    </span>
  );
}

export default function MatchingGame({ mission, module, totalLevels, onComplete }) {
  const data = mission.scenarioData;
  const [selections, setSelections] = useState({});
  const [finished, setFinished] = useState(null); // { timeRemaining, timedOut }

  const remaining = useCountdown(data.timeLimitSeconds, {
    isRunning: !finished,
    onExpire: () => setFinished({ timeRemaining: 0, timedOut: true }),
  });

  const correctCount = data.columns.filter((column) => selections[column.key] === column.correctOptionId).length;
  const allCorrect = correctCount === data.columns.length;
  const beatClock = Boolean(finished && !finished.timedOut && allCorrect);
  const objectivesDone = correctCount + (beatClock ? 1 : 0);

  const select = (column, optionId) => {
    if (finished || selections[column.key]) return;
    const next = { ...selections, [column.key]: optionId };
    setSelections(next);
    if (data.columns.every((c) => next[c.key])) setFinished({ timeRemaining: remaining, timedOut: false });
  };

  let banner = null;
  if (finished) {
    if (allCorrect && !finished.timedOut) banner = { tone: 'success', text: 'Great! Correct identification and choices. Keep protecting the crops!' };
    else if (finished.timedOut) banner = { tone: 'danger', text: `Time's up! You matched ${correctCount} of ${data.columns.length} correctly.` };
    else banner = { tone: 'warning', text: `You matched ${correctCount} of ${data.columns.length} correctly. Review the highlighted answers.` };
  }

  return (
    <div className="match-game">
      <header className="game-header">
        <div>
          <HudChip icon="layers"><strong>Mission {mission.levelNumber}:</strong> Level {mission.levelNumber} of {totalLevels}</HudChip>
          <h1>Module {module.moduleNumber}: {module.title}</h1>
          <p className="text-muted">Identify the pest and select the correct classification, damage type, and management tactic.</p>
        </div>
        <div className="game-header__chips">
          <CountdownTimer remaining={finished ? finished.timeRemaining : remaining} total={data.timeLimitSeconds} />
          <HudChip icon="target" tone={objectivesDone === 4 ? 'success' : 'default'}>Objectives: {objectivesDone}/4</HudChip>
        </div>
      </header>

      <div className="match-board">
        <section className="match-target">
          <div className="match-target__label"><Icon name="target" size={16} /> TARGET PEST</div>
          <div className={`match-target__image ${finished ? 'is-revealed' : ''}`}>
            <PestIllustration imageKey={data.target.imageKey} size={180} label="Target pest" />
            <span className="match-target__scope" aria-hidden="true" />
          </div>
          <div className="match-target__info">
            <span className="text-muted text-sm">Pest to identify</span>
            <h2>{finished ? data.target.commonName : 'What is this pest?'}</h2>
            {finished && <em className="text-muted">{data.target.scientificName}</em>}
            <p className="match-target__hint"><Icon name="info" size={14} /> Hint: {data.target.hint}</p>
          </div>
          <ol className="match-chain" aria-label="Your matches">
            {data.columns.map((column, index) => {
              const option = column.options.find((o) => o.id === selections[column.key]);
              const ok = selections[column.key] === column.correctOptionId;
              return (
                <li key={column.key} className={`match-chain__slot ${option ? (ok ? 'is-ok' : 'is-wrong') : ''}`}>
                  <span>{index + 1}</span>
                  {option ? option.label : '—'}
                </li>
              );
            })}
          </ol>
        </section>

        {data.columns.map((column, columnIndex) => {
          const selected = selections[column.key];
          return (
            <section key={column.key} className={`match-column anim-fade-up ${selected ? 'is-answered' : ''}`} style={{ '--i': columnIndex + 1 }}>
              <header className="match-column__header">
                <span className="match-column__number">{columnIndex + 1}</span>
                <h3>{column.title}</h3>
              </header>
              <div className="match-column__options">
                {column.options.map((option) => {
                  const isSelected = selected === option.id;
                  const isCorrect = option.id === column.correctOptionId;
                  const reveal = (selected || finished) && isCorrect && !isSelected;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`match-option ${isSelected ? (isCorrect ? 'is-correct' : 'is-wrong') : ''} ${reveal ? 'is-answer' : ''}`}
                      onClick={() => select(column, option.id)}
                      disabled={Boolean(selected) || Boolean(finished)}
                      aria-pressed={isSelected}
                    >
                      <OptionThumb imageKey={option.imageKey} />
                      <span className="match-option__text">
                        <strong>{option.label}</strong>
                        <small>{option.sublabel}</small>
                      </span>
                      {isSelected && (
                        <span className="match-option__status"><Icon name={isCorrect ? 'check' : 'x'} size={14} strokeWidth={3} /></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section className="other-pests">
        <h3>Other Pests You May Encounter</h3>
        <div className="other-pests__list">
          {data.otherPests.map((pest) => (
            <div key={pest.name} className="other-pests__item">
              <PestIllustration imageKey={pest.imageKey} size={48} />
              <div>
                <strong>{pest.name}</strong>
                <small>({pest.group})</small>
                <span>{pest.note}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="game-actions game-actions--split">
        {banner ? (
          <p className={`result-banner result-banner--${banner.tone}`} role="status">
            <Icon name={banner.tone === 'success' ? 'shield' : banner.tone === 'danger' ? 'timer' : 'alert'} size={22} />
            {banner.text}
          </p>
        ) : (
          <p className="text-muted text-sm">Pick one answer in each column. Choices lock once selected.</p>
        )}
        <Button
          size="lg"
          iconRight="chevron-right"
          className={`next-level-btn ${finished ? 'is-ready' : ''}`}
          disabled={!finished}
          onClick={() => onComplete({ selections, timeRemainingSeconds: finished.timeRemaining })}
        >
          NEXT LEVEL
        </Button>
      </div>
    </div>
  );
}
