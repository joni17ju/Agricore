/**
 * Module 2 — Identification game (Proposal Table 1, Fig 19).
 * Inspect the specimen with a zoom scope, mark every symptom with a red circle,
 * then identify the pathogen to unlock NEXT LEVEL.
 */
import { useRef, useState } from 'react';
import { findMarkedSpotIds } from '../../../utils/scoring.js';
import Button from '../../common/Button.jsx';
import Icon from '../../common/Icon.jsx';
import LeafSpecimen from '../../illustrations/LeafSpecimen.jsx';
import { HudChip } from '../MissionHud.jsx';

const ZOOM_LEVELS = [1, 5, 10, 20];
/** Visual magnification of the lens for each zoom level. */
const LENS_SCALE = { 1: 1, 5: 2.2, 10: 3.2, 20: 4.4 };
const LENS_SIZE = 170;

const GROUP_ICONS = { fungus: 'sprout', oomycete: 'droplet', bacterium: 'droplet', virus: 'globe', abiotic: 'sun' };

export default function IdentificationGame({ mission, module, totalLevels, onComplete }) {
  const data = mission.scenarioData;
  const viewportRef = useRef(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [marks, setMarks] = useState([]); // every mark placed (sent for scoring)
  const [wrongMarkIds, setWrongMarkIds] = useState([]); // marks currently fading out
  const [guesses, setGuesses] = useState([]);
  const [lens, setLens] = useState(null);
  const [message, setMessage] = useState(null);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const canMark = zoom >= data.minZoomToMark;
  const foundIds = findMarkedSpotIds(data.symptomSpots, marks);
  const allFound = foundIds.length === data.symptomSpots.length;
  const identified = guesses.includes(data.correctPathogenId);
  const correctMarks = marks.filter((mark) => mark.spotId);

  const pointFromEvent = (event) => {
    const rect = viewportRef.current.getBoundingClientRect();
    return {
      px: event.clientX - rect.left,
      py: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const updateLens = (event) => {
    if (zoom === 1) return;
    setLens(pointFromEvent(event));
  };

  const handleMark = (event) => {
    if (identified) return;
    const point = pointFromEvent(event);
    if (event.pointerType === 'touch' && zoom > 1) {
      setLens(point);
      setTimeout(() => setLens(null), 900);
    }
    if (!canMark) {
      setMessage({ tone: 'warn', text: `Zoom to ${data.minZoomToMark}x or more to inspect and mark symptoms.` });
      return;
    }
    const [spotId] = findMarkedSpotIds(data.symptomSpots, [point]);
    if (spotId && foundIds.includes(spotId)) {
      setMessage({ tone: 'info', text: 'That symptom is already marked.' });
      return;
    }
    const mark = { id: `m${marks.length + 1}`, x: point.x, y: point.y, spotId: spotId ?? null };
    setMarks((previous) => [...previous, mark]);
    if (spotId) {
      const spot = data.symptomSpots.find((s) => s.id === spotId);
      setMessage({ tone: 'ok', text: `Symptom found: ${spot.description}.` });
    } else {
      setMessage({ tone: 'error', text: 'That area looks healthy. Marks on healthy tissue lower your score.' });
      setWrongMarkIds((ids) => [...ids, mark.id]);
      setTimeout(() => setWrongMarkIds((ids) => ids.filter((id) => id !== mark.id)), 900);
    }
  };

  const guess = (optionId) => {
    if (!allFound || identified || guesses.includes(optionId)) return;
    setGuesses((previous) => [...previous, optionId]);
    const option = data.pathogenOptions.find((p) => p.id === optionId);
    setMessage(
      optionId === data.correctPathogenId
        ? { tone: 'ok', text: `Correct! ${option.commonName} identified. NEXT LEVEL unlocked.` }
        : { tone: 'error', text: `${option.commonName} does not match these symptoms. Look again.` },
    );
  };

  const scale = LENS_SCALE[zoom];

  return (
    <div className="id-game">
      <header className="game-header">
        <h1>Module {module.moduleNumber}: {module.title}</h1>
        <div className="game-header__chips">
          <HudChip icon="layers"><strong>Mission {mission.levelNumber}:</strong> Level {mission.levelNumber} of {totalLevels}</HudChip>
          <HudChip icon="target" tone={allFound ? 'success' : 'default'}>
            Objectives: {correctMarks.length}/{data.symptomSpots.length}
          </HudChip>
        </div>
      </header>

      <section className="id-workspace">
        <div
          ref={viewportRef}
          className={`id-viewport ${canMark ? 'can-mark' : ''} ${zoom > 1 ? 'is-zoomed' : ''}`}
          onPointerMove={updateLens}
          onPointerLeave={() => setLens(null)}
          onPointerUp={handleMark}
          role="application"
          aria-label={`${data.host} specimen. Current zoom ${zoom}x.`}
        >
          <LeafSpecimen specimenKey={data.specimenKey} spots={data.symptomSpots} />

          <div className="id-hint">
            <Icon name="leaf" size={18} />
            <span>{data.instructions}</span>
          </div>

          {marks.map((mark) => (
            (mark.spotId || wrongMarkIds.includes(mark.id)) && (
              <span
                key={mark.id}
                className={`id-mark ${mark.spotId ? 'is-correct' : 'is-wrong'}`}
                style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                aria-hidden="true"
              />
            )
          ))}

          {lens && zoom > 1 && (
            <div
              className="id-lens"
              style={{ width: LENS_SIZE, height: LENS_SIZE, left: lens.px - LENS_SIZE / 2, top: lens.py - LENS_SIZE / 2 }}
              aria-hidden="true"
            >
              <div
                className="id-lens__content"
                style={{
                  width: lens.width * scale,
                  height: lens.height * scale,
                  transform: `translate(${LENS_SIZE / 2 - lens.px * scale}px, ${LENS_SIZE / 2 - lens.py * scale}px)`,
                }}
              >
                <LeafSpecimen specimenKey={data.specimenKey} spots={data.symptomSpots} />
              </div>
              <span className="id-lens__label">{zoom}x</span>
            </div>
          )}
        </div>

        <div className="zoom-control" aria-label="Zoom scope">
          <button type="button" className="zoom-control__btn" onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))} aria-label="Zoom in">
            <Icon name="plus" size={18} />
          </button>
          <input
            type="range"
            min="0"
            max={ZOOM_LEVELS.length - 1}
            step="1"
            value={zoomIndex}
            onChange={(event) => setZoomIndex(Number(event.target.value))}
            className="zoom-control__slider"
            aria-label="Zoom level"
            aria-valuetext={`${zoom}x`}
          />
          <div className="zoom-control__levels">
            {[...ZOOM_LEVELS].reverse().map((level) => (
              <button
                key={level}
                type="button"
                className={`zoom-control__level ${level === zoom ? 'is-active' : ''} ${level >= data.minZoomToMark ? 'can-mark' : ''}`}
                onClick={() => setZoomIndex(ZOOM_LEVELS.indexOf(level))}
              >
                {level}x
              </button>
            ))}
          </div>
          <button type="button" className="zoom-control__btn" onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} aria-label="Zoom out">
            <Icon name="minus" size={18} />
          </button>
        </div>
      </section>

      {message && (
        <p key={`${message.text}-${marks.length}-${guesses.length}`} className={`game-message game-message--${message.tone}`} role="status">
          <Icon name={message.tone === 'ok' ? 'check-circle' : message.tone === 'error' ? 'x-circle' : 'info'} size={18} />
          {message.text}
        </p>
      )}

      <div className="id-bottom">
        <section className="id-notes">
          <h2><Icon name="clipboard" size={16} /> Field notes</h2>
          <ul>
            {data.symptomSpots.map((spot, index) => (
              <li key={spot.id} className={foundIds.includes(spot.id) ? 'is-found' : ''}>
                <span className="id-notes__dot">{foundIds.includes(spot.id) ? <Icon name="check" size={12} strokeWidth={3} /> : index + 1}</span>
                {foundIds.includes(spot.id) ? spot.description : 'Symptom not yet marked'}
              </li>
            ))}
          </ul>
        </section>

        <section className={`id-pathogens ${allFound ? 'is-unlocked' : 'is-locked'}`}>
          <h2>Identify the pathogen:</h2>
          {!allFound && (
            <p className="id-pathogens__lock"><Icon name="lock" size={14} /> Mark all {data.symptomSpots.length} symptoms to unlock identification</p>
          )}
          <div className="id-pathogens__grid">
            {data.pathogenOptions.map((option, index) => {
              const wasGuessed = guesses.includes(option.id);
              const isCorrect = option.id === data.correctPathogenId;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`pathogen-card anim-fade-up ${wasGuessed ? (isCorrect ? 'is-correct' : 'is-wrong') : ''}`}
                  style={{ '--i': index }}
                  onClick={() => guess(option.id)}
                  disabled={!allFound || identified || wasGuessed}
                >
                  <span className={`pathogen-card__thumb pathogen-card__thumb--${option.group}`}>
                    <Icon name={GROUP_ICONS[option.group] ?? 'microscope'} size={20} />
                  </span>
                  <span className="pathogen-card__text">
                    <strong>{option.commonName}</strong>
                    <em>{option.scientificName}</em>
                  </span>
                  {wasGuessed && (
                    <span className="pathogen-card__status">
                      <Icon name={isCorrect ? 'check' : 'x'} size={14} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="game-actions">
        <Button
          size="lg"
          iconRight="chevron-right"
          className={`next-level-btn ${identified ? 'is-ready' : ''}`}
          disabled={!identified}
          onClick={() => onComplete({ marks: marks.map(({ x, y }) => ({ x, y })), pathogenGuesses: guesses })}
        >
          NEXT LEVEL
        </Button>
      </div>
    </div>
  );
}
