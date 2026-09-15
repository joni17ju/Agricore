/**
 * Turns a scoring breakdown into readable feedback lines for the result screen.
 * Each line: { ok: boolean, title: string, detail?: string }
 */
import { GAME_TYPES } from '../../constants/gameTypes.js';

function quizFeedback(scenarioData, breakdown) {
  return breakdown.results.map((result, index) => {
    const question = scenarioData.questions.find((q) => q.id === result.questionId);
    const correct = question.options.find((o) => o.id === question.correctOptionId);
    return {
      ok: result.isCorrect,
      title: `Q${index + 1}. ${question.prompt}`,
      detail: result.isCorrect ? question.explanation : `Correct answer: ${correct.text}. ${question.explanation}`,
    };
  });
}

function decisionFeedback(scenarioData, breakdown) {
  return breakdown.results.map((result, index) => {
    const scenario = scenarioData.scenarios.find((s) => s.id === result.scenarioId);
    const chosen = scenario.choices.find((c) => c.id === result.choiceId);
    const best = scenario.choices.reduce((a, b) => (b.points > a.points ? b : a));
    return {
      ok: result.isBest,
      title: `Scenario ${index + 1}: you chose “${chosen?.title ?? 'no decision'}”`,
      detail: result.isBest ? scenario.explanation : `Best decision: “${best.title}”. ${scenario.explanation}`,
    };
  });
}

function identificationFeedback(scenarioData, breakdown) {
  const correct = scenarioData.pathogenOptions.find((p) => p.id === scenarioData.correctPathogenId);
  return [
    {
      ok: breakdown.spotsFound === breakdown.totalSpots,
      title: `Symptoms marked: ${breakdown.spotsFound} of ${breakdown.totalSpots}`,
      detail: breakdown.misplacedMarks ? `${breakdown.misplacedMarks} mark(s) placed on healthy tissue (−5 each).` : 'No marks on healthy tissue.',
    },
    {
      ok: breakdown.identified && breakdown.wrongGuesses === 0,
      title: `Pathogen: ${correct.commonName} (${correct.scientificName})`,
      detail: breakdown.wrongGuesses
        ? `${breakdown.wrongGuesses} incorrect identification(s) before the right answer (−25 each).`
        : 'Identified on the first try.',
    },
    { ok: true, title: 'Why', detail: scenarioData.explanation },
  ];
}

function matchingFeedback(scenarioData, breakdown) {
  const lines = scenarioData.columns.map((column) => {
    const result = breakdown.results.find((r) => r.columnKey === column.key);
    const chosen = column.options.find((o) => o.id === result.selectedOptionId);
    const correct = column.options.find((o) => o.id === column.correctOptionId);
    return {
      ok: result.isCorrect,
      title: `${column.title}: ${chosen ? chosen.label : 'no answer'}`,
      detail: result.isCorrect ? correct.sublabel : `Correct match: ${correct.label} — ${correct.sublabel}`,
    };
  });
  lines.push({
    ok: breakdown.beatClock,
    title: breakdown.beatClock ? 'Beat the clock (+10)' : 'Beat the clock',
    detail: breakdown.beatClock ? 'All matches correct before time ran out.' : 'Complete all three correct matches before the timer ends for the bonus.',
  });
  lines.push({ ok: true, title: `${scenarioData.target.commonName} (${scenarioData.target.scientificName})`, detail: scenarioData.explanation });
  return lines;
}

function dragDropFeedback(scenarioData, breakdown) {
  const labelText = (id) => scenarioData.labels.find((l) => l.id === id)?.text;
  return [
    ...breakdown.results.map((result, index) => ({
      ok: result.isCorrect,
      title: `Target ${index + 1}: ${labelText(result.labelId) ?? 'left empty'}`,
      detail: result.isCorrect ? 'Correct placement.' : `Correct label: ${labelText(scenarioData.targets[index].correctLabelId)}`,
    })),
    { ok: true, title: `${scenarioData.specimen.commonName} (${scenarioData.specimen.scientificName})`, detail: scenarioData.explanation },
  ];
}

