/**
 * Align mission wording with what each lesson actually teaches.
 *
 *   node scripts/align-missions-to-lessons.js            dry run: shows what would change
 *   node scripts/align-missions-to-lessons.js --apply    backs up, then writes the changes
 *
 * What it changes, and what it never touches
 * - Only the wording inside scenarioData: questions, answer option names,
 *   label texts, hints and explanations. Every id stays the same — option
 *   ids, correctPathogenId, symptom spots, targets and correctLabelId — so
 *   scoring, saved attempts, student progress and the instructor's mission
 *   editor keep working unchanged.
 * - Each mission is found by module number + level number and must still
 *   have the expected title; anything that does not match is skipped and
 *   reported, so the script cannot overwrite a mission an instructor has
 *   since replaced.
 * - --apply first writes every affected mission, as it is now, to
 *   backups/missions-before-align-<timestamp>.json (the backups folder is
 *   git-ignored). Restore by writing those scenarioData values back.
 *
 * Why: the Module 2 identification missions asked for specific disease names
 * (e.g. Cercospora arachidicola) that the lessons never teach, and the Module 4
 * drag-and-drop labels used botany terms (ligule, keeled sheath) instead of
 * the lesson's own characteristics of grasses, sedges and broadleaves.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { Lesson, Mission, Module } from '../models/index.js';

const concept = (id, commonName, scientificName) => ({ id, commonName, scientificName, group: 'concept' });

/** module number → level number → { title (must match), changes(scenarioData) → new scenarioData } */
const CHANGES = {
  2: {
    // Lesson 1: telling healthy from diseased plants; biotic or abiotic.
    1: {
      title: 'Spots on the Peanut Leaf',
      change: (d) => ({
        ...d,
        instructions: 'Zoom in to inspect the unhealthy leaf. Mark every symptom, then decide what is causing it.',
        question: 'What is causing these symptoms?',
        pathogenOptions: [
          { id: 'p1', commonName: 'Spray drift injury', scientificName: 'Abiotic — damage along one edge, does not spread', group: 'abiotic' },
          { id: 'p2', commonName: 'Nutrient deficiency', scientificName: 'Abiotic — uniform pattern, does not spread', group: 'abiotic' },
          { id: 'p3', commonName: 'Fungal leaf spot', scientificName: 'Biotic — a living pathogen that spreads', group: 'fungus' },
          { id: 'p4', commonName: 'Waterlogging', scientificName: 'Abiotic — linked to poor drainage', group: 'abiotic' },
        ],
        explanation:
          'Distinct spots with a yellow halo, appearing in patches and spreading from plant to plant, point to a biotic cause: a fungal leaf spot. Abiotic problems such as spray drift, nutrient shortage or waterlogging do not spread and usually show a uniform pattern or follow one edge.',
      }),
    },
    // Lesson 3: causes of plant diseases — characteristics of pathogen groups.
    3: {
      title: 'Yellowing Rice Leaves',
      change: (d) => ({
        ...d,
        question: 'Which group of pathogens causes this?',
        pathogenOptions: [
          { id: 'p1', commonName: 'Fungus', scientificName: 'Thread-like; spots, rusts, mildews; spreads by spores', group: 'fungus' },
          { id: 'p2', commonName: 'Bacterium', scientificName: 'Single-celled; leaf spots, blights, wilts, ooze in wet weather', group: 'bacterium' },
          { id: 'p3', commonName: 'Virus', scientificName: 'Particles inside cells; mottling, curling, stunting', group: 'virus' },
          { id: 'p4', commonName: 'Abiotic: nutrient shortage', scientificName: 'Non-living; does not spread', group: 'abiotic' },
        ],
        explanation:
          'Bacteria are single-celled organisms that cause leaf spots, blights, wilts and soft rots, especially in wet conditions. Blight lesions with droplets of bacterial ooze point to a bacterium.',
      }),
    },
    4: {
      title: 'Mottled Pepper Leaves',
      change: (d) => ({
        ...d,
        question: 'Which group of pathogens causes this?',
        pathogenOptions: [
          { id: 'p1', commonName: 'Virus', scientificName: 'Particles inside cells; mottling, curling, stunting', group: 'virus' },
          { id: 'p2', commonName: 'Fungus', scientificName: 'Thread-like; spots, rusts, mildews; spreads by spores', group: 'fungus' },
          { id: 'p3', commonName: 'Abiotic: nutrient shortage', scientificName: 'Non-living; does not spread', group: 'abiotic' },
          { id: 'p4', commonName: 'Bacterium', scientificName: 'Single-celled; leaf spots, blights, wilts, ooze', group: 'bacterium' },
        ],
        explanation:
          'Viruses are tiny particles that live inside plant cells and cause mottled, curled or stunted growth. They are often spread by insects. A mosaic with distorted leaves and no spores or ooze points to a virus.',
      }),
    },
    // Lesson 4: the disease cycle.
    5: {
      title: 'White Powder on Cucumber',
      change: (d) => ({
        ...d,
        instructions: 'Find where the pathogen is producing new spores on the leaf, then name that stage of the disease cycle.',
        question: 'Which stage of the disease cycle do the marked signs show?',
        pathogenOptions: [
          concept('p1', 'Penetration', 'The pathogen gets inside the plant'),
          concept('p2', 'Reproduction', 'New spores, cells or particles are produced on diseased tissue'),
          concept('p3', 'Survival', 'The pathogen lasts between crops in residue, soil or seed'),
          concept('p4', 'Incubation', 'Time from infection to the first symptoms'),
        ],
        explanation:
          'The white powdery colonies are masses of new spores: the reproduction stage, when new spores are produced in or on the diseased tissue. Because secondary spores keep forming, this is a polycyclic disease that repeats many times in one season.',
      }),
    },
    6: {
      title: 'Dark Lesions on Mango',
      change: (d) => ({
        ...d,
        instructions: 'Mark the lesions that release spores, then name the stage that carries them to new fruit.',
        question: 'Which stage of the disease cycle carries the spores to new fruit?',
        pathogenOptions: [
          concept('p1', 'Inoculation', 'Inoculum first reaches a host'),
          concept('p2', 'Colonization', 'The pathogen grows within the host'),
          concept('p3', 'Dissemination', 'Wind, water, insects, people or tools carry inoculum to new hosts'),
          concept('p4', 'Infection', 'The pathogen sets up a parasitic relationship with the host'),
        ],
        explanation:
          'Rain splash carrying spores from these lesions to healthy fruit is dissemination: wind, water, insects, animals, people, tools, seed and planting material carry inoculum to new hosts.',
      }),
    },
    // Lesson 5: disease epidemiology.
    7: {
      title: 'Blight After the Rains',
      change: (d) => ({
        ...d,
        question: 'Which element of the epidemic set off this outbreak?',
        pathogenOptions: [
          concept('p1', 'Environmental factors', 'Temperature, rainfall, humidity, wind, soil'),
          concept('p2', 'Host factors', 'Resistance, genetic uniformity, age, crop density'),
          concept('p3', 'Human activities', 'Planting dates, variety choice, fertiliser, irrigation'),
          concept('p4', 'Time', 'Length of the disease cycle and favourable period'),
        ],
        explanation:
          'A week of cool, humid weather is an environmental factor. Temperature, rainfall and humidity can turn a few lesions into an epidemic when the host and pathogen are already present.',
      }),
    },
    8: {
      title: 'Pustules Across the Cornfield',
      change: (d) => ({
        ...d,
        question: 'Which pathogen factor lets this disease sweep across the field?',
        pathogenOptions: [
          concept('p1', 'Low virulence', 'The pathogen causes only mild disease'),
          concept('p2', 'Small initial inoculum', 'Only a little inoculum at the start'),
          concept('p3', 'Mode of spread', 'Spores carried far by wind, produced in large numbers'),
          concept('p4', 'Genetic uniformity', 'A host factor: every plant is alike'),
        ],
        explanation:
          'Pathogen factors in an epidemic include virulence, the amount of initial inoculum, the reproduction rate and the mode of spread. Pustules releasing masses of wind-borne spores give fast, long-distance spread.',
      }),
    },
    // Lesson 6: variability of plant pathogens.
    9: {
      title: 'The Resistant Variety Fails',
      change: (d) => ({
        ...d,
        instructions: 'A "blast-resistant" rice variety now shows lesions. Mark them, then explain why the resistance failed.',
        question: 'Why did the resistant variety fail?',
        pathogenOptions: [
          concept('p1', 'The variety became a pathovar', 'Pathovars group bacteria by host, not varieties'),
          concept('p2', 'A new race overcame the resistance', 'Races differ in which resistant varieties they overcome'),
          { id: 'p3', commonName: 'An abiotic disorder', scientificName: 'Non-living; would not spread', group: 'abiotic' },
          concept('p4', 'Too much fungicide', 'Fungicides do not break resistance'),
        ],
        explanation:
          'Races (pathotypes) differ in which resistant varieties they overcome. A resistant variety can stop working when a new race appears, which is why breeders look for durable resistance and farmers rotate varieties and combine tactics.',
      }),
    },
  },
  4: {
    // Lesson 2: classification of weeds — grasses, sedges, broadleaves by stem and leaf.
    1: {
      title: 'Goosegrass Morphology',
      change: (d) => ({
        ...d,
        instructions: 'Drag each label onto the matching part of this grass weed.',
        labels: [
          { id: 'l1', text: 'Roots of a Monocot', hint: 'Grasses are monocots: one seed leaf (cotyledon)' },
          { id: 'l2', text: 'Node (Joint)', hint: 'Grass stems are jointed with nodes' },
          { id: 'l3', text: 'Round, Hollow Stem', hint: 'Grass stems are round and usually hollow' },
          { id: 'l4', text: 'Narrow Leaf, Parallel Veins', hint: 'Grass leaves are narrow with parallel veins, two-ranked' },
          { id: 'l5', text: 'Triangular, Solid Stem', hint: 'A sedge feature' },
          { id: 'l6', text: 'Netted Veins', hint: 'A broadleaf feature' },
        ],
        explanation:
          'Goosegrass (Eleusine indica) is a grass (Poaceae): its stems are round, usually hollow and jointed with nodes, and its leaves are narrow with parallel veins, arranged in two ranks.',
      }),
    },
    2: {
      title: 'Sedges Have Edges',
      change: (d) => ({
        ...d,
        labels: [
          { id: 'l1', text: 'Tubers', hint: 'Swollen underground storage organs that regrow into new plants' },
          { id: 'l2', text: 'Triangular, Solid Stem', hint: 'Sedge stems are triangular and solid, with no nodes' },
          { id: 'l3', text: 'Three-ranked Leaves', hint: 'Narrow leaves with parallel veins in three ranks' },
          { id: 'l4', text: 'Flower and Seed Head', hint: 'Sedges also spread by seed' },
          { id: 'l5', text: 'Node (Joint)', hint: 'A grass feature: sedges have no nodes' },
          { id: 'l6', text: 'Round, Hollow Stem', hint: 'A grass feature' },
        ],
        explanation:
          'Purple nutsedge (Cyperus rotundus) is a sedge: its stem is triangular and solid with no nodes, its leaves are three-ranked, and it regrows from tubers, which is why it survives cutting and tillage.',
      }),
    },
    3: {
      title: 'A Spiny Broadleaf',
      change: (d) => ({
        ...d,
        labels: [
          { id: 'l1', text: 'Main Root of a Dicot', hint: 'Broadleaves are dicots: two seed leaves' },
          { id: 'l2', text: 'Branching Stem', hint: 'Broadleaf stems are round or angular and branching' },
          { id: 'l3', text: 'Expanded Blade, Netted Veins', hint: 'Broadleaf leaves have a wide blade with net-like veins' },
          { id: 'l4', text: 'Flowers Making Many Seeds', hint: 'Prolific seed production fills the seed bank' },
          { id: 'l5', text: 'Narrow Leaf, Parallel Veins', hint: 'A grass or sedge feature' },
          { id: 'l6', text: 'Triangular, Solid Stem', hint: 'A sedge feature' },
        ],
        explanation:
          'Spiny amaranth (Amaranthus spinosus) is a broadleaf (dicot): it has branching stems and expanded leaf blades with netted veins, and it produces many seeds that build up the seed bank.',
      }),
    },
    // Lessons 1 and 7: water hyacinth as a weed and an invasive example.
    9: {
      title: 'Clogged Irrigation Canal',
      change: (d) => ({
        ...d,
        explanation:
          'Water hyacinth (Eichhornia crassipes) forms dense mats that block waterways and irrigation channels. It floats on air-filled leaf stalks and spreads quickly, which makes it an invasive example among weeds.',
      }),
    },
  },
};

