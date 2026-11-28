/**
 * Thin React wrapper around the plain-JavaScript inspection engine.
 * It only mounts the engine, passes sounds through, and hands the answers
 * (marks and chosen answers, never a score) to the mission page for submitting.
 */
import { useEffect, useRef } from 'react';
import { scoreMission } from '../../../utils/scoring.js';
import { GAME_TYPES } from '../../../constants/gameTypes.js';
import { graphicsTier, prefersReducedMotion } from '../../missions3d/capability.js';
import { useMissionSound } from '../sound/MissionSound.jsx';
import { createInspectionGame } from './inspectionEngine.js';
import './inspection.css';

export default function InspectionGame({ mission, onComplete }) {
  const hostRef = useRef(null);
  const sound = useMissionSound();
  // Latest callbacks without restarting the engine.
  const latest = useRef({ sound, onComplete });
  useEffect(() => {
    latest.current = { sound, onComplete };
  }, [sound, onComplete]);

  useEffect(() => {
    const calibrate = new URLSearchParams(window.location.search).get('calibrate') === '1';
    const game = createInspectionGame(hostRef.current, {
      data: mission.scenarioData,
      reducedMotion: prefersReducedMotion(),
      calibrate,
      // Weak devices: the microscope keeps only its vignette and focus blur.
      light: graphicsTier() !== 'high',
      // The lens click of the microscope uses the existing pick-up sound.
      onSound: (name) => latest.current.sound[name === 'lens' ? 'pickup' : name]?.(),
      // A local preview only; the server scores the submitted marks itself.
      scoreAnswers: (answers) => scoreMission({ gameType: GAME_TYPES.INSPECTION, scenarioData: mission.scenarioData, answers }),
      onFinish: (answers) => {
        if (!calibrate) latest.current.onComplete(answers);
      },
    });
    return () => game.destroy();
  }, [mission]);

  return <div ref={hostRef} className="inspection-game" />;
}
