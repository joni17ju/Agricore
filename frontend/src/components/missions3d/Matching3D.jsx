import { animated, useSpring } from '@react-spring/three';
import { useState } from 'react';
import Button from '../common/Button.jsx';
import PestIllustration from '../illustrations/PestIllustration.jsx';
import GameStage, { Anchor, Burst } from './GameStage.jsx';
import Shell3D, { useFinale, useXpPops } from './Shell3D.jsx';
import { useSvgTexture } from './svgTexture.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { scoreMission } from '../../utils/scoring.js';
import { GAME_TYPES } from '../../constants/gameTypes.js';

/**
 * Matching in 3D: the target pest stands on a pedestal; each answer column is
 * a row of crates in the field. Tapping a crate sends it flying onto the
 * pest's slot for that column, where it flips to show whether it was right.
 * One crate per column, against the clock. Same answers as the 2D game:
 * { selections: { [columnKey]: optionId }, timeRemainingSeconds }.
 */
const COLUMN_X = [-3.4, 0, 3.4];

function TargetCard({ target }) {
  const texture = useSvgTexture(<PestIllustration imageKey={target.imageKey} size={256} label="Target pest" />, [512, 512], target.imageKey);
  return (
    <group position={[0, 0, -1.6]}>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.05, 1, 8]} />
        <meshStandardMaterial color="#e8dfc8" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[2.1, 2.1, 0.08]} />
        <meshStandardMaterial color="#1f5136" />
      </mesh>
      <mesh position={[0, 2.15, 0.05]}>
        <planeGeometry args={[1.9, 1.9]} />
        {texture ? <meshBasicMaterial map={texture} transparent /> : <meshBasicMaterial color="#f4ead2" />}
      </mesh>
      <Anchor id="target" position={[0, 3.45, 0]} />
    </group>
  );
}

function Crate({ option, columnIndex, row, state, onPick, calm }) {
  const [hover, setHover] = useState(false);
  const chosen = state === 'right' || state === 'wrong';
  const home = [COLUMN_X[columnIndex], 0.4, 0.7 + row * 1.05];
  const slot = [COLUMN_X[columnIndex] * 0.42 + (columnIndex - 1) * 0.6, 3.6, -1.4];
  const { position, flip, scale } = useSpring({
    position: chosen ? slot : home,
    flip: chosen ? Math.PI : 0,
    scale: state === 'locked' ? 0.85 : hover && state === 'open' ? 1.1 : 1,
    immediate: calm,
    config: { tension: 170, friction: 20 },
  });
  const face = state === 'right' ? '#43b05c' : state === 'wrong' ? '#d65a4a' : state === 'locked' ? '#b9ad8c' : '#d9a55a';
  return (
    <animated.group position={position} scale={scale}>
      <animated.mesh
        rotation-y={flip}
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
        <boxGeometry args={[1.5, 0.72, 0.72]} />
        <meshStandardMaterial color={face} roughness={0.85} />
      </animated.mesh>
      <Anchor id={`crate-${columnIndex}-${option.id}`} position={[0, 0, 0.4]} />
    </animated.group>
  );
}

