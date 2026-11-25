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
    contentBody: `
<p><strong>Plant pathology</strong> is the science that studies plant diseases: their causes, how they develop and spread, the losses they cause, and how they can be managed.</p>
<h2>Disease versus injury</h2>
<p>A <strong>plant disease</strong> is a continuing disturbance of normal plant function caused by a pathogen or an environmental factor. An <strong>injury</strong>, such as hail damage or an insect bite, is a sudden, one-time event.</p>
<h2>Symptoms and signs</h2>
<ul>
  <li><strong>Symptoms</strong> are the plant's visible reactions — leaf spots, yellowing (chlorosis), wilting, blight, rot, stunting.</li>
  <li><strong>Signs</strong> are the pathogen itself — fungal spores, mycelium, bacterial ooze.</li>
</ul>
<h2>Significance in the Philippines</h2>
<p>Diseases such as rice blast, bacterial leaf blight, Fusarium wilt of banana and coconut cadang-cadang have caused major losses in Philippine agriculture, making disease diagnosis an essential skill.</p>
`.trim(),
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
    _id: 'les_2_2',
    moduleId: 'mod_2',
    lessonNumber: 2,
    title: 'Causes of Plant Diseases',
    contentBody: `
<p>Plant diseases are caused by <strong>biotic</strong> (living) agents or <strong>abiotic</strong> (non-living) factors.</p>
<h2>Biotic causes (infectious)</h2>
<ul>
  <li><strong>Fungi</strong> — the largest group; cause leaf spots, rusts, mildews, blights and rots.</li>
  <li><strong>Oomycetes</strong> — fungus-like organisms such as <em>Phytophthora</em> (late blight).</li>
  <li><strong>Bacteria</strong> — cause blights, soft rots and wilts, e.g. <em>Xanthomonas oryzae</em> pv. <em>oryzae</em>.</li>
  <li><strong>Viruses and viroids</strong> — cause mosaics, stunting and leaf curl; often spread by insect vectors.</li>
  <li><strong>Nematodes, phytoplasmas and parasitic plants.</strong></li>
</ul>
<h2>Abiotic causes (non-infectious)</h2>
<ul>
  <li>Nutrient deficiencies or toxicities</li>
  <li>Extreme temperature, drought or flooding</li>
  <li>Air pollutants and chemical (herbicide) injury</li>
</ul>
<p>Abiotic disorders do not spread from plant to plant, which helps distinguish them from infectious diseases in the field.</p>
`.trim(),
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
    lessonNumber: 3,
    title: 'Disease Cycle',
    contentBody: `
<p>The <strong>disease cycle</strong> is the chain of events in disease development, from the arrival of the pathogen to its survival until the next season.</p>
<ol>
  <li><strong>Inoculation</strong> — the pathogen (inoculum) lands on the host.</li>
  <li><strong>Penetration</strong> — entry through natural openings, wounds or directly through the surface.</li>
  <li><strong>Infection</strong> — the pathogen establishes contact with susceptible cells and obtains nutrients.</li>
  <li><strong>Colonization and incubation</strong> — the pathogen grows inside the host before symptoms appear.</li>
  <li><strong>Symptom development and reproduction</strong> — new spores or cells are produced.</li>
  <li><strong>Dissemination</strong> — spread by wind, water, insects, tools, seed or people.</li>
  <li><strong>Survival</strong> — overwintering or oversummering in debris, soil, seed or alternate hosts.</li>
</ol>
<h2>Monocyclic and polycyclic diseases</h2>
<p><strong>Monocyclic</strong> pathogens complete one cycle per season. <strong>Polycyclic</strong> pathogens, such as those causing rice blast and late blight, complete many cycles and can build up rapidly into epidemics.</p>
`.trim(),
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
    lessonNumber: 4,
    title: 'Disease Epidemiology',
    contentBody: `
<p><strong>Epidemiology</strong> studies how disease develops and spreads in plant populations over time and space.</p>
<h2>The disease triangle</h2>
<p>A disease develops only when three elements occur together:</p>
<ul>
  <li>a <strong>susceptible host</strong>,</li>
  <li>a <strong>virulent pathogen</strong>, and</li>
  <li>a <strong>favorable environment</strong> (temperature, humidity, leaf wetness).</li>
</ul>
<p>Adding <strong>time</strong> — and the influence of <strong>human activities</strong> such as planting a single susceptible variety over large areas — turns the triangle into the disease pyramid.</p>
<h2>What drives an epidemic</h2>
<ul>
  <li>Large areas of genetically uniform, susceptible crops</li>
  <li>Abundant initial inoculum</li>
  <li>Long periods of favorable weather</li>
  <li>Short pathogen generation time and efficient spread</li>
</ul>
<p>Breaking any side of the triangle — resistant varieties, clean planting material, or changing field conditions — reduces disease.</p>
`.trim(),
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
    lessonNumber: 5,
    title: 'Variability of Plant Pathogens',
    contentBody: `
<p>Pathogen populations are not uniform. Individuals differ in the hosts they can attack and in how aggressive they are. This <strong>variability</strong> explains why resistant varieties and pesticides can lose effectiveness.</p>
<h2>Sources of variability</h2>
<ul>
  <li><strong>Mutation</strong> — sudden changes in genetic material.</li>
  <li><strong>Sexual recombination</strong> — mixing of genes from two parents.</li>
  <li><strong>Parasexual processes and heterokaryosis</strong> in fungi.</li>
  <li><strong>Gene exchange in bacteria</strong> through plasmids and transformation.</li>
</ul>
<h2>Races and pathotypes</h2>
<p>Pathogen strains that attack different sets of varieties are called <strong>races</strong> or <strong>pathotypes</strong>. Rice blast (<em>Magnaporthe oryzae</em>) has many races, so a variety resistant in one location can become susceptible elsewhere.</p>
<h2>Managing variability</h2>
<ul>
  <li>Rotate or combine resistant varieties</li>
  <li>Rotate fungicides with different modes of action</li>
  <li>Monitor for new races and resistance</li>
</ul>
`.trim(),
    mediaAssets: [],
  },

  // ───────────────────────── Module 3: Agricultural Entomology ─────────────────────────
  {
    _id: 'les_3_1',
    moduleId: 'mod_3',
    lessonNumber: 1,
    title: 'Arthropod Pests',
    contentBody: `
<p><strong>Arthropods</strong> have jointed legs, segmented bodies and an exoskeleton. The most important crop pests are <strong>insects</strong> and <strong>mites</strong>.</p>
<h2>Insects versus mites</h2>
<ul>
  <li><strong>Insects</strong> — three body regions (head, thorax, abdomen), six legs, usually one pair of antennae and often wings.</li>
  <li><strong>Mites (Acari)</strong> — two body regions, eight legs as adults, no antennae or wings.</li>
</ul>
<h2>Major insect orders of crop pests</h2>
<ul>
  <li><strong>Coleoptera</strong> (beetles, weevils) — chewing mouthparts.</li>
  <li><strong>Lepidoptera</strong> (moths, butterflies) — caterpillars chew leaves or bore into stems and fruit.</li>
  <li><strong>Hemiptera</strong> (true bugs, aphids, planthoppers, whiteflies) — piercing-sucking mouthparts.</li>
  <li><strong>Orthoptera</strong> (grasshoppers, locusts) — chewing.</li>
  <li><strong>Thysanoptera</strong> (thrips) — rasping-sucking.</li>
  <li><strong>Diptera</strong> (flies) — larvae mine leaves or bore into fruit.</li>
</ul>
<h2>Reading the damage</h2>
<p>The type of damage points to the mouthparts and the order: holes and ragged edges suggest chewing insects; yellowing, curling and honeydew suggest sucking insects; tunnels and wilted shoots suggest borers.</p>
`.trim(),
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
    _id: 'les_3_2',
    moduleId: 'mod_3',
    lessonNumber: 2,
    title: 'Vertebrate Pests',
    contentBody: `
<p><strong>Vertebrate pests</strong> are backboned animals that damage crops in the field or in storage.</p>
<h2>Common vertebrate pests</h2>
<ul>
  <li><strong>Rodents</strong> — the rice field rat (<em>Rattus tanezumi</em>) cuts tillers and eats grain; rodents also contaminate stored products.</li>
  <li><strong>Birds</strong> — sparrows and munias feed on ripening grain.</li>
  <li><strong>Wild pigs</strong> — uproot root crops and trample fields near forests.</li>
  <li><strong>Fruit bats</strong> — feed on ripening fruit in orchards.</li>
</ul>
<h2>Management</h2>
<ul>
  <li><strong>Barriers</strong> — plastic fences and the Trap Barrier System (TBS) for rats; netting for birds.</li>
  <li><strong>Habitat management</strong> — clean field bunds and remove harborage.</li>
  <li><strong>Synchronous planting</strong> across a community so pests have a shorter feeding window.</li>
  <li><strong>Community-wide trapping</strong> timed with the crop stage.</li>
  <li><strong>Conserving predators</strong> such as barn owls and snakes.</li>
  <li><strong>Rodenticides</strong> used carefully in bait stations, only when needed.</li>
</ul>
`.trim(),
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
    lessonNumber: 3,
    title: 'Natural Enemies of Insects and Vertebrate Pests',
    contentBody: `
<p><strong>Natural enemies</strong> are organisms that kill, weaken or reduce the reproduction of pests. Conserving and using them is the foundation of biological control.</p>
<h2>Groups of natural enemies</h2>
<ul>
  <li><strong>Predators</strong> — consume many prey during their lives: lady beetles, spiders, dragonflies, lacewings, earwigs.</li>
  <li><strong>Parasitoids</strong> — lay eggs in or on a host that is killed as the larva develops: <em>Trichogramma</em> egg parasitoids and braconid wasps.</li>
  <li><strong>Entomopathogens</strong> — microorganisms that cause disease in insects: <em>Metarhizium</em>, <em>Beauveria</em>, <em>Bacillus thuringiensis</em> (Bt).</li>
  <li><strong>Vertebrate predators</strong> — barn owls, raptors and snakes that feed on rodents.</li>
</ul>
<h2>Conserving natural enemies</h2>
<ul>
  <li>Avoid broad-spectrum insecticides, especially early in the season</li>
  <li>Keep flowering plants on bunds to provide nectar and shelter</li>
  <li>Install owl boxes and perches near fields</li>
</ul>
`.trim(),
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
