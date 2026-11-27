import { animated, useSpring } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';
import GameStage, { Anchor, Burst } from './GameStage.jsx';
import Shell3D, { useFinale, useXpPops } from './Shell3D.jsx';
import { scoreMission } from '../../utils/scoring.js';
import { GAME_TYPES } from '../../constants/gameTypes.js';

/**
 * Decision-Making in 3D: three signboards stand in the field, one per
 * decision. The farm shows the consequence of the choice — the crops stay
 * green and bees arrive after the best call, yellow after a partial one,
 * wilt with a pest swarm after a poor one. Same answers as the 2D game:
 * { choices: { [scenarioId]: choiceId } }.
 */
function outcomeTone(choice, scenario) {
  const best = Math.max(...scenario.choices.map((c) => c.points));
  if (choice.points === best) return 'best';
  return choice.points > 0 ? 'partial' : 'poor';
}

const MOOD = { best: 'healthy', partial: 'recovering', poor: 'stressed' };

function Signboard({ index, x, state, onPick, calm }) {
  const [hover, setHover] = useState(false);
  const { y, scale, tilt } = useSpring({
    from: { y: -1.6 },
    y: state === 'faded' ? -0.5 : 0,
    scale: state === 'chosen' ? 1.12 : hover ? 1.06 : 1,
    tilt: state === 'chosen' ? -0.08 : 0,
    delay: calm ? 0 : index * 120,
    immediate: calm,
    config: { tension: 220, friction: 18 },
  });
  const color = state === 'chosen' ? '#f6d66b' : state === 'faded' ? '#cbbf9f' : hover ? '#fff4cf' : '#f4ead2';
  return (
    <animated.group position-x={x} position-y={y} position-z={2.7} scale={scale} rotation-x={tilt}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 1.2, 6]} />
        <meshStandardMaterial color="#7a5733" />
      </mesh>
      <mesh
        position={[0, 1.55, 0]}
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
      >
        <boxGeometry args={[1.85, 1.0, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <Anchor id={`sign-${index}`} position={[0, 1.55, 0.08]} />
    </animated.group>
  );
}

/** Bees after a good call, a pest swarm after a poor one. */
function Visitors({ kind, calm }) {
  const group = useRef();
  const items = useMemo(() => Array.from({ length: kind === 'pests' ? 26 : 10 }, (_, i) => ({ r: 1.5 + (i % 5) * 0.6, speed: 0.6 + (i % 3) * 0.3, phase: i * 1.7, h: 1.2 + (i % 4) * 0.3 })), [kind]);
  useFrame(({ clock }) => {
    if (!group.current || calm) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const it = items[i];
      child.position.set(Math.cos(t * it.speed + it.phase) * it.r, it.h + Math.sin(t * 3 + it.phase) * 0.2, -2 + Math.sin(t * it.speed + it.phase) * it.r * 0.6);
    });
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i} position={[Math.cos(it.phase) * it.r, it.h, -2]} castShadow>
          <sphereGeometry args={[kind === 'pests' ? 0.09 : 0.12, 8, 6]} />
          <meshStandardMaterial color={kind === 'pests' ? '#3b2416' : '#f2c230'} emissive={kind === 'pests' ? '#000' : '#5a4300'} />
        </mesh>
      ))}
    </group>
  );
}

