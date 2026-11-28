import { animated, useSpring } from '@react-spring/three';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';
import LeafSpecimen from '../illustrations/LeafSpecimen.jsx';
import GameStage, { Anchor, Burst } from './GameStage.jsx';
import Shell3D, { useFinale, useXpPops } from './Shell3D.jsx';
import { useSvgTexture } from './svgTexture.js';
import { findMarkedSpotIds, scoreMission } from '../../utils/scoring.js';
import { GAME_TYPES } from '../../constants/gameTypes.js';

/**
 * Identification in 3D: the infected leaf lies on a lab board. Zoom in (the
 * camera closes in on the spot you point at), mark each symptom by tapping
 * it, then pick the right specimen jar. Same answers as the 2D game:
 * { marks: [{ x, y }], pathogenGuesses: [optionId, …] } with x/y in percent
 * of the leaf drawing.
 */
const ZOOM_LEVELS = [1, 5, 10, 20];
const BOARD = { width: 4, height: 3, center: new THREE.Vector3(0, 1.9, 0.6) };
const BOARD_TILT = -0.42;

function boardPoint(xPct, yPct) {
  // Percent of the drawing → a point on the tilted board, in world space.
  const local = new THREE.Vector3((xPct / 100 - 0.5) * BOARD.width, (0.5 - yPct / 100) * BOARD.height, 0.02);
  local.applyEuler(new THREE.Euler(BOARD_TILT, 0, 0));
  return local.add(BOARD.center);
}

/** Keeps the camera's focus on the board, so a touch pan cannot drift into empty space. */
const clampToBoard = (v) => {
  const half = new THREE.Vector3(BOARD.width / 2, BOARD.height / 2, BOARD.height / 2);
  return v.clone().max(BOARD.center.clone().sub(half)).min(BOARD.center.clone().add(half));
};

function ZoomCamera({ zoom, focus, calm }) {
  const { camera } = useThree();
  const look = useRef(BOARD.center.clone());
  useFrame(() => {
    const wanted = zoom === 1 ? BOARD.center : focus;
    look.current.lerp(wanted, calm ? 1 : 0.12);
    const fov = 42 / (1 + Math.log2(zoom) * 0.55);
    camera.fov += (fov - camera.fov) * (calm ? 1 : 0.12);
    camera.lookAt(look.current);
    camera.updateProjectionMatrix();
  });
  return null;
}

function Mark({ mark, wrong, calm }) {
  const p = boardPoint(mark.x, mark.y);
  const { scale } = useSpring({ from: { scale: 0.2 }, scale: wrong ? 0 : 1, immediate: calm, config: { tension: 260, friction: 14 }, delay: wrong ? 600 : 0 });
  return (
    <animated.mesh position={p} rotation={[BOARD_TILT, 0, 0]} scale={scale}>
      <torusGeometry args={[0.16, 0.025, 8, 28]} />
      <meshBasicMaterial color={mark.spotId ? '#1f9d55' : '#d64545'} />
    </animated.mesh>
  );
}

