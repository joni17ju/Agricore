/**
 * Module 3 (Agricultural Entomology) lesson content.
 * Source: the Arthropod and Vertebrate Pests and Natural Enemies section
 * (Weeks 7–11, the document's Lessons 4–8) of the CP1 Week 2–11 lesson
 * document (AgriCore Paper/module_week2-11.pdf), placed by the CP1 syllabus:
 *   Week 7  entomology defined; recognizing an insect and a mite
 *   Week 8  characteristics of insects; how insects affect man
 *   Week 9  recognizing insect orders
 *   Week 10 representative insect pests and planning their management
 *   Week 11 vertebrate pests (birds and rodents); natural enemies
 * Learning objectives are the syllabus learning outcome for Weeks 7–11.
 *
 * Tables in the document are written as term-and-explanation lists with the
 * same wording. The document's bracketed citation numbers are left out (it has
 * no numbered reference list). Images live in frontend/public/images/lessons/module-3/.
 * Edit the lessons in the lesson editor; this file is the seed copy.
 */
const IMG = '/images/lessons/module-3';

export const arthropodPests = `
<ul class="lesson-objectives"><li><p>Identify different arthropod pests based on their characteristics.</p></li></ul>
<h2>Entomology and why it matters</h2>
<p><strong>Entomology</strong> is the study of insects. Most insects are harmless or helpful, and only a few damage crops, so crop protection entomology studies both the pests and the helpful insects that control them.</p>
<h2>Arthropods: the larger group</h2>
<p>Insects and mites belong to the phylum <strong>Arthropoda</strong>. All arthropods share a segmented body, paired jointed appendages and a hard exoskeleton that must be molted for the animal to grow. The classes you are most likely to meet in the field are:</p>
<ul>
  <li><p><strong>Insecta (Hexapoda)</strong></p><ul><li><strong>Body regions:</strong> 3: head, thorax, abdomen</li><li><strong>Legs and antennae:</strong> 6 legs; 1 pair of antennae; often 1–2 pairs of wings</li><li><strong>Examples:</strong> Planthoppers, beetles, moths, flies, ants</li></ul></li>
  <li><p><strong>Arachnida</strong></p><ul><li><strong>Body regions:</strong> 2 (or fused into one): cephalothorax and abdomen; mites usually appear as one oval body</li><li><strong>Legs and antennae:</strong> 8 legs in adults; no antennae; no wings</li><li><strong>Examples:</strong> Spiders, spider mites, ticks, scorpions</li></ul></li>
  <li><p><strong>Crustacea</strong></p><ul><li><strong>Body regions:</strong> Cephalothorax and abdomen</li><li><strong>Legs and antennae:</strong> Many legs; 2 pairs of antennae</li><li><strong>Examples:</strong> Crabs, shrimps, pill bugs (woodlice)</li></ul></li>
  <li><p><strong>Diplopoda</strong></p><ul><li><strong>Body regions:</strong> Head and many segments</li><li><strong>Legs and antennae:</strong> 2 pairs of legs per body segment</li><li><strong>Examples:</strong> Millipedes (may chew seedlings)</li></ul></li>
  <li><p><strong>Chilopoda</strong></p><ul><li><strong>Body regions:</strong> Head and many segments</li><li><strong>Legs and antennae:</strong> 1 pair of legs per segment; venomous fangs</li><li><strong>Examples:</strong> Centipedes</li></ul></li>
</ul>
<h2>Recognizing an insect and a mite</h2>
<figure data-layout="center"><img src="${IMG}/w07-fig1-insect-and-mite.jpg" alt="Labelled grasshopper showing antennae, eyes, head, mouth, thorax, abdomen and legs, beside a labelled mite showing head, mouth, abdomen and legs"><figcaption>Adult insect compared with an adult mite.</figcaption></figure>
<h3>Body parts</h3>
<ul>
  <li><strong>Head:</strong> The head has the antennae (for smell and touch), the eyes and the mouthparts. The mouthparts decide how the insect feeds and what kind of damage it causes.</li>
  <li><strong>Thorax:</strong> The thorax carries the six legs and, when present, the wings. Wing type is one of the best clues for identifying an insect.</li>
  <li><strong>Abdomen:</strong> The abdomen holds most of the digestive and reproductive organs. Insects breathe through small openings called spiracles, not lungs.</li>
</ul>
<h3>Why the exoskeleton and small size matter</h3>
<p>The hard outer skin protects the insect but cannot grow, so insects molt to get bigger. Newly molted insects are soft and easier to kill.</p>
<h3>Recognizing a mite</h3>
<ul>
  <li><strong>Spider mites</strong> feed on leaf cells and leave a speckled (stippled) pale surface; heavy infestations form fine webbing. Hot, dry conditions favour them.</li>
  <li><strong>Rust, gall and bud mites</strong> (eriophyid mites) are smaller than the width of a hair, cause distortion, galls, russeting or curling and often need magnification to see.</li>
  <li><strong>Predatory mites</strong> are beneficial: they feed on pest mites and small insects. Correct identification matters, because a mistaken spray can remove the natural enemies and make the pest problem worse.</li>
</ul>
<h3>How to recognize an insect in five steps</h3>
<ol>
  <li>Count the legs: six means insect; eight means mite or spider.</li>
  <li>Count the body regions: three distinct regions means insect.</li>
  <li>Look for antennae: present in insects, absent in mites and spiders.</li>
  <li>Note wings: number, texture (hard, leathery, membranous, scaly) and how they are held.</li>
  <li>Look at mouthparts and the shape of the immature stage.</li>
</ol>
`.trim();

