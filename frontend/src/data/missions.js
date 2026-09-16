/**
 * Mock `missions` collection.
 * Shape: { _id, lessonId, levelNumber, maxXP, scenarioData }
 *
 * - Every lesson has one or more mission levels. `levelNumber` counts across the
 *   whole module (Module 2 = Levels 1–8, as in the proposal mockup).
 * - `scenarioData` depends on the module's gameType:
 *     decision-making      → scenarios[] with 3 decision cards each
 *     identification       → specimen, symptomSpots[], pathogenOptions[]
 *     matching             → target pest, columns[] (classification, damage, tactic), timer
 *     drag-and-drop        → specimen, targets[] (x/y zones), labels[], timer
 *     strategy-management  → observations, pestOptions[], tactics[] with meters, goals
 * - `imageKey` / `specimenKey` / `sceneKey` select local placeholder illustrations.
 * - Coordinates (x, y, radius) are percentages of the specimen image.
 *
 * NOTE: Content is starter content for the prototype and should be reviewed by the
 * Crop Protection I instructor.
 */

// ───────────────────────── Module 1 · Decision-Making ─────────────────────────
const module1Missions = [
  {
    _id: 'mis_1_1',
    lessonId: 'les_1_1',
    levelNumber: 1,
    maxXP: 100,
    scenarioData: {
      title: 'Global Harvest Challenge',
      instructions: 'Read the situation, then tap the decision card you think is best.',
      scenarios: [
        {
          id: 's1',
          sceneKey: 'farm-cornfield',
          prompt:
            'World population is rapidly growing, creating a massive food shortage crisis. How should farmers respond to ensure everyone has enough to eat?',
          dataVisual: { value: '8.1B', label: 'Food Demand', trend: 'up' },
          choices: [
            {
              id: 'c1',
              icon: 'tractor',
              title: 'Raise Food Production',
              description: 'Produce more crops to meet the rising food demand.',
              outcome: 'Harvests grow and more families are fed. Protecting those crops keeps the gains.',
              points: 100,
            },
            {
              id: 'c2',
              icon: 'clock',
              title: 'Maintain Current Output',
              description: 'Keep food production levels the same despite population growth.',
              outcome: 'Supply stays flat while demand keeps rising — the shortage gets worse.',
              points: 0,
            },
            {
              id: 'c3',
              icon: 'ban',
              title: 'Halt Farm Expansion',
              description: 'Stop expanding agricultural operations.',
              outcome: 'Land is conserved, but nothing is done to close the food gap.',
              points: 20,
            },
          ],
          explanation:
            'A growing population needs more food. Increasing production — and protecting it from losses — is the direct response.',
        },
        {
          id: 's2',
          sceneKey: 'rice-paddy',
          prompt:
            'A province loses about 30% of its rice harvest to pests and diseases every season. Before clearing any new land, what is the most effective first step?',
          dataVisual: { value: '30%', label: 'Harvest Lost', trend: 'down' },
          choices: [
            {
              id: 'c1',
              icon: 'axe',
              title: 'Clear New Farmland',
              description: 'Convert nearby forest into new rice fields.',
              outcome: 'More land is planted, but the same losses continue and forests are lost.',
              points: 20,
            },
            {
              id: 'c2',
              icon: 'shield',
              title: 'Reduce Crop Losses',
              description: 'Apply crop protection to save the harvest already planted.',
              outcome: 'Recovering even part of the lost 30% adds food without clearing land.',
              points: 100,
            },
            {
              id: 'c3',
              icon: 'ship',
              title: 'Rely on Imports',
              description: 'Buy the missing rice from other countries.',
              outcome: 'Shortages ease for now, but costs rise and local farmers do not benefit.',
              points: 40,
            },
          ],
          explanation:
            'Reducing losses to pests is one of the fastest ways to increase food supply without expanding farmland.',
        },
      ],
    },
  },
  {
    _id: 'mis_1_2',
    lessonId: 'les_1_2',
    levelNumber: 2,
    maxXP: 100,
    scenarioData: {
      title: 'Protect the Harvest',
      instructions: 'Choose the action that best shows the role of crop protection.',
      scenarios: [
        {
          id: 's1',
          sceneKey: 'tomato-farm',
          prompt:
            'Two weeks before harvest, a tomato farmer sees leaf spots spreading across the field. The buyer has warned that blemished fruit will be rejected.',
          dataVisual: { value: '2 wks', label: 'To Harvest', trend: 'down' },
          choices: [
            {
              id: 'c1',
              icon: 'eye-off',
              title: 'Ignore It',
              description: 'Wait until harvest and hope the spots stop.',
              outcome: 'The disease spreads to the fruit and much of the harvest is rejected.',
              points: 0,
            },
            {
              id: 'c2',
              icon: 'search',
              title: 'Monitor and Protect',
              description: 'Diagnose the problem and apply suitable protection measures.',
              outcome: 'The spread slows, fruit quality is kept and the buyer accepts the harvest.',
              points: 100,
            },
            {
              id: 'c3',
              icon: 'basket',
              title: 'Harvest Everything Now',
              description: 'Pick all fruit immediately, ripe or not.',
              outcome: 'Unripe fruit sells poorly and the yield potential is lost.',
              points: 30,
            },
          ],
          explanation: 'Crop protection preserves both yield and quality, which protects the farmer’s income.',
        },
        {
          id: 's2',
          sceneKey: 'warehouse',
          prompt: 'Harvested corn stored in a humid warehouse has started to grow mold.',
          dataVisual: { value: '85%', label: 'Humidity', trend: 'up' },
          choices: [
            {
              id: 'c1',
              icon: 'sun',
              title: 'Dry and Ventilate',
              description: 'Re-dry the grain and improve storage ventilation.',
              outcome: 'Mold growth stops and the grain stays safe to eat.',
              points: 100,
            },
            {
              id: 'c2',
              icon: 'coins',
              title: 'Sell It Quickly',
              description: 'Sell the moldy corn at the normal price before it gets worse.',
              outcome: 'Moldy grain can carry mycotoxins that harm people and animals.',
              points: 0,
            },
            {
              id: 'c3',
              icon: 'layers',
              title: 'Blend With Clean Grain',
              description: 'Mix the moldy corn with fresh corn to hide it.',
              outcome: 'The contamination spreads to the clean grain.',
              points: 0,
            },
          ],
          explanation: 'Crop protection continues after harvest: proper drying and storage prevent losses and protect food safety.',
        },
      ],
    },
  },
  {
    _id: 'mis_1_3',
    lessonId: 'les_1_3',
    levelNumber: 3,
    maxXP: 100,
    scenarioData: {
      title: 'Friend or Pest?',
      instructions: 'Decide whether each organism is a pest and what to do.',
      scenarios: [
        {
          id: 's1',
          sceneKey: 'eggplant-field',
          prompt: 'A farmer finds several lady beetles on eggplant leaves and wants to spray right away.',
          dataVisual: { value: '6', label: 'Lady Beetles', trend: 'up' },
          choices: [
            {
              id: 'c1',
              icon: 'spray',
              title: 'Spray Immediately',
              description: 'All insects on the crop are pests.',
              outcome: 'The spray kills beneficial insects that were eating aphids.',
              points: 0,
            },
            {
              id: 'c2',
              icon: 'search',
              title: 'Identify First',
              description: 'Check what the insects are before acting.',
              outcome: 'Lady beetles are natural enemies — keeping them helps control aphids.',
              points: 100,
            },
            {
              id: 'c3',
              icon: 'hand',
              title: 'Remove by Hand',
              description: 'Pick off every insect found.',
              outcome: 'Time is wasted removing helpful predators.',
              points: 30,
            },
          ],
          explanation: 'An organism is a pest only if it injures the crop. Lady beetles are predators, not pests.',
        },
        {
          id: 's2',
          sceneKey: 'rice-paddy',
          prompt: 'Golden apple snails are eating newly transplanted rice seedlings in a paddy.',
          dataVisual: { value: '40%', label: 'Seedlings Eaten', trend: 'up' },
          choices: [
            {
              id: 'c1',
              icon: 'check',
              title: 'They Are Pests',
              description: 'They damage the crop, so they are pests.',
              outcome: 'Correct — mollusks that injure crops are pests and need management.',
              points: 100,
            },
            {
              id: 'c2',
              icon: 'x',
              title: 'Not Pests',
              description: 'Only insects can be pests.',
              outcome: 'Pests include mollusks, vertebrates, weeds and pathogens — not only insects.',
              points: 0,
            },
            {
              id: 'c3',
              icon: 'help',
              title: 'Only if Diseased',
              description: 'They are pests only if they carry a disease.',
              outcome: 'Direct feeding damage is already enough to make them pests.',
              points: 20,
            },
          ],
          explanation: 'By definition, any plant, animal or pathogen that injures plants is a pest.',
        },
      ],
    },
  },
  {
    _id: 'mis_1_4',
    lessonId: 'les_1_4',
    levelNumber: 4,
    maxXP: 100,
    scenarioData: {
      title: 'Spray or Wait?',
      instructions: 'Use the economic threshold to make the right call.',
      scenarios: [
        {
          id: 's1',
          sceneKey: 'rice-paddy',
          prompt:
            'Monitoring shows the rice stem borer count is still below the economic threshold. Spraying costs ₱2,500 per hectare.',
          dataVisual: { value: 'Below ET', label: 'Stem Borers', trend: 'flat' },
          choices: [
            {
              id: 'c1',
              icon: 'spray',
              title: 'Spray to Be Safe',
              description: 'Apply insecticide now, just in case.',
              outcome: 'The spray costs more than the damage it prevents and harms natural enemies.',
              points: 20,
            },
            {
              id: 'c2',
              icon: 'chart',
              title: 'Keep Monitoring',
              description: 'Continue regular checks and act only if the threshold is reached.',
              outcome: 'Money is saved and natural enemies keep working.',
              points: 100,
            },
            {
              id: 'c3',
              icon: 'eye-off',
              title: 'Stop Monitoring',
              description: 'Pest numbers are low, so stop checking.',
              outcome: 'A later outbreak goes unnoticed until damage is severe.',
              points: 0,
            },
          ],
          explanation: 'Below the economic threshold, control costs more than it saves. Monitoring continues.',
        },
        {
          id: 's2',
          sceneKey: 'rice-paddy',
          prompt:
            'A week later the stem borer count has risen above the economic threshold and is approaching the economic injury level.',
          dataVisual: { value: 'Above ET', label: 'Stem Borers', trend: 'up' },
          choices: [
            {
              id: 'c1',
              icon: 'shield',
              title: 'Act Now',
              description: 'Start control measures while there is still time.',
              outcome: 'The population is stopped before it reaches the economic injury level.',
              points: 100,
            },
            {
              id: 'c2',
              icon: 'clock',
              title: 'Wait for the EIL',
              description: 'Take action only once the economic injury level is reached.',
              outcome: 'By then, damage already equals the cost of control.',
              points: 30,
            },
            {
              id: 'c3',
              icon: 'eye-off',
              title: 'Wait for Visible Damage',
              description: 'Act only when damage is visible across the field.',
              outcome: 'Losses are already high by the time action is taken.',
              points: 0,
            },
          ],
          explanation: 'The economic threshold is set below the EIL so that action can start before losses become economic.',
        },
      ],
    },
  },
  {
    _id: 'mis_1_5',
    lessonId: 'les_1_5',
    levelNumber: 5,
    maxXP: 100,
    scenarioData: {
      title: 'Assemble the Expert Team',
      instructions: 'Pick the discipline best suited to each problem.',
      scenarios: [
        {
          id: 's1',
          sceneKey: 'banana-farm',
          prompt:
            'Banana plants are wilting. Older leaves turn yellow and the inside of the pseudostem shows brown streaks.',
          dataVisual: { value: '15%', label: 'Plants Wilting', trend: 'up' },
          choices: [
            {
              id: 'c1',
              icon: 'microscope',
              title: 'Plant Pathologist',
              description: 'Studies plant diseases and their causes.',
              outcome: 'Vascular discoloration and wilting point to a disease — the right expert.',
              points: 100,
            },
            {
              id: 'c2',
              icon: 'bug',
              title: 'Entomologist',
              description: 'Studies insects.',
              outcome: 'Borers can be checked, but the symptoms point mainly to a disease.',
              points: 20,
            },
            {
              id: 'c3',
              icon: 'calculator',
              title: 'Agricultural Economist',
              description: 'Studies costs and benefits.',
              outcome: 'Useful later for decisions, but cannot diagnose the problem.',
              points: 0,
            },
          ],
          explanation: 'Wilting with internal vascular browning is a disease symptom handled by plant pathology.',
        },
        {
          id: 's2',
          sceneKey: 'village',
          prompt: 'Farmers in a village spray pesticides every week whether or not pests are present.',
          dataVisual: { value: '52×', label: 'Sprays per Year', trend: 'up' },
          choices: [
            {
              id: 'c1',
              icon: 'users',
              title: 'Extension Worker',
              description: 'Trains farmers in IPM and field monitoring.',
              outcome: 'Farmers learn to monitor and spray only when needed.',
              points: 100,
            },
            {
              id: 'c2',
              icon: 'flask',
              title: 'Pesticide Chemist',
              description: 'Develops stronger pesticides.',
              outcome: 'Stronger chemicals do not fix the habit of unnecessary spraying.',
              points: 0,
            },
            {
              id: 'c3',
              icon: 'sprout',
              title: 'Plant Breeder',
              description: 'Develops resistant varieties.',
              outcome: 'Helpful in the long term, but the spraying habit remains.',
              points: 30,
            },
          ],
          explanation: 'Changing farm practices needs extension — bringing research-based IPM to farmers.',
        },
      ],
    },
  },
];

