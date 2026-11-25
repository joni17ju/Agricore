/**
 * Module 3 (Agricultural Entomology) mission levels added with the CP1 Week 8–10
 * lesson content. Situations, correct answers and feedback come from the Week
 * 8, 9 and 10 text of the Week 2–11 lesson document; nothing is added beyond
 * what the document states.
 *
 * Module 3 plays matching (pest → order, damage, tactic). The two representative
 * pest levels use it as is. The Week 8 (mouthparts, metamorphosis, the three
 * R's) and Week 9 (order recognition) levels are questions about concepts, not
 * one pest to match, so they set their own `gameType` and play as
 * decision-making scenarios (see missionGameType).
 *
 * Level numbers continue across the module: Arthropod Pests 1–2, Why Insects
 * Succeed 3, Recognizing Insect Orders 4, Representative Insect Pests 5–6,
 * Vertebrate Pests 7–8, Natural Enemies 9.
 */

const DECIDE = 'Read each situation, then choose the best decision card.';
const MATCH = 'Identify the pest, then match its classification, damage type and management tactic.';

const classification = 'Order / Classification';
const damage = 'Physical / Damage Characteristics';
const tactic = 'Appropriate Management Tactic';

const orderOptions = [
  { id: 'o1', label: 'Hemiptera', sublabel: 'True bugs, hoppers', imageKey: 'bug' },
  { id: 'o2', label: 'Lepidoptera', sublabel: 'Moths & butterflies', imageKey: 'moth' },
  { id: 'o3', label: 'Coleoptera', sublabel: 'Beetles', imageKey: 'beetle' },
  { id: 'o4', label: 'Orthoptera', sublabel: 'Grasshoppers', imageKey: 'grasshopper' },
];
const damageOptions = [
  { id: 'd1', label: 'Chewing mouthparts', sublabel: 'Holes in leaves, defoliation', imageKey: 'damage-chewing' },
  { id: 'd2', label: 'Piercing-sucking mouthparts', sublabel: 'Yellowing, wilting, hopperburn', imageKey: 'damage-sucking' },
  { id: 'd3', label: 'Boring damage', sublabel: 'Tunnels in stems and fruits', imageKey: 'damage-boring' },
  { id: 'd4', label: 'Rasping-sucking mouthparts', sublabel: 'Silvery streaks, scarring', imageKey: 'damage-rasping' },
];
const lookAlikes = [
  { name: 'Green Leafhopper', group: 'Hemiptera', note: 'Tungro vector in rice', imageKey: 'leafhopper' },
  { name: 'Yellow Stem Borer', group: 'Lepidoptera', note: 'Deadheart and whitehead', imageKey: 'stem-borer' },
  { name: 'Rice Bug', group: 'Hemiptera', note: 'Piercing-sucking beak', imageKey: 'rice-bug' },
];