export const whyInsectsSucceed = `
<ul class="lesson-objectives"><li><p>Identify different arthropod pests based on their characteristics.</p></li></ul>
<h2>Characteristics that make insects so successful</h2>
<p>Why each characteristic helps insects, and what it means for crop protection:</p>
<ul>
  <li><strong>Small size:</strong> Requires little food and space, allows hiding in small places (leaf sheaths, soil, stems) and makes detection difficult.</li>
  <li><strong>Exoskeleton:</strong> Protects against drying out and injury; allows life on land in dry conditions.</li>
  <li><strong>Flight:</strong> The only invertebrates with wings: quick escape, searching for hosts and mates, and migration over long distances to colonize new fields.</li>
  <li><strong>Metamorphosis:</strong> Immatures and adults often live in different places and eat different foods, so they do not compete. Metamorphosis is one of the key elements that make insects so successful.</li>
  <li><strong>High reproductive potential:</strong> Many eggs, short life cycles and many generations per crop; populations can grow explosively when conditions are favourable.</li>
  <li><strong>Varied feeding habits and mouthparts:</strong> Insects exploit almost every plant part and food source.</li>
  <li><strong>Adaptability:</strong> Short generations allow populations to evolve resistance to insecticides and to overcome resistant varieties.</li>
  <li><strong>Resting stages and diapause:</strong> Eggs, pupae or diapausing adults survive dry seasons, cold or the absence of host crops.</li>
</ul>
<h2>Growth and development of insects</h2>
<figure data-layout="center"><img src="${IMG}/w08-fig1-metamorphosis.png" alt="Diagram: incomplete metamorphosis goes egg, nymph, adult; complete metamorphosis goes egg, larva, pupa, adult"><figcaption>Incomplete (gradual) metamorphosis has three stages (e.g. grasshoppers, planthoppers, leafhoppers, bugs, aphids, thrips, cockroaches, termites); complete metamorphosis has four (e.g. moths and butterflies, beetles, flies, wasps, bees, ants).</figcaption></figure>
<ul class="lesson-key-terms">
  <li><p><strong>Gradual (incomplete) metamorphosis</strong>: The immature stage is a nymph that looks like a small, wingless adult; wing buds appear and grow with each molt and the adult has the same organs and appendages as the nymph.</p></li>
  <li><p><strong>Complete metamorphosis</strong>: The insect passes through egg, larva, pupa and adult; the larva looks very different from the adult, and during the pupal stage the body is rebuilt.</p></li>
</ul>
<div data-callout="tip"><p><strong>Management consequence</strong></p><p>Each life stage of an insect may live in a different place and respond differently to control. In complete metamorphosis, usually only the larvae of moths and beetles damage the crop, while in gradual metamorphosis both nymphs and adults feed on the plant, so the damage lasts longer. Control is aimed at the most vulnerable stage available.</p></div>
<h2>Mouthparts decide the type of damage</h2>
<ul>
  <li><p><strong>Chewing</strong></p><ul><li><strong>Examples:</strong> Grasshoppers, beetles, caterpillars</li><li><strong>Typical damage:</strong> Holes in leaves, defoliation, borers in stems and fruits, root feeding</li><li><strong>Management consequence:</strong> Stomach-poison and contact products, baits, plant resistance; barriers</li></ul></li>
  <li><p><strong>Piercing-sucking</strong></p><ul><li><strong>Examples:</strong> Planthoppers, aphids, true bugs, scale insects</li><li><strong>Typical damage:</strong> Yellowing, wilting, hopperburn, honeydew and sooty mould, virus transmission</li><li><strong>Management consequence:</strong> Systemic or contact products; vector control; conserve natural enemies</li></ul></li>
  <li><p><strong>Rasping-sucking</strong></p><ul><li><strong>Examples:</strong> Thrips</li><li><strong>Typical damage:</strong> Silvery streaks, scarring, distorted growth</li><li><strong>Management consequence:</strong> Monitoring of small insects; sticky traps</li></ul></li>
  <li><p><strong>Siphoning</strong></p><ul><li><strong>Examples:</strong> Adult moths and butterflies</li><li><strong>Typical damage:</strong> Adults do not damage plants (larvae do); adults pollinate</li><li><strong>Management consequence:</strong> Control larvae, not adults, with traps or pheromone lures</li></ul></li>
  <li><p><strong>Sponging / lapping</strong></p><ul><li><strong>Examples:</strong> Houseflies; honey bees</li><li><strong>Typical damage:</strong> Contamination of food; pollination</li><li><strong>Management consequence:</strong> Sanitation; protect pollinators</li></ul></li>
</ul>
<h2>Habits and behavior that affect people</h2>
<h3>Feeding habits</h3>
<p>Insects may be plant feeders, predators, parasites, scavengers or decomposers. Some plant feeders attack only one crop while others attack many, so weeds and neighbouring crops can harbour pests.</p>
<h3>Other important behaviours</h3>
<ul>
  <li><strong>Migration and dispersal:</strong> the brown planthopper arrives as winged forms that lay eggs; the offspring include wingless adults; after harvest the insects move to grasses or to new rice crops.</li>
  <li><strong>Gregarious feeding:</strong> young armyworms and aphids feed in groups, which makes early detection and spot treatment possible.</li>
  <li><strong>Activity cycles:</strong> many moths are active at night, which is why light traps and night scouting are effective.</li>
  <li><strong>Social behaviour:</strong> termites and ants live in colonies; ants may protect honeydew-producing insects such as aphids and scales from their natural enemies.</li>
  <li><strong>Host selection and egg-laying:</strong> female moths and beetles choose where to lay eggs; planting dates and field sanitation can reduce this.</li>
</ul>
<h2>How insects affect people</h2>
<ul>
  <li><strong>Harmful: direct damage to crops:</strong> Defoliation by armyworms, stem borers causing deadhearts, rhinoceros beetle damaging coconut crowns, fruit flies in mango</li>
  <li><strong>Harmful: transmission of plant diseases:</strong> Green leafhopper and tungro in rice; aphids and banana bunchy top; planthoppers and rice stunt viruses</li>
  <li><strong>Harmful: stored products and household:</strong> Weevils in grain, termites in timber, cockroaches in food stores</li>
  <li><strong>Harmful: human and animal health:</strong> Mosquitoes (dengue, malaria), flies, fleas, lice</li>
  <li><strong>Beneficial: pollination:</strong> Bees, flies and others pollinate fruit, vegetables and many tree crops</li>
  <li><strong>Beneficial: natural enemies of pests:</strong> Ladybird beetles, lacewings, parasitoid wasps; FAO notes lady beetles and green lacewings as key components of IPM</li>
  <li><strong>Beneficial: products and services:</strong> Honey, silk, wax, lac; nutrient recycling by decomposers; food in some regions; research models</li>
</ul>
<div data-callout="warning"><p><strong>When insecticide use backfires: the three R's</strong></p><ul><li><strong>Resistance:</strong> the pest becomes more tolerant of the insecticide.</li><li><strong>Resurgence:</strong> the pest returns in larger numbers after spraying killed its natural enemies.</li><li><strong>Replacement:</strong> a secondary pest becomes a key pest.</li></ul></div>
`.trim();

