import { TACTIC_CATEGORY_KEYS } from '../../../../utils/missionValidation.js';
import Button, { IconButton } from '../../../common/Button.jsx';
import { SelectInput, TextArea, TextInput } from '../../../common/Form.jsx';
import Icon from '../../../common/Icon.jsx';
import FarmScene from '../../../illustrations/FarmScene.jsx';
import PestIllustration from '../../../illustrations/PestIllustration.jsx';
import StrategyGame from '../../../missions/strategy/StrategyGame.jsx';
import { moveItem, nextId, removeItem } from '../draft.js';
import { FieldIssues, IllustrationPicker, ImageSelect, ItemControls, SliderField } from '../fields.jsx';
import { strategyInsights } from './scoringInsights.js';

const MAX_PESTS = 10;
const MAX_TACTICS = 12;
const MAX_CLUES = 12;

const newTactic = (id) => ({
  id,
  category: 'cultural',
  name: '',
  description: '',
  effectiveness: 50,
  resourceCost: 30,
  environmentalImpact: 5,
});

export default function StrategyEditor({ data, update, at }) {
  const tactics = data.tactics;
  const pests = data.pestOptions;
  const clues = Array.isArray(data.observations) ? data.observations : null;
  const best = Array.isArray(data.bestTacticIds) ? data.bestTacticIds : [];
  const goal = data.goals?.minEnvironmentalScore;
  const insight = strategyInsights(data);

  const toggleBest = (id) =>
    update('bestTacticIds', best.includes(id) ? best.filter((item) => item !== id) : [...best, id]);

  return (
    <div className="me-game">
      {/* ── Live check from the real scorer ── */}
      <section className="me-check" aria-live="polite" aria-label="Scoring check">
        {insight ? (
          <>
            <div className="me-check__stats">
              <span className={`me-summary__item ${insight.marked.score < 100 ? 'is-warning' : ''}`}>
                <Icon name="target" size={16} /> Marked best plan scores <strong>{insight.marked.score}%</strong>
                <span className="text-xs">(environment {insight.marked.environmentalScore}, grade {insight.marked.grade})</span>
              </span>
              <span className="me-summary__item">
                <Icon name="trophy" size={16} /> Best possible: <strong>{insight.best.score}%</strong>
                <span className="text-xs">across {insight.plans} plan{insight.plans === 1 ? '' : 's'}</span>
              </span>
            </div>
            {!insight.goalReachable && (
              <p className="me-alert is-error" role="alert">
                <Icon name="alert" size={16} /> Impossible setup: no set of {data.requiredTacticCount} tactics reaches the environmental
                goal of {goal}. The best any plan manages is {insight.bestEnvironmentalScore}.
              </p>
            )}
            {insight.goalReachable && !insight.marked.goalMet && (
              <p className="me-alert is-error" role="alert">
                <Icon name="alert" size={16} /> The tactics marked best miss the environmental goal
                ({insight.marked.environmentalScore} of {goal} needed), so even the right answer loses those points.
              </p>
            )}
            {insight.best.score > insight.marked.score && (
              <p className="me-alert is-warning">
                <Icon name="info" size={16} /> Another plan scores higher than the one marked best ({insight.best.score}% vs {insight.marked.score}%).
              </p>
            )}
          </>
        ) : (
          <p className="me-note">The scoring check appears once the tactics, best picks and goal below are complete.</p>
        )}
      </section>

      <section className="me-card" aria-label="Field situation">
        <header className="me-card__head"><span className="me-card__badge">Field situation</span></header>
        <div className="me-two">
          <IllustrationPicker
            label="Scene"
            value={data.sceneKey}
            keys={FarmScene.keys}
            render={(key) => <FarmScene sceneKey={key} />}
            onChange={(key) => update('sceneKey', key)}
            size={72}
          />
          <div className="stack">
            <TextInput label="Crop" value={data.crop ?? ''} onChange={(event) => update('crop', event.target.value)} error={at('crop').errors[0]} />
            <TextArea label="Guide's message" value={data.guideMessage ?? ''} onChange={(event) => update('guideMessage', event.target.value)} rows={2} error={at('guideMessage').errors[0]} />
          </div>
        </div>
        {clues && (
          <div className="stack">
            <span className="field__label">Field clues</span>
            <FieldIssues {...at('observations')} />
            <ol className="me-clues">
              {clues.map((clue, i) => (
                <li key={i} className="me-clue">
                  <span className="me-clue__n" aria-hidden="true">{i + 1}</span>
                  <TextInput
                    label={`Clue ${i + 1}`}
                    value={clue ?? ''}
                    onChange={(event) => update(`observations.${i}`, event.target.value)}
                    error={at(`observations.${i}`).errors[0]}
                  />
                  <ItemControls label={`clue ${i + 1}`} index={i} count={clues.length} onMove={(to) => update('observations', moveItem(clues, i, to))} onDelete={() => update('observations', removeItem(clues, i))} />
                </li>
              ))}
            </ol>
            <Button size="sm" variant="secondary" icon="plus" disabled={clues.length >= MAX_CLUES} onClick={() => update('observations', [...clues, ''])}>
              Add clue
            </Button>
          </div>
        )}
      </section>

      <section className="me-card" aria-label="Pest diagnosis">
        <header className="me-card__head">
          <span className="me-card__badge">Diagnosis</span>
          <span className="text-xs text-muted">Students pick the pest first.</span>
        </header>
        <FieldIssues {...at('pestOptions')} />
        <FieldIssues {...at('correctPestId')} />
        <ol className="me-pests" role="radiogroup" aria-label="Correct pest">
          {pests.map((pest, i) => {
            const isCorrect = pest.id === data.correctPestId;
            return (
              <li key={pest.id ?? i} className={`me-choice ${isCorrect ? 'is-correct' : 'is-decoy'}`}>
                <div className="me-choice__top">
                  <button type="button" role="radio" aria-checked={isCorrect} className="me-correct" onClick={() => update('correctPestId', pest.id)}>
                    <Icon name={isCorrect ? 'check' : 'x'} size={14} strokeWidth={2.6} /> {isCorrect ? 'Correct' : 'Decoy'}
                  </button>
                  <span className="me-item-controls">
                    <IconButton
                      icon="trash"
                      size="sm"
                      variant="danger"
                      label={isCorrect ? 'Mark another pest correct before removing this one' : `Remove ${pest.name || `pest ${i + 1}`}`}
                      disabled={isCorrect}
                      onClick={() => update('pestOptions', removeItem(pests, i))}
                    />
                  </span>
                </div>
                <ImageSelect
                  label="Picture"
                  value={pest.imageKey}
                  groups={[{ label: 'Pests', keys: PestIllustration.keys }]}
                  render={(key) => <PestIllustration imageKey={key} size={36} />}
                  onChange={(key) => update(`pestOptions.${i}.imageKey`, key)}
                />
                <TextInput label="Name" value={pest.name ?? ''} onChange={(event) => update(`pestOptions.${i}.name`, event.target.value)} error={at(`pestOptions.${i}.name`).errors[0]} />
                <TextInput label="Scientific name" value={pest.scientificName ?? ''} onChange={(event) => update(`pestOptions.${i}.scientificName`, event.target.value)} />
              </li>
            );
          })}
        </ol>
        <Button
          size="sm"
          variant="secondary"
          icon="plus"
          disabled={pests.length >= MAX_PESTS}
          onClick={() => update('pestOptions', [...pests, { id: nextId('p', pests), name: '', scientificName: '', imageKey: 'bug' }])}
        >
          Add pest
        </Button>
      </section>

      <section className="me-card" aria-label="Tactics">
        <header className="me-card__head">
          <span className="me-card__badge">Tactics</span>
          <span className={`me-count ${best.length !== data.requiredTacticCount ? 'is-short' : ''}`}>
            {best.length} of {data.requiredTacticCount} best marked
          </span>
        </header>

        <div className="me-two">
          <div className="me-stepper-field">
            <span className="field__label" id="required-tactics">Tactics students deploy</span>
            <div className="me-timer__stepper" role="group" aria-labelledby="required-tactics">
              <Button
                variant="secondary"
                size="sm"
                icon="minus"
                aria-label="One tactic fewer"
                disabled={!(data.requiredTacticCount > 1)}
                onClick={() => update('requiredTacticCount', data.requiredTacticCount - 1)}
              />
              <output className="me-stepper-field__value">{data.requiredTacticCount}</output>
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                aria-label="One tactic more"
                disabled={!(data.requiredTacticCount < tactics.length)}
                onClick={() => update('requiredTacticCount', data.requiredTacticCount + 1)}
              />
            </div>
            <FieldIssues {...at('requiredTacticCount')} />
          </div>
          <div>
            <SliderField
              label="Environmental goal (minimum score)"
              value={goal}
              onChange={(value) => update('goals.minEnvironmentalScore', value)}
              min={0}
              max={100}
              tone="green"
              hint="Plans scoring at least this keep the 30 environment points."
            />
            <FieldIssues {...at('goals.minEnvironmentalScore')} />
          </div>
        </div>
        <FieldIssues {...at('tactics')} />
        <FieldIssues {...at('bestTacticIds')} />

        <ol className="me-tactics">
          {tactics.map((tactic, i) => {
            const path = `tactics.${i}`;
            const meta = StrategyGame.categoryMeta[tactic.category];
            const isBest = best.includes(tactic.id);
            return (
              <li key={tactic.id ?? i} className={`me-tactic me-tactic--${tactic.category} ${isBest ? 'is-best' : ''}`}>
                <header className="me-tactic__head">
                  <span className="me-tactic__icon" aria-hidden="true"><Icon name={meta?.icon ?? 'help'} size={20} /></span>
                  <button
                    type="button"
                    className="me-correct"
                    aria-checked={isBest}
                    role="checkbox"
                    onClick={() => toggleBest(tactic.id)}
                  >
                    <Icon name={isBest ? 'star' : 'plus'} size={13} /> {isBest ? 'Best tactic' : 'Mark best'}
                  </button>
                  <ItemControls
                    label={tactic.name || `tactic ${i + 1}`}
                    index={i}
                    count={tactics.length}
                    onMove={(to) => update('tactics', moveItem(tactics, i, to))}
                    onDelete={() => {
                      update('tactics', removeItem(tactics, i));
                      if (isBest) update('bestTacticIds', best.filter((id) => id !== tactic.id));
                    }}
                    canDelete={tactics.length > 2}
                  />
                </header>
                <div className="me-option__grid">
                  <TextInput label="Name" value={tactic.name ?? ''} onChange={(event) => update(`${path}.name`, event.target.value)} error={at(`${path}.name`).errors[0]} />
                  <SelectInput
                    label="Category"
                    value={tactic.category ?? ''}
                    onChange={(event) => update(`${path}.category`, event.target.value)}
                    options={TACTIC_CATEGORY_KEYS.map((key) => ({ value: key, label: StrategyGame.categoryMeta[key]?.label ?? key }))}
                    error={at(`${path}.category`).errors[0]}
                  />
                </div>
                <TextArea label="Description" value={tactic.description ?? ''} onChange={(event) => update(`${path}.description`, event.target.value)} rows={2} />
                <div className="me-three">
                  <SliderField label="Effectiveness" value={tactic.effectiveness} onChange={(value) => update(`${path}.effectiveness`, value)} tone="green" />
                  <SliderField label="Environmental impact" value={tactic.environmentalImpact} onChange={(value) => update(`${path}.environmentalImpact`, value)} tone="red" hint="Subtracted from 100 for the plan's environment score." />
                  <SliderField label="Resource cost" value={tactic.resourceCost} onChange={(value) => update(`${path}.resourceCost`, value)} tone="blue" suffix="%" />
                </div>
                <FieldIssues {...at(`${path}.effectiveness`)} />
                <FieldIssues {...at(`${path}.environmentalImpact`)} />
                <FieldIssues {...at(`${path}.resourceCost`)} />
              </li>
            );
          })}
        </ol>
        <p className="me-note"><Icon name="info" size={14} /> Tactics are not tied to a particular pest in this game: every tactic is offered once the pest is diagnosed.</p>
        <Button size="sm" variant="secondary" icon="plus" disabled={tactics.length >= MAX_TACTICS} onClick={() => update('tactics', [...tactics, newTactic(nextId('t', tactics))])}>
          Add tactic
        </Button>
      </section>

      <TextArea label="Explanation (shown after the plan)" value={data.explanation ?? ''} onChange={(event) => update('explanation', event.target.value)} rows={2} error={at('explanation').errors[0]} />
    </div>
  );
}