function strategyFeedback(scenarioData, breakdown, answers) {
  const pest = scenarioData.pestOptions.find((p) => p.id === scenarioData.correctPestId);
  const chosenPest = scenarioData.pestOptions.find((p) => p.id === answers?.pestId);
  const bestNames = scenarioData.tactics.filter((t) => scenarioData.bestTacticIds.includes(t.id)).map((t) => t.name);
  return [
    {
      ok: breakdown.goals.diagnosed,
      title: `Diagnosis: ${chosenPest?.name ?? 'none'}`,
      detail: breakdown.goals.diagnosed ? 'Correct diagnosis.' : `The field clues point to ${pest.name} (${pest.scientificName}).`,
    },
    {
      ok: breakdown.isBestCombination,
      title: `Tactics deployed: ${breakdown.goals.deployedRequired ? scenarioData.requiredTacticCount : 'incomplete'}`,
      detail: breakdown.isBestCombination ? 'You chose the most effective combination.' : `Most effective combination: ${bestNames.join(' + ')}.`,
    },
    {
      ok: breakdown.goals.environmentalGoalMet,
      title: `Environmental score: ${breakdown.environmentalScore}% (${breakdown.environmentalGrade})`,
      detail: breakdown.goals.environmentalGoalMet ? 'A+ environmental goal achieved.' : 'Goal not met — the plan harms beneficial organisms or the environment.',
    },
    { ok: true, title: 'Why', detail: scenarioData.explanation },
  ];
}

export function describeFeedback({ gameType, scenarioData, breakdown, answers }) {
  if (scenarioData.kind === 'quiz') return quizFeedback(scenarioData, breakdown);
  switch (gameType) {
    case GAME_TYPES.DECISION_MAKING:
      return decisionFeedback(scenarioData, breakdown);
    case GAME_TYPES.IDENTIFICATION:
      return identificationFeedback(scenarioData, breakdown);
    case GAME_TYPES.MATCHING:
      return matchingFeedback(scenarioData, breakdown);
    case GAME_TYPES.DRAG_AND_DROP:
      return dragDropFeedback(scenarioData, breakdown);
    case GAME_TYPES.STRATEGY_MANAGEMENT:
      return strategyFeedback(scenarioData, breakdown, answers);
    default:
      return [];
  }
}

/** Short "how to play" bullets for the mission intro screen. */
export const HOW_TO_PLAY = {
  quiz: ['Read each question and choose one answer.', 'Check your answer to see the explanation.', 'Score 70% or higher to pass the module.'],
  [GAME_TYPES.DECISION_MAKING]: [
    'Read the crisis scenario presented by the guide.',
    'Tap one of the three decision cards.',
    'See the outcome of your choice, then move to the next scenario.',
  ],
  [GAME_TYPES.IDENTIFICATION]: [
    'Use the zoom scope to inspect the specimen closely.',
    'Tap each symptom to mark it with a red circle.',
    'When every symptom is marked, identify the correct pathogen to unlock NEXT LEVEL.',
  ],
  [GAME_TYPES.MATCHING]: [
    'Study the target pest and its hint.',
    'Match its classification, damage type and management tactic.',
    'Finish all three correctly before the countdown ends for a time bonus.',
  ],
  [GAME_TYPES.DRAG_AND_DROP]: [
    'Drag each structural label onto its flashing target zone (or tap a label, then tap a zone).',
    'Tap a placed label to move it back to the dock.',
    'Press Verify Identification before the timer runs out.',
  ],
  [GAME_TYPES.STRATEGY_MANAGEMENT]: [
    'Read the field observations and diagnose the pest.',
    'Choose the required number of control tactics while watching the meters.',
    'Deploy a strategy that saves the crop and keeps an A+ environmental score.',
  ],
};