export const recognizingInsectOrders = `
<ul class="lesson-objectives"><li><p>Recognize insect orders.</p></li></ul>
<h2>Insect orders</h2>
<figure data-layout="center"><img src="${IMG}/w09-fig1-insect-orders.png" alt="Tree of class Insecta: orders with gradual metamorphosis on the left and orders with complete metamorphosis on the right"><figcaption>Orders of class Insecta grouped by metamorphosis. Hymenoptera also includes many parasitoid wasps; Coleoptera and Diptera also include predators and parasitoids. Green boxes are mainly beneficial orders.</figcaption></figure>
<h2>Characteristics of the main orders</h2>
<ul>
  <li><p><strong>Orthoptera (grasshoppers, locusts, crickets)</strong></p><ul><li><strong>Wings:</strong> Leathery narrow front wings; membranous hind wings</li><li><strong>Mouthparts:</strong> Chewing; hind legs enlarged for jumping (grasshoppers)</li><li><strong>Metamorphosis:</strong> Gradual</li><li><strong>Importance and examples:</strong> Defoliators of grasses, corn, rice and sugarcane; migratory locusts</li></ul></li>
  <li><p><strong>Blattodea (cockroaches, termites)</strong></p><ul><li><strong>Wings:</strong> Present in cockroaches; reproductive termites have 2 equal pairs</li><li><strong>Mouthparts:</strong> Chewing</li><li><strong>Metamorphosis:</strong> Gradual</li><li><strong>Importance and examples:</strong> Termites damage timber and some crops; cockroaches are household pests</li></ul></li>
  <li><p><strong>Dermaptera (earwigs)</strong></p><ul><li><strong>Wings:</strong> Short front wings, folded hind wings</li><li><strong>Mouthparts:</strong> Chewing; pincer-like cerci at tail</li><li><strong>Metamorphosis:</strong> Gradual</li><li><strong>Importance and examples:</strong> Omnivores; some are predators (DA uses earwigs against fall armyworm)</li></ul></li>
  <li><p><strong>Hemiptera (true bugs, planthoppers, leafhoppers, aphids, scales, mealybugs, whiteflies)</strong></p><ul><li><strong>Wings:</strong> True bugs: half-hard front wings; others: uniform wings held roof-like; some groups wingless</li><li><strong>Mouthparts:</strong> Piercing-sucking beak</li><li><strong>Metamorphosis:</strong> Gradual</li><li><strong>Importance and examples:</strong> Major pests and virus vectors: brown planthopper, green leafhopper, rice bugs, aphids, mealybugs, scale insects</li></ul></li>
  <li><p><strong>Thysanoptera (thrips)</strong></p><ul><li><strong>Wings:</strong> Narrow wings with fringe of hairs</li><li><strong>Mouthparts:</strong> Rasping-sucking</li><li><strong>Metamorphosis:</strong> Gradual with resting stages</li><li><strong>Importance and examples:</strong> Silvery streaks and distortion on leaves and flowers; virus vectors</li></ul></li>
  <li><p><strong>Coleoptera (beetles, weevils)</strong></p><ul><li><strong>Wings:</strong> Hard front wings (elytra) meeting in a straight line down the back</li><li><strong>Mouthparts:</strong> Chewing</li><li><strong>Metamorphosis:</strong> Complete</li><li><strong>Importance and examples:</strong> Largest order: rhinoceros beetle, weevils, leaf beetles (pests); ladybirds and ground beetles (predators)</li></ul></li>
  <li><p><strong>Lepidoptera (moths, butterflies)</strong></p><ul><li><strong>Wings:</strong> Four wings covered with tiny scales</li><li><strong>Mouthparts:</strong> Larva chewing; adult siphoning</li><li><strong>Metamorphosis:</strong> Complete</li><li><strong>Importance and examples:</strong> Larvae are major pests: stem borers, armyworms, cutworms, leaf folders</li></ul></li>
  <li><p><strong>Diptera (true flies, midges)</strong></p><ul><li><strong>Wings:</strong> One pair of wings; hind pair reduced to halteres</li><li><strong>Mouthparts:</strong> Sponging or piercing; larvae (maggots) often with no legs</li><li><strong>Metamorphosis:</strong> Complete</li><li><strong>Importance and examples:</strong> Fruit flies, gall midges, leaf miners (pests); hoverflies and tachinid flies (beneficial)</li></ul></li>
  <li><p><strong>Hymenoptera (wasps, bees, ants, sawflies)</strong></p><ul><li><strong>Wings:</strong> Two pairs of membranous wings hooked together; many wasps and ants have a narrow waist</li><li><strong>Mouthparts:</strong> Chewing or chewing-lapping</li><li><strong>Metamorphosis:</strong> Complete</li><li><strong>Importance and examples:</strong> Mostly beneficial: parasitoid wasps, pollinators; some ants and sawflies are pests</li></ul></li>
  <li><p><strong>Neuroptera (lacewings)</strong></p><ul><li><strong>Wings:</strong> Four net-veined wings held roof-like</li><li><strong>Mouthparts:</strong> Chewing (larvae suck prey)</li><li><strong>Metamorphosis:</strong> Complete</li><li><strong>Importance and examples:</strong> Larvae are predators of aphids and small insects</li></ul></li>
  <li><p><strong>Odonata (dragonflies, damselflies)</strong></p><ul><li><strong>Wings:</strong> Two pairs of long net-veined wings; very large eyes</li><li><strong>Mouthparts:</strong> Chewing; aquatic nymphs</li><li><strong>Metamorphosis:</strong> Gradual</li><li><strong>Importance and examples:</strong> Predators of flying insects</li></ul></li>
</ul>
<h2>A simplified recognition guide</h2>
<ol>
  <li><strong>Coleoptera:</strong> Hard, shell-like front wings meeting in a straight line down the back.</li>
  <li><strong>Lepidoptera:</strong> Wings covered with fine scales and a coiled tongue.</li>
  <li><strong>Diptera:</strong> Only one pair of wings.</li>
  <li><strong>Hymenoptera:</strong> Two pairs of clear wings, narrow waist.</li>
  <li><strong>Hemiptera:</strong> Needle-like beak; front wings half-hard (bugs) or uniform and held like a roof (hoppers, aphids).</li>
  <li><strong>Orthoptera:</strong> Narrow leathery front wings and large hind legs for jumping.</li>
  <li><strong>Dermaptera:</strong> Pair of forceps at the end of the abdomen.</li>
  <li><strong>Thysanoptera:</strong> Extremely small insect with narrow fringed wings.</li>
  <li><strong>Odonata or Neuroptera:</strong> Large, net-veined wings and big eyes (lacewings have thin, delicate wings held roof-like).</li>
</ol>
`.trim();

