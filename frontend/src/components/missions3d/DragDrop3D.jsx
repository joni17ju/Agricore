import { animated, useSpring } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import WeedSpecimen from '../illustrations/WeedSpecimen.jsx';
import GameStage, { Anchor, Burst } from './GameStage.jsx';
import Shell3D, { useFinale, useXpPops } from './Shell3D.jsx';
import { useSvgTexture } from './svgTexture.js';
import { useCountdown } from '../../hooks/useCountdown.js';
import { scoreMission } from '../../utils/scoring.js';
import { GAME_TYPES } from '../../constants/gameTypes.js';
import { useMissionSound } from '../missions/sound/MissionSound.jsx';

/**
 * Drag-and-Drop in 3D: the weed specimen stands on a board with glowing
 * target rings; the labels lie on the table as tags. Drag a tag onto a ring
 * (it snaps to the nearest one), or tap a tag and then a ring. Check the
 * placements when done, or the clock checks them for you. Same answers as
 * the 2D game: { placements: { [targetId]: labelId } }.
 */
const BOARD = { size: 3.6, y: 2.25, z: 0 };
const SNAP_DISTANCE = 0.55;

const boardPoint = (x, y) => [(x / 100 - 0.5) * BOARD.size, BOARD.y + (0.5 - y / 100) * BOARD.size, BOARD.z + 0.04];

