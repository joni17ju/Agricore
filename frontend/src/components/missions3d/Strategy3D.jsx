import { animated, useSpring } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';
import { ProgressBar } from '../common/Progress.jsx';
import GameStage, { Anchor, Burst } from './GameStage.jsx';
import { particleCount } from './capability.js';
import Shell3D, { useFinale, useXpPops } from './Shell3D.jsx';
import { computeStrategyMeters, scoreMission } from '../../utils/scoring.js';
import { GAME_TYPES } from '../../constants/gameTypes.js';

/**
 * Strategy and Management in 3D: pests swarm over the crop. Diagnose the
 * pest from the field observations, choose the required number of control
 * tactics from the tool shelf (watch the resource and environment meters),
 * then deploy — the field shows whether the plan saves the crop. Same answers
 * as the 2D game: { pestId, tacticIds }.
 */
const TOOL_COLORS = { cultural: '#6aa84f', biological: '#e06666', mechanical: '#8e7cc3', chemical: '#f1c232' };
const DEPLOY_MS = 1400;

function Swarm({ count, calm, fleeing }) {
  const group = useRef();
  const bugs = useMemo(() => Array.from({ length: count }, (_, i) => ({ x: ((i * 37) % 19) - 9.5, z: -1 - ((i * 53) % 9), phase: i * 0.9 })), [count]);
  const away = useRef(0);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (fleeing) away.current = Math.min(1, away.current + delta * 0.8);
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const b = bugs[i];
      const hop = calm ? 0 : Math.abs(Math.sin(t * 4 + b.phase)) * 0.25;
      child.position.set(b.x + (calm ? 0 : Math.sin(t + b.phase) * 0.3), 1.05 + hop + away.current * 6, b.z);
      child.scale.setScalar(1 - away.current);
    });
  });
  return (
    <group ref={group}>
      {bugs.map((b, i) => (
        <mesh key={i} position={[b.x, 1.05, b.z]} castShadow>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color="#3b2416" />
        </mesh>
      ))}
    </group>
  );
}