export const representativeInsectPests = `
<ul class="lesson-objectives"><li><p>Identify different arthropod pests based on their characteristics.</p></li></ul>
<h2>Planning begins with the pest</h2>
<p>Good pest management is a decision process, not a spraying schedule. Before choosing any tactic, answer these questions:</p>
<ol>
  <li><strong>What is the pest, and is it really the cause of the damage?</strong> Correct identification comes first.</li>
  <li><strong>What does its life cycle look like?</strong> Which stage causes damage, which stage is easiest to attack, how many generations per crop, where does it spend the off-season?</li>
  <li><strong>What is the damage type?</strong> Chewing, boring, sucking, or virus transmission?</li>
  <li><strong>How much damage can the crop tolerate?</strong> At what pest density does control pay for itself (EIL and ET)?</li>
  <li><strong>Which natural enemies are present?</strong> Can they be conserved?</li>
  <li><strong>What tactics are available and compatible?</strong> Cultural, physical, biological, host-plant resistance, chemical and regulatory.</li>
  <li><strong>What are the economic, health and environmental effects?</strong> Costs, pesticide safety, effects on pollinators, natural enemies and water, and acceptability to farmers and consumers.</li>
  <li><strong>How will we monitor the result and avoid resistance?</strong> Keep records and rotate tactics.</li>
</ol>
<h2>The management toolbox</h2>
<ul>
  <li><p><strong>Cultural</strong></p><ul><li><strong>What it involves:</strong> Changing crop management to make the field less suitable for pests</li><li><strong>Examples:</strong> Synchronous planting, crop rotation, field sanitation, removing volunteer plants, balanced fertiliser, varietal rotation</li></ul></li>
  <li><p><strong>Mechanical / physical</strong></p><ul><li><strong>What it involves:</strong> Hand-picking, traps, barriers, nets</li><li><strong>Examples:</strong> Light traps, removing egg masses, breeding-site sanitation</li></ul></li>
  <li><p><strong>Host-plant resistance</strong></p><ul><li><strong>What it involves:</strong> Growing varieties that tolerate or resist the pest</li><li><strong>Examples:</strong> Planthopper- and leafhopper-resistant rice varieties</li></ul></li>
  <li><p><strong>Biological</strong></p><ul><li><strong>What it involves:</strong> Conserving, augmenting or introducing natural enemies</li><li><strong>Examples:</strong> Parasitoid wasps, predatory spiders and bugs, <em>Metarhizium</em> fungus</li></ul></li>
  <li><p><strong>Behavioral</strong></p><ul><li><strong>What it involves:</strong> Using attractants or repellents</li><li><strong>Examples:</strong> Pheromone traps and lures</li></ul></li>
  <li><p><strong>Chemical</strong></p><ul><li><strong>What it involves:</strong> Insecticides used according to thresholds and the label</li><li><strong>Examples:</strong> Selective products when thresholds are exceeded</li></ul></li>
  <li><p><strong>Regulatory</strong></p><ul><li><strong>What it involves:</strong> Quarantine and eradication to keep pests out</li><li><strong>Examples:</strong> Inspection of planting material</li></ul></li>
</ul>
<h2>Representative insect pests (Philippine focus)</h2>
<h3>Brown planthopper, <em>Nilaparvata lugens</em> (Hemiptera)</h3>
<ul>
  <li><strong>Crop and damage:</strong> rice. Nymphs and adults suck sap at the base of plants; heavy infestations from tillering to flowering cause “hopperburn”, in which plants dry out and collapse. It can also be associated with rice grassy stunt and ragged stunt diseases.</li>
  <li><strong>Biology:</strong> infestations begin when winged adults arrive and lay eggs; the nymphs undergo four to five molts and later forms include short-winged and long-winged adults.</li>
  <li><strong>Management ideas:</strong> tolerant varieties, avoid overlapping crops and remove volunteer plants; conserve spiders and mirid bugs that eat eggs and nymphs (Week 11); avoid unnecessary insecticide applications that kill natural enemies.</li>
</ul>
<h3>Yellow stem borer, <em>Scirpophaga incertulas</em> (Lepidoptera)</h3>
<ul>
  <li><strong>Damage:</strong> larvae bore into tillers. In the vegetative stage they cause “deadheart” (central whorl dries and the shoot is easily pulled out); in the reproductive stage they cause “whitehead” (whitish panicles with empty grains).</li>
  <li><strong>Management ideas:</strong> conserve natural enemies; use resistant varieties; change varieties every two to four cropping seasons; harvest before populations peak. Egg parasitoid wasps and other predators attack stem borer eggs. Some guides use egg-mass counts as an action threshold.</li>
</ul>
<h3>Fall armyworm, <em>Spodoptera frugiperda</em> (Lepidoptera)</h3>
<ul>
  <li><strong>History:</strong> first reported in the Philippines in June 2019 in Piat, Cagayan, and later spread as far as Mindanao.</li>
  <li><strong>Damage:</strong> the larva feeds on the leaves and other parts of corn, rice and other crops.</li>
  <li><strong>Management tools used by the DA:</strong> pheromone lures, biological control agents such as <em>Trichogramma chilonis</em> against eggs and <em>Metarhizium</em> against larvae, earwigs, farmer training in IPM and good agricultural practices. A parasitoid of FAW (<em>Chelonus formosanus</em>) has also been recorded in the Philippines.</li>
</ul>
<h3>Coconut rhinoceros beetle, <em>Oryctes rhinoceros</em> (Coleoptera)</h3>
<ul>
  <li><strong>Biology:</strong> a complete-metamorphosis insect (egg, larva, pupa, adult). It is considered the most prevalent pest of coconut palms, and the abundance of breeding sites allows rapid population increase.</li>
  <li><strong>Damage:</strong> the beetle causes loss of leaf area (V-shaped damage on fronds) and early nut fall, resulting in lower yield.</li>
  <li><strong>Management ideas (PCA technology guide):</strong> cultural control (sanitation of breeding sites such as decaying coconut logs), biological control with green muscardine fungus and the <em>Oryctes</em> nudivirus, and pheromone traps baited with food. The PCA Davao Research Center in Bago Oshiro, Davao City, produced this guide.</li>
</ul>
`.trim();