export const module3ConceptMissions = [
  {
    _id: 'mis_3_6',
    lessonId: 'les_3_4',
    levelNumber: 3,
    maxXP: 150,
    gameType: 'decision-making',
    scenarioData: {
      title: 'Mouthparts, Stages and Sprays',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'rice-paddy',
          prompt: 'Rice leaves are yellowing and plants wilt. There is honeydew on the leaves and sooty mould is growing on it. What kind of mouthparts does the pest most likely have?',
          dataVisual: { value: 'Honeydew', label: 'Seen on the leaves', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'droplet', title: 'Piercing-sucking', description: 'Planthoppers, aphids, true bugs, scales.', outcome: 'Correct. Piercing-sucking feeders cause yellowing, wilting, hopperburn, honeydew and sooty mould, and can transmit viruses.', points: 100 },
            { id: 'c2', icon: 'bug', title: 'Chewing', description: 'Grasshoppers, beetles, caterpillars.', outcome: 'Chewing pests leave holes in leaves, defoliation, borers in stems and fruits, or root feeding, not honeydew.', points: 0 },
            { id: 'c3', icon: 'layers', title: 'Rasping-sucking', description: 'Thrips.', outcome: 'Thrips leave silvery streaks, scarring and distorted growth. Honeydew and sooty mould point to piercing-sucking feeders.', points: 20 },
          ],
          explanation: 'Mouthparts decide the type of damage: piercing-sucking feeders cause yellowing, wilting, hopperburn, honeydew and sooty mould, and virus transmission.',
        },
        {
          id: 's2',
          sceneKey: 'tomato-field',
          prompt: 'Many adult moths fly over a vegetable field at night. A farmer wants to spray the moths to protect the crop. What fits the lesson?',
          dataVisual: { value: 'Night', label: 'When the moths fly', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'target', title: 'Control the larvae, not the adults', description: 'Use traps or pheromone lures.', outcome: 'Correct. Adult moths have siphoning mouthparts and do not damage plants (larvae do); adults pollinate. Control larvae, not adults, with traps or pheromone lures.', points: 100 },
            { id: 'c2', icon: 'spray', title: 'Spray the adult moths', description: 'They are the ones flying in the field.', outcome: 'Adults do not damage plants; the larvae do. Control is aimed at the stage that does the damage.', points: 0 },
            { id: 'c3', icon: 'eye-off', title: 'Ignore the moths and their larvae', description: 'Moths never matter.', outcome: 'The adults do not damage plants, but their larvae do. Many moths are active at night, which is why light traps and night scouting are effective.', points: 0 },
          ],
          explanation: 'Siphoning adults (moths and butterflies) do not damage plants; larvae do. Control larvae, not adults, with traps or pheromone lures.',
        },
        {
          id: 's3',
          sceneKey: 'corn-field',
          prompt: 'A moth pest with complete metamorphosis is found in a corn field. Which life stage usually damages the crop?',
          dataVisual: { value: '4 stages', label: 'Egg, larva, pupa, adult', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'bug', title: 'The larvae', description: 'Caterpillars feeding on the plant.', outcome: 'Correct. In complete metamorphosis, usually only the larvae of moths and beetles damage the crop.', points: 100 },
            { id: 'c2', icon: 'clock', title: 'The pupae', description: 'The resting stage.', outcome: 'The pupa is a non-feeding stage, during which the body is rebuilt.', points: 0 },
            { id: 'c3', icon: 'wind', title: 'The adult moths', description: 'The winged stage.', outcome: 'Adult moths do not damage plants. In complete metamorphosis, usually only the larvae damage the crop.', points: 0 },
          ],
          explanation: 'Each life stage may live in a different place and respond differently to control. In complete metamorphosis usually only the larvae damage the crop; in gradual metamorphosis both nymphs and adults feed, so the damage lasts longer.',
        },
        {
          id: 's4',
          sceneKey: 'rice-field',
          prompt: 'After repeated broad-spectrum insecticide sprays, planthoppers come back in larger numbers than before, because the spraying killed their natural enemies. Which of the three R’s is this?',
          dataVisual: { value: 'More hoppers', label: 'After spraying', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'trend-up', title: 'Resurgence', description: 'The pest returns in larger numbers.', outcome: 'Correct. Resurgence: the pest returns in larger numbers after spraying killed its natural enemies.', points: 100 },
            { id: 'c2', icon: 'shield', title: 'Resistance', description: 'The pest tolerates the insecticide.', outcome: 'Resistance is when the pest becomes more tolerant of the insecticide. Here the cause is the loss of natural enemies.', points: 20 },
            { id: 'c3', icon: 'refresh', title: 'Replacement', description: 'Another pest takes over.', outcome: 'Replacement is when a secondary pest becomes a key pest. Here the same pest returns in larger numbers.', points: 0 },
          ],
          explanation: 'When insecticide use backfires: resistance (the pest becomes more tolerant), resurgence (the pest returns in larger numbers after spraying killed its natural enemies) and replacement (a secondary pest becomes a key pest).',
        },
      ],
    },
  },
  {
    _id: 'mis_3_7',
    lessonId: 'les_3_5',
    levelNumber: 4,
    maxXP: 150,
    gameType: 'decision-making',
    scenarioData: {
      title: 'Name That Order',
      instructions: 'Read what you see on each insect, then choose its order.',
      scenarios: [
        {
          id: 's1',
          sceneKey: 'farm-cornfield',
          prompt: 'The insect on the leaf has hard, shell-like front wings that meet in a straight line down the back. Which order is it?',
          dataVisual: { value: 'Hard', label: 'Front wings', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'shield', title: 'Coleoptera', description: 'Beetles, weevils.', outcome: 'Correct. Coleoptera have hard front wings (elytra) meeting in a straight line down the back.', points: 100 },
            { id: 'c2', icon: 'droplet', title: 'Hemiptera', description: 'True bugs, hoppers, aphids.', outcome: 'Hemiptera have a needle-like beak, and true bugs have half-hard front wings, not fully hard wings meeting in a straight line.', points: 0 },
            { id: 'c3', icon: 'leaf', title: 'Orthoptera', description: 'Grasshoppers, crickets.', outcome: 'Orthoptera have narrow leathery front wings and large hind legs for jumping.', points: 0 },
          ],
          explanation: 'Coleoptera: hard, shell-like front wings meeting in a straight line down the back.',
        },
        {
          id: 's2',
          sceneKey: 'banana-farm',
          prompt: 'A small flying insect has only one pair of wings. Behind them are two tiny knobs, the reduced hind wings. Which order is it?',
          dataVisual: { value: '1 pair', label: 'Wings', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'wind', title: 'Diptera', description: 'True flies, midges.', outcome: 'Correct. Diptera have one pair of wings; the hind pair is reduced to halteres.', points: 100 },
            { id: 'c2', icon: 'bug', title: 'Hymenoptera', description: 'Wasps, bees, ants.', outcome: 'Hymenoptera have two pairs of membranous wings hooked together.', points: 0 },
            { id: 'c3', icon: 'sun', title: 'Lepidoptera', description: 'Moths, butterflies.', outcome: 'Lepidoptera have four wings covered with tiny scales.', points: 0 },
          ],
          explanation: 'Diptera: only one pair of wings; the hind pair is reduced to halteres.',
        },
        {
          id: 's3',
          sceneKey: 'rice-paddy',
          prompt: 'A rice pest has a needle-like beak, and its uniform wings are held like a roof over its body. Which order is it?',
          dataVisual: { value: 'Beak', label: 'Mouthparts', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'droplet', title: 'Hemiptera', description: 'Bugs, planthoppers, leafhoppers, aphids.', outcome: 'Correct. Hemiptera have a needle-like beak; front wings half-hard (bugs) or uniform and held like a roof (hoppers, aphids).', points: 100 },
            { id: 'c2', icon: 'layers', title: 'Neuroptera', description: 'Lacewings.', outcome: 'Lacewings also hold their wings roof-like, but they have four net-veined wings and chewing mouthparts, not a beak.', points: 20 },
            { id: 'c3', icon: 'shield', title: 'Coleoptera', description: 'Beetles.', outcome: 'Beetles have chewing mouthparts and hard front wings meeting in a straight line.', points: 0 },
          ],
          explanation: 'Hemiptera: needle-like beak; front wings half-hard (bugs) or uniform and held like a roof (hoppers, aphids).',
        },
        {
          id: 's4',
          sceneKey: 'eggplant-field',
          prompt: 'Leaves and flowers show silvery streaks. With a hand lens you find extremely small insects with narrow wings fringed with hairs. Which order is it?',
          dataVisual: { value: 'Tiny', label: 'Insect size', trend: 'down' },
          choices: [
            { id: 'c1', icon: 'search', title: 'Thysanoptera', description: 'Thrips.', outcome: 'Correct. Thysanoptera are extremely small insects with narrow fringed wings; they cause silvery streaks and distortion on leaves and flowers.', points: 100 },
            { id: 'c2', icon: 'wind', title: 'Diptera', description: 'Flies, midges.', outcome: 'Diptera have one pair of wings, not narrow fringed wings.', points: 0 },
            { id: 'c3', icon: 'droplet', title: 'Hemiptera', description: 'Aphids, whiteflies.', outcome: 'Hemiptera have a piercing-sucking beak. Fringed wings and silvery streaks point to thrips.', points: 0 },
          ],
          explanation: 'Thysanoptera: extremely small insect with narrow fringed wings; rasping-sucking mouthparts leave silvery streaks.',
        },
        {
          id: 's5',
          sceneKey: 'corn-field',
          prompt: 'In a corn field you find an insect with a pair of forceps at the end of its abdomen. The DA uses it against fall armyworm. Which order is it?',
          dataVisual: { value: 'Forceps', label: 'End of abdomen', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'hand', title: 'Dermaptera', description: 'Earwigs.', outcome: 'Correct. Dermaptera (earwigs) have a pair of forceps (pincer-like cerci) at the end of the abdomen; some are predators, and the DA uses earwigs against fall armyworm.', points: 100 },
            { id: 'c2', icon: 'leaf', title: 'Orthoptera', description: 'Grasshoppers, crickets.', outcome: 'Orthoptera have large hind legs for jumping, not forceps.', points: 0 },
            { id: 'c3', icon: 'eye', title: 'Odonata', description: 'Dragonflies.', outcome: 'Odonata have long net-veined wings and very large eyes.', points: 0 },
          ],
          explanation: 'Dermaptera: a pair of forceps at the end of the abdomen.',
        },
      ],
    },
  },
];