function Tool({ tactic, x, z, selected, disabled, onPick }) {
  const [hover, setHover] = useState(false);
  const { y, scale } = useSpring({ y: selected ? 0.55 : 0, scale: hover && !disabled ? 1.1 : 1 });
  const color = TOOL_COLORS[tactic.category] ?? '#999';
  const shape =
    tactic.category === 'biological' ? <sphereGeometry args={[0.32, 14, 10]} />
    : tactic.category === 'chemical' ? <cylinderGeometry args={[0.24, 0.28, 0.7, 12]} />
    : tactic.category === 'mechanical' ? <boxGeometry args={[0.6, 0.5, 0.2]} />
    : <coneGeometry args={[0.32, 0.7, 6]} />;
  return (
    <animated.group position-x={x} position-y={y} position-z={z} scale={scale}>
      <mesh
        position={[0, 0.95, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = disabled ? '' : 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      >
        {shape}
        <meshStandardMaterial color={color} emissive={selected ? color : '#000'} emissiveIntensity={selected ? 0.35 : 0} roughness={0.6} />
      </mesh>
      <Anchor id={`tool-${tactic.id}`} position={[0, 0.32, 0.4]} />
    </animated.group>
  );
}

export default function Strategy3D({ mission, module, onComplete, calm }) {
  const data = mission.scenarioData;
  const [started, setStarted] = useState(false);
  const [pestId, setPestId] = useState('');
  const [tacticIds, setTacticIds] = useState([]);
  const [warning, setWarning] = useState('');
  const [phase, setPhase] = useState('planning');
  const [outcome, setOutcome] = useState(null);
  const { pops, pop } = useXpPops();
  const { finale, finish } = useFinale(onComplete, calm);

  const required = data.requiredTacticCount;
  const meters = computeStrategyMeters(data.tactics, tacticIds);
  const locked = phase !== 'planning' || !started;

  const toggle = (id) => {
    if (locked) return;
    setWarning('');
    if (tacticIds.includes(id)) setTacticIds(tacticIds.filter((t) => t !== id));
    else if (tacticIds.length >= required) setWarning(`Select only ${required} tactics — deselect one first.`);
    else setTacticIds([...tacticIds, id]);
  };

  const deploy = () => {
    const result = scoreMission({ gameType: GAME_TYPES.STRATEGY_MANAGEMENT, scenarioData: data, answers: { pestId, tacticIds } });
    setOutcome(result);
    setPhase('deploying');
    window.setTimeout(() => {
      setPhase('outcome');
      pop(result.isPassed ? 'Crop saved!' : 'Pests remain', result.isPassed ? 'good' : 'bad');
    }, calm ? 200 : DEPLOY_MS);
  };

  const submit = () => finish({ pestId, tacticIds }, outcome?.isPassed);

  const saved = phase === 'outcome' && outcome?.isPassed;
  const cols = Math.min(4, data.tactics.length);
  const toolPos = (i) => [((i % cols) - (cols - 1) / 2) * 1.6, 2.4 + Math.floor(i / cols) * 1.2];

  return (
    <Shell3D
      kicker={`Module ${module.moduleNumber} · Strategy`}
      title={data.title}
      started={started}
      onStart={() => setStarted(true)}
      steps={[
        'Read the field observations and diagnose the pest.',
        `Choose ${required} control tactics from the tool shelf. Keep resource use low and the environmental score high.`,
        'Deploy the plan and watch the field.',
      ]}
      hud={{ progress: { done: (pestId ? 1 : 0) + tacticIds.length, total: 1 + required } }}
      pops={pops}
      finale={finale}
      stage={
        <>
        <GameStage mood={saved ? 'healthy' : phase === 'outcome' ? 'stressed' : 'stressed'} calm={calm} camera={{ position: [0, 5.2, 10.5], fov: 46 }} target={[0, 1.2, 0.5]} label={`${data.crop ?? 'Crop'} field with a pest problem`}>
          <Swarm count={calm ? 18 : particleCount(34)} calm={calm} fleeing={saved} />
          {/* Tool shelf */}
          <mesh position={[0, 0.5, 2.9]} castShadow receiveShadow>
            <boxGeometry args={[cols * 1.6 + 0.4, 0.14, 2.6]} />
            <meshStandardMaterial color="#c9a36b" />
          </mesh>
          {data.tactics.map((tactic, i) => {
            const [x, z] = toolPos(i);
            const selected = tacticIds.includes(tactic.id);
            return <Tool key={tactic.id} tactic={tactic} x={x} z={z} selected={selected} disabled={locked || (!selected && tacticIds.length >= required)} onPick={() => toggle(tactic.id)} />;
          })}
          {phase === 'deploying' && <Burst key="deploy" position={[0, 2, -2]} count={40} color="#b4ffc8" calm={calm} />}
          {saved && <Burst key="saved" position={[0, 2.5, -2]} count={40} calm={calm} />}
        </GameStage>
        <div className="m3d-labels" aria-hidden="true">
          {data.tactics.map((tactic) => (
            <div key={tactic.id} className="m3d-anchor" data-anchor={`tool-${tactic.id}`}>
              <div className={`m3d-tag ${tacticIds.includes(tactic.id) ? 'is-selected' : ''}`}>{tactic.name}</div>
            </div>
          ))}
        </div>
        </>
      }
      panel={
        <>
          {data.guideMessage && <p className="m3d-panel__prompt">{data.guideMessage}</p>}
          <h3 className="m3d-panel__h">1. Field observations</h3>
          <ul className="m3d-list">
            {(data.observations ?? []).map((o) => <li key={o}>{o}</li>)}
          </ul>
          <label className="m3d-select">
            <span>Diagnose the pest</span>
            <select value={pestId} onChange={(e) => !locked && setPestId(e.target.value)} disabled={locked}>
              <option value="">Choose a pest…</option>
              {data.pestOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <h3 className="m3d-panel__h">2. Control tactics (choose {required})</h3>
          <div className="m3d-options m3d-options--compact">
            {data.tactics.map((tactic) => {
              const selected = tacticIds.includes(tactic.id);
              return (
                <button key={tactic.id} type="button" className={`m3d-option ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => toggle(tactic.id)} disabled={locked}>
                  <strong>{tactic.name}</strong>
                  <span>{tactic.category} · cost {tactic.resourceCost} · eco impact {tactic.environmentalImpact}</span>
                </button>
              );
            })}
          </div>
          {warning && <p className="m3d-message is-warn" role="status">{warning}</p>}
          <div className="m3d-meters">
            <div><span>Resource usage</span><ProgressBar value={meters.resourceUsage} /><strong>{meters.resourceUsage}%</strong></div>
            <div><span>Environmental score ({meters.environmentalGrade})</span><ProgressBar value={meters.environmentalScore} /><strong>{meters.environmentalScore}%</strong></div>
          </div>
          {phase === 'outcome' && (
            <p className={`m3d-message is-${outcome.isPassed ? 'ok' : 'error'}`} role="status">
              <Icon name={outcome.isPassed ? 'sparkles' : 'alert'} size={15} /> Strategy score: {outcome.score}%. {outcome.isPassed ? 'The pests are under control.' : 'The plan did not stop the pests.'}
            </p>
          )}
          <div className="m3d-actions">
            {phase !== 'outcome' ? (
              <Button size="lg" icon="shield" onClick={deploy} disabled={locked || !pestId || tacticIds.length !== required}>Deploy strategy</Button>
            ) : (
              <Button size="lg" iconRight="chevron-right" onClick={submit} disabled={Boolean(finale)}>Finish mission</Button>
            )}
          </div>
        </>
      }
    />
  );
}