// ───────────────────────── Module 2 · Identification ─────────────────────────
const module2Missions = [
  {
    _id: 'mis_2_1',
    lessonId: 'les_2_1',
    levelNumber: 1,
    maxXP: 150,
    scenarioData: {
      title: 'Spots on the Peanut Leaf',
      instructions:
        'Zoom in to inspect the unhealthy leaf. Mark every symptom with a red circle, then identify the pathogen.',
      host: 'Peanut',
      specimenKey: 'peanut-leaf-spot',
      minZoomToMark: 5,
      symptomSpots: [
        { id: 'sp1', x: 34, y: 38, radius: 7, description: 'Circular brown lesion with a yellow halo' },
        { id: 'sp2', x: 62, y: 58, radius: 7, description: 'Older lesion with a darker center' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Powdery Mildew', scientificName: 'Erysiphales', group: 'fungus' },
        { id: 'p2', commonName: 'Leaf Rust', scientificName: 'Pucciniales', group: 'fungus' },
        { id: 'p3', commonName: 'Early Leaf Spot', scientificName: 'Cercospora arachidicola', group: 'fungus' },
        { id: 'p4', commonName: 'Bacterial Blight', scientificName: 'Xanthomonas spp.', group: 'bacterium' },
      ],
      correctPathogenId: 'p3',
      explanation:
        'Circular brown spots surrounded by a yellow halo are typical of Cercospora early leaf spot of peanut.',
    },
  },
  {
    _id: 'mis_2_2',
    lessonId: 'les_2_2',
    levelNumber: 2,
    maxXP: 150,
    scenarioData: {
      title: 'Yellowing Rice Leaves',
      instructions: 'Mark the lesions, then decide whether the cause is fungal, bacterial, viral or abiotic.',
      host: 'Rice',
      specimenKey: 'rice-bacterial-blight',
      minZoomToMark: 5,
      symptomSpots: [
        { id: 'sp1', x: 22, y: 30, radius: 8, description: 'Yellow-white lesion starting at the leaf tip' },
        { id: 'sp2', x: 55, y: 44, radius: 8, description: 'Wavy lesion margin along the leaf edge' },
        { id: 'sp3', x: 78, y: 62, radius: 7, description: 'Bacterial ooze droplets on the lesion' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Rice Blast', scientificName: 'Magnaporthe oryzae', group: 'fungus' },
        { id: 'p2', commonName: 'Bacterial Leaf Blight', scientificName: 'Xanthomonas oryzae pv. oryzae', group: 'bacterium' },
        { id: 'p3', commonName: 'Rice Tungro', scientificName: 'Rice tungro viruses', group: 'virus' },
        { id: 'p4', commonName: 'Nitrogen Deficiency', scientificName: 'Abiotic disorder', group: 'abiotic' },
      ],
      correctPathogenId: 'p2',
      explanation:
        'Lesions that begin at the leaf tip with wavy yellow margins and bacterial ooze are signs of bacterial leaf blight.',
    },
  },
  {
    _id: 'mis_2_3',
    lessonId: 'les_2_2',
    levelNumber: 3,
    maxXP: 150,
    scenarioData: {
      title: 'Mottled Pepper Leaves',
      instructions: 'Inspect the mottled areas, mark them, and identify the cause.',
      host: 'Pepper',
      specimenKey: 'pepper-mosaic',
      minZoomToMark: 5,
      symptomSpots: [
        { id: 'sp1', x: 40, y: 34, radius: 9, description: 'Light and dark green mosaic pattern' },
        { id: 'sp2', x: 60, y: 66, radius: 8, description: 'Distorted, puckered leaf area' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Cucumber Mosaic Virus', scientificName: 'CMV (Cucumovirus)', group: 'virus' },
        { id: 'p2', commonName: 'Anthracnose', scientificName: 'Colletotrichum spp.', group: 'fungus' },
        { id: 'p3', commonName: 'Magnesium Deficiency', scientificName: 'Abiotic disorder', group: 'abiotic' },
        { id: 'p4', commonName: 'Bacterial Spot', scientificName: 'Xanthomonas euvesicatoria', group: 'bacterium' },
      ],
      correctPathogenId: 'p1',
      explanation:
        'A light/dark green mosaic with leaf distortion and no lesions or spores points to a virus, commonly spread by aphids.',
    },
  },
  {
    _id: 'mis_2_4',
    lessonId: 'les_2_3',
    levelNumber: 4,
    maxXP: 150,
    scenarioData: {
      title: 'White Powder on Cucumber',
      instructions: 'Find where the pathogen is reproducing on the leaf surface, then identify it.',
      host: 'Cucumber',
      specimenKey: 'cucumber-powdery-mildew',
      minZoomToMark: 5,
      symptomSpots: [
        { id: 'sp1', x: 30, y: 45, radius: 8, description: 'White powdery colony of spores (sign)' },
        { id: 'sp2', x: 58, y: 30, radius: 7, description: 'New colony from secondary spread' },
        { id: 'sp3', x: 66, y: 68, radius: 7, description: 'Yellowing tissue beneath an older colony' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Downy Mildew', scientificName: 'Pseudoperonospora cubensis', group: 'oomycete' },
        { id: 'p2', commonName: 'Powdery Mildew', scientificName: 'Podosphaera xanthii', group: 'fungus' },
        { id: 'p3', commonName: 'Angular Leaf Spot', scientificName: 'Pseudomonas syringae pv. lachrymans', group: 'bacterium' },
        { id: 'p4', commonName: 'Leaf Rust', scientificName: 'Pucciniales', group: 'fungus' },
      ],
      correctPathogenId: 'p2',
      explanation:
        'White powdery colonies on the upper surface are spores of powdery mildew — a polycyclic disease spread by wind.',
    },
  },
  {
    _id: 'mis_2_5',
    lessonId: 'les_2_3',
    levelNumber: 5,
    maxXP: 150,
    scenarioData: {
      title: 'Dark Lesions on Mango',
      instructions: 'Mark the lesions that can spread new spores by rain splash, then identify the pathogen.',
      host: 'Mango',
      specimenKey: 'mango-anthracnose',
      minZoomToMark: 5,
      symptomSpots: [
        { id: 'sp1', x: 36, y: 40, radius: 8, description: 'Dark, sunken lesion on the fruit' },
        { id: 'sp2', x: 64, y: 55, radius: 8, description: 'Lesions merging into a larger blotch' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Sooty Mold', scientificName: 'Capnodium spp.', group: 'fungus' },
        { id: 'p2', commonName: 'Bacterial Black Spot', scientificName: 'Xanthomonas citri pv. mangiferaeindicae', group: 'bacterium' },
        { id: 'p3', commonName: 'Anthracnose', scientificName: 'Colletotrichum gloeosporioides', group: 'fungus' },
        { id: 'p4', commonName: 'Sunscald', scientificName: 'Abiotic disorder', group: 'abiotic' },
      ],
      correctPathogenId: 'p3',
      explanation:
        'Dark sunken lesions are anthracnose. The fungus survives on infected debris and spreads to fruit by rain splash.',
    },
  },
  {
    _id: 'mis_2_6',
    lessonId: 'les_2_4',
    levelNumber: 6,
    maxXP: 150,
    scenarioData: {
      title: 'Blight After the Rains',
      instructions:
        'After a week of cool, humid weather, tomato plants are collapsing. Mark the symptoms and identify the pathogen.',
      host: 'Tomato',
      specimenKey: 'tomato-late-blight',
      minZoomToMark: 5,
      symptomSpots: [
        { id: 'sp1', x: 28, y: 36, radius: 9, description: 'Large water-soaked, dark lesion' },
        { id: 'sp2', x: 57, y: 50, radius: 8, description: 'Pale green margin around the lesion' },
        { id: 'sp3', x: 72, y: 72, radius: 7, description: 'White growth at the lesion edge (sporulation)' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Late Blight', scientificName: 'Phytophthora infestans', group: 'oomycete' },
        { id: 'p2', commonName: 'Early Blight', scientificName: 'Alternaria solani', group: 'fungus' },
        { id: 'p3', commonName: 'Septoria Leaf Spot', scientificName: 'Septoria lycopersici', group: 'fungus' },
        { id: 'p4', commonName: 'Bacterial Wilt', scientificName: 'Ralstonia solanacearum', group: 'bacterium' },
      ],
      correctPathogenId: 'p1',
      explanation:
        'Water-soaked lesions with white sporulation under cool, humid conditions are late blight — a classic epidemic disease.',
    },
  },
  {
    _id: 'mis_2_7',
    lessonId: 'les_2_4',
    levelNumber: 7,
    maxXP: 150,
    scenarioData: {
      title: 'Pustules Across the Cornfield',
      instructions: 'Mark the pustules that release wind-borne spores, then identify the disease.',
      host: 'Corn',
      specimenKey: 'corn-common-rust',
      minZoomToMark: 10,
      symptomSpots: [
        { id: 'sp1', x: 25, y: 48, radius: 6, description: 'Cinnamon-brown powdery pustule' },
        { id: 'sp2', x: 50, y: 40, radius: 6, description: 'Pustules on both leaf surfaces' },
        { id: 'sp3', x: 75, y: 55, radius: 6, description: 'Ruptured pustule releasing spores' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Philippine Downy Mildew', scientificName: 'Peronosclerospora philippinensis', group: 'oomycete' },
        { id: 'p2', commonName: 'Northern Leaf Blight', scientificName: 'Exserohilum turcicum', group: 'fungus' },
        { id: 'p3', commonName: 'Common Rust', scientificName: 'Puccinia sorghi', group: 'fungus' },
        { id: 'p4', commonName: 'Banded Leaf and Sheath Blight', scientificName: 'Rhizoctonia solani', group: 'fungus' },
      ],
      correctPathogenId: 'p3',
      explanation:
        'Powdery cinnamon-brown pustules are common rust. Its spores travel long distances by wind, allowing rapid epidemics.',
    },
  },
  {
    _id: 'mis_2_8',
    lessonId: 'les_2_5',
    levelNumber: 8,
    maxXP: 150,
    scenarioData: {
      title: 'The Resistant Variety Fails',
      instructions:
        'A "blast-resistant" rice variety now shows lesions. Mark them and identify the pathogen that overcame the resistance.',
      host: 'Rice',
      specimenKey: 'rice-blast',
      minZoomToMark: 10,
      symptomSpots: [
        { id: 'sp1', x: 30, y: 42, radius: 6, description: 'Diamond-shaped lesion with a gray center' },
        { id: 'sp2', x: 52, y: 56, radius: 6, description: 'Brown lesion margin' },
        { id: 'sp3', x: 74, y: 38, radius: 6, description: 'Young spindle-shaped lesion' },
      ],
      pathogenOptions: [
        { id: 'p1', commonName: 'Brown Spot', scientificName: 'Bipolaris oryzae', group: 'fungus' },
        { id: 'p2', commonName: 'Rice Blast', scientificName: 'Magnaporthe oryzae', group: 'fungus' },
        { id: 'p3', commonName: 'Bacterial Leaf Streak', scientificName: 'Xanthomonas oryzae pv. oryzicola', group: 'bacterium' },
        { id: 'p4', commonName: 'Sheath Blight', scientificName: 'Rhizoctonia solani', group: 'fungus' },
      ],
      correctPathogenId: 'p2',
      explanation:
        'Diamond-shaped lesions with gray centers are rice blast. Its many races can overcome single-gene resistance.',
    },
  },
];

// ───────────────────────── Module 3 · Matching ─────────────────────────
const commonOtherPests = [
  { name: 'Aphids', group: 'Hemiptera', note: 'Sucking pest', imageKey: 'aphid' },
  { name: 'Armyworm', group: 'Lepidoptera', note: 'Leaf chewer', imageKey: 'armyworm' },
  { name: 'Red Spider Mite', group: 'Acari', note: 'Sap sucker', imageKey: 'spider-mite' },
  { name: 'Field Mouse', group: 'Rodentia', note: 'Crop gnawer', imageKey: 'field-mouse' },
];

const damageColumnTitle = 'Physical / Damage Characteristics';
const classificationColumnTitle = 'Order / Classification';
const tacticColumnTitle = 'Appropriate Management Tactic';

const module3Missions = [
  {
    _id: 'mis_3_1',
    lessonId: 'les_3_1',
    levelNumber: 1,
    maxXP: 150,
    scenarioData: {
      title: 'Crown Damage on Coconut',
      instructions: 'Identify the pest, then match its classification, damage type and management tactic.',
      timeLimitSeconds: 60,
      target: {
        commonName: 'Coconut Rhinoceros Beetle',
        scientificName: 'Oryctes rhinoceros',
        imageKey: 'rhinoceros-beetle',
        hint: 'Adults bore into the crown; fronds open with V-shaped cuts.',
      },
      columns: [
        {
          key: 'classification',
          title: classificationColumnTitle,
          options: [
            { id: 'o1', label: 'Coleoptera', sublabel: 'Beetles', imageKey: 'beetle' },
            { id: 'o2', label: 'Hemiptera', sublabel: 'True bugs', imageKey: 'bug' },
            { id: 'o3', label: 'Lepidoptera', sublabel: 'Moths & butterflies', imageKey: 'moth' },
            { id: 'o4', label: 'Rodentia', sublabel: 'Rodents', imageKey: 'field-mouse' },
          ],
          correctOptionId: 'o1',
        },
        {
          key: 'damage',
          title: damageColumnTitle,
          options: [
            { id: 'd1', label: 'Chewing mouthparts', sublabel: 'Leaf holes', imageKey: 'damage-chewing' },
            { id: 'd2', label: 'Sucking mouthparts', sublabel: 'Sap removal', imageKey: 'damage-sucking' },
            { id: 'd3', label: 'Boring damage', sublabel: 'Tunnels in crown or stem', imageKey: 'damage-boring' },
            { id: 'd4', label: 'Gnawing damage', sublabel: 'Fruits and seeds', imageKey: 'damage-gnawing' },
          ],
          correctOptionId: 'd3',
        },
        {
          key: 'tactic',
          title: tacticColumnTitle,
          options: [
            { id: 't1', label: 'Pheromone traps', sublabel: 'Plus removal of breeding sites', imageKey: 'tactic-trap' },
            { id: 't2', label: 'Yellow sticky traps', sublabel: 'Catch small flying insects', imageKey: 'tactic-sticky' },
            { id: 't3', label: 'Field flooding', sublabel: 'Drown soil pests', imageKey: 'tactic-water' },
            { id: 't4', label: 'Foliar spray', sublabel: 'Contact insecticide on leaves', imageKey: 'tactic-spray' },
          ],
          correctOptionId: 't1',
        },
      ],
      otherPests: commonOtherPests,
      explanation:
        'Rhinoceros beetles are Coleoptera that bore into the crown. Aggregation pheromone traps and destroying rotting logs where larvae breed reduce populations.',
    },
  },
  {
    _id: 'mis_3_2',
    lessonId: 'les_3_1',
    levelNumber: 2,
    maxXP: 150,
    scenarioData: {
      title: 'Curling Okra Leaves',
      instructions: 'Identify the pest, then match its classification, damage type and management tactic.',
      timeLimitSeconds: 55,
      target: {
        commonName: 'Cotton Aphid',
        scientificName: 'Aphis gossypii',
        imageKey: 'aphid',
        hint: 'Soft-bodied colonies on leaf undersides; sticky honeydew below.',
      },
      columns: [
        {
          key: 'classification',
          title: classificationColumnTitle,
          options: [
            { id: 'o1', label: 'Orthoptera', sublabel: 'Grasshoppers', imageKey: 'grasshopper' },
            { id: 'o2', label: 'Hemiptera', sublabel: 'True bugs & aphids', imageKey: 'bug' },
            { id: 'o3', label: 'Coleoptera', sublabel: 'Beetles', imageKey: 'beetle' },
            { id: 'o4', label: 'Acari', sublabel: 'Mites', imageKey: 'spider-mite' },
          ],
          correctOptionId: 'o2',
        },
        {
          key: 'damage',
          title: damageColumnTitle,
          options: [
            { id: 'd1', label: 'Chewing mouthparts', sublabel: 'Ragged leaf holes', imageKey: 'damage-chewing' },
            { id: 'd2', label: 'Sucking mouthparts', sublabel: 'Curling, yellowing, honeydew', imageKey: 'damage-sucking' },
            { id: 'd3', label: 'Mining damage', sublabel: 'Tunnels inside leaves', imageKey: 'damage-mining' },
            { id: 'd4', label: 'Boring damage', sublabel: 'Holes in stems', imageKey: 'damage-boring' },
          ],
          correctOptionId: 'd2',
        },
        {
          key: 'tactic',
          title: tacticColumnTitle,
          options: [
            { id: 't1', label: 'Rodent bait stations', sublabel: 'Along field bunds', imageKey: 'tactic-trap' },
            { id: 't2', label: 'Bird netting', sublabel: 'Cover the canopy', imageKey: 'tactic-net' },
            { id: 't3', label: 'Conserve natural enemies', sublabel: 'Lady beetles & lacewings', imageKey: 'tactic-biological' },
            { id: 't4', label: 'Deep plowing', sublabel: 'Expose soil pupae', imageKey: 'tactic-cultural' },
          ],
          correctOptionId: 't3',
        },
      ],
      otherPests: commonOtherPests,
      explanation:
        'Aphids are Hemiptera with piercing-sucking mouthparts. Lady beetles and lacewings keep colonies in check when broad-spectrum sprays are avoided.',
    },
  },
  {
    _id: 'mis_3_3',
    lessonId: 'les_3_2',
    levelNumber: 3,
    maxXP: 150,
    scenarioData: {
      title: 'Cut Tillers in the Paddy',
      instructions: 'Identify the pest, then match its classification, damage type and management tactic.',
      timeLimitSeconds: 50,
      target: {
        commonName: 'Rice Field Rat',
        scientificName: 'Rattus tanezumi',
        imageKey: 'field-rat',
        hint: 'Tillers cut at a 45° angle; burrows along the bunds.',
      },
      columns: [
        {
          key: 'classification',
          title: classificationColumnTitle,
          options: [
            { id: 'o1', label: 'Rodentia', sublabel: 'Rodents', imageKey: 'field-mouse' },
            { id: 'o2', label: 'Passeriformes', sublabel: 'Perching birds', imageKey: 'sparrow' },
            { id: 'o3', label: 'Lepidoptera', sublabel: 'Moths & butterflies', imageKey: 'moth' },
            { id: 'o4', label: 'Orthoptera', sublabel: 'Grasshoppers', imageKey: 'grasshopper' },
          ],
          correctOptionId: 'o1',
        },
        {
          key: 'damage',
          title: damageColumnTitle,
          options: [
            { id: 'd1', label: 'Sucking mouthparts', sublabel: 'Sap removal', imageKey: 'damage-sucking' },
            { id: 'd2', label: 'Gnawing damage', sublabel: 'Cut tillers and eaten grain', imageKey: 'damage-gnawing' },
            { id: 'd3', label: 'Mining damage', sublabel: 'Tunnels inside leaves', imageKey: 'damage-mining' },
            { id: 'd4', label: 'Rasping damage', sublabel: 'Silvery leaf scars', imageKey: 'damage-rasping' },
          ],
          correctOptionId: 'd2',
        },
        {
          key: 'tactic',
          title: tacticColumnTitle,
          options: [
            { id: 't1', label: 'Yellow sticky traps', sublabel: 'Catch small flying insects', imageKey: 'tactic-sticky' },
            { id: 't2', label: 'Trap Barrier System', sublabel: 'With synchronous planting', imageKey: 'tactic-barrier' },
            { id: 't3', label: 'Release Trichogramma', sublabel: 'Egg parasitoids', imageKey: 'tactic-biological' },
            { id: 't4', label: 'Foliar fungicide', sublabel: 'Protect the leaves', imageKey: 'tactic-spray' },
          ],
          correctOptionId: 't2',
        },
      ],
      otherPests: commonOtherPests,
      explanation:
        'Rats are rodents that gnaw tillers and grain. The Trap Barrier System combined with community-wide synchronous planting limits damage.',
    },
  },
  {
    _id: 'mis_3_4',
    lessonId: 'les_3_2',
    levelNumber: 4,
    maxXP: 150,
    scenarioData: {
      title: 'Empty Grains at Ripening',
      instructions: 'Identify the pest, then match its classification, damage type and management tactic.',
      timeLimitSeconds: 45,
      target: {
        commonName: 'Eurasian Tree Sparrow',
        scientificName: 'Passer montanus',
        imageKey: 'sparrow',
        hint: 'Flocks feed on ripening panicles at dawn and dusk.',
      },
      columns: [
        {
          key: 'classification',
          title: classificationColumnTitle,
          options: [
            { id: 'o1', label: 'Rodentia', sublabel: 'Rodents', imageKey: 'field-mouse' },
            { id: 'o2', label: 'Hemiptera', sublabel: 'True bugs', imageKey: 'bug' },
            { id: 'o3', label: 'Passeriformes', sublabel: 'Perching birds', imageKey: 'sparrow' },
            { id: 'o4', label: 'Coleoptera', sublabel: 'Beetles', imageKey: 'beetle' },
          ],
          correctOptionId: 'o3',
        },
        {
          key: 'damage',
          title: damageColumnTitle,
          options: [
            { id: 'd1', label: 'Seed feeding', sublabel: 'Grains removed from panicles', imageKey: 'damage-gnawing' },
            { id: 'd2', label: 'Boring damage', sublabel: 'Dead hearts in stems', imageKey: 'damage-boring' },
            { id: 'd3', label: 'Sucking mouthparts', sublabel: 'Discolored, unfilled grain', imageKey: 'damage-sucking' },
            { id: 'd4', label: 'Chewing mouthparts', sublabel: 'Leaf holes', imageKey: 'damage-chewing' },
          ],
          correctOptionId: 'd1',
        },
        {
          key: 'tactic',
          title: tacticColumnTitle,
          options: [
            { id: 't1', label: 'Bird netting & scaring devices', sublabel: 'During grain ripening', imageKey: 'tactic-net' },
            { id: 't2', label: 'Pheromone traps', sublabel: 'Attract male moths', imageKey: 'tactic-trap' },
            { id: 't3', label: 'Systemic insecticide', sublabel: 'Soil drench', imageKey: 'tactic-spray' },
            { id: 't4', label: 'Crop rotation', sublabel: 'Break the soil pest cycle', imageKey: 'tactic-cultural' },
          ],
          correctOptionId: 't1',
        },
      ],
      otherPests: commonOtherPests,
      explanation:
        'Sparrows are birds (Passeriformes) that remove ripening grain. Netting and scaring devices during ripening protect the panicles.',
    },
  },
  {
    _id: 'mis_3_5',
    lessonId: 'les_3_3',
    levelNumber: 5,
    maxXP: 150,
    scenarioData: {
      title: 'Ragged Corn Whorls',
      instructions:
        'Identify the pest, then match its classification, damage type and the natural-enemy tactic that manages it.',
      timeLimitSeconds: 40,
      target: {
        commonName: 'Fall Armyworm',
        scientificName: 'Spodoptera frugiperda',
        imageKey: 'fall-armyworm',
        hint: 'Larva with an inverted "Y" on the head; sawdust-like frass in the whorl.',
      },
      columns: [
        {
          key: 'classification',
          title: classificationColumnTitle,
          options: [
            { id: 'o1', label: 'Diptera', sublabel: 'Flies', imageKey: 'fly' },
            { id: 'o2', label: 'Lepidoptera', sublabel: 'Moths & butterflies', imageKey: 'moth' },
            { id: 'o3', label: 'Hemiptera', sublabel: 'True bugs', imageKey: 'bug' },
            { id: 'o4', label: 'Acari', sublabel: 'Mites', imageKey: 'spider-mite' },
          ],
          correctOptionId: 'o2',
        },
        {
          key: 'damage',
          title: damageColumnTitle,
          options: [
            { id: 'd1', label: 'Chewing mouthparts', sublabel: 'Ragged holes, frass in whorl', imageKey: 'damage-chewing' },
            { id: 'd2', label: 'Rasping damage', sublabel: 'Silvery leaf scars', imageKey: 'damage-rasping' },
            { id: 'd3', label: 'Gnawing damage', sublabel: 'Cut stems at the base', imageKey: 'damage-gnawing' },
            { id: 'd4', label: 'Sucking mouthparts', sublabel: 'Sap removal', imageKey: 'damage-sucking' },
          ],
          correctOptionId: 'd1',
        },
        {
          key: 'tactic',
          title: tacticColumnTitle,
          options: [
            { id: 't1', label: 'Owl nest boxes', sublabel: 'Attract barn owls', imageKey: 'tactic-owl' },
            { id: 't2', label: 'Trichogramma & Metarhizium', sublabel: 'Egg parasitoids and fungus', imageKey: 'tactic-biological' },
            { id: 't3', label: 'Trap Barrier System', sublabel: 'Plastic fence with traps', imageKey: 'tactic-barrier' },
            { id: 't4', label: 'Bird netting', sublabel: 'Cover the canopy', imageKey: 'tactic-net' },
          ],
          correctOptionId: 't2',
        },
      ],
      otherPests: commonOtherPests,
      explanation:
        'Fall armyworm caterpillars (Lepidoptera) chew the whorl. Trichogramma wasps parasitize its eggs and Metarhizium fungus infects larvae.',
    },
  },
];

// ───────────────────────── Module 4 · Drag-and-Drop ─────────────────────────
const module4Missions = [
  {
    _id: 'mis_4_1',
    lessonId: 'les_4_1',
    levelNumber: 1,
    maxXP: 200,
    scenarioData: {
      title: 'Goosegrass Morphology',
      instructions: 'Drag each structural label onto its flashing target zone on the weed, then verify.',
      timeLimitSeconds: 90,
      specimen: {
        commonName: 'Goosegrass',
        scientificName: 'Eleusine indica',
        group: 'Grass',
        imageKey: 'goosegrass',
      },
      targets: [
        { id: 'z1', x: 30, y: 84, correctLabelId: 'l1' },
        { id: 'z2', x: 47, y: 55, correctLabelId: 'l2' },
        { id: 'z3', x: 44, y: 68, correctLabelId: 'l3' },
        { id: 'z4', x: 70, y: 28, correctLabelId: 'l4' },
      ],
      labels: [
        { id: 'l1', text: 'Fibrous Roots', hint: 'Many thin roots of similar size' },
        { id: 'l2', text: 'Membranous Ligule', hint: 'Thin collar-like flap where blade meets sheath' },
        { id: 'l3', text: 'Keeled Sheath', hint: 'Flattened sheath folded along a ridge' },
        { id: 'l4', text: 'Parallel-veined Blade', hint: 'Long leaf with veins running side by side' },
        { id: 'l5', text: 'Taproot', hint: 'One thick main root' },
        { id: 'l6', text: 'Triangular Stem', hint: 'Solid stem with three edges' },
      ],
      explanation:
        'Goosegrass is a grass: fibrous roots, a flattened keeled sheath, a membranous ligule and parallel-veined leaf blades.',
    },
  },
  {
    _id: 'mis_4_2',
    lessonId: 'les_4_2',
    levelNumber: 2,
    maxXP: 200,
    scenarioData: {
      title: 'Sedges Have Edges',
      instructions: 'Label the structures that identify this weed as a sedge.',
      timeLimitSeconds: 90,
      specimen: {
        commonName: 'Purple Nutsedge',
        scientificName: 'Cyperus rotundus',
        group: 'Sedge',
        imageKey: 'purple-nutsedge',
      },
      targets: [
        { id: 'z1', x: 38, y: 88, correctLabelId: 'l1' },
        { id: 'z2', x: 50, y: 45, correctLabelId: 'l2' },
        { id: 'z3', x: 30, y: 60, correctLabelId: 'l3' },
        { id: 'z4', x: 52, y: 14, correctLabelId: 'l4' },
      ],
      labels: [
        { id: 'l1', text: 'Tubers (Nutlets)', hint: 'Small hard storage organs on rhizomes' },
        { id: 'l2', text: 'Triangular Stem', hint: 'Solid stem with three edges' },
        { id: 'l3', text: 'Three-ranked Leaves', hint: 'Leaves arranged in three directions' },
        { id: 'l4', text: 'Reddish-purple Spikelets', hint: 'Flower clusters at the stem tip' },
        { id: 'l5', text: 'Membranous Ligule', hint: 'Thin flap where blade meets sheath' },
        { id: 'l6', text: 'Hollow Round Stem', hint: 'Cylindrical stem with a hollow center' },
      ],
      explanation:
        'Sedges have solid triangular stems, three-ranked leaves and no ligule. Purple nutsedge spreads by tubers on underground rhizomes.',
    },
  },
  {
    _id: 'mis_4_3',
    lessonId: 'les_4_2',
    levelNumber: 3,
    maxXP: 200,
    scenarioData: {
      title: 'A Spiny Broadleaf',
      instructions: 'Label the structures that identify this broadleaf weed.',
      timeLimitSeconds: 80,
      specimen: {
        commonName: 'Spiny Amaranth',
        scientificName: 'Amaranthus spinosus',
        group: 'Broadleaf',
        imageKey: 'spiny-amaranth',
      },
      targets: [
        { id: 'z1', x: 50, y: 88, correctLabelId: 'l1' },
        { id: 'z2', x: 43, y: 52, correctLabelId: 'l2' },
        { id: 'z3', x: 70, y: 42, correctLabelId: 'l3' },
        { id: 'z4', x: 50, y: 12, correctLabelId: 'l4' },
      ],
      labels: [
        { id: 'l1', text: 'Taproot', hint: 'One thick main root' },
        { id: 'l2', text: 'Axillary Spines', hint: 'Paired sharp spines where leaves attach' },
        { id: 'l3', text: 'Net-veined Leaf', hint: 'Branching veins forming a network' },
        { id: 'l4', text: 'Terminal Spike', hint: 'Dense flower spike at the stem tip' },
        { id: 'l5', text: 'Fibrous Roots', hint: 'Many thin roots of similar size' },
        { id: 'l6', text: 'Membranous Ligule', hint: 'Thin flap where blade meets sheath' },
      ],
      explanation:
        'Spiny amaranth is a broadleaf: a taproot, net-veined leaves, paired axillary spines and terminal flower spikes.',
    },
  },
  {
    _id: 'mis_4_4',
    lessonId: 'les_4_3',
    levelNumber: 4,
    maxXP: 200,
    scenarioData: {
      title: 'The Invading Hagonoy',
      instructions: 'Label the features used to recognize this invasive weed.',
      timeLimitSeconds: 80,
      specimen: {
        commonName: 'Hagonoy (Siam Weed)',
        scientificName: 'Chromolaena odorata',
        group: 'Broadleaf · Invasive',
        imageKey: 'hagonoy',
      },
      targets: [
        { id: 'z1', x: 36, y: 46, correctLabelId: 'l1' },
        { id: 'z2', x: 70, y: 48, correctLabelId: 'l2' },
        { id: 'z3', x: 52, y: 12, correctLabelId: 'l3' },
        { id: 'z4', x: 50, y: 76, correctLabelId: 'l4' },
      ],
      labels: [
        { id: 'l1', text: 'Opposite Leaves', hint: 'Two leaves attached at each node' },
        { id: 'l2', text: 'Three-veined Toothed Leaf', hint: 'Triangular blade with three main veins' },
        { id: 'l3', text: 'Pale-lilac Flower Heads', hint: 'Clusters of small tubular flowers' },
        { id: 'l4', text: 'Hairy Stem', hint: 'Stem covered with fine hairs' },
        { id: 'l5', text: 'Swollen Petioles', hint: 'Spongy, air-filled leaf stalks' },
        { id: 'l6', text: 'Triangular Stem', hint: 'Solid stem with three edges' },
      ],
      explanation:
        'Hagonoy has opposite, triangular, toothed leaves with three main veins, hairy stems and pale-lilac flower heads that release wind-dispersed seeds.',
    },
  },
  {
    _id: 'mis_4_5',
    lessonId: 'les_4_3',
    levelNumber: 5,
    maxXP: 200,
    scenarioData: {
      title: 'Clogged Irrigation Canal',
      instructions: 'Label the structures that let this invasive aquatic weed float and spread.',
      timeLimitSeconds: 75,
      specimen: {
        commonName: 'Water Hyacinth',
        scientificName: 'Pontederia crassipes',
        group: 'Aquatic · Invasive',
        imageKey: 'water-hyacinth',
      },
      targets: [
        { id: 'z1', x: 42, y: 60, correctLabelId: 'l1' },
        { id: 'z2', x: 50, y: 88, correctLabelId: 'l2' },
        { id: 'z3', x: 26, y: 36, correctLabelId: 'l3' },
        { id: 'z4', x: 60, y: 10, correctLabelId: 'l4' },
      ],
      labels: [
        { id: 'l1', text: 'Swollen Petioles', hint: 'Spongy, air-filled leaf stalks that act as floats' },
        { id: 'l2', text: 'Feathery Roots', hint: 'Dark, finely branched roots hanging in water' },
        { id: 'l3', text: 'Glossy Rounded Leaves', hint: 'Thick, shiny, broad leaf blades' },
        { id: 'l4', text: 'Lavender Flower Spike', hint: 'Showy flowers with a yellow spot' },
        { id: 'l5', text: 'Taproot', hint: 'One thick main root' },
        { id: 'l6', text: 'Axillary Spines', hint: 'Sharp spines where leaves attach' },
      ],
      explanation:
        'Water hyacinth floats on air-filled swollen petioles, has feathery roots and glossy leaves, and spreads rapidly by daughter plants.',
    },
  },
];

// ───────────────────────── Module 5 · Strategy & Management ─────────────────────────
const module5Missions = [
  {
    _id: 'mis_5_1',
    lessonId: 'les_5_1',
    levelNumber: 1,
    maxXP: 250,
    scenarioData: {
      title: 'Tunnels in the Tomato Leaves',
      instructions: 'Diagnose the pest from the field clues, then deploy 2 control tactics that save the crop.',
      guideMessage: 'IPM strategy needed! Perform diagnosis and select tactics.',
      crop: 'Tomato',
      sceneKey: 'tomato-field',
      observations: [
        'Winding white tunnels on the leaves',
        'Tiny yellow-and-black flies around the plants',
        'Small punctures on the leaf surface',
      ],
      pestOptions: [
        { id: 'p1', name: 'Leaf Miners', scientificName: 'Liriomyza spp.', imageKey: 'leaf-miner' },
        { id: 'p2', name: 'Whiteflies', scientificName: 'Bemisia tabaci', imageKey: 'whitefly' },
        { id: 'p3', name: 'Tomato Fruitworm', scientificName: 'Helicoverpa armigera', imageKey: 'fruitworm' },
        { id: 'p4', name: 'Early Blight', scientificName: 'Alternaria solani', imageKey: 'early-blight' },
      ],
      correctPestId: 'p1',
      requiredTacticCount: 2,
      tactics: [
        {
          id: 't1',
          category: 'cultural',
          name: 'Sanitation',
          description: 'Remove and destroy mined leaves; rotate with non-host crops.',
          effectiveness: 60,
          resourceCost: 30,
          environmentalImpact: 3,
        },
        {
          id: 't2',
          category: 'biological',
          name: 'Conserve Parasitoids',
          description: 'Protect the parasitic wasps that attack leaf miner larvae.',
          effectiveness: 75,
          resourceCost: 35,
          environmentalImpact: 2,
        },
        {
          id: 't3',
          category: 'mechanical',
          name: 'Yellow Sticky Traps',
          description: 'Catch adult flies before they lay eggs.',
          effectiveness: 70,
          resourceCost: 30,
          environmentalImpact: 3,
        },
        {
          id: 't4',
          category: 'chemical',
          name: 'Broad-spectrum Spray',
          description: 'Spray a contact insecticide over the whole field.',
          effectiveness: 45,
          resourceCost: 45,
          environmentalImpact: 40,
        },
      ],
      bestTacticIds: ['t2', 't3'],
      goals: { minEnvironmentalScore: 90 },
      explanation:
        'Larvae are protected inside the mines, so contact sprays work poorly and kill the parasitoids. Parasitoids plus sticky traps give the best control.',
    },
  },
  {
    _id: 'mis_5_2',
    lessonId: 'les_5_2',
    levelNumber: 2,
    maxXP: 250,
    scenarioData: {
      title: 'Hopperburn in the Rice Field',
      instructions: 'Diagnose the pest, then choose 2 tactics that follow IPM principles.',
      guideMessage: 'Patches of rice are drying up. Remember: avoid causing resurgence!',
      crop: 'Rice',
      sceneKey: 'rice-field',
      observations: [
        'Circular patches of browning, drying plants',
        'Brown insects crowded at the base of the tillers',
        'The field was sprayed with a pyrethroid early in the season',
        'Heavy nitrogen fertilizer was applied',
      ],
      pestOptions: [
        { id: 'p1', name: 'Rice Bug', scientificName: 'Leptocorisa oratorius', imageKey: 'rice-bug' },
        { id: 'p2', name: 'Brown Planthopper', scientificName: 'Nilaparvata lugens', imageKey: 'planthopper' },
        { id: 'p3', name: 'Yellow Stem Borer', scientificName: 'Scirpophaga incertulas', imageKey: 'stem-borer' },
        { id: 'p4', name: 'Bacterial Leaf Blight', scientificName: 'Xanthomonas oryzae pv. oryzae', imageKey: 'bacterial-blight' },
      ],
      correctPestId: 'p2',
      requiredTacticCount: 2,
      tactics: [
        {
          id: 't1',
          category: 'cultural',
          name: 'Resistant Variety & Balanced N',
          description: 'Plant a resistant variety and avoid excess nitrogen.',
          effectiveness: 75,
          resourceCost: 30,
          environmentalImpact: 3,
        },
        {
          id: 't2',
          category: 'biological',
          name: 'Conserve Predators',
          description: 'Stop early spraying so spiders and mirid bugs can recover.',
          effectiveness: 70,
          resourceCost: 15,
          environmentalImpact: 1,
        },
        {
          id: 't3',
          category: 'mechanical',
          name: 'Light Traps',
          description: 'Monitor adult flights with light traps.',
          effectiveness: 35,
          resourceCost: 30,
          environmentalImpact: 2,
        },
        {
          id: 't4',
          category: 'chemical',
          name: 'Repeated Pyrethroid Spray',
          description: 'Spray again every week.',
          effectiveness: 25,
          resourceCost: 50,
          environmentalImpact: 45,
        },
      ],
      bestTacticIds: ['t1', 't2'],
      goals: { minEnvironmentalScore: 90 },
      explanation:
        'Early pyrethroid sprays and heavy nitrogen cause planthopper resurgence. Resistant varieties, balanced fertilizer and conserved predators break the cycle.',
    },
  },
  {
    _id: 'mis_5_3',
    lessonId: 'les_5_3',
    levelNumber: 3,
    maxXP: 250,
    scenarioData: {
      title: 'Wilted Eggplant Shoots',
      instructions: 'Diagnose the pest, then pick the 2 tactics that best combine without harming the environment.',
      guideMessage: 'Shoots are wilting and fruits have holes. What is causing it?',
      crop: 'Eggplant',
      sceneKey: 'eggplant-field',
      observations: [
        'Drooping, wilted shoot tips',
        'Holes plugged with frass on the fruits',
        'Pinkish larvae found inside cut fruits',
      ],
      pestOptions: [
        { id: 'p1', name: 'Cotton Leafhopper', scientificName: 'Amrasca biguttula', imageKey: 'leafhopper' },
        { id: 'p2', name: 'Bacterial Wilt', scientificName: 'Ralstonia solanacearum', imageKey: 'bacterial-wilt' },
        { id: 'p3', name: 'Eggplant Fruit and Shoot Borer', scientificName: 'Leucinodes orbonalis', imageKey: 'shoot-borer' },
        { id: 'p4', name: 'Cotton Aphid', scientificName: 'Aphis gossypii', imageKey: 'aphid' },
      ],
      correctPestId: 'p3',
      requiredTacticCount: 2,
      tactics: [
        {
          id: 't1',
          category: 'cultural',
          name: 'Weekly Sanitation',
          description: 'Cut and destroy infested shoots and fruits every week.',
          effectiveness: 75,
          resourceCost: 35,
          environmentalImpact: 2,
        },
        {
          id: 't2',
          category: 'biological',
          name: 'Release Egg Parasitoids',
          description: 'Release Trichogramma wasps.',
          effectiveness: 55,
          resourceCost: 30,
          environmentalImpact: 2,
        },
        {
          id: 't3',
          category: 'mechanical',
          name: 'Pheromone Traps & Netting',
          description: 'Trap male moths and net the nursery.',
          effectiveness: 70,
          resourceCost: 35,
          environmentalImpact: 3,
        },
        {
          id: 't4',
          category: 'chemical',
          name: 'Calendar Spraying',
          description: 'Spray insecticide every week regardless of pest level.',
          effectiveness: 50,
          resourceCost: 55,
          environmentalImpact: 45,
        },
      ],
      bestTacticIds: ['t1', 't3'],
      goals: { minEnvironmentalScore: 90 },
      explanation:
        'Larvae hide inside shoots and fruit. Removing infested parts and trapping adult moths reduce the population without heavy spraying.',
    },
  },
  {
    _id: 'mis_5_4',
    lessonId: 'les_5_4',
    levelNumber: 4,
    maxXP: 250,
    scenarioData: {
      title: 'Season Plan for the Cornfield',
      instructions: 'Diagnose the pest, then plan 2 tactics that keep the environmental score at A+.',
      guideMessage: 'Plan your program! Neighbors planted weeks apart, so pests keep moving in.',
      crop: 'Corn',
      sceneKey: 'corn-field',
      observations: [
        'Ragged holes and window-pane feeding on young leaves',
        'Sawdust-like frass in the whorl',
        'Egg masses covered with scales on the leaves',
        'Neighboring farms planted 3–4 weeks apart',
      ],
      pestOptions: [
        { id: 'p1', name: 'Fall Armyworm', scientificName: 'Spodoptera frugiperda', imageKey: 'fall-armyworm' },
        { id: 'p2', name: 'Asian Corn Borer', scientificName: 'Ostrinia furnacalis', imageKey: 'corn-borer' },
        { id: 'p3', name: 'Corn Aphid', scientificName: 'Rhopalosiphum maidis', imageKey: 'aphid' },
        { id: 'p4', name: 'Downy Mildew', scientificName: 'Peronosclerospora philippinensis', imageKey: 'downy-mildew' },
      ],
      correctPestId: 'p1',
      requiredTacticCount: 2,
      tactics: [
        {
          id: 't1',
          category: 'cultural',
          name: 'Synchronous Planting',
          description: 'Plant at the same time as neighbors and intercrop.',
          effectiveness: 65,
          resourceCost: 30,
          environmentalImpact: 2,
        },
        {
          id: 't2',
          category: 'biological',
          name: 'Metarhizium & Parasitoids',
          description: 'Apply Metarhizium and conserve Trichogramma and earwigs.',
          effectiveness: 75,
          resourceCost: 35,
          environmentalImpact: 3,
        },
        {
          id: 't3',
          category: 'mechanical',
          name: 'Crush Egg Masses',
          description: 'Hand-pick egg masses and young larvae.',
          effectiveness: 55,
          resourceCost: 40,
          environmentalImpact: 1,
        },
        {
          id: 't4',
          category: 'chemical',
          name: 'Selective Insecticide',
          description: 'Spray a selective product only above threshold.',
          effectiveness: 70,
          resourceCost: 45,
          environmentalImpact: 15,
        },
      ],
      bestTacticIds: ['t1', 't2'],
      goals: { minEnvironmentalScore: 90 },
      explanation:
        'Area-wide synchronous planting shortens the pest’s window, and biological agents keep larvae down. A selective spray works but lowers the environmental score below A+.',
    },
  },
];

const missions = [
  ...module1Missions,
  ...module2Missions,
  ...module3Missions,
  ...module4Missions,
  ...module5Missions,
];

export default missions;
