import { useId } from 'react';
import { xpForScore } from '../../../../utils/gamification.js';
import { DATA_TRENDS, MIN_DECISION_CHOICES } from '../../../../utils/missionValidation.js';
import { scoreMission } from '../../../../utils/scoring.js';
import Button from '../../../common/Button.jsx';
import { SelectInput, TextArea, TextInput } from '../../../common/Form.jsx';
import Icon from '../../../common/Icon.jsx';
import FarmScene from '../../../illustrations/FarmScene.jsx';
import { cloneData, moveItem, nextId, removeItem } from '../draft.js';
import { FieldIssues, IllustrationPicker, ItemControls, SliderField } from '../fields.jsx';

const MAX_SCENARIOS = 12;
const MAX_CHOICES = 6;
const TREND_LABELS = { up: 'Rising', down: 'Falling', flat: 'Steady' };
/** The middle chip: partial credit for a reasonable-but-not-best choice. */
const PARTIAL = 50;

const newChoice = (id, points = 0) => ({ id, icon: 'leaf', title: '', description: '', outcome: '', points });

/** Key order matches the seeded scenarios, so new ones look like the rest. */
const newScenario = (id) => ({
  id,
  sceneKey: 'farm-cornfield',
  prompt: '',
  dataVisual: { value: '', label: '', trend: 'up' },
  choices: [newChoice('c1', 100), newChoice('c2', 0), newChoice('c3', 0)],
  explanation: '',
});

/** The best possible score, worked out by the real scorer on the best answers. */
function bestPossible(data) {
  try {
    const choices = Object.fromEntries(
      data.scenarios.map((scenario) => {
        const best = [...scenario.choices].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];
        return [scenario.id, best?.id];
      }),
    );
    return scoreMission({ gameType: 'decision-making', scenarioData: data, answers: { choices } }).score;
  } catch {
    return null;
  }
}

export default function DecisionEditor({ data, update, at, maxXP }) {
  const scenarios = data.scenarios;
  const best = bestPossible(data);
  const listIssues = at('scenarios');

  const setScenarios = (next) => update('scenarios', next);

  return (
    <div className="me-game">
      <div className="me-summary" aria-live="polite">
        <span className="me-summary__item">
          <Icon name="target" size={16} /> {scenarios.length} scenario{scenarios.length === 1 ? '' : 's'}
        </span>
        <span className={`me-summary__item ${best !== null && best < 100 ? 'is-warning' : ''}`}>
          <Icon name="trophy" size={16} /> Maximum possible score: <strong>{best ?? '—'}%</strong>
          {best !== null && Number.isFinite(maxXP) && <> · {xpForScore(maxXP, best)} XP</>}
        </span>
      </div>
      <FieldIssues {...listIssues} />

      <ol className="me-cards">
        {scenarios.map((scenario, s) => (
          <ScenarioCard
            key={scenario.id ?? s}
            scenario={scenario}
            index={s}
            count={scenarios.length}
            at={at}
            update={update}
            onMove={(to) => setScenarios(moveItem(scenarios, s, to))}
            onDuplicate={() => {
              if (scenarios.length >= MAX_SCENARIOS) return;
              const copy = { ...cloneData(scenario), id: nextId('s', scenarios) };
              setScenarios([...scenarios.slice(0, s + 1), copy, ...scenarios.slice(s + 1)]);
            }}
            onDelete={() => setScenarios(removeItem(scenarios, s))}
          />
        ))}
      </ol>

      <Button
        variant="soft"
        icon="plus"
        onClick={() => setScenarios([...scenarios, newScenario(nextId('s', scenarios))])}
        disabled={scenarios.length >= MAX_SCENARIOS}
      >
        Add scenario
      </Button>
    </div>
  );
}

