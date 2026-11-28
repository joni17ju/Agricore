/* Ported verbatim from frontend/src/constants/gameTypes.js. */
/**
 * The five game types from Table 1 / Scope item 7 of the proposal.
 * `modules.gameType` stores one of these keys.
 */
export const GAME_TYPES = Object.freeze({
  DECISION_MAKING: 'decision-making',
  IDENTIFICATION: 'identification',
  MATCHING: 'matching',
  DRAG_AND_DROP: 'drag-and-drop',
  STRATEGY_MANAGEMENT: 'strategy-management',
  // A general engine: inspect a photo with a zoom scope, mark findings, then answer a question.
  INSPECTION: 'inspection',
});

export const GAME_TYPE_INFO = Object.freeze({
  [GAME_TYPES.DECISION_MAKING]: {
    label: 'Decision-Making',
    shortDescription: 'Read a farm crisis scenario and choose the best of three decision cards.',
  },
  [GAME_TYPES.IDENTIFICATION]: {
    // Shown as Module 2's game everywhere (module card, course map, mission screens, instructor lists).
    label: 'Leaf Inspection',
    shortDescription: 'Look over the leaf with a zoom scope, mark the symptoms you find, then identify the pathogen or cause.',
  },
  [GAME_TYPES.MATCHING]: {
    label: 'Matching',
    shortDescription: 'Match a target pest to its classification, damage type and management tactic before time runs out.',
  },
  [GAME_TYPES.DRAG_AND_DROP]: {
    label: 'Drag-and-Drop',
    shortDescription: 'Drag structural labels onto the flashing target zones of a weed specimen.',
  },
  [GAME_TYPES.STRATEGY_MANAGEMENT]: {
    label: 'Strategy & Management',
    shortDescription: 'Diagnose the pest problem and deploy the best combination of eco-friendly tactics.',
  },
  [GAME_TYPES.INSPECTION]: {
    label: 'Inspection',
    shortDescription: 'Look over the leaf with a zoom scope, mark the symptoms, look closer under the microscope, then identify the pathogen or cause.',
  },
});

/** IPM control tactic categories used by the Module 5 strategy game. */
export const TACTIC_CATEGORIES = Object.freeze({
  CULTURAL: 'cultural',
  BIOLOGICAL: 'biological',
  MECHANICAL: 'mechanical',
  CHEMICAL: 'chemical',
});

/**
 * The game a mission is played as. A mission may name its own game type (for
 * example a decision scenario inside a drag-and-drop module); otherwise it
 * plays its module's game.
 */
export const missionGameType = (module, mission) => mission?.gameType ?? module.gameType;