function Ring({ target, state, inviting, onPick, calm }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current || calm) return;
    const s = inviting ? 1 + Math.sin(clock.elapsedTime * 5) * 0.08 : 1;
    ref.current.scale.setScalar(s);
  });
  const color = state === 'right' ? '#43b05c' : state === 'wrong' ? '#d65a4a' : inviting ? '#f2c230' : '#ffffff';
  return (
    <group position={boardPoint(target.x, target.y)}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
      >
        <torusGeometry args={[0.22, 0.045, 10, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Anchor id={`ring-${target.id}`} position={[0.3, 0.28, 0]} />
    </group>
  );
}

function Tag({ label, home, dragPos, placedAt, selected, verified, onDown }) {
  const target = dragPos ?? placedAt ?? home;
  const { position, scale } = useSpring({ position: target, scale: selected || dragPos ? 1.12 : 1, immediate: Boolean(dragPos), config: { tension: 260, friction: 22 } });
  return (
    <animated.group position={position} scale={scale}>
      <mesh
        castShadow
        onPointerDown={(e) => {
          if (verified) return;
          e.stopPropagation();
          onDown(e);
        }}
        onPointerOver={() => {
          document.body.style.cursor = verified ? '' : 'grab';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <boxGeometry args={[1.45, 0.42, 0.08]} />
        <meshStandardMaterial color={selected ? '#f6d66b' : '#fffaf0'} roughness={0.6} />
      </mesh>
      <Anchor id={`tag-${label.id}`} position={[0, 0, 0.06]} />
    </animated.group>
  );
}

/** Where a dragged tag goes: under the mouse, or lifted above a finger so it stays visible. */
const dragPoint = (e) => [e.point.x, e.point.y + (e.pointerType === 'touch' ? 0.45 : 0), BOARD.z + 0.25];
/** A short buzz on phones that support it: a clear "picked up" / "dropped" feel. */
const buzz = (ms) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not allowed here; the sound and the animation still play.
  }
};

export default function DragDrop3D({ mission, module, onComplete, calm }) {
  const data = mission.scenarioData;
  const [started, setStarted] = useState(false);
  const [placements, setPlacements] = useState({});
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null); // { labelId, pos }
  const [verified, setVerified] = useState(false);
  const [burst, setBurst] = useState(null);
  const { pops, pop } = useXpPops();
  const sound = useMissionSound();
  const { finale, finish } = useFinale(onComplete, calm);
  const dragRef = useRef(null);
  dragRef.current = drag;

  const remaining = useCountdown(data.timeLimitSeconds, { isRunning: started && !verified, onExpire: () => setVerified(true) });
  const texture = useSvgTexture(<WeedSpecimen imageKey={data.specimen.imageKey} />, [800, 800], data.specimen.imageKey);

  const zoneOfLabel = (labelId) => Object.keys(placements).find((zone) => placements[zone] === labelId);
  const correctCount = data.targets.filter((t) => placements[t.id] === t.correctLabelId).length;

  const homeOf = (index) => {
    const perRow = 3;
    const row = Math.floor(index / perRow);
    const col = index % perRow;
    return [(col - 1) * 1.65, 0.78, 1.5 + row * 0.62];
  };

  const place = (labelId, zoneId) => {
    if (verified || !started) return;
    setPlacements((previous) => {
      const next = {};
      for (const [zone, label] of Object.entries(previous)) if (label !== labelId && zone !== zoneId) next[zone] = label;
      next[zoneId] = labelId;
      return next;
    });
    setSelected(null);
    sound.drop();
    buzz(15);
    pop('Placed', 'neutral');
  };

  const unplace = (zoneId) => {
    if (verified) return;
    setPlacements((previous) => {
      const next = { ...previous };
      delete next[zoneId];
      return next;
    });
  };

  // Dropping a dragged tag: the nearest ring within reach takes it.
  useEffect(() => {
    if (!drag) return undefined;
    const onUp = () => {
      const current = dragRef.current;
      setDrag(null);
      if (!current?.pos) return;
      let best = null;
      for (const t of data.targets) {
        const [x, y] = boardPoint(t.x, t.y);
        const d = Math.hypot(current.pos[0] - x, current.pos[1] - y);
        if (d < SNAP_DISTANCE && (!best || d < best.d)) best = { id: t.id, d };
      }
      if (best) place(current.labelId, best.id);
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(drag)]);

  const verify = () => {
    setVerified(true);
    if (correctCount === data.targets.length) {
      pop('All correct!');
      setBurst({ key: 'all', at: [0, BOARD.y + 1, 0.3] });
    } else pop(`${correctCount} of ${data.targets.length} correct`, 'bad');
  };

  const submit = () => {
    const answers = { placements };
    const preview = scoreMission({ gameType: GAME_TYPES.DRAG_AND_DROP, scenarioData: data, answers });
    finish(answers, preview.isPassed);
  };

  const ringState = (t) => (!verified || !placements[t.id] ? 'open' : placements[t.id] === t.correctLabelId ? 'right' : 'wrong');

  return (
    <Shell3D
      kicker={`Module ${module.moduleNumber} · Drag and drop`}
      title={data.title}
      started={started}
      landscapeHint
      onStart={() => setStarted(true)}
      steps={[
        `Look at the ${data.specimen.group.toLowerCase()} weed: ${data.specimen.commonName}.`,
        'Drag each label onto its numbered ring — or tap a label, then a ring. Some labels do not belong.',
        'Press Check when every ring has a label, before the time runs out.',
      ]}
      hud={{ progress: { done: Object.keys(placements).length, total: data.targets.length }, timeLeft: remaining }}
      pops={pops}
      finale={finale}
      stage={
        <div className="m3d-dragzone">
          <GameStage calm={calm} showCrops={false} camera={{ position: [0, 3.4, 7.4], fov: 46 }} target={[0, 1.8, 0.3]} label={`${data.specimen.commonName} specimen`}>
            <mesh position={[0, BOARD.y, BOARD.z - 0.05]} castShadow>
              <boxGeometry args={[BOARD.size + 0.3, BOARD.size + 0.3, 0.08]} />
              <meshStandardMaterial color="#f4ead2" />
            </mesh>
            <mesh
              position={[0, BOARD.y, BOARD.z]}
              onPointerMove={(e) => {
                if (dragRef.current) setDrag({ ...dragRef.current, pos: dragPoint(e) });
              }}
            >
              <planeGeometry args={[BOARD.size, BOARD.size]} />
              {texture ? <meshBasicMaterial map={texture} /> : <meshBasicMaterial color="#efebdd" />}
            </mesh>
            {/* A wide invisible plane keeps the drag moving even off the board. */}
            <mesh
              position={[0, 2, BOARD.z + 0.01]}
              visible={false}
              onPointerMove={(e) => {
                if (dragRef.current) setDrag({ ...dragRef.current, pos: dragPoint(e) });
              }}
            >
              <planeGeometry args={[14, 8]} />
            </mesh>
            <mesh position={[0, 0.55, 1.8]} receiveShadow castShadow>
              <boxGeometry args={[6, 0.12, 1.9]} />
              <meshStandardMaterial color="#c9a36b" />
            </mesh>
            {data.targets.map((t) => (
              <Ring key={t.id} target={t} calm={calm} state={ringState(t)} inviting={Boolean(selected) && !placements[t.id]} onPick={() => (selected ? place(selected, t.id) : placements[t.id] && unplace(t.id))} />
            ))}
            {data.labels.map((label, i) => {
              const zone = zoneOfLabel(label.id);
              const target = zone ? data.targets.find((t) => t.id === zone) : null;
              const at = target ? boardPoint(target.x, target.y) : null;
              return (
                <Tag
                  key={label.id}
                  label={label}
                  home={homeOf(i)}
                  placedAt={at ? [at[0], at[1] - 0.42, at[2] + 0.1] : null}
                  dragPos={drag?.labelId === label.id ? drag.pos : null}
                  selected={selected === label.id}
                  verified={verified}
                  onDown={() => {
                    if (!started) return;
                    sound.pickup();
                    buzz(10);
                    setSelected((s) => (s === label.id ? null : label.id));
                    setDrag({ labelId: label.id, pos: null });
                  }}
                />
              );
            })}
            {burst && <Burst key={burst.key} position={burst.at} calm={calm} />}
          </GameStage>
          <div className="m3d-labels" aria-hidden="true">
            {data.targets.map((t, i) => (
              <div key={t.id} className="m3d-anchor" data-anchor={`ring-${t.id}`}><span className="m3d-ring-num">{i + 1}</span></div>
            ))}
            {data.labels.map((label) => (
              <div key={label.id} className="m3d-anchor" data-anchor={`tag-${label.id}`}>
                <div className={`m3d-tag ${selected === label.id ? 'is-selected' : ''}`}>{label.text}</div>
              </div>
            ))}
          </div>
        </div>
      }
      panel={
        <>
          <p className="m3d-panel__eyebrow">{data.specimen.group}</p>
          <p className="m3d-panel__prompt">{data.specimen.commonName} <em>({data.specimen.scientificName})</em></p>
          <p className="m3d-hint">{data.instructions}</p>
          <h3 className="m3d-panel__h">Labels</h3>
          <div className="m3d-options m3d-options--compact">
            {data.labels.map((label) => {
              const zone = zoneOfLabel(label.id);
              return (
                <button key={label.id} type="button" className={`m3d-option ${selected === label.id ? 'is-selected' : ''} ${zone ? 'is-placed' : ''}`} aria-pressed={selected === label.id} onClick={() => setSelected((s) => (s === label.id ? null : label.id))} disabled={verified || !started}>
                  <strong>{label.text}</strong>
                  <span>{zone ? `On ring ${data.targets.findIndex((t) => t.id === zone) + 1}` : label.hint}</span>
                </button>
              );
            })}
          </div>
          <h3 className="m3d-panel__h">Rings</h3>
          <div className="m3d-rings">
            {data.targets.map((t, i) => {
              const state = ringState(t);
              const placed = placements[t.id] ? data.labels.find((l) => l.id === placements[t.id]) : null;
              return (
                <button key={t.id} type="button" className={`m3d-ring is-${state}`} onClick={() => (selected ? place(selected, t.id) : placed && unplace(t.id))} disabled={verified || !started || (!selected && !placed)}>
                  <span className="m3d-ring-num">{i + 1}</span> {placed ? placed.text : selected ? 'Place here' : 'Empty'}
                </button>
              );
            })}
          </div>
          {verified && <p className={`m3d-message is-${correctCount === data.targets.length ? 'ok' : 'warn'}`} role="status">{data.explanation}</p>}
          <div className="m3d-actions">
            {!verified ? (
              <Button size="lg" icon="check" onClick={verify} disabled={!started || Object.keys(placements).length === 0}>Check placements</Button>
            ) : (
              <Button size="lg" iconRight="chevron-right" onClick={submit} disabled={Boolean(finale)}>Finish mission</Button>
            )}
          </div>
        </>
      }
    />
  );
}