function ScenarioCard({ scenario, index, count, at, update, onMove, onDuplicate, onDelete }) {
  const base = `scenarios.${index}`;
  const choices = scenario.choices;
  const top = Math.max(...choices.map((choice) => (Number.isFinite(choice.points) ? choice.points : 0)));
  const set = (path, value) => update(`${base}.${path}`, value);
  const setChoices = (next) => update(`${base}.choices`, next);
  const visual = scenario.dataVisual;

  return (
    <li className="me-card">
      <header className="me-card__head">
        <span className="me-card__badge">Scenario {index + 1}</span>
        <ItemControls
          label={`scenario ${index + 1}`}
          index={index}
          count={count}
          onMove={onMove}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          canDelete={count > 1}
        />
      </header>

      <TextArea
        label="The situation"
        value={scenario.prompt ?? ''}
        onChange={(event) => set('prompt', event.target.value)}
        rows={3}
        error={at(`${base}.prompt`).errors[0]}
        placeholder="Describe the farm problem students must decide on."
      />

      <div className="me-two">
        <IllustrationPicker
          label="Scene"
          value={scenario.sceneKey}
          keys={FarmScene.keys}
          render={(key) => <FarmScene sceneKey={key} />}
          onChange={(key) => set('sceneKey', key)}
          size={72}
        />
        {visual && typeof visual === 'object' ? (
          <fieldset className="me-fieldset">
            <legend className="field__label">Data card</legend>
            <div className="me-three">
              <TextInput
                label="Figure"
                value={visual.value ?? ''}
                onChange={(event) => set('dataVisual.value', event.target.value)}
                placeholder="8.1B"
                error={at(`${base}.dataVisual.value`).errors[0]}
              />
              <TextInput
                label="What it measures"
                value={visual.label ?? ''}
                onChange={(event) => set('dataVisual.label', event.target.value)}
                placeholder="Food demand"
                error={at(`${base}.dataVisual.label`).errors[0]}
              />
              <SelectInput
                label="Trend"
                value={visual.trend ?? ''}
                onChange={(event) => set('dataVisual.trend', event.target.value)}
                options={DATA_TRENDS.map((trend) => ({ value: trend, label: TREND_LABELS[trend] }))}
                error={at(`${base}.dataVisual.trend`).errors[0]}
              />
            </div>
          </fieldset>
        ) : (
          <div>
            <FieldIssues {...at(`${base}.dataVisual`)} />
            <Button size="sm" variant="secondary" icon="chart" onClick={() => set('dataVisual', { value: '', label: '', trend: 'up' })}>
              Add data card
            </Button>
          </div>
        )}
      </div>

      <div className="me-subhead">
        <span className="field__label">Options</span>
        <span className="text-xs text-muted">The highest-scoring option is the best answer.</span>
      </div>
      <FieldIssues {...at(`${base}.choices`)} />
      <ol className="me-options">
        {choices.map((choice, i) => (
          <ChoiceCard
            key={choice.id ?? i}
            choice={choice}
            index={i}
            count={choices.length}
            isBest={Number.isFinite(choice.points) && choice.points === top}
            path={`${base}.choices.${i}`}
            at={at}
            update={update}
            onMove={(to) => setChoices(moveItem(choices, i, to))}
            onDuplicate={() => {
              if (choices.length >= MAX_CHOICES) return;
              const copy = { ...cloneData(choice), id: nextId('c', choices) };
              setChoices([...choices.slice(0, i + 1), copy, ...choices.slice(i + 1)]);
            }}
            onDelete={() => setChoices(removeItem(choices, i))}
          />
        ))}
      </ol>
      <Button
        size="sm"
        variant="secondary"
        icon="plus"
        onClick={() => setChoices([...choices, newChoice(nextId('c', choices))])}
        disabled={choices.length >= MAX_CHOICES}
      >
        Add option
      </Button>

      <TextArea
        label="Explanation (shown after answering)"
        value={scenario.explanation ?? ''}
        onChange={(event) => set('explanation', event.target.value)}
        rows={2}
        error={at(`${base}.explanation`).errors[0]}
      />
    </li>
  );
}

function ChoiceCard({ choice, index, count, isBest, path, at, update, onMove, onDuplicate, onDelete }) {
  const id = useId();
  const set = (key, value) => update(`${path}.${key}`, value);
  const points = Number.isFinite(choice.points) ? choice.points : 0;
  return (
    <li className={`me-option ${isBest ? 'is-best' : ''}`}>
      <header className="me-option__head">
        <span className="me-option__icon" aria-hidden="true"><Icon name={choice.icon || 'help'} size={22} /></span>
        <span className="me-option__number">Option {index + 1}</span>
        {isBest && (
          <span className="me-best" title="Highest-scoring option">
            <Icon name="star" size={13} /> Best answer
          </span>
        )}
        <ItemControls
          label={`option ${index + 1}`}
          index={index}
          count={count}
          onMove={onMove}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          canDelete={count > MIN_DECISION_CHOICES}
        />
      </header>
      <div className="me-option__grid">
        <TextInput
          label="Card title"
          value={choice.title ?? ''}
          onChange={(event) => set('title', event.target.value)}
          error={at(`${path}.title`).errors[0]}
        />
        <label className="field">
          <span className="field__label" id={`${id}-icon`}>Icon</span>
          <span className="me-icon-select">
            <Icon name={choice.icon || 'help'} size={18} />
            <select
              className="input select__control"
              value={choice.icon ?? ''}
              onChange={(event) => set('icon', event.target.value)}
              aria-labelledby={`${id}-icon`}
            >
              {!Icon.keys.includes(choice.icon) && choice.icon && <option value={choice.icon}>{choice.icon}</option>}
              {Icon.keys.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </span>
        </label>
      </div>
      <TextArea
        label="Description"
        value={choice.description ?? ''}
        onChange={(event) => set('description', event.target.value)}
        rows={2}
        error={at(`${path}.description`).errors[0]}
      />
      <TextInput
        label="Feedback after choosing"
        value={choice.outcome ?? ''}
        onChange={(event) => set('outcome', event.target.value)}
        error={at(`${path}.outcome`).errors[0]}
      />
      <div className="me-points">
        <SliderField
          label="Points"
          value={points}
          onChange={(value) => set('points', value)}
          min={0}
          max={100}
          step={5}
          tone={points === 100 ? 'green' : points > 0 ? 'amber' : 'red'}
          describe={(value) => `${value} points out of 100`}
        />
        <div className="me-chips" role="group" aria-label={`Points for option ${index + 1}`}>
          {[
            [0, 'None'],
            [PARTIAL, 'Partial'],
            [100, 'Full'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`me-chip me-chip--sm ${points === value ? 'is-selected' : ''}`}
              aria-pressed={points === value}
              onClick={() => set('points', value)}
            >
              {label} <span className="me-chip__sub">{value}</span>
            </button>
          ))}
        </div>
        <FieldIssues {...at(`${path}.points`)} />
      </div>
    </li>
  );
}
