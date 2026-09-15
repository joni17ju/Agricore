/**
 * Module 1 — Decision-Making game (Proposal Table 1, Fig 18).
 * The guide character presents a farm crisis; the student taps one of three
 * decision cards and sees its outcome before moving to the next scenario.
 */
import { useState } from 'react';
import Button from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import FarmScene from '../../illustrations/FarmScene.jsx';
import GuideCharacter from '../../illustrations/GuideCharacter.jsx';
import { HudChip } from '../MissionHud.jsx';

function outcomeTone(choice, scenario) {
  const best = Math.max(...scenario.choices.map((c) => c.points));
  if (choice.points === best) return 'best';
  return choice.points > 0 ? 'partial' : 'poor';
}

const TREND_BARS = { up: [30, 45, 60, 80, 100], down: [100, 80, 60, 45, 30], flat: [60, 62, 58, 61, 60] };

function DataVisual({ visual }) {
  const bars = TREND_BARS[visual.trend] ?? TREND_BARS.flat;
  return (
    <div className="decision-visual">
      <span className="decision-visual__value">{visual.value}</span>
      <Icon name="arrow-right" size={22} className="decision-visual__arrow" />
      <div className="decision-visual__chart">
        <div className="decision-visual__bars">
          {bars.map((height, index) => (
            <span key={index} style={{ height: `${height}%`, animationDelay: `${300 + index * 90}ms` }} className={`is-${visual.trend}`} />
          ))}
        </div>
        <strong>{visual.label}</strong>
      </div>
    </div>
  );
}

export default function DecisionGame({ mission, module, onComplete }) {
  const { scenarios, title } = mission.scenarioData;
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState({});
  const scenario = scenarios[index];
  const chosenId = choices[scenario.id];
  const chosen = scenario.choices.find((choice) => choice.id === chosenId);
  const tone = chosen ? outcomeTone(chosen, scenario) : null;
  const isLast = index === scenarios.length - 1;

  const choose = (choiceId) => {
    if (chosenId) return;
    setChoices((previous) => ({ ...previous, [scenario.id]: choiceId }));
  };

  const advance = () => {
    if (isLast) onComplete({ choices });
    else setIndex((value) => value + 1);
  };

  return (
    <div className="decision-game">
      <section key={scenario.id} className="decision-stage">
        <FarmScene sceneKey={scenario.sceneKey} className={tone === 'poor' ? 'is-stressed' : ''} />
        <div className="decision-stage__progress" aria-label={`Scenario ${index + 1} of ${scenarios.length}`}>
          {scenarios.map((item, i) => (
            <span key={item.id} className={`${i < index ? 'is-done' : ''} ${i === index ? 'is-current' : ''}`} />
          ))}
          <strong>{index + 1}/{scenarios.length}</strong>
        </div>
        <div className="decision-stage__guide">
          <GuideCharacter mood={tone === 'best' ? 'happy' : tone === 'poor' ? 'worried' : 'neutral'} size={130} />
          <div className="speech-bubble">
            <strong>Module {module.moduleNumber}, Scenario {index + 1}:</strong> {scenario.prompt}
          </div>
        </div>
        <DataVisual visual={scenario.dataVisual} />
      </section>

      <section className="decision-panel">
        <div className="decision-panel__header">
          <span className="decision-panel__title">Lesson {mission.levelNumber}: {title}</span>
          <HudChip icon="target">Choose one decision</HudChip>
        </div>

        <div className="decision-cards" role="radiogroup" aria-label="Decision cards">
          {scenario.choices.map((choice, i) => {
            const isChosen = choice.id === chosenId;
            const cardTone = chosenId ? outcomeTone(choice, scenario) : '';
            return (
              <button
                key={`${scenario.id}-${choice.id}`}
                type="button"
                role="radio"
                aria-checked={isChosen}
                className={`decision-card anim-fade-up ${chosenId ? `is-revealed tone-${cardTone}` : ''} ${isChosen ? 'is-chosen' : ''}`}
                style={{ '--i': i }}
                onClick={() => choose(choice.id)}
                disabled={Boolean(chosenId) && !isChosen}
              >
                <div className="decision-card__inner">
                  <div className="decision-card__face decision-card__front">
                    <span className="decision-card__number">{i + 1}</span>
                    <span className="decision-card__icon"><Icon name={choice.icon} size={30} /></span>
                    <strong>{choice.title}</strong>
                    <span>{choice.description}</span>
                  </div>
                  <div className="decision-card__face decision-card__back">
                    <span className="decision-card__verdict">
                      <Icon name={cardTone === 'best' ? 'check-circle' : cardTone === 'partial' ? 'alert' : 'x-circle'} size={20} />
                      {cardTone === 'best' ? 'Best decision' : cardTone === 'partial' ? 'Partly effective' : 'Poor outcome'}
                    </span>
                    <strong>{choice.title}</strong>
                    <span>{choice.outcome}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {chosen && (
          <div className={`decision-feedback tone-${tone}`} role="status">
            <Icon name={tone === 'best' ? 'sparkles' : 'info'} size={20} />
            <p>{scenario.explanation}</p>
            <Button iconRight={isLast ? 'check' : 'arrow-right'} onClick={advance}>
              {isLast ? 'Finish Mission' : 'Next Scenario'}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