export default function Decision3D({ mission, module, onComplete, calm, onSwitch2D }) {
  const { scenarios, title } = mission.scenarioData;
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState({});
  const [streak, setStreak] = useState(0);
  const { pops, pop } = useXpPops();
  const { finale, finish } = useFinale(onComplete, calm);

  const scenario = scenarios[index];
  const chosenId = choices[scenario.id];
  const chosen = scenario.choices.find((c) => c.id === chosenId);
  const tone = chosen ? outcomeTone(chosen, scenario) : null;
  const isLast = index === scenarios.length - 1;

  const choose = (choiceId) => {
    if (!started || chosenId || finale) return;
    const choice = scenario.choices.find((c) => c.id === choiceId);
    const nextTone = outcomeTone(choice, scenario);
    setChoices((previous) => ({ ...previous, [scenario.id]: choiceId }));
    if (nextTone === 'best') {
      setStreak((s) => s + 1);
      pop(streak >= 1 ? `Best call! ${streak + 1}× combo` : 'Best call!', 'good');
    } else {
      setStreak(0);
      pop(nextTone === 'partial' ? 'Partly effective' : 'Poor outcome', nextTone === 'partial' ? 'warn' : 'bad');
    }
  };

  const advance = () => {
    if (!isLast) {
      setIndex((i) => i + 1);
      return;
    }
    const preview = scoreMission({ gameType: GAME_TYPES.DECISION_MAKING, scenarioData: mission.scenarioData, answers: { choices } });
    finish({ choices }, preview.isPassed);
  };

  const xs = scenario.choices.length === 2 ? [-1.25, 1.25] : scenario.choices.map((_, i) => (i - (scenario.choices.length - 1) / 2) * 2.2);

  return (
    <Shell3D
      kicker={`Module ${module.moduleNumber} · Decision`}
      title={title}
      started={started}
      onStart={() => setStarted(true)}
      onSwitch2D={onSwitch2D}
      steps={[
        'Read the farm situation.',
        'Pick one of the decision signboards in the field (or the matching button).',
        'Watch what happens to the crops, read why, then go on to the next situation.',
      ]}
      hud={{ progress: { done: Object.keys(choices).length, total: scenarios.length }, streak }}
      pops={pops}
      finale={finale}
      stage={
        <>
        <GameStage mood={tone ? MOOD[tone] : 'healthy'} calm={calm} camera={{ position: [0, 3.3, 11.8], fov: 42 }} target={[0, 1.4, 1.5]} label={`Farm scene for: ${scenario.prompt}`}>
          {scenario.choices.map((choice, i) => (
            <Signboard
              key={`${scenario.id}-${choice.id}`}
              choice={choice}
              index={i}
              x={xs[i]}
              calm={calm}
              state={!chosenId ? 'open' : choice.id === chosenId ? 'chosen' : 'faded'}
              onPick={() => choose(choice.id)}
            />
          ))}
          {tone === 'best' && <Visitors kind="bees" calm={calm} />}
          {tone === 'poor' && <Visitors kind="pests" calm={calm} />}
          {tone === 'best' && <Burst key={`b-${scenario.id}`} position={[xs[scenario.choices.findIndex((c) => c.id === chosenId)], 2, 2.7]} calm={calm} />}
        </GameStage>
        <div className="m3d-labels" aria-hidden="true">
          {scenario.choices.map((choice, i) => (
            <div key={`${scenario.id}-${choice.id}`} className="m3d-anchor" data-anchor={`sign-${i}`}>
              <div className={`m3d-sign ${chosenId && choice.id !== chosenId ? 'is-faded' : ''}`}>
                <span className="m3d-sign__num">{i + 1}</span>
                <span className="m3d-sign__title">{choice.title}</span>
              </div>
            </div>
          ))}
        </div>
        </>
      }
      panel={
        <>
          <p className="m3d-panel__eyebrow">Situation {index + 1} of {scenarios.length}</p>
          <p className="m3d-panel__prompt">{scenario.prompt}</p>
          <div className="m3d-choices" role="radiogroup" aria-label="Decisions">
            {scenario.choices.map((choice, i) => {
              const isChosen = choice.id === chosenId;
              const cardTone = chosenId ? outcomeTone(choice, scenario) : '';
              return (
                <button
                  key={`${scenario.id}-${choice.id}`}
                  type="button"
                  role="radio"
                  aria-checked={isChosen}
                  className={`m3d-choice ${chosenId ? `is-revealed tone-${cardTone}` : ''} ${isChosen ? 'is-chosen' : ''}`}
                  onClick={() => choose(choice.id)}
                  disabled={!started || (Boolean(chosenId) && !isChosen)}
                >
                  <span className="m3d-choice__num">{i + 1}</span>
                  <span className="m3d-choice__text">
                    <strong>{choice.title}</strong>
                    <span>{chosenId ? choice.outcome : choice.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {chosen && (
            <div className={`m3d-feedback tone-${tone}`} role="status">
              <Icon name={tone === 'best' ? 'sparkles' : 'info'} size={18} />
              <p>{scenario.explanation}</p>
              <Button iconRight={isLast ? 'check' : 'arrow-right'} onClick={advance} disabled={Boolean(finale)}>
                {isLast ? 'Finish mission' : 'Next situation'}
              </Button>
            </div>
          )}
        </>
      }
    />
  );
}
