/**
 * Module 4 (Weed Science) mission levels added with the CP1 Week 14–15 lesson
 * content. Scenarios, correct answers and feedback are taken from the Week 14
 * and Week 15 lesson documents and their review questions; nothing is added
 * beyond what those documents state.
 *
 * Module 4 plays drag-and-drop, which labels parts of a weed drawing. These
 * topics (effects, spread, competition, weed shifts, invasive snails and scale
 * insects) are not parts of a plant, so each level sets its own `gameType` and
 * plays as a decision-making scenario instead (see missionGameType).
 *
 * Level numbers continue across the module: Weed Science 1, Classification of
 * Weeds 2–3, these four lessons 4–7, Invasive Species 8–11.
 */

const DECIDE = 'Read each situation, then choose the best decision card.';

export const module4ConceptMissions = [
  {
    _id: 'mis_4_6',
    lessonId: 'les_4_4',
    levelNumber: 4,
    maxXP: 200,
    gameType: 'decision-making',
    scenarioData: {
      title: 'Weeds: Harm and Help',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'rice-field',
          prompt: 'A rice field has weedy rice at a moderate infestation of 15-20 panicles per square meter. What should the farmer expect if it is left unmanaged?',
          dataVisual: { value: '15-20', label: 'Weedy rice panicles per m²', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'trend-down', title: 'A large yield loss', description: 'Expect a serious drop in harvest.', outcome: 'Correct. Weedy rice at moderate infestation (15-20 panicles per square meter) can cause 50-60% yield loss, and 70-80% at high infestation.', points: 100 },
            { id: 'c2', icon: 'check', title: 'No real effect', description: 'Weeds do not change the harvest.', outcome: 'Weeds compete with crops for light, water, nutrients and space, so yield is reduced.', points: 0 },
            { id: 'c3', icon: 'eye', title: 'Only a cosmetic problem', description: 'The rice just looks untidy.', outcome: 'Weedy rice also stains harvested grain with undesirable pericarp color and lowers its value, but the main loss is yield.', points: 20 },
          ],
          explanation: 'Weeds compete with crops for light, water, nutrients and space. Weedy rice at moderate infestation can cause 50-60% yield loss, and it also stains harvested grain and lowers the value of the crop.',
        },
        {
          id: 's2',
          sceneKey: 'corn-field',
          prompt: 'Between two crops, a field is left fallow under a cover of weeds. Which effect of this weed cover is beneficial?',
          dataVisual: { value: 'Fallow', label: 'Field between crops', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'leaf', title: 'Soil cover that reduces erosion', description: 'Ground cover protects the soil.', outcome: 'Correct. Ground cover reduces erosion and runoff between crops or on fallow land.', points: 100 },
            { id: 'c2', icon: 'bug', title: 'Hosting disease pathogens', description: 'Weeds shelter pests and pathogens.', outcome: 'That is a harmful effect: weeds can shelter pathogens and pests.', points: 0 },
            { id: 'c3', icon: 'droplet', title: 'Clogging canals', description: 'Weeds block water channels.', outcome: 'That is a harmful effect, not a beneficial one.', points: 0 },
          ],
          explanation: 'Typical beneficial roles of weeds include soil protection (ground cover reduces erosion and runoff), soil improvement, food, feed and medicine, biodiversity, indicators of soil conditions, and materials such as cogon for thatch.',
        },
        {
          id: 's3',
          sceneKey: 'farm-cornfield',
          prompt: 'Purslane grows between the rows of a vegetable plot. Your classmate says it is simply a bad plant. Which statement fits how weeds are judged?',
          dataVisual: { value: '1 species', label: 'Harmful or useful?', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'scale', title: 'It depends on place and time', description: 'The same species can be harmful in one setting and useful in another.', outcome: 'Correct. A plant is called a weed because of the way people judge it in a particular place and time. Purslane is eaten as a vegetable in many places.', points: 100 },
            { id: 'c2', icon: 'ban', title: 'A weed is always harmful', description: 'Weeds are bad everywhere.', outcome: 'Weeds are not always bad: many are eaten as vegetables, fed to livestock or used in traditional medicine, for example purslane.', points: 0 },
            { id: 'c3', icon: 'help', title: 'It is never a weed', description: 'Useful plants cannot be weeds.', outcome: 'In a crop row it competes with the crop, so there it is a weed even though it is useful elsewhere.', points: 20 },
          ],
          explanation: 'A plant is called a weed because of the way people judge it in a particular place and time, so the same species can be harmful in one setting and useful in another. Both sides should be understood.',
        },
      ],
    },
  },
  {
    _id: 'mis_4_7',
    lessonId: 'les_4_5',
    levelNumber: 5,
    maxXP: 200,
    gameType: 'decision-making',
    scenarioData: {
      title: 'How Weeds Spread and Establish',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'corn-field',
          prompt: 'A field infested with purple nutsedge is plowed and harrowed several times before planting. Afterwards the nutsedge is worse and covers more of the field. Why?',
          dataVisual: { value: '3 passes', label: 'Tillage before planting', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'tractor', title: 'Tillage fragments and moves tubers', description: 'Rhizomes and tubers are broken up and carried across the field.', outcome: 'Correct. Perennial weeds regenerate from rhizomes, stolons, tubers and bulbs, and are often spread further during soil preparation and cultivation.', points: 100 },
            { id: 'c2', icon: 'x', title: 'Tillage kills their seeds', description: 'Plowing destroys the seed supply.', outcome: 'Tillage does not stop perennial weeds: it fragments rhizomes and tubers and moves them.', points: 0 },
            { id: 'c3', icon: 'flask', title: 'Tillage lowers soil pH', description: 'Plowing changes soil chemistry.', outcome: 'Not the reason. Tillage spreads the storage structures that perennial weeds regrow from.', points: 0 },
          ],
          explanation: 'Perennial weeds can regenerate from storage and spreading structures: rhizomes (underground stems), stolons (aboveground stems), tubers and bulbs. Seed is the main way these weeds reach new areas, but they are often spread further during soil preparation and cultivation.',
        },
        {
          id: 's2',
          sceneKey: 'rice-field',
          prompt: 'A farmer plants clean seed but will borrow a tractor that was just used in a neighbor\'s weedy field. Which step best stops weed seeds arriving with it?',
          dataVisual: { value: '1 tractor', label: 'From a weedy field', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'droplet', title: 'Clean the equipment first', description: 'Remove soil and plant material before it enters the field.', outcome: 'Correct. Clean seeds and clean equipment are standard preventive measures.', points: 100 },
            { id: 'c2', icon: 'wind', title: 'No need: seeds only travel by wind', description: 'Machinery cannot carry seeds.', outcome: 'Seeds spread by wind, water, animals, and people and machinery: contaminated crop seed, farm tools, tractors, footwear and clothing.', points: 0 },
            { id: 'c3', icon: 'clock', title: 'Wait and weed later', description: 'Deal with the weeds once they appear.', outcome: 'Preventing seed from arriving is easier than controlling the weeds after they establish.', points: 20 },
          ],
          explanation: 'Weed seeds are dispersed by wind, water, animals, and people and machinery (contaminated crop seed, farm tools, tractors, footwear and clothing). Clean seeds and clean equipment are standard preventive measures.',
        },
        {
          id: 's3',
          sceneKey: 'rice-paddy',
          prompt: 'Weeds come up thickly in a direct-seeded rice field but much less in a nearby puddled, flooded transplanted field. What explains the difference?',
          dataVisual: { value: '2 fields', label: 'Direct-seeded vs transplanted', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'sprout', title: 'No water layer in direct seeding', description: 'Weeds germinate together with the crop and nothing suppresses them.', outcome: 'Correct. In direct-seeded rice, weeds germinate together with the crop and there is no water layer to suppress them, so establishment is much easier.', points: 100 },
            { id: 'c2', icon: 'layers', title: 'Transplanted fields have no seed bank', description: 'There are no weed seeds in that soil.', outcome: 'Both fields can have a seed bank; the difference is how easily weeds establish.', points: 0 },
            { id: 'c3', icon: 'sun', title: 'Direct-seeded fields get less sun', description: 'Shade favors the weeds.', outcome: 'Not stated in the lesson. The difference comes from germinating with the crop and the missing water layer.', points: 0 },
          ],
          explanation: 'A weed establishes when seed or a propagule germinates, the seedling emerges and survives, and the plant grows enough to compete. In direct-seeded rice, weeds germinate together with the crop and there is no water layer to suppress them, so establishment is much easier than in puddled, flooded transplanted rice.',
        },
      ],
    },
  },
  {
    _id: 'mis_4_8',
    lessonId: 'les_4_6',
    levelNumber: 6,
    maxXP: 200,
    gameType: 'decision-making',
    scenarioData: {
      title: 'Racing the Weeds',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'corn-field',
          prompt: 'In Field A, weeds emerge on the same day as the corn. In Field B, weeds come up three weeks after the corn. Which field is likely to lose more yield?',
          dataVisual: { value: '0 days', label: 'Gap in Field A', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'clock', title: 'Field A: weeds emerged with the crop', description: 'Same-day emergence.', outcome: 'Correct. Weeds that emerge with the crop are the most damaging; as the gap between crop and weed emergence widens, weeds are less likely to affect yield.', points: 100 },
            { id: 'c2', icon: 'timer', title: 'Field B: late-emerging weeds', description: 'Weeds three weeks behind the crop.', outcome: 'Late-emerging weeds do not cause the greatest loss; the crop is already ahead of them.', points: 0 },
            { id: 'c3', icon: 'scale', title: 'Both lose the same', description: 'Timing does not matter.', outcome: 'Timing matters: relative time of emergence is one of the factors that affect the severity of competition.', points: 0 },
          ],
          explanation: 'Factors affecting the severity of competition include weed density, duration, relative time of emergence, weed species, crop establishment method, and environment and management. Weeds emerging with the crop are generally the most damaging.',
        },
        {
          id: 's2',
          sceneKey: 'rice-field',
          prompt: 'A farmer can afford only one weeding this season. When does weeding protect the most yield?',
          dataVisual: { value: '1', label: 'Weeding this season', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'shield', title: 'Within the critical period', description: 'During the part of the crop cycle when weeds must be controlled.', outcome: 'Correct. Weeds controlled within the critical period protect yield, while later removal gives little yield benefit.', points: 100 },
            { id: 'c2', icon: 'basket', title: 'Just before harvest', description: 'Clean the field at the end.', outcome: 'Later removal gives little yield benefit; the damage has already been done.', points: 0 },
            { id: 'c3', icon: 'sprout', title: 'When weeds set the most seed', description: 'Wait for the weeds to mature.', outcome: 'The critical period is defined by yield loss in the crop, not by when weeds produce the most seed.', points: 20 },
          ],
          explanation: 'The critical period for weed control (CPWC) is the period in the crop growth cycle during which weeds must be controlled to prevent yield losses. It lies between the critical timing of weed removal and the end of the critical weed-free period. Timing, not just whether weeds are controlled, matters.',
        },
        {
          id: 's3',
          sceneKey: 'rice-paddy',
          prompt: 'Which change would make weed competition in a rice field more severe?',
          dataVisual: { value: '50-100%', label: 'Reported loss, direct-seeded', trend: 'down' },
          choices: [
            { id: 'c1', icon: 'seedling', title: 'Switching to direct seeding', description: 'From transplanting into standing water.', outcome: 'Correct. In direct-seeded rice, weeds and crop germinate together and there is no water layer to suppress weeds, so losses reach 50-100%.', points: 100 },
            { id: 'c2', icon: 'droplet', title: 'Keeping standing water after puddling', description: 'Maintain a water layer.', outcome: 'Puddling and standing water reduce weed pressure in transplanted rice.', points: 0 },
            { id: 'c3', icon: 'hand', title: 'Weeding early, at crop emergence', description: 'Let the crop start ahead.', outcome: 'Controlling weeds early, before or at crop emergence, helps the crop start ahead of the weeds.', points: 0 },
          ],
          explanation: 'Crop establishment method affects competition: in direct-seeded rice there is no water layer to suppress weeds, so losses reach 50-100%, while puddling and standing water reduce weed pressure in transplanted rice.',
        },
      ],
    },
  },
  {
    _id: 'mis_4_9',
    lessonId: 'les_4_7',
    levelNumber: 7,
    maxXP: 200,
    gameType: 'decision-making',
    scenarioData: {
      title: 'The Weeds That Stayed',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'corn-field',
          prompt: 'For several years a farmer has sprayed the same herbicide every season. Now a few weed species that the herbicide does not control dominate the field. What has happened?',
          dataVisual: { value: 'Same', label: 'Herbicide every season', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'refresh', title: 'A weed shift', description: 'The share of weed species changed over time.', outcome: 'Correct. Repeated use of one control tactic can lead to a weed population dominated by species that the tactic does not control.', points: 100 },
            { id: 'c2', icon: 'check-circle', title: 'All weeds were eliminated for good', description: 'The herbicide solved the problem.', outcome: 'Repeated use of one herbicide favors species it does not control, or resistant biotypes; it does not eliminate weeds permanently.', points: 0 },
            { id: 'c3', icon: 'sun', title: 'Weeds changed color in the dry season', description: 'A seasonal change in appearance.', outcome: 'A weed shift is a change in the relative share of weed species over time, not a change in color.', points: 0 },
          ],
          explanation: 'A field usually holds a mixture of weed species, and the share of each species changes over time in response to management. Herbicide selection pressure leads to resistant biotypes or to increased dominance of tolerant species.',
        },
        {
          id: 's2',
          sceneKey: 'farm-cornfield',
          prompt: 'What should the farmer do next season to slow the weed shift?',
          dataVisual: { value: 'Next season', label: 'Plan to slow the shift', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'layers', title: 'Vary the tactics', description: 'Rotate crops and vary tillage, planting date and control methods.', outcome: 'Correct. Varying practices means no species is favored continuously.', points: 100 },
            { id: 'c2', icon: 'spray', title: 'Spray the same herbicide at a higher rate', description: 'More of the same product.', outcome: 'Do not rely on one tactic or one herbicide mode of action year after year.', points: 0 },
            { id: 'c3', icon: 'eye-off', title: 'Stop scouting', description: 'The field will balance itself.', outcome: 'Scout fields and keep records of which weeds are present so shifts are noticed early.', points: 0 },
          ],
          explanation: 'Do not rely on one tactic or one herbicide mode of action year after year; rotate crops and vary tillage, planting date and control methods; scout and keep records; prevent seed production; and use integrated weed management, since no single method works for all weeds.',
        },
        {
          id: 's3',
          sceneKey: 'rice-field',
          prompt: 'Farmers in a region move from transplanting to direct seeding of rice. What should they expect?',
          dataVisual: { value: 'Direct-seeded', label: 'New establishment method', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'alert', title: 'Weed flora shifts and new challenges', description: 'Different weeds become important.', outcome: 'Correct. In Asia, the move from transplanting to direct seeding, with herbicide resistance and climate change, has led to weed flora shifts and new challenges for weed management in rice.', points: 100 },
            { id: 'c2', icon: 'check', title: 'No change in the weeds present', description: 'The same weeds as before.', outcome: 'Crop establishment imposes selection pressure, so the weed flora changes.', points: 0 },
            { id: 'c3', icon: 'x-circle', title: 'Weeds will disappear', description: 'Without puddling, weeds cannot grow.', outcome: 'Without a water layer, weed pressure in direct-seeded rice is higher, not lower.', points: 0 },
          ],
          explanation: 'Crop rotation, tillage, soil amendments, mechanized harvest and crop establishment all impose selection pressures that can favor some species over others. The move to direct-seeded rice has led to weed flora shifts.',
        },
      ],
    },
  },
];

