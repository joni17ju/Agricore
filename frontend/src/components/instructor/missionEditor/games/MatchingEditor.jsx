import { MIN_MATCHING_DECOYS } from '../../../../utils/missionValidation.js';
import Button, { IconButton } from '../../../common/Button.jsx';
import { TextArea, TextInput } from '../../../common/Form.jsx';
import Icon from '../../../common/Icon.jsx';
import PestIllustration, { hasPestIllustration } from '../../../illustrations/PestIllustration.jsx';
import MatchingGame from '../../../missions/matching/MatchingGame.jsx';
import { moveItem, nextId, removeItem } from '../draft.js';
import { FieldIssues, IllustrationPicker, ImageSelect } from '../fields.jsx';

const MAX_OPTIONS = 10;
const MAX_LOOKALIKES = 12;
const COLUMN_NAMES = { classification: 'Classification', damage: 'Damage', tactic: 'Management' };

/** What each option key looks like in the game: a pest drawing, else its icon. */
function OptionPicture({ imageKey, size = 36 }) {
  if (hasPestIllustration(imageKey)) return <PestIllustration imageKey={imageKey} size={size} />;
  return <Icon name={MatchingGame.optionIcons[imageKey] ?? 'leaf'} size={Math.round(size * 0.55)} />;
}
const OPTION_GROUPS = [
  { label: 'Pests', keys: PestIllustration.keys },
  { label: 'Damage and tactic icons', keys: Object.keys(MatchingGame.optionIcons) },
];

/** The id prefix a column already uses ("o", "d", "t"…), so new ids match. */
const prefixOf = (options) => /^([a-z]+)\d+$/i.exec(options[0]?.id ?? '')?.[1] ?? 'o';

export default function MatchingEditor({ data, update, at }) {
  const target = data.target ?? {};
  const lookalikes = Array.isArray(data.otherPests) ? data.otherPests : null;

  return (
    <div className="me-game">
      <section className="me-card" aria-label="Target pest">
        <header className="me-card__head"><span className="me-card__badge">Target pest</span></header>
        <div className="me-two">
          <IllustrationPicker
            label="Picture"
            value={target.imageKey}
            keys={PestIllustration.keys}
            render={(key) => <PestIllustration imageKey={key} size={56} />}
            onChange={(key) => update('target.imageKey', key)}
            size={56}
          />
          <div className="stack">
            <TextInput label="Common name" value={target.commonName ?? ''} onChange={(event) => update('target.commonName', event.target.value)} error={at('target.commonName').errors[0]} />
            <TextInput label="Scientific name" value={target.scientificName ?? ''} onChange={(event) => update('target.scientificName', event.target.value)} error={at('target.scientificName').errors[0]} />
          </div>
        </div>
        <TextInput label="Field hint" value={target.hint ?? ''} onChange={(event) => update('target.hint', event.target.value)} error={at('target.hint').errors[0]} />
      </section>

      <FieldIssues {...at('columns')} />
      <div className="me-columns">
        {data.columns.map((column, c) => (
          <ColumnCard key={column.key ?? c} column={column} index={c} update={update} at={at} />
        ))}
      </div>

      {lookalikes && (
        <section className="me-card" aria-label="Look-alike pests">
          <header className="me-card__head">
            <span className="me-card__badge">Look-alike pests</span>
            <span className="text-xs text-muted">Shown beside the board to compare against.</span>
          </header>
          <FieldIssues {...at('otherPests')} />
          <ol className="me-rows">
            {lookalikes.map((pest, i) => (
              <li key={i} className="me-row">
                <ImageSelect
                  label="Picture"
                  value={pest.imageKey}
                  groups={[{ label: 'Pests', keys: PestIllustration.keys }]}
                  render={(key) => <PestIllustration imageKey={key} size={36} />}
                  onChange={(key) => update(`otherPests.${i}.imageKey`, key)}
                />
                <TextInput label="Name" value={pest.name ?? ''} onChange={(event) => update(`otherPests.${i}.name`, event.target.value)} error={at(`otherPests.${i}.name`).errors[0]} />
                <TextInput label="Group" value={pest.group ?? ''} onChange={(event) => update(`otherPests.${i}.group`, event.target.value)} />
                <TextInput label="Note" value={pest.note ?? ''} onChange={(event) => update(`otherPests.${i}.note`, event.target.value)} />
                <IconButton icon="trash" label={`Remove look-alike ${i + 1}`} size="sm" variant="danger" onClick={() => update('otherPests', removeItem(lookalikes, i))} />
              </li>
            ))}
          </ol>
          <Button
            size="sm"
            variant="secondary"
            icon="plus"
            disabled={lookalikes.length >= MAX_LOOKALIKES}
            onClick={() => update('otherPests', [...lookalikes, { name: '', group: '', note: '', imageKey: 'bug' }])}
          >
            Add look-alike
          </Button>
        </section>
      )}

      <TextArea label="Explanation (shown after the round)" value={data.explanation ?? ''} onChange={(event) => update('explanation', event.target.value)} rows={2} error={at('explanation').errors[0]} />
    </div>
  );
}

