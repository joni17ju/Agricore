import { useRef, useState } from 'react';
import { IDENTIFICATION_ZOOM_LEVELS } from '../../../../utils/missionValidation.js';
import Button, { IconButton } from '../../../common/Button.jsx';
import { SelectInput, TextArea, TextInput } from '../../../common/Form.jsx';
import Icon from '../../../common/Icon.jsx';
import LeafSpecimen from '../../../illustrations/LeafSpecimen.jsx';
import { nextId, removeItem } from '../draft.js';
import { FieldIssues, IllustrationPicker, SliderField } from '../fields.jsx';
import { identificationPenalties } from './scoringInsights.js';
import { clamp, nudge, stagePercent } from './stage.js';

const RADIUS = { min: 2, max: 30, start: 7 };
const MAX_SPOTS = 20;
const MAX_PATHOGENS = 10;
const GROUPS = ['fungus', 'bacterium', 'virus', 'oomycete', 'nematode', 'abiotic', 'concept'];

export default function IdentificationEditor({ data, update, at }) {
  const spots = data.symptomSpots;
  const pathogens = data.pathogenOptions;
  const stageRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const drag = useRef(null); // { index, mode: 'move' | 'size' }
  const penalties = identificationPenalties(data);

  const setSpot = (index, patch) => update(`symptomSpots.${index}`, (spot) => ({ ...spot, ...patch }));
  const addSpot = (x, y) => {
    if (spots.length >= MAX_SPOTS) return;
    update('symptomSpots', [...spots, { id: nextId('sp', spots), x, y, radius: RADIUS.start, description: '' }]);
    setSelected(spots.length);
  };
  const removeSpot = (index) => {
    update('symptomSpots', removeItem(spots, index));
    setSelected(null);
  };

  // A click on bare stage places a spot there (a tap on touch screens).
  const onStageClick = (event) => {
    if (event.target !== event.currentTarget) return;
    const { x, y } = stagePercent(stageRef.current, event);
    addSpot(x, y);
  };

  const startDrag = (event, index, mode) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { index, mode };
    setSelected(index);
  };
  const onDrag = (event) => {
    if (!drag.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = stagePercent(stageRef.current, event);
    const { index, mode } = drag.current;
    if (mode === 'move') setSpot(index, { x: point.x, y: point.y });
    // The handle sits on the ellipse's right edge, where the distance from the
    // centre in width-percent is exactly the radius the scorer uses.
    else setSpot(index, { radius: clamp(Math.round(Math.abs(point.exactX - spots[index].x)), RADIUS.min, RADIUS.max) });
  };
  const endDrag = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };

  const onPinKey = (event, index) => {
    const spot = spots[index];
    const moved = nudge(event, spot);
    if (moved) {
      event.preventDefault();
      setSpot(index, moved);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setSpot(index, { radius: clamp(spot.radius + 1, RADIUS.min, RADIUS.max) });
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      setSpot(index, { radius: clamp(spot.radius - 1, RADIUS.min, RADIUS.max) });
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeSpot(index);
    }
  };

  return (
    <div className="me-game">
      <section className="me-card" aria-label="Specimen">
        <header className="me-card__head"><span className="me-card__badge">Specimen</span></header>
        <div className="me-two">
          <IllustrationPicker
            label="Leaf specimen"
            value={data.specimenKey}
            keys={LeafSpecimen.keys}
            render={(key) => <LeafSpecimen specimenKey={key} spots={[]} />}
            onChange={(key) => update('specimenKey', key)}
            size={80}
            hint="The game draws symptoms on this specimen exactly where you place the spots below."
          />
          <div className="stack">
            <TextInput label="Host plant" value={data.host ?? ''} onChange={(event) => update('host', event.target.value)} error={at('host').errors[0]} />
            <div className="field">
              <span className="field__label" id="zoom-label">Zoom needed before marking</span>
              <div className="me-chips" role="radiogroup" aria-labelledby="zoom-label">
                {IDENTIFICATION_ZOOM_LEVELS.map((zoom) => (
                  <button
                    key={zoom}
                    type="button"
                    role="radio"
                    aria-checked={data.minZoomToMark === zoom}
                    className={`me-chip ${data.minZoomToMark === zoom ? 'is-selected' : ''}`}
                    onClick={() => update('minZoomToMark', zoom)}
                  >
                    {zoom}x
                  </button>
                ))}
              </div>
              <FieldIssues {...at('minZoomToMark')} />
            </div>
          </div>
        </div>
      </section>

      <section className="me-card" aria-label="Symptom spots">
        <header className="me-card__head">
          <span className="me-card__badge">Symptom spots</span>
          <span className="text-xs text-muted">Click the leaf to add a spot. Drag a spot to move it, drag its edge handle to resize.</span>
        </header>
        <FieldIssues {...at('symptomSpots')} />
        <div className="me-placement">
          <div className="me-stage me-stage--4x3" ref={stageRef}>
            <LeafSpecimen specimenKey={data.specimenKey} spots={spots} className="me-stage__art" />
            {/* The overlay matches the game's viewport: same box, same percentages. */}
            <div className="me-stage__overlay" onClick={onStageClick} role="presentation">
              {spots.map((spot, i) => (
                <div
                  key={spot.id ?? i}
                  className={`me-spot ${selected === i ? 'is-selected' : ''}`}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.radius * 2}%`, height: `${spot.radius * 2}%` }}
                >
                  <button
                    type="button"
                    className="me-spot__pin"
                    aria-label={`Spot ${i + 1} at ${spot.x}% across, ${spot.y}% down, size ${spot.radius}. Arrow keys move it, plus and minus resize, Delete removes.`}
                    onPointerDown={(event) => startDrag(event, i, 'move')}
                    onPointerMove={onDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onFocus={() => setSelected(i)}
                    onKeyDown={(event) => onPinKey(event, i)}
                  >
                    {i + 1}
                  </button>
                  <span
                    className="me-spot__handle"
                    aria-hidden="true"
                    onPointerDown={(event) => startDrag(event, i, 'size')}
                    onPointerMove={onDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  />
                </div>
              ))}
            </div>
          </div>

          <ol className="me-spot-list">
            {spots.map((spot, i) => (
              <li key={spot.id ?? i} className={`me-spot-item ${selected === i ? 'is-selected' : ''}`}>
                <div className="me-spot-item__head">
                  <span className="me-spot-item__n" aria-hidden="true">{i + 1}</span>
                  <span className="text-xs text-muted">{spot.x}% across · {spot.y}% down</span>
                  <IconButton icon="trash" label={`Delete spot ${i + 1}`} size="sm" variant="danger" onClick={() => removeSpot(i)} />
                </div>
                <TextInput
                  label={`Spot ${i + 1} description`}
                  value={spot.description ?? ''}
                  onChange={(event) => setSpot(i, { description: event.target.value })}
                  error={at(`symptomSpots.${i}.description`).errors[0]}
                />
                <SliderField
                  label="Size"
                  value={spot.radius}
                  onChange={(value) => setSpot(i, { radius: value })}
                  min={RADIUS.min}
                  max={RADIUS.max}
                  describe={(value) => `radius ${value}`}
                />
                <FieldIssues {...at(`symptomSpots.${i}.x`)} />
                <FieldIssues {...at(`symptomSpots.${i}.y`)} />
              </li>
            ))}
            <li>
              <Button size="sm" variant="secondary" icon="plus" disabled={spots.length >= MAX_SPOTS} onClick={() => addSpot(50, 50)}>
                Add a spot in the centre
              </Button>
            </li>
          </ol>
        </div>
      </section>

      <section className="me-card" aria-label="Pathogen">
        <header className="me-card__head"><span className="me-card__badge">Pathogen</span></header>
        <SelectInput
          label="Correct pathogen"
          value={data.correctPathogenId ?? ''}
          onChange={(event) => update('correctPathogenId', event.target.value)}
          options={pathogens.map((option) => ({ value: option.id, label: option.commonName || `(unnamed ${option.id})` }))}
          placeholder={pathogens.some((option) => option.id === data.correctPathogenId) ? undefined : 'Choose the correct pathogen'}
          error={at('correctPathogenId').errors[0]}
        />
        <FieldIssues {...at('pathogenOptions')} />
        <ol className="me-pests">
          {pathogens.map((option, i) => {
            const isCorrect = option.id === data.correctPathogenId;
            return (
              <li key={option.id ?? i} className={`me-choice ${isCorrect ? 'is-correct' : 'is-decoy'}`}>
                <div className="me-choice__top">
                  <span className={`me-tag ${isCorrect ? 'is-correct' : ''}`}>
                    <Icon name={isCorrect ? 'check' : 'x'} size={13} strokeWidth={2.6} /> {isCorrect ? 'Correct' : 'Wrong choice'}
                  </span>
                  <span className="me-item-controls">
                    <IconButton
                      icon="trash"
                      size="sm"
                      variant="danger"
                      label={isCorrect ? 'Pick another correct pathogen before removing this one' : `Remove ${option.commonName || `pathogen ${i + 1}`}`}
                      disabled={isCorrect}
                      onClick={() => update('pathogenOptions', removeItem(pathogens, i))}
                    />
                  </span>
                </div>
                <TextInput label="Common name" value={option.commonName ?? ''} onChange={(event) => update(`pathogenOptions.${i}.commonName`, event.target.value)} error={at(`pathogenOptions.${i}.commonName`).errors[0]} />
                <TextInput label="Scientific name" value={option.scientificName ?? ''} onChange={(event) => update(`pathogenOptions.${i}.scientificName`, event.target.value)} />
                <SelectInput
                  label="Group"
                  value={option.group ?? ''}
                  onChange={(event) => update(`pathogenOptions.${i}.group`, event.target.value)}
                  options={[...new Set([...(option.group ? [option.group] : []), ...GROUPS])].map((group) => ({ value: group, label: group }))}
                />
              </li>
            );
          })}
        </ol>
        <Button
          size="sm"
          variant="secondary"
          icon="plus"
          disabled={pathogens.length >= MAX_PATHOGENS}
          onClick={() => update('pathogenOptions', [...pathogens, { id: nextId('p', pathogens), commonName: '', scientificName: '', group: 'fungus' }])}
        >
          Add wrong choice
        </Button>
        {penalties && (
          <p className="me-penalties">
            <strong>Scoring:</strong>
            <span>Wrong pathogen guess −{penalties.wrongGuess ?? '—'}</span>
            <span>Mark off target −{penalties.misplacedMark ?? '—'}</span>
            <span>Missed symptom −{penalties.missedSpot ?? '—'}</span>
            <span>Never naming the right pathogen scores {penalties.wrongPathogenScore ?? 0}</span>
          </p>
        )}
      </section>

      <TextArea label="Explanation (shown after the round)" value={data.explanation ?? ''} onChange={(event) => update('explanation', event.target.value)} rows={2} error={at('explanation').errors[0]} />
    </div>
  );
}
