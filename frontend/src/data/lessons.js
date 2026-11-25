/**
 * Mock `lessons` collection — syllabus topics per module (Proposal Table 1).
 * Shape: { _id, moduleId, lessonNumber, title, contentBody, mediaAssets }
 *
 * contentBody: HTML limited to h2, h3, p, ul, ol, li, strong, em, blockquote.
 * mediaAssets: [{ assetId, type: 'image' | 'video' | 'animation', title, caption, url, placeholderKey }]
 *   `url` is null for built-in placeholders; `placeholderKey` selects a local illustration.
 *
 * Lesson content comes from the CP1 lesson documents: Modules 1–3 from the Week 2–11
 * document, Modules 4 and 5 from the Week 13–17 documents (see ./lessonContent/).
 * It may also contain h4, figures and images (served from /images/lessons/),
 * callout divs and the editor's objectives and key-terms lists.
 */
import {
  definitionOfPests,
  disciplinesInCropProtection,
  economicImportanceOfPests,
  roleOfCropProtection,
  worldPopulationAndFoodSupply,
} from './lessonContent/module1.js';
import {
  causesOfPlantDiseases,
  conceptsOfPlantDiseases,
  diseaseCycle,
  diseaseEpidemiology,
  plantPathology,
  variabilityOfPlantPathogens,
} from './lessonContent/module2.js';
import {
  arthropodPests,
  naturalEnemies,
  recognizingInsectOrders,
  representativeInsectPests,
  vertebratePests,
  whyInsectsSucceed,
} from './lessonContent/module3.js';
import {
  changeInWeedPopulation,
  classificationOfWeeds,
  cropWeedCompetition,
  effectsOfWeeds,
  invasiveSpecies,
  reproductionOfWeeds,
  weedScience,
} from './lessonContent/module4.js';
import {
  pestManagementConcepts,
  pestManagementStrategies,
  pestProblemDiagnosis,
  planningPestManagementPrograms,
} from './lessonContent/module5.js';

