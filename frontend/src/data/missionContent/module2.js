/**
 * Module 2 (Plant Pathology) mission level added with the CP1 Week 3–5 lesson
 * content. Situations, correct answers and feedback come from the "Concepts of
 * Plant Diseases" text of the Week 2–11 lesson document; nothing is added
 * beyond what the document states.
 *
 * Module 2 plays identification, which marks symptoms on a specimen and names
 * the pathogen. These concepts (disease triangle, pathogen vs disease, symptom
 * vs sign, injury vs disease) are not a specimen to inspect, so the level sets
 * its own `gameType` and plays as a decision-making scenario, as Module 4's
 * concept levels do (see missionGameType).
 *
 * Level numbers continue across the module: Plant Pathology 1, Concepts of
 * Plant Diseases 2, Causes 3–4, Disease Cycle 5–6, Epidemiology 7–8,
 * Variability 9.
 */

const DECIDE = 'Read each situation, then choose the best decision card.';

export const module2ConceptMissions = [
  {
    _id: 'mis_2_9',
    lessonId: 'les_2_6',
    levelNumber: 2,
    maxXP: 150,
    gameType: 'decision-making',
    scenarioData: {
      title: 'Is It Really a Disease?',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'rice-field',
          prompt: 'A farmer plants a susceptible rice variety in a field where the pathogen is present, but the weather stays dry and does not favour the pathogen. What does the disease triangle predict?',
          dataVisual: { value: '2 of 3', label: 'Disease triangle factors', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'sun', title: 'Disease is unlikely', description: 'One side of the triangle is missing.', outcome: 'Correct. Disease occurs only when a susceptible plant, a harmful pathogen and a favourable environment are present together, so removing any one of them reduces or stops it.', points: 100 },
            { id: 'c2', icon: 'bug', title: 'Disease is certain: the pathogen is there', description: 'The pathogen alone is enough.', outcome: 'The pathogen alone is not enough. The environment must also favour it, for example warm, wet weather that helps fungal spores spread and infect.', points: 0 },
            { id: 'c3', icon: 'seedling', title: 'Disease is certain: the variety is susceptible', description: 'A susceptible host always gets sick.', outcome: 'A susceptible host is only one side of the triangle. Without a favourable environment, disease is reduced or stopped.', points: 0 },
          ],
          explanation: 'The disease triangle: disease needs a susceptible host, a virulent pathogen and a favourable environment at the same time.',
        },
        {
          id: 's2',
          sceneKey: 'tomato-field',
          prompt: 'Potato plants collapse with late blight. A classmate writes in the report: "The disease is Phytophthora infestans." Which statement is correct?',
          dataVisual: { value: 'Late blight', label: 'Disease in the field', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'microscope', title: 'Phytophthora infestans is the pathogen', description: 'Late blight is the disease it causes.', outcome: 'Correct. The pathogen is the organism that causes the problem, while the disease is what happens to the plant: Phytophthora infestans (pathogen) and late blight (disease).', points: 100 },
            { id: 'c2', icon: 'check', title: 'The report is right', description: 'Pathogen and disease mean the same thing.', outcome: 'A pathogen is not the same as a disease. The pathogen causes the problem; the disease is what happens to the plant.', points: 0 },
            { id: 'c3', icon: 'refresh', title: 'Late blight is the pathogen', description: 'Phytophthora infestans is the disease.', outcome: 'This swaps the two. Phytophthora infestans is the pathogen and late blight is the disease.', points: 0 },
          ],
          explanation: 'A pathogen is not the same as a disease: the pathogen is the organism that causes the problem, while the disease is what happens to the plant.',
        },
        {
          id: 's3',
          sceneKey: 'eggplant-field',
          prompt: 'You cut the stem of a wilted plant and a sticky, milky liquid comes out of the cut tissue. What have you found?',
          dataVisual: { value: 'Ooze', label: 'Seen at the cut stem', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'droplet', title: 'A sign: bacterial ooze', description: 'Something you see of the pathogen itself.', outcome: 'Correct. Bacterial ooze, a sticky or milky liquid from cut or diseased tissue, is a sign. Signs often allow a quicker and more certain identification.', points: 100 },
            { id: 'c2', icon: 'eye', title: 'A symptom of necrosis', description: 'A change in the plant tissue.', outcome: 'A symptom is a change you see in the plant, such as leaf spots or rots. The liquid is something of the pathogen, so it is a sign.', points: 0 },
            { id: 'c3', icon: 'alert', title: 'An abiotic disorder', description: 'A non-living cause.', outcome: 'Abiotic disorders show no sign of a pest or pathogen. Ooze is a sign of a bacterial pathogen.', points: 0 },
          ],
          explanation: 'A symptom is what you see change in the plant; a sign is something you see of the pathogen, which often allows a quicker and more certain identification.',
        },
        {
          id: 's4',
          sceneKey: 'corn-field',
          prompt: 'A hailstorm tears the leaves of a cornfield in one afternoon. In the following weeks the damage does not grow or spread to other plants. How is this damage described?',
          dataVisual: { value: '1 day', label: 'Time the damage took', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'x-circle', title: 'Injury', description: 'One-time damage.', outcome: 'Correct. Injury is a one-time damage. A plant is diseased when its normal processes are disturbed over time.', points: 100 },
            { id: 'c2', icon: 'bug', title: 'A biotic disease', description: 'Caused by a living organism.', outcome: 'Biotic diseases are caused by living organisms and spread. This damage came from the weather and did not spread.', points: 0 },
            { id: 'c3', icon: 'clock', title: 'A disease', description: 'Normal processes disturbed over time.', outcome: 'A disease disturbs the plant’s normal processes over time. Damage done once, by hail, is injury.', points: 20 },
          ],
          explanation: 'A plant is diseased when its normal processes are disturbed over time, unlike injury, which is a one-time damage.',
        },
      ],
    },
  },
];