export const module4InvasiveMissions = [
  {
    _id: 'mis_4_10',
    lessonId: 'les_4_3',
    levelNumber: 10,
    maxXP: 200,
    gameType: 'decision-making',
    scenarioData: {
      title: 'Snails in the New Paddy',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'rice-paddy',
          prompt: 'Golden apple snails are found in a rice field transplanted 5 days ago. What should the farmer do now?',
          dataVisual: { value: '5 DAT', label: 'Days after transplanting', trend: 'flat' },
          choices: [
            { id: 'c1', icon: 'hand', title: 'Handpick and lower the water', description: 'Collect snails, crush egg masses and keep water below 2 cm.', outcome: 'Correct. The critical time is the first 10 days after transplanting; handpick snails, crush egg masses and keep the water level below 2 cm during the vulnerable stages.', points: 100 },
            { id: 'c2', icon: 'clock', title: 'Wait until the rice is 40 days old', description: 'Act later in the season.', outcome: 'Too late. Snails damage transplanted rice up to about 30 days old; the critical time is land preparation and crop establishment.', points: 0 },
            { id: 'c3', icon: 'flask', title: 'Rely on a molluscicide', description: 'Make chemicals the main control.', outcome: 'Effective molluscicides exist but several were highly toxic to fish, so integrated, largely non-chemical approaches are stressed.', points: 30 },
          ],
          explanation: 'Snails cut rice stems at the base and destroy the whole plant. The critical time for management is the first 10 days after transplanting and the first 21 days after direct wet-seeding. Cultural control: handpick snails and crush egg masses; keep the water level below 2 cm during the vulnerable stages.',
        },
        {
          id: 's2',
          sceneKey: 'rice-field',
          prompt: 'Bright pink masses appear on rice stems and stakes above the waterline. What are they, and what should be done?',
          dataVisual: { value: '92-592', label: 'Eggs per mass (one study)', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'basket', title: 'Snail egg masses: collect and destroy', description: 'Remove them before they hatch.', outcome: 'Correct. The snail lays bright pink egg masses above the waterline; stakes placed as egg-laying sites make them easy to collect and destroy.', points: 100 },
            { id: 'c2', icon: 'spray', title: 'Fungal growth: spray a fungicide', description: 'Treat it as a disease.', outcome: 'These are golden apple snail eggs, not a fungus.', points: 0 },
            { id: 'c3', icon: 'eye-off', title: 'Harmless: leave them', description: 'Nothing to do.', outcome: 'Eggs hatch after about two weeks and the young fall into the water to feed.', points: 0 },
          ],
          explanation: 'The golden apple snail lays bright pink egg masses above the waterline; eggs hatch after about two weeks and the young fall into the water. Stakes placed in the field as egg-laying sites make egg masses easy to collect and destroy.',
        },
        {
          id: 's3',
          sceneKey: 'rice-paddy',
          prompt: 'A barangay wants snail control that lasts. Which approach does the Philippine experience support?',
          dataVisual: { value: '13,946 ha', label: 'Infested by Feb 1988', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'users', title: 'Sustained community collection', description: 'Mass snail and egg collection at land preparation and establishment, kept up season after season.', outcome: 'Correct. Community action works at establishment, and the national campaign showed that practices must be sustained to last.', points: 100 },
            { id: 'c2', icon: 'clock', title: 'One campaign, then stop', description: 'A single big effort.', outcome: 'A national campaign created awareness, but farmers\' long-term adoption was not sustained.', points: 30 },
            { id: 'c3', icon: 'bug', title: 'Release a predatory snail', description: 'Let another snail eat them.', outcome: 'Generalist predators released against the giant African snail were implicated in mass extinctions of other land snails. Natural enemies must be host-specific and carefully tested.', points: 0 },
          ],
          explanation: 'Community action: mass snail and egg collection campaigns during land preparation and crop establishment. Natural enemies such as red ants (on eggs) and ducks also help. A national non-chemical campaign created awareness, but long-term adoption was not sustained.',
        },
      ],
    },
  },
  {
    _id: 'mis_4_11',
    lessonId: 'les_4_3',
    levelNumber: 11,
    maxXP: 200,
    gameType: 'decision-making',
    scenarioData: {
      title: 'The Cocolisap Outbreak',
      instructions: DECIDE,
      scenarios: [
        {
          id: 's1',
          sceneKey: 'banana-farm',
          prompt: 'Coconut leaflets are crusted underneath with tiny armored scales and the palms are weakening. An early report names the pest Aspidiotus destructor. What should come before choosing control?',
          dataVisual: { value: '1.2M+', label: 'Coconut trees affected', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'microscope', title: 'Confirm the species', description: 'Check identity by morphological and DNA analysis.', outcome: 'Correct. Analysis by UP Los Baños researchers showed the pest was A. rigidus, not A. destructor. Correct species identification matters.', points: 100 },
            { id: 'c2', icon: 'spray', title: 'Spray right away', description: 'Any insecticide will do.', outcome: 'Control chosen without correct identification can fail; identification came first in the cocolisap response.', points: 0 },
            { id: 'c3', icon: 'clock', title: 'Wait and watch', description: 'See whether it goes away.', outcome: 'The insect can kill a tree in six months or less, so waiting is risky.', points: 0 },
          ],
          explanation: 'The pest was first thought to be Aspidiotus destructor, until morphological and DNA analysis by UP Los Baños researchers showed that it was A. rigidus. It feeds on the lower surface of coconut leaflets, impairing photosynthesis and transpiration, and can kill the tree in six months or less.',
        },
        {
          id: 's2',
          sceneKey: 'banana-farm',
          prompt: 'Which natural enemy proved effective against the coconut scale insect?',
          dataVisual: { value: '80%', label: 'Parasitization in some places', trend: 'up' },
          choices: [
            { id: 'c1', icon: 'bug', title: 'A native parasitoid wasp', description: 'Comperiella calauanica, specific to the scale insect.', outcome: 'Correct. It was specific to the scale insect and showed density-dependent parasitism, a feature of an effective natural enemy.', points: 100 },
            { id: 'c2', icon: 'globe', title: 'A generalist predator from abroad', description: 'Any predator that eats insects.', outcome: 'Releasing a generalist predator to fight one invader can create a second, worse invasion.', points: 0 },
            { id: 'c3', icon: 'ban', title: 'None: natural enemies cannot help', description: 'Only chemicals work on invaders.', outcome: 'Conserving and using natural enemies, including native ones, can be a major part of managing an invasive pest.', points: 0 },
          ],
          explanation: 'A native parasitoid wasp, Comperiella calauanica, was specific to the scale insect and showed density-dependent parasitism. It was found in 53 municipalities in CALABARZON in 2014, with parasitization as high as 80% in some places. Mass-reared wasps were later released in the Zamboanga Peninsula.',
        },
        {
          id: 's3',
          sceneKey: 'banana-farm',
          prompt: 'By the end of 2014 the Southern Luzon infestation had declined to non-outbreak level. What has the recovery been attributed to?',
          dataVisual: { value: '2014', label: 'Southern Luzon recovered', trend: 'down' },
          choices: [
            { id: 'c1', icon: 'layers', title: 'A combination of factors', description: 'Typhoon effects, chemical control and biological control together.', outcome: 'Correct. Combining tactics works better than relying on one.', points: 100 },
            { id: 'c2', icon: 'spray', title: 'Trunk injection alone', description: 'Only the insecticide.', outcome: 'Trunk injection of dinotefuran was a principal emergency measure, but the recovery is attributed to several factors together.', points: 30 },
            { id: 'c3', icon: 'help', title: 'It disappeared by itself', description: 'Nothing was done.', outcome: 'A task force, chemical control and biological control were all part of the response.', points: 0 },
          ],
          explanation: 'Recovery has been attributed to a combination of factors, including typhoon effects, chemical control and biological control. Key lessons: correct species identification matters; combining tactics works better than relying on one; and conserving and using natural enemies can be a major part of managing an invasive pest.',
        },
      ],
    },
  },
];