export const module3PestMissions = [
  {
    _id: 'mis_3_8',
    lessonId: 'les_3_6',
    levelNumber: 5,
    maxXP: 150,
    scenarioData: {
      title: 'Hopperburn in the Paddy',
      instructions: MATCH,
      timeLimitSeconds: 60,
      target: {
        commonName: 'Brown Planthopper',
        scientificName: 'Nilaparvata lugens',
        imageKey: 'planthopper',
        hint: 'Nymphs and adults gather at the base of rice plants; patches of plants dry out and collapse.',
      },
      columns: [
        { key: 'classification', title: classification, options: orderOptions, correctOptionId: 'o1' },
        { key: 'damage', title: damage, options: damageOptions, correctOptionId: 'd2' },
        {
          key: 'tactic',
          title: tactic,
          options: [
            { id: 't1', label: 'Tolerant varieties', sublabel: 'Remove volunteers; conserve spiders', imageKey: 'tactic-cultural' },
            { id: 't2', label: 'Routine broad-spectrum spray', sublabel: 'Insecticide on a fixed schedule', imageKey: 'tactic-spray' },
            { id: 't3', label: 'Pheromone traps baited with food', sublabel: 'Plus breeding-site sanitation', imageKey: 'tactic-trap' },
            { id: 't4', label: 'Bird scaring', sublabel: 'Noise, rattling cans and nets', imageKey: 'tactic-net' },
          ],
          correctOptionId: 't1',
        },
      ],
      otherPests: lookAlikes,
      explanation:
        'Brown planthopper (Hemiptera) nymphs and adults suck sap at the base of rice plants and cause hopperburn. Manage it with tolerant varieties, by avoiding overlapping crops and removing volunteer plants, and by conserving the spiders and mirid bugs that eat its eggs and nymphs; avoid unnecessary insecticide applications that kill natural enemies.',
    },
  },
  {
    _id: 'mis_3_9',
    lessonId: 'les_3_6',
    levelNumber: 6,
    maxXP: 150,
    scenarioData: {
      title: 'Armyworms in the Corn',
      instructions: MATCH,
      timeLimitSeconds: 60,
      target: {
        commonName: 'Fall Armyworm',
        scientificName: 'Spodoptera frugiperda',
        imageKey: 'fall-armyworm',
        hint: 'First reported in the Philippines in June 2019 in Piat, Cagayan; the larvae feed on corn leaves.',
      },
      columns: [
        { key: 'classification', title: classification, options: orderOptions, correctOptionId: 'o2' },
        { key: 'damage', title: damage, options: damageOptions, correctOptionId: 'd1' },
        {
          key: 'tactic',
          title: tactic,
          options: [
            { id: 't1', label: 'Biological control', sublabel: 'Trichogramma, Metarhizium, earwigs', imageKey: 'tactic-biological' },
            { id: 't2', label: 'Yellow sticky traps', sublabel: 'For small insects such as thrips', imageKey: 'tactic-sticky' },
            { id: 't3', label: 'Spray the adult moths', sublabel: 'Contact insecticide at night', imageKey: 'tactic-spray' },
            { id: 't4', label: 'Bird scaring', sublabel: 'Noise, rattling cans and nets', imageKey: 'tactic-net' },
          ],
          correctOptionId: 't1',
        },
      ],
      otherPests: lookAlikes,
      explanation:
        'Fall armyworm is a Lepidoptera whose larva feeds on the leaves and other parts of corn, rice and other crops. The DA uses pheromone lures, Trichogramma chilonis against the eggs, Metarhizium against the larvae, earwigs, and farmer training in IPM.',
    },
  },
];