const lessons = [
  // ───────────────────────── Module 1: Introduction to Crop Protection ─────────────────────────
  {
    _id: 'les_1_1',
    moduleId: 'mod_1',
    lessonNumber: 1,
    title: 'World Population and Food Supply',
    contentBody: worldPopulationAndFoodSupply,
    mediaAssets: [
      {
        assetId: 'asset_1_1_a',
        type: 'image',
        title: 'Population and food demand',
        caption: 'Rising population increases the demand for staple crops.',
        url: null,
        placeholderKey: 'population-growth',
      },
    ],
  },
  {
    _id: 'les_1_2',
    moduleId: 'mod_1',
    lessonNumber: 2,
    title: 'Role of Crop Protection',
    contentBody: roleOfCropProtection,
    mediaAssets: [
      {
        assetId: 'asset_1_2_a',
        type: 'video',
        title: 'Crop protection across the production cycle',
        caption: 'Short guide: protecting crops from seedbed to storage.',
        url: null,
        placeholderKey: 'production-cycle',
      },
    ],
  },
  {
    _id: 'les_1_3',
    moduleId: 'mod_1',
    lessonNumber: 3,
    title: 'Definition of Pests',
    contentBody: definitionOfPests,
    mediaAssets: [
      {
        assetId: 'asset_1_3_a',
        type: 'image',
        title: 'Groups of crop pests',
        caption: 'Pathogens, arthropods, nematodes, weeds, vertebrates and mollusks.',
        url: null,
        placeholderKey: 'pest-groups',
      },
    ],
  },
  {
    _id: 'les_1_4',
    moduleId: 'mod_1',
    lessonNumber: 4,
    title: 'Economic Importance of Pests',
    contentBody: economicImportanceOfPests,
    mediaAssets: [
      {
        assetId: 'asset_1_4_a',
        type: 'animation',
        title: 'EIL and Economic Threshold',
        caption: '2D animation: a pest population rising toward the economic injury level.',
        url: null,
        placeholderKey: 'economic-threshold',
      },
    ],
  },
  {
    _id: 'les_1_5',
    moduleId: 'mod_1',
    lessonNumber: 5,
    title: 'Various Disciplines Involved in Crop Protection',
    contentBody: disciplinesInCropProtection,
    mediaAssets: [],
  },

  // ───────────────────────── Module 2: Plant Pathology ─────────────────────────
  {
    _id: 'les_2_1',
    moduleId: 'mod_2',
    lessonNumber: 1,
    title: 'Plant Pathology',
    contentBody: plantPathology,
    mediaAssets: [
      {
        assetId: 'asset_2_1_a',
        type: 'image',
        title: 'Symptoms and signs',
        caption: 'Leaf spot symptoms with visible fungal growth (signs).',
        url: null,
        placeholderKey: 'leaf-spot',
      },
    ],
  },
  {
    _id: 'les_2_6',
    moduleId: 'mod_2',
    lessonNumber: 2,
    title: 'Concepts of Plant Diseases',
    contentBody: conceptsOfPlantDiseases,
    mediaAssets: [],
  },
  {
    _id: 'les_2_2',
    moduleId: 'mod_2',
    lessonNumber: 3,
    title: 'Causes of Plant Diseases',
    contentBody: causesOfPlantDiseases,
    mediaAssets: [
      {
        assetId: 'asset_2_2_a',
        type: 'image',
        title: 'Fungal, bacterial and viral symptoms',
        caption: 'Comparing typical symptoms caused by different pathogen groups.',
        url: null,
        placeholderKey: 'pathogen-groups',
      },
    ],
  },
  {
    _id: 'les_2_3',
    moduleId: 'mod_2',
    lessonNumber: 4,
    title: 'Disease Cycle',
    contentBody: diseaseCycle,
    mediaAssets: [
      {
        assetId: 'asset_2_3_a',
        type: 'animation',
        title: 'The disease cycle',
        caption: '2D animation of a polycyclic leaf disease.',
        url: null,
        placeholderKey: 'disease-cycle',
      },
    ],
  },
  {
    _id: 'les_2_4',
    moduleId: 'mod_2',
    lessonNumber: 5,
    title: 'Disease Epidemiology',
    contentBody: diseaseEpidemiology,
    mediaAssets: [
      {
        assetId: 'asset_2_4_a',
        type: 'image',
        title: 'Disease triangle',
        caption: 'Host, pathogen and environment must coincide for disease.',
        url: null,
        placeholderKey: 'disease-triangle',
      },
    ],
  },
  {
    _id: 'les_2_5',
    moduleId: 'mod_2',
    lessonNumber: 6,
    title: 'Variability of Plant Pathogens',
    contentBody: variabilityOfPlantPathogens,
    mediaAssets: [],
  },

  // ───────────────────────── Module 3: Agricultural Entomology ─────────────────────────
  {
    _id: 'les_3_1',
    moduleId: 'mod_3',
    lessonNumber: 1,
    title: 'Arthropod Pests',
    contentBody: arthropodPests,
    mediaAssets: [
      {
        assetId: 'asset_3_1_a',
        type: 'image',
        title: 'Insect orders and mouthparts',
        caption: 'Chewing, piercing-sucking and rasping-sucking mouthparts.',
        url: null,
        placeholderKey: 'insect-orders',
      },
    ],
  },
  {
    _id: 'les_3_4',
    moduleId: 'mod_3',
    lessonNumber: 2,
    title: 'Why Insects Succeed and How They Affect People',
    contentBody: whyInsectsSucceed,
    mediaAssets: [],
  },
  {
    _id: 'les_3_5',
    moduleId: 'mod_3',
    lessonNumber: 3,
    title: 'Recognizing Insect Orders',
    contentBody: recognizingInsectOrders,
    mediaAssets: [],
  },
  {
    _id: 'les_3_6',
    moduleId: 'mod_3',
    lessonNumber: 4,
    title: 'Representative Insect Pests and Principles of Insect Pest Management',
    contentBody: representativeInsectPests,
    mediaAssets: [],
  },
  {
    _id: 'les_3_2',
    moduleId: 'mod_3',
    lessonNumber: 5,
    title: 'Vertebrate Pests',
    contentBody: vertebratePests,
    mediaAssets: [
      {
        assetId: 'asset_3_2_a',
        type: 'image',
        title: 'Trap Barrier System',
        caption: 'A plastic barrier with multiple-capture traps protecting a rice field.',
        url: null,
        placeholderKey: 'trap-barrier',
      },
    ],
  },
  {
    _id: 'les_3_3',
    moduleId: 'mod_3',
    lessonNumber: 6,
    title: 'Natural Enemies of Insects and Vertebrate Pests',
    contentBody: naturalEnemies,
    mediaAssets: [
      {
        assetId: 'asset_3_3_a',
        type: 'video',
        title: 'Predators and parasitoids in the field',
        caption: 'Short guide to recognizing common natural enemies.',
        url: null,
        placeholderKey: 'natural-enemies',
      },
    ],
  },

  // ───────────────────────── Module 4: Weed Science ─────────────────────────
  {
    _id: 'les_4_1',
    moduleId: 'mod_4',
    lessonNumber: 1,
    title: 'Weed Science',
    contentBody: weedScience,
    mediaAssets: [
      {
        assetId: 'asset_4_1_a',
        type: 'image',
        title: 'Parts of a grass weed',
        caption: 'Roots, sheath, collar, ligule and leaf blade.',
        url: null,
        placeholderKey: 'grass-parts',
      },
    ],
  },
  {
    _id: 'les_4_2',
    moduleId: 'mod_4',
    lessonNumber: 2,
    title: 'Classification of Weeds',
    contentBody: classificationOfWeeds,
    mediaAssets: [
      {
        assetId: 'asset_4_2_a',
        type: 'image',
        title: 'Grass, sedge and broadleaf',
        caption: 'Comparing stems, leaves and roots of the three weed groups.',
        url: null,
        placeholderKey: 'weed-groups',
      },
    ],
  },
  {
    _id: 'les_4_4',
    moduleId: 'mod_4',
    lessonNumber: 3,
    title: 'Effects of Weeds on Human Affairs',
    contentBody: effectsOfWeeds,
    mediaAssets: [],
  },
  {
    _id: 'les_4_5',
    moduleId: 'mod_4',
    lessonNumber: 4,
    title: 'Reproduction and Establishment of Weeds',
    contentBody: reproductionOfWeeds,
    mediaAssets: [],
  },
  {
    _id: 'les_4_6',
    moduleId: 'mod_4',
    lessonNumber: 5,
    title: 'Crop-Weed Competition',
    contentBody: cropWeedCompetition,
    mediaAssets: [],
  },
  {
    _id: 'les_4_7',
    moduleId: 'mod_4',
    lessonNumber: 6,
    title: 'Change in Weed Population',
    contentBody: changeInWeedPopulation,
    mediaAssets: [],
  },
  {
    _id: 'les_4_3',
    moduleId: 'mod_4',
    lessonNumber: 7,
    title: 'Invasive Species',
    contentBody: invasiveSpecies,
    mediaAssets: [],
  },

  // ───────────────────────── Module 5: Integrated Pest Management ─────────────────────────
  {
    _id: 'les_5_1',
    moduleId: 'mod_5',
    lessonNumber: 1,
    title: 'Pest Problem Diagnosis',
    contentBody: pestProblemDiagnosis,
    mediaAssets: [
      {
        assetId: 'asset_5_1_a',
        type: 'image',
        title: 'Field damage patterns',
        caption: 'Patchy versus uniform damage patterns in the field.',
        url: null,
        placeholderKey: 'damage-patterns',
      },
    ],
  },
  {
    _id: 'les_5_2',
    moduleId: 'mod_5',
    lessonNumber: 2,
    title: 'Pest Management Concepts',
    contentBody: pestManagementConcepts,
    mediaAssets: [
      {
        assetId: 'asset_5_2_a',
        type: 'animation',
        title: 'Pest resurgence',
        caption: '2D animation: how broad-spectrum sprays can lead to resurgence.',
        url: null,
        placeholderKey: 'pest-resurgence',
      },
    ],
  },
  {
    _id: 'les_5_3',
    moduleId: 'mod_5',
    lessonNumber: 3,
    title: 'Pest Management Strategies',
    contentBody: pestManagementStrategies,
    mediaAssets: [
      {
        assetId: 'asset_5_3_a',
        type: 'image',
        title: 'The IPM toolbox',
        caption: 'Cultural, biological, mechanical and chemical tactics.',
        url: null,
        placeholderKey: 'ipm-toolbox',
      },
    ],
  },
  {
    _id: 'les_5_4',
    moduleId: 'mod_5',
    lessonNumber: 4,
    title: 'Planning Pest Management Programs',
    contentBody: planningPestManagementPrograms,
    mediaAssets: [],
  },
];

export default lessons;
