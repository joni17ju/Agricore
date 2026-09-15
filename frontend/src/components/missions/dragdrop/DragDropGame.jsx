/**
 * Module 4 — Drag-and-Drop game (Proposal Table 1, Fig 21).
 * Drag structural labels onto flashing target zones on a weed specimen.
 * Uses pointer events so dragging works with mouse, pen and touch; tapping a
 * label and then a zone is also supported.
 */
import { useEffect, useRef, useState } from 'react';
import { useCountdown } from '../../../hooks/useCountdown.js';
import Button from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import { SegmentedProgress } from '../../common/Progress.jsx';
import WeedSpecimen from '../../illustrations/WeedSpecimen.jsx';
import { CountdownTimer } from '../MissionHud.jsx';

const DRAG_THRESHOLD = 6;
const ZONE_HIT_RADIUS = 44;

export default function DragDropGame({ mission, module, totalLevels, onComplete }) {
  const data = mission.scenarioData;
  const zoneRefs = useRef({});
  const [placements, setPlacements] = useState({}); // zoneId → labelId
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [drag, setDrag] = useState(null); // { labelId, fromZoneId, startX, startY, x, y, moved, overZoneId }
  const [verified, setVerified] = useState(false);
  const [bouncedZone, setBouncedZone] = useState(null);
  const dragRef = useRef(null);

  const remaining = useCountdown(data.timeLimitSeconds, {
    isRunning: !verified,
    onExpire: () => setVerified(true),
  });

  const labelById = Object.fromEntries(data.labels.map((label) => [label.id, label]));
  const placedLabelIds = new Set(Object.values(placements));
  const dockLabels = data.labels.filter((label) => !placedLabelIds.has(label.id));
  const filledCount = Object.keys(placements).length;
  const correctCount = data.targets.filter((t) => placements[t.id] === t.correctLabelId).length;

  const place = (labelId, zoneId) => {
    setPlacements((previous) => {
      const next = {};
      for (const [zone, label] of Object.entries(previous)) {
        if (label !== labelId && zone !== zoneId) next[zone] = label;
      }
      next[zoneId] = labelId;
      return next;
    });
    setSelectedLabelId(null);
    setBouncedZone(zoneId);
    setTimeout(() => setBouncedZone(null), 450);
  };

  const unplace = (zoneId) => {
    setPlacements((previous) => {
      const next = { ...previous };
      delete next[zoneId];
      return next;
    });
  };

  const zoneAt = (x, y) => {
    let closest = null;
    for (const target of data.targets) {
      const element = zoneRefs.current[target.id];
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const distance = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
      if (distance <= ZONE_HIT_RADIUS && (!closest || distance < closest.distance)) closest = { id: target.id, distance };
    }
    return closest?.id ?? null;
  };

  const listenersRef = useRef(null);

  const detachListeners = () => {
    if (!listenersRef.current) return;
    const { onMove, onUp } = listenersRef.current;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    listenersRef.current = null;
  };

  useEffect(() => detachListeners, []);

  /** Listeners are attached immediately (not in an effect) so fast flicks are never missed. */
  const startDrag = (event, labelId, fromZoneId = null) => {
    if (verified || event.button > 0) return;
    event.preventDefault();
    detachListeners();
    const initial = { labelId, fromZoneId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false, overZoneId: null };
    dragRef.current = initial;
    setDrag(initial);

    const onMove = (moveEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const moved = current.moved || Math.hypot(moveEvent.clientX - current.startX, moveEvent.clientY - current.startY) > DRAG_THRESHOLD;
      const next = { ...current, x: moveEvent.clientX, y: moveEvent.clientY, moved, overZoneId: moved ? zoneAt(moveEvent.clientX, moveEvent.clientY) : null };
      dragRef.current = next;
      setDrag(next);
    };

    const onUp = (upEvent) => {
      detachListeners();
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;
      const overZoneId = current.moved ? zoneAt(upEvent.clientX, upEvent.clientY) ?? current.overZoneId : null;
      if (!current.moved) {
        // A tap: placed labels go back to the dock, dock labels become selected.
        if (current.fromZoneId) unplace(current.fromZoneId);
        else setSelectedLabelId((selected) => (selected === current.labelId ? null : current.labelId));
      } else if (overZoneId) {
        place(current.labelId, overZoneId);
      } else if (current.fromZoneId) {
        unplace(current.fromZoneId);
      }
    };

    listenersRef.current = { onMove, onUp };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleZoneClick = (zoneId) => {
    if (verified) return;
    if (selectedLabelId) place(selectedLabelId, zoneId);
  };

  const verify = () => setVerified(true);
  const draggingLabel = drag?.moved ? labelById[drag.labelId] : null;

  return (
    <div className={`dd-game ${drag?.moved ? 'is-dragging' : ''}`}>
      <header className="game-header">
        <h1>Module {module.moduleNumber}: {module.title} Identification</h1>
        <div className="game-header__chips">
          <CountdownTimer remaining={remaining} total={data.timeLimitSeconds} />
        </div>
      </header>

      <div className="dd-layout">
        <section className="dd-workspace">
          <div className="dd-workspace__header">
            <h2>Weed Morphology Workspace</h2>
            <div className="dd-workspace__progress">
              <SegmentedProgress total={totalLevels} current={mission.levelNumber} />
            </div>
          </div>

          <div className="dd-specimen">
           <div className="dd-stage">
            <WeedSpecimen imageKey={data.specimen.imageKey} />
            <span className="dd-specimen__chip">Challenge Progress: {mission.levelNumber} of {totalLevels}</span>

            {data.targets.map((target, index) => {
              const labelId = placements[target.id];
              const label = labelId ? labelById[labelId] : null;
              const isCorrect = labelId === target.correctLabelId;
              const isOver = drag?.overZoneId === target.id;
              const alignRight = target.x > 60;
              return (
                <div
                  key={target.id}
                  className={`dd-zone ${label ? 'is-filled' : ''} ${isOver ? 'is-over' : ''} ${verified ? (isCorrect ? 'is-correct' : 'is-wrong') : ''} ${bouncedZone === target.id ? 'is-bounce' : ''} ${selectedLabelId && !label ? 'is-inviting' : ''}`}
                  style={{ left: `${target.x}%`, top: `${target.y}%` }}
                >
                  <button
                    type="button"
                    ref={(element) => { zoneRefs.current[target.id] = element; }}
                    className="dd-zone__target"
                    onClick={() => handleZoneClick(target.id)}
                    aria-label={label ? `Target ${index + 1}: ${label.text}` : `Empty target ${index + 1}`}
                  >
                    {verified ? <Icon name={isCorrect ? 'check' : 'x'} size={16} strokeWidth={3} /> : <span className="dd-zone__dot" />}
                  </button>
                  {label && (
                    <span
                      className={`dd-tag ${alignRight ? 'dd-tag--left' : ''}`}
                      onPointerDown={(event) => startDrag(event, label.id, target.id)}
                      role="button"
                      tabIndex={verified ? -1 : 0}
                      onKeyDown={(event) => event.key === 'Enter' && !verified && unplace(target.id)}
                    >
                      {label.text}
                      {verified && !isCorrect && <small>→ {labelById[target.correctLabelId].text}</small>}
                    </span>
                  )}
                </div>
              );
            })}
           </div>

            <div className="dd-dock" aria-label="Labels dock">
              <span className="dd-dock__title">Labels Dock</span>
              <div className="dd-dock__labels">
                {dockLabels.length === 0 && <span className="dd-dock__empty">All labels placed</span>}
                {dockLabels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    className={`dd-label ${selectedLabelId === label.id ? 'is-selected' : ''} ${drag?.moved && drag.labelId === label.id ? 'is-lifted' : ''}`}
                    onPointerDown={(event) => startDrag(event, label.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedLabelId((selected) => (selected === label.id ? null : label.id));
                      }
                    }}
                    disabled={verified}
                  >
                    <Icon name="grip" size={14} />
                    [{label.text}]
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="dd-inventory">
          <h2>Label Inventory</h2>
          <div className="dd-inventory__card">
            <h3><Icon name="leaf" size={18} /> Drag Labels to Targets</h3>
            <p>
              Drag labels of the structures of <strong>{data.specimen.commonName}</strong> (<em>{data.specimen.scientificName}</em>) onto the flashing targets.
              You can also tap a label, then tap a target.
            </p>
          </div>
          <ul className="dd-inventory__list">
            {data.labels.map((label) => (
              <li key={label.id} className={placedLabelIds.has(label.id) ? 'is-placed' : ''}>
                <Icon name={placedLabelIds.has(label.id) ? 'check-circle' : 'sprout'} size={18} />
                <div>
                  <strong>{label.text}</strong>
                  <small>{label.hint}</small>
                </div>
              </li>
            ))}
          </ul>
          <span className="chip">{data.specimen.group}</span>

          {verified ? (
            <div className={`dd-result ${correctCount === data.targets.length ? 'is-perfect' : ''}`}>
              <strong>{correctCount} of {data.targets.length} correct</strong>
              <p className="text-sm">{remaining === 0 ? "Time's up — your placements were checked." : 'Placements verified.'}</p>
              <Button block size="lg" iconRight="chevron-right" className="next-level-btn is-ready" onClick={() => onComplete({ placements })}>
                NEXT LEVEL
              </Button>
            </div>
          ) : (
            <Button block size="lg" icon="check-circle" onClick={verify} disabled={filledCount === 0}>
              Verify Identification {filledCount < data.targets.length && `(${filledCount}/${data.targets.length})`}
            </Button>
          )}
        </aside>
      </div>

      {draggingLabel && (
        <div className="dd-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          [{draggingLabel.text}]
        </div>
      )}
    </div>
  );
}