function ColumnCard({ column, index, update, at }) {
  const base = `columns.${index}`;
  const options = column.options;
  const decoys = Math.max(0, options.length - 1);
  const setOptions = (next) => update(`${base}.options`, next);
  const listIssues = at(`${base}.options`);
  const correctIssues = at(`${base}.correctOptionId`);

  const shuffle = () => {
    const copy = [...options];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setOptions(copy);
  };

  return (
    <section className="me-card me-column" aria-labelledby={`${base}-name`}>
      <header className="me-card__head">
        <span className="me-card__badge" id={`${base}-name`}>{COLUMN_NAMES[column.key] ?? column.key}</span>
        <span className={`me-count ${decoys < MIN_MATCHING_DECOYS ? 'is-short' : ''}`}>
          1 correct + {decoys} decoy{decoys === 1 ? '' : 's'}
        </span>
      </header>
      <TextInput label="Column heading" value={column.title ?? ''} onChange={(event) => update(`${base}.title`, event.target.value)} error={at(`${base}.title`).errors[0]} />
      <FieldIssues {...listIssues} />
      <FieldIssues {...correctIssues} />
      <ol className="me-choices" role="radiogroup" aria-label={`Correct answer for ${COLUMN_NAMES[column.key] ?? column.key}`}>
        {options.map((option, i) => {
          const isCorrect = option.id === column.correctOptionId;
          return (
            <li key={option.id ?? i} className={`me-choice ${isCorrect ? 'is-correct' : 'is-decoy'}`}>
              <div className="me-choice__top">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isCorrect}
                  className="me-correct"
                  onClick={() => update(`${base}.correctOptionId`, option.id)}
                >
                  <Icon name={isCorrect ? 'check' : 'x'} size={14} strokeWidth={2.6} />
                  {isCorrect ? 'Correct' : 'Decoy'}
                </button>
                <span className="me-choice__thumb" aria-hidden="true"><OptionPicture imageKey={option.imageKey} /></span>
                <span className="me-item-controls">
                  <IconButton icon="chevron-up" label={`Move ${option.label || `choice ${i + 1}`} up`} size="sm" disabled={i === 0} onClick={() => setOptions(moveItem(options, i, i - 1))} />
                  <IconButton icon="chevron-down" label={`Move ${option.label || `choice ${i + 1}`} down`} size="sm" disabled={i === options.length - 1} onClick={() => setOptions(moveItem(options, i, i + 1))} />
                  <IconButton
                    icon="trash"
                    label={isCorrect ? 'Mark another choice correct before removing this one' : `Remove ${option.label || `choice ${i + 1}`}`}
                    size="sm"
                    variant="danger"
                    disabled={isCorrect}
                    onClick={() => setOptions(removeItem(options, i))}
                  />
                </span>
              </div>
              <TextInput label="Label" value={option.label ?? ''} onChange={(event) => update(`${base}.options.${i}.label`, event.target.value)} error={at(`${base}.options.${i}.label`).errors[0]} />
              <TextInput label="Note" value={option.sublabel ?? ''} onChange={(event) => update(`${base}.options.${i}.sublabel`, event.target.value)} />
              <ImageSelect
                label="Picture"
                value={option.imageKey}
                groups={OPTION_GROUPS}
                render={(key) => <OptionPicture imageKey={key} />}
                onChange={(key) => update(`${base}.options.${i}.imageKey`, key)}
              />
            </li>
          );
        })}
      </ol>
      <div className="row">
        <Button
          size="sm"
          variant="secondary"
          icon="plus"
          disabled={options.length >= MAX_OPTIONS}
          onClick={() => setOptions([...options, { id: nextId(prefixOf(options), options), label: '', sublabel: '', imageKey: 'bug' }])}
        >
          Add decoy
        </Button>
        <Button size="sm" variant="ghost" icon="refresh" onClick={shuffle} disabled={options.length < 2}>
          Shuffle order
        </Button>
      </div>
    </section>
  );
}