function Jar({ option, x, state, onPick }) {
  const [hover, setHover] = useState(false);
  const { y, scale } = useSpring({ y: state === 'right' ? 0.3 : 0, scale: hover && state === 'open' ? 1.08 : 1 });
  const glass = state === 'right' ? '#8fe3a8' : state === 'wrong' ? '#f2a3a3' : '#d8ecf2';
  return (
    <animated.group position-x={x} position-y={y} position-z={2.5} scale={scale}>
      <mesh
        position={[0, 0.5, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = state === 'open' ? 'pointer' : '';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      >
        <cylinderGeometry args={[0.38, 0.38, 0.9, 16]} />
        <meshStandardMaterial color={glass} transparent opacity={0.75} roughness={0.15} />
      </mesh>
      <mesh position={[0, 1.02, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.14, 16]} />
        <meshStandardMaterial color="#6b4b2a" />
      </mesh>
      <Anchor id={`jar-${option.id}`} position={[0, -0.05, 0.42]} />
    </animated.group>
  );
}

export default function Identification3D({ mission, module, onComplete, calm }) {
  const data = mission.scenarioData;
  const [started, setStarted] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [marks, setMarks] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [message, setMessage] = useState(null);
  const [focus, setFocus] = useState(BOARD.center.clone());
  const [lens, setLens] = useState(null);
  // Keyboard: arrow keys move a crosshair over the leaf, Enter marks there.
  const [cross, setCross] = useState({ x: 50, y: 50 });
  const onStageKey = (event) => {
    const step = event.shiftKey ? 8 : 3;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[event.key]) {
      event.preventDefault();
      const next = { x: Math.min(100, Math.max(0, cross.x + moves[event.key][0])), y: Math.min(100, Math.max(0, cross.y + moves[event.key][1])) };
      setCross(next);
      setLens(boardPoint(next.x, next.y));
      setFocus(boardPoint(next.x, next.y));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      mark(cross);
    }
  };
  const [burst, setBurst] = useState(null);
  const { pops, pop } = useXpPops();
  const { finale, finish } = useFinale(onComplete, calm);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const canMark = zoom >= data.minZoomToMark;
  const foundIds = findMarkedSpotIds(data.symptomSpots, marks);
  const allFound = foundIds.length === data.symptomSpots.length;
  const identified = guesses.includes(data.correctPathogenId);
  const wrongGuesses = guesses.filter((id) => id !== data.correctPathogenId).length;

  const leafTexture = useSvgTexture(<LeafSpecimen specimenKey={data.specimenKey} spots={data.symptomSpots} />, [800, 600], data.specimenKey);

  const pointOnLeaf = (event) => ({ x: event.uv.x * 100, y: (1 - event.uv.y) * 100 });
  // Touch: one finger drags the zoomed leaf like a map (the grabbed point stays
  // under the finger); a tap marks. A mouse simply aims the magnifier.
  const grab = useRef(null);
  const isMouse = (event) => (event.nativeEvent?.pointerType ?? 'mouse') === 'mouse';

  const mark = (point) => {
    if (!started || identified || finale) return;
    if (!canMark) {
      setMessage({ tone: 'warn', text: `Zoom to ${data.minZoomToMark}x or more to inspect and mark symptoms.` });
      return;
    }
    const [spotId] = findMarkedSpotIds(data.symptomSpots, [point]);
    if (spotId && foundIds.includes(spotId)) {
      setMessage({ tone: 'info', text: 'That symptom is already marked.' });
      return;
    }
    const next = { id: `m${marks.length + 1}`, x: point.x, y: point.y, spotId: spotId ?? null };
    setMarks((list) => [...list, next]);
    if (spotId) {
      const spot = data.symptomSpots.find((s) => s.id === spotId);
      setMessage({ tone: 'ok', text: `Symptom found: ${spot.description}.` });
      setBurst({ key: next.id, at: boardPoint(point.x, point.y) });
      pop('Symptom found!');
    } else {
      setMessage({ tone: 'error', text: 'That area looks healthy. Marks on healthy tissue lower your score.' });
      pop('Healthy tissue', 'bad');
    }
  };

  const guess = (optionId) => {
    if (!started || !allFound || identified || guesses.includes(optionId) || finale) return;
    setGuesses((list) => [...list, optionId]);
    const option = data.pathogenOptions.find((p) => p.id === optionId);
    if (optionId === data.correctPathogenId) {
      setMessage({ tone: 'ok', text: `Correct! ${option.commonName}.` });
      setBurst({ key: `g${optionId}`, at: new THREE.Vector3(jarX(data.pathogenOptions.findIndex((p) => p.id === optionId)), 1.6, 2.5) });
      pop('Identified!');
    } else {
      setMessage({ tone: 'error', text: `${option.commonName} does not match these symptoms. Look again.` });
      pop('Not this one', 'bad');
    }
  };

  const jarX = (i) => (i - (data.pathogenOptions.length - 1) / 2) * 1.25;

  const submit = () => {
    const answers = { marks: marks.map(({ x, y }) => ({ x, y })), pathogenGuesses: guesses };
    const preview = scoreMission({ gameType: GAME_TYPES.IDENTIFICATION, scenarioData: data, answers });
    finish(answers, preview.isPassed);
  };

  const jarState = (option) => (guesses.includes(option.id) ? (option.id === data.correctPathogenId ? 'right' : 'wrong') : allFound && !identified ? 'open' : 'locked');
  const markSpots = useMemo(() => marks, [marks]);

  return (
    <Shell3D
      kicker={`Module ${module.moduleNumber} · Leaf inspection`}
      title={data.title}
      started={started}
      onStart={() => setStarted(true)}
      steps={[
        `Zoom to ${data.minZoomToMark}x or more with the zoom buttons.`,
        'Tap each symptom on the leaf to mark it. Marks on healthy tissue cost points.',
        data.question ? `When every symptom is marked, answer: ${data.question}` : 'When every symptom is marked, pick the right specimen jar.',
      ]}
      hud={{ progress: { done: foundIds.length, total: data.symptomSpots.length }, lives: Math.max(0, 3 - wrongGuesses), maxLives: 3 }}
      pops={pops}
      finale={finale}
      stage={
        <>
        <div className="m3d-keyzone" tabIndex={0} onKeyDown={onStageKey} aria-label="Leaf. Use the arrow keys to move the magnifier and Enter to mark a symptom.">
        <GameStage calm={calm} showCrops={false} camera={{ position: [0, 3.4, 6.6], fov: 42 }} target={[0, 1.9, 0.6]} label={`Leaf of ${data.host} to inspect`}>
          <ZoomCamera zoom={zoom} focus={focus} calm={calm} />
          {/* Lab table */}
          <mesh position={[0, 0.55, 1.4]} castShadow receiveShadow>
            <boxGeometry args={[7, 0.12, 3.4]} />
            <meshStandardMaterial color="#c9a36b" roughness={0.8} />
          </mesh>
          {[-3.3, 3.3].map((x) => (
            <mesh key={x} position={[x, 0.25, 1.4]} castShadow>
              <boxGeometry args={[0.15, 0.6, 3]} />
              <meshStandardMaterial color="#8a6a3f" />
            </mesh>
          ))}
          {/* The leaf board */}
          <group position={BOARD.center} rotation={[BOARD_TILT, 0, 0]}>
            <mesh position={[0, 0, -0.04]} castShadow>
              <boxGeometry args={[BOARD.width + 0.25, BOARD.height + 0.25, 0.06]} />
              <meshStandardMaterial color="#f4ead2" />
            </mesh>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                // A drag that pans the view is not a tap.
                if (e.delta > 12) return;
                const p = pointOnLeaf(e);
                setFocus(boardPoint(p.x, p.y));
                mark(p);
              }}
              onPointerDown={(e) => {
                if (isMouse(e) || zoom === 1) return;
                const p = pointOnLeaf(e);
                grab.current = boardPoint(p.x, p.y);
              }}
              onPointerUp={() => {
                grab.current = null;
              }}
              onPointerMove={(e) => {
                const p = pointOnLeaf(e);
                const under = boardPoint(p.x, p.y);
                setLens(under);
                if (zoom === 1) return;
                if (isMouse(e)) setFocus(under);
                else if (grab.current) {
                  // Read the grabbed point now: the updater runs later, possibly after the finger lifts.
                  const shift = grab.current.clone().sub(under);
                  setFocus((current) => clampToBoard(current.clone().add(shift)));
                }
              }}
              onPointerOut={() => {
                grab.current = null;
                setLens(null);
              }}
            >
              <planeGeometry args={[BOARD.width, BOARD.height]} />
              {leafTexture ? <meshStandardMaterial map={leafTexture} roughness={0.7} /> : <meshStandardMaterial color="#e8f0dc" />}
            </mesh>
          </group>
          {lens && (zoom > 1 || canMark) && (
            <mesh position={lens} rotation={[BOARD_TILT, 0, 0]}>
              <torusGeometry args={[0.32, 0.03, 8, 32]} />
              <meshStandardMaterial color="#1f5136" metalness={0.4} roughness={0.3} />
            </mesh>
          )}
          {markSpots.map((m) => <Mark key={m.id} mark={m} wrong={!m.spotId} calm={calm} />)}
          {data.pathogenOptions.map((option, i) => (
            <Jar key={option.id} option={option} x={jarX(i)} state={jarState(option)} onPick={() => guess(option.id)} />
          ))}
          {burst && <Burst key={burst.key} position={[burst.at.x, burst.at.y, burst.at.z]} calm={calm} color="#7be08e" />}
        </GameStage>
        </div>
        <div className="m3d-labels" aria-hidden="true">
          {data.pathogenOptions.map((option) => (
            <div key={option.id} className="m3d-anchor" data-anchor={`jar-${option.id}`}>
              <div className={`m3d-tag is-${jarState(option)}`}>{option.commonName}</div>
            </div>
          ))}
        </div>
        </>
      }
      panel={
        <>
          <p className="m3d-panel__eyebrow">Host: {data.host}</p>
          <p className="m3d-panel__prompt">{data.instructions}</p>
          <div className="m3d-zoom" role="group" aria-label="Zoom">
            <span>Zoom</span>
            {ZOOM_LEVELS.map((level, i) => (
              <button key={level} type="button" className={`m3d-zoom__btn ${i === zoomIndex ? 'is-active' : ''} ${level >= data.minZoomToMark ? 'can-mark' : ''}`} aria-pressed={i === zoomIndex} onClick={() => setZoomIndex(i)} disabled={!started}>
                {level}x
              </button>
            ))}
          </div>
          <ul className="m3d-notes" aria-label="Symptoms">
            {data.symptomSpots.map((spot, i) => {
              const found = foundIds.includes(spot.id);
              return (
                <li key={spot.id} className={found ? 'is-done' : ''}>
                  <span className="m3d-notes__dot">{found ? <Icon name="check" size={12} /> : i + 1}</span>
                  {found ? spot.description : 'Symptom not yet marked'}
                </li>
              );
            })}
          </ul>
          {message && <p className={`m3d-message is-${message.tone}`} role="status">{message.text}</p>}
          <h3 className="m3d-panel__h">{data.question ?? 'Identify the pathogen:'}</h3>
          {!allFound && <p className="m3d-panel__lock"><Icon name="lock" size={14} /> Mark all {data.symptomSpots.length} symptoms first.</p>}
          <div className="m3d-options">
            {data.pathogenOptions.map((option) => {
              const state = jarState(option);
              return (
                <button key={option.id} type="button" className={`m3d-option is-${state}`} onClick={() => guess(option.id)} disabled={state !== 'open' || !started}>
                  <strong>{option.commonName}</strong>
                  <span>{option.scientificName}</span>
                </button>
              );
            })}
          </div>
          <div className="m3d-actions">
            <Button size="lg" iconRight="chevron-right" onClick={submit} disabled={!identified || Boolean(finale)}>Finish mission</Button>
          </div>
        </>
      }
    />
  );
}
