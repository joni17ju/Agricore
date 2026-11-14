import { useRef, useState } from 'react';
import Button, { IconButton } from '../../../common/Button.jsx';
import { SelectInput, TextArea, TextInput } from '../../../common/Form.jsx';
import Icon from '../../../common/Icon.jsx';
import WeedSpecimen from '../../../illustrations/WeedSpecimen.jsx';
import { nextId, removeItem } from '../draft.js';
import { FieldIssues, IllustrationPicker } from '../fields.jsx';
import { nudge, stagePercent } from './stage.js';

const MAX_TARGETS = 12;
const MAX_LABELS = 20;

export default function DragDropEditor({ data, update, at }) {
  const targets = data.targets;
  const labels = data.labels;
  const specimen = data.specimen ?? {};
  const stageRef = useRef(null);
  const drag = useRef(null);
  const [selected, setSelected] = useState(null);

  const zoneOf = (labelId) => targets.findIndex((target) => target.correctLabelId === labelId);
  const unusedLabel = labels.find((label) => zoneOf(label.id) === -1);

  /*
   * A new zone needs a label of its own: the first one no zone uses yet, or a
   * new blank label (which then shows as needing text).
   */
  const addZone = (x, y) => {
    if (targets.length >= MAX_TARGETS) return;
    let labelId = unusedLabel?.id;
    if (!labelId) {
      labelId = nextId('l', labels);
      update('labels', [...labels, { id: labelId, text: '', hint: '' }]);
    }
    update('targets', [...targets, { id: nextId('z', targets), x, y, correctLabelId: labelId }]);
    setSelected(targets.length);
  };
  const removeZone = (index) => {
    update('targets', removeItem(targets, index));
    setSelected(null);
  };
  const moveZone = (index, point) => update(`targets.${index}`, (target) => ({ ...target, x: point.x, y: point.y }));

  const onStageClick = (event) => {
    if (event.target !== event.currentTarget) return;
    const { x, y } = stagePercent(stageRef.current, event);
    addZone(x, y);
  };
  const startDrag = (event, index) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = index;
    setSelected(index);
  };
  const onDrag = (event) => {
    if (drag.current === null || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    moveZone(drag.current, stagePercent(stageRef.current, event));
  };
  const endDrag = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  };
  const onPinKey = (event, index) => {
    const moved = nudge(event, targets[index]);
    if (moved) {
      event.preventDefault();
      moveZone(index, moved);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeZone(index);
    }
  };

  return (
    <div className="me-game">
      <section className="me-card" aria-label="Specimen">
        <header className="me-card__head"><span className="me-card__badge">Specimen</span></header>
        <div className="me-two">
          <IllustrationPicker
            label="Weed specimen"
            value={specimen.imageKey}
            keys={WeedSpecimen.keys}
            render={(key) => <WeedSpecimen imageKey={key} />}
            onChange={(key) => update('specimen.imageKey', key)}
            size={80}
          />
          <div className="stack">
            <TextInput label="Common name" value={specimen.commonName ?? ''} onChange={(event) => update('specimen.commonName', event.target.value)} error={at('specimen.commonName').errors[0]} />
            <TextInput label="Scientific name" value={specimen.scientificName ?? ''} onChange={(event) => update('specimen.scientificName', event.target.value)} />
            <TextInput label="Weed group" value={specimen.group ?? ''} onChange={(event) => update('specimen.group', event.target.value)} />
          </div>
        </div>
      </section>

      <section className="me-card" aria-label="Target zones">
        <header className="me-card__head">
          <span className="me-card__badge">Target zones</span>
          <span className="text-xs text-muted">Click the specimen to drop a zone, drag a zone to move it.</span>
        </header>
        <FieldIssues {...at('targets')} />
        <div className="me-placement">
          <div className="me-stage me-stage--1x1 me-stage--weed" ref={stageRef}>
            <WeedSpecimen imageKey={specimen.imageKey} className="me-stage__art" />
            <div className="me-stage__overlay" onClick={onStageClick} role="presentation">
              {targets.map((target, i) => {
                const label = labels.find((item) => item.id === target.correctLabelId);
                return (
                  <div key={target.id ?? i} className={`me-zone ${selected === i ? 'is-selected' : ''}`} style={{ left: `${target.x}%`, top: `${target.y}%` }}>
                    <button
                      type="button"
                      className="me-zone__pin"
                      aria-label={`Zone ${i + 1}${label?.text ? `, ${label.text}` : ''}, at ${target.x}% across, ${target.y}% down. Arrow keys move it, Delete removes.`}
                      onPointerDown={(event) => startDrag(event, i)}
                      onPointerMove={onDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onFocus={() => setSelected(i)}
                      onKeyDown={(event) => onPinKey(event, i)}
                    >
                      {i + 1}
                    </button>
                    {label?.text && <span className={`me-zone__tag ${target.x > 60 ? 'is-left' : ''}`}>{label.text}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <ol className="me-spot-list">
            {targets.map((target, i) => (
              <li key={target.id ?? i} className={`me-spot-item ${selected === i ? 'is-selected' : ''}`}>
                <div className="me-spot-item__head">
                  <span className="me-spot-item__n" aria-hidden="true">{i + 1}</span>
                  <span className="text-xs text-muted">{target.x}% across · {target.y}% down</span>
                  <IconButton icon="trash" label={`Delete zone ${i + 1}`} size="sm" variant="danger" onClick={() => removeZone(i)} />
                </div>
                <SelectInput
                  label={`Zone ${i + 1} correct label`}
                  value={target.correctLabelId ?? ''}
                  onChange={(event) => update(`targets.${i}.correctLabelId`, event.target.value)}
                  options={labels.map((label) => ({ value: label.id, label: label.text || `(blank label ${label.id})` }))}
                  error={at(`targets.${i}.correctLabelId`).errors[0]}
                />
              </li>
            ))}
            <li>
              <Button size="sm" variant="secondary" icon="plus" disabled={targets.length >= MAX_TARGETS} onClick={() => addZone(50, 50)}>
                Add a zone in the centre
              </Button>
            </li>
          </ol>
        </div>
        <p className="me-note"><Icon name="info" size={14} /> Zones are points in this game; the drop area around each one is the same size, so there is nothing to resize.</p>
      </section>

      <section className="me-card" aria-label="Labels">
        <header className="me-card__head">
          <span className="me-card__badge">Labels</span>
          <span className="me-count">{labels.length - targets.length > 0 ? `${labels.length - targets.length} decoy${labels.length - targets.length === 1 ? '' : 's'}` : 'no decoys'}</span>
        </header>
        <FieldIssues {...at('labels')} />
        <ol className="me-rows">
          {labels.map((label, i) => {
            const zone = zoneOf(label.id);
            return (
              <li key={label.id ?? i} className="me-row me-row--label">
                <span className={`me-tag ${zone >= 0 ? 'is-correct' : ''}`}>{zone >= 0 ? `Zone ${zone + 1}` : 'Decoy'}</span>
                <TextInput label="Label" value={label.text ?? ''} onChange={(event) => update(`labels.${i}.text`, event.target.value)} error={at(`labels.${i}.text`).errors[0]} />
                <TextInput label="Hint" value={label.hint ?? ''} onChange={(event) => update(`labels.${i}.hint`, event.target.value)} />
                <IconButton
                  icon="trash"
                  size="sm"
                  variant="danger"
                  label={zone >= 0 ? `Zone ${zone + 1} uses this label — remove or relabel the zone first` : `Remove ${label.text || `label ${i + 1}`}`}
                  disabled={zone >= 0}
                  onClick={() => update('labels', removeItem(labels, i))}
                />
              </li>
            );
          })}
        </ol>
        <Button size="sm" variant="secondary" icon="plus" disabled={labels.length >= MAX_LABELS} onClick={() => update('labels', [...labels, { id: nextId('l', labels), text: '', hint: '' }])}>
          Add decoy label
        </Button>
      </section>

      <TextArea label="Explanation (shown after the round)" value={data.explanation ?? ''} onChange={(event) => update('explanation', event.target.value)} rows={2} error={at('explanation').errors[0]} />
    </div>
  );
}