export const vertebratePests = `
<ul class="lesson-objectives"><li><p>Identify vertebrate pests based on their characteristics.</p></li></ul>
<h2>Importance of vertebrate pests</h2>
<ul>
  <li><strong>They reduce yield:</strong> Rats and birds eat and cut crops such as rice, corn and coconut, so farmers harvest less.</li>
  <li><strong>They cause losses after harvest:</strong> Rodents eat and contaminate stored grain, so food that was already produced is wasted.</li>
  <li><strong>They damage property:</strong> Rodents gnaw on storage buildings, sacks, wires and irrigation structures.</li>
  <li><strong>They affect health:</strong> Rodents can spread diseases to people and animals.</li>
  <li><strong>They are hard to control:</strong> They are intelligent, mobile and often active at night, so control must be planned at the community level, not just on a single farm.</li>
</ul>
<h2>Rodents</h2>
<h3>Pest species</h3>
<p>The Asian house rat (<em>Rattus tanezumi</em>) is the main rodent pest of rice and coconut in the Philippines. Other pests include the rice-field rat (<em>R. argentiventer</em>, not found on Luzon), <em>R. exulans</em> and the house mouse. In a Luzon study, most of their nests were in coconut groves, about 22 metres from the nearest rice field.</p>
<h3>Biology that matters for management</h3>
<ul>
  <li><strong>High reproduction.</strong> PhilRice reports that a female can have as many as 120 young in a cropping season; pregnancy lasts about 21 days and females can mate again the day after giving birth. Rat numbers rise at harvest when food is plentiful.</li>
  <li><strong>Food and planting.</strong> Asynchronous or year-round planting extends the period of high-quality food, which can lengthen rodent breeding. Planting within about two weeks of neighbours, and proper management of stubble after harvest, help prevent high populations.</li>
  <li><strong>Mobility.</strong> Rats are highly mobile, so a well-managed field can be re-invaded from neighbouring fields.</li>
</ul>
<h2>Birds</h2>
<p>In the Philippines, <em>maya</em> refers to several rice-eating birds, including the Eurasian tree sparrow (<em>Passer montanus</em>) and three species of munias (<em>Lonchura</em> spp.). The Java sparrow (<em>Padda oryzivora</em>) is a specialised rice eater. However, most birds seen in rice fields do not eat rice, since only four of more than 50 species recorded at the IRRI farm were known to feed on it.</p>
<ul>
  <li><strong>When damage occurs:</strong> mostly from the milky stage to early maturity of the rice crop.</li>
  <li><strong>Typical measures:</strong> “bird boys” who make noise, strings and tin cans that rattle, and nets; scaring works only if the method is changed often.</li>
  <li><strong>Better approach:</strong> Plant and harvest at the same time as neighbouring farms, harvest early, vary scaring methods, target only the birds that cause real damage, and protect the birds that eat weed seeds and insects.</li>
</ul>
`.trim();

export const naturalEnemies = `
<h2>Natural enemies and biological control</h2>
<p><strong>Natural enemies</strong> are organisms that kill, reduce the reproduction of or otherwise reduce the numbers of another organism, and they are key components of IPM.</p>
<figure data-layout="center"><img src="${IMG}/w11-fig1-natural-enemies.png" alt="Diagram of natural enemies: predators, parasitoids and pathogens, and three ways to use them: conservation, augmentation and classical biological control"><figcaption>Natural enemies, the basis of biological control: predators, parasitoids and pathogens, and three ways to use them (conservation, augmentation and classical).</figcaption></figure>
<h2>Examples in Philippine crops</h2>
<ul>
  <li><strong>Stem borers in rice:</strong> egg parasitoid wasps from several families, plus ants, ladybird beetles and others.</li>
  <li><strong>Fall armyworm in corn:</strong> egg parasitoid <em>Trichogramma</em>, the fungus <em>Metarhizium</em>, earwigs and the egg-larval parasitoid <em>Chelonus formosanus</em>.</li>
  <li><strong>Rhinoceros beetle in coconut:</strong> green muscardine fungus and the <em>Oryctes</em> nudivirus.</li>
</ul>
`.trim();