export default function Matching3D({ mission, module, onComplete, calm, onSwitch2D }) {
  const data = mission.scenarioData;
  const [started, setStarted] = useState(false);
  const [selections, setSelections] = useState({});
  const [finished, setFinished] = useState(null);
  const [streak, setStreak] = useState(0);
  const [burst, setBurst] = useState(null);
  const { pops, pop } = useXpPops();
  const { finale, finish } = useFinale(onComplete, calm);

  const remaining = useCountdown(data.timeLimitSeconds, {
    isRunning: started && !finished,
    onExpire: () => setFinished({ timeRemaining: 0, timedOut: true }),
  });
  const correctCount = data.columns.filter((c) => selections[c.key] === c.correctOptionId).length;

  const select = (column, columnIndex, optionId) => {
    if (!started || finished || selections[column.key]) return;
    const next = { ...selections, [column.key]: optionId };
    setSelections(next);
    if (optionId === column.correctOptionId) {
      setStreak((s) => s + 1);
      pop(streak >= 1 ? `Match! ${streak + 1}× combo` : 'Match!');
      setBurst({ key: `${column.key}-${optionId}`, at: [COLUMN_X[columnIndex] * 0.42 + (columnIndex - 1) * 0.6, 4, -1.4] });
    } else {
      setStreak(0);
      pop('Not a match', 'bad');
    }
    if (data.columns.every((c) => next[c.key])) setFinished({ timeRemaining: remaining, timedOut: false });
  };

  const crateState = (column, option) => {
    const picked = selections[column.key];
    if (picked === option.id) return option.id === column.correctOptionId ? 'right' : 'wrong';
    if (picked || finished) return 'locked';
    return 'open';
  };

  const submit = () => {
    const answers = { selections, timeRemainingSeconds: finished?.timeRemaining ?? 0 };
    const preview = scoreMission({ gameType: GAME_TYPES.MATCHING, scenarioData: data, answers });
    finish(answers, preview.isPassed);
  };

  return (
    <Shell3D
      kicker={`Module ${module.moduleNumber} · Matching`}
      title={data.title}
      started={started}
      onStart={() => setStarted(true)}
      onSwitch2D={onSwitch2D}
      steps={[
        'Study the target pest and its hint.',
        `Pick one crate in each of the ${data.columns.length} rows: ${data.columns.map((c) => c.title).join(', ')}.`,
        'Choices lock once made. Finish all rows before the timer runs out for a bonus.',
      ]}
      hud={{ progress: { done: Object.keys(selections).length, total: data.columns.length }, timeLeft: remaining, streak }}
      pops={pops}
      finale={finale}
      stage={
        <>
        <GameStage calm={calm} camera={{ position: [0, 6, 9.5], fov: 44 }} target={[0, 1.4, 0.2]} label={`Target pest: ${data.target.hint}`}>
          <TargetCard target={data.target} />
          {data.columns.map((column, ci) =>
            column.options.map((option, row) => (
              <Crate key={`${column.key}-${option.id}`} option={option} columnIndex={ci} row={row} calm={calm} state={crateState(column, option)} onPick={() => select(column, ci, option.id)} />
            )),
          )}
          {data.columns.map((column, ci) => (
            <Anchor key={column.key} id={`col-${ci}`} position={[COLUMN_X[ci], 0.2, 0]} />
          ))}
          {burst && <Burst key={burst.key} position={burst.at} calm={calm} />}
        </GameStage>
        <div className="m3d-labels" aria-hidden="true">
          <div className="m3d-anchor" data-anchor="target"><div className="m3d-tag is-target">{finished ? data.target.commonName : 'What is this pest?'}</div></div>
          {data.columns.map((column, ci) => (
            <div key={column.key} className="m3d-anchor" data-anchor={`col-${ci}`}><div className="m3d-tag is-column">{ci + 1}. {column.title}</div></div>
          ))}
          {data.columns.map((column, ci) =>
            column.options.map((option) => (
              <div key={`${column.key}-${option.id}`} className="m3d-anchor" data-anchor={`crate-${ci}-${option.id}`}>
                <div className={`m3d-tag is-${crateState(column, option)}`}>{option.label}</div>
              </div>
            )),
          )}
        </div>
        </>
      }
      panel={
        <>
          <p className="m3d-panel__eyebrow">Target pest</p>
          <p className="m3d-panel__prompt">{finished ? `${data.target.commonName} (${data.target.scientificName})` : 'What is this pest?'}</p>
          <p className="m3d-hint">Hint: {data.target.hint}</p>
          {data.columns.map((column, ci) => (
            <fieldset key={column.key} className="m3d-column">
              <legend>{ci + 1}. {column.title}</legend>
              <div className="m3d-options m3d-options--compact">
                {column.options.map((option) => {
                  const state = crateState(column, option);
                  return (
                    <button key={option.id} type="button" className={`m3d-option is-${state}`} onClick={() => select(column, ci, option.id)} disabled={state !== 'open' || !started}>
                      <strong>{option.label}</strong>
                      {option.sublabel && <span>{option.sublabel}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {finished && (
            <p className={`m3d-message is-${correctCount === data.columns.length && !finished.timedOut ? 'ok' : finished.timedOut ? 'error' : 'warn'}`} role="status">
              {finished.timedOut ? `Time's up! ${correctCount} of ${data.columns.length} matched.` : `${correctCount} of ${data.columns.length} matched.`}
            </p>
          )}
          <div className="m3d-actions">
            <Button size="lg" iconRight="chevron-right" onClick={submit} disabled={!finished || Boolean(finale)}>Finish mission</Button>
          </div>
        </>
      }
    />
  );
}