const apply = process.argv.includes('--apply');

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const plan = [];
for (const [moduleNumber, levels] of Object.entries(CHANGES)) {
  const module = await Module.findOne({ moduleNumber: Number(moduleNumber) }).lean();
  if (!module) {
    console.log(`Module ${moduleNumber}: not found, skipped`);
    continue;
  }
  const lessonIds = (await Lesson.find({ moduleId: module._id }).select('_id').lean()).map((l) => l._id);
  for (const [levelNumber, spec] of Object.entries(levels)) {
    const mission = await Mission.findOne({ lessonId: { $in: lessonIds }, levelNumber: Number(levelNumber) }).lean();
    if (!mission || mission.scenarioData?.title !== spec.title) {
      console.log(`Module ${moduleNumber} level ${levelNumber}: expected "${spec.title}", found "${mission?.scenarioData?.title ?? 'nothing'}" — skipped`);
      continue;
    }
    const next = spec.change(structuredClone(mission.scenarioData));
    const changed = Object.keys(next).filter((key) => JSON.stringify(next[key]) !== JSON.stringify(mission.scenarioData[key]));
    if (changed.length === 0) {
      console.log(`Module ${moduleNumber} level ${levelNumber} "${spec.title}": already aligned`);
      continue;
    }
    console.log(`Module ${moduleNumber} level ${levelNumber} "${spec.title}": ${changed.join(', ')}`);
    plan.push({ mission, next });
  }
}

if (!apply) {
  console.log(`\nDry run: ${plan.length} mission(s) would change. Run with --apply to write them.`);
} else if (plan.length > 0) {
  const dir = path.resolve('backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `missions-before-align-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(plan.map(({ mission }) => mission), null, 2));
  console.log(`\nBacked up ${plan.length} mission(s) to ${file}`);
  for (const { mission, next } of plan) {
    await Mission.updateOne({ _id: mission._id, 'scenarioData.title': mission.scenarioData.title }, { $set: { scenarioData: next } });
  }
  console.log(`Updated ${plan.length} mission(s).`);
}
await mongoose.disconnect();
