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
});

export const GAME_TYPE_INFO = Object.freeze({
  [GAME_TYPES.DECISION_MAKING]: {
    label: 'Decision-Making',
    shortDescription: 'Read a farm crisis scenario and choose the best of three decision cards.',
  },
  [GAME_TYPES.IDENTIFICATION]: {
    label: 'Identification',
    shortDescription: 'Inspect leaves with a zoom scope, mark symptoms, then identify the pathogen.',
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
});

/** IPM control tactic categories used by the Module 5 strategy game. */
export const TACTIC_CATEGORIES = Object.freeze({
  CULTURAL: 'cultural',
  BIOLOGICAL: 'biological',
  MECHANICAL: 'mechanical',
  CHEMICAL: 'chemical',
});
