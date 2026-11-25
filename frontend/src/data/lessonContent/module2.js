/**
 * Module 2 (Plant Pathology) lesson content.
 * Source: the Plant Pathogens section (Weeks 3–5) of the CP1 Week 2–11 lesson
 * document (AgriCore Paper/module_week2-11.pdf), placed by the CP1 syllabus:
 * plant pathology defined, economic importance of plant diseases, concepts of
 * plant diseases, causes of plant diseases, disease cycle, epidemiology and
 * variability in plant pathogens.
 * Learning objectives are the syllabus learning outcomes for Weeks 3–5.
 *
 * Tables in the document are written as term-and-explanation lists with the
 * same wording. The document's bracketed citation numbers are left out (it has
 * no numbered reference list). Images live in frontend/public/images/lessons/module-2/.
 * Edit the lessons in the lesson editor; this file is the seed copy.
 */
const IMG = '/images/lessons/module-2';

export const plantPathology = `
<ul class="lesson-objectives"><li><p>Identify healthy plants from diseased plants caused by different plant pathogens.</p></li></ul>
<h2>Plant pathology defined</h2>
<p>The word comes from three Greek roots: <em>phyton</em> (plant), <em>pathos</em> (suffering) and <em>logos</em> (study).</p>
<p><strong>Plant pathology</strong> studies why plants become diseased, how the disease develops and spreads, how much damage it causes, and how it can be prevented or managed.</p>
<h2>Economic importance of plant diseases</h2>
<p>Diseases cost farmers and nations in several ways:</p>
<ul>
  <li><strong>Direct yield loss:</strong> fewer or lighter grains, fruits and tubers; dead plants and plantations.</li>
  <li><strong>Quality loss:</strong> spotted fruit, discoloured grain, toxins in infected produce, poor storage life.</li>
  <li><strong>Cost of control:</strong> fungicides, labour, resistant varieties, quarantine and inspection.</li>
  <li><strong>Market and trade loss:</strong> importing countries may ban products from areas with certain diseases.</li>
  <li><strong>Social and food-security effects:</strong> severe epidemics cause hunger, migration and loss of livelihoods.</li>
</ul>
<h2>Telling a healthy plant from a diseased plant</h2>
<p>Use the same order every time you look at a plant. This habit is what the moving examination tests.</p>
<ol>
  <li><strong>Identify the host</strong> (crop, variety, growth stage). Many diseases attack only particular crops or stages.</li>
  <li><strong>Look at the whole field or plot.</strong> Disease caused by pathogens usually starts in patches and spreads; damage in a very uniform pattern or along one edge suggests an abiotic cause such as spray drift, nutrient problems or waterlogging.</li>
  <li><strong>Examine all plant parts:</strong> leaves (both sides), stems, roots, flowers, fruits and seeds.</li>
  <li><strong>Describe the symptoms</strong> with the correct terms, then look for <strong>signs</strong> with a hand lens (10x).</li>
  <li><strong>Decide: biotic or abiotic?</strong> Look for spread from plant to plant, presence of signs and a history of the disease. Abiotic problems do not spread.</li>
</ol>
`.trim();

export const conceptsOfPlantDiseases = `
<ul class="lesson-objectives"><li><p>Discuss the concepts of plant diseases.</p></li></ul>
<h2>The concept of plant disease</h2>
<h3>Disease, disorder and injury</h3>
<p>A plant is diseased when its normal processes are disturbed over time, unlike injury, which is a one-time damage, and biotic diseases are caused by living organisms and spread while abiotic disorders come from non-living factors and do not.</p>
<h3>A pathogen is not the same as a disease</h3>
<p>The pathogen is the organism that causes the problem, while the disease is what happens to the plant, as with <em>Phytophthora infestans</em> (pathogen) and late blight (disease).</p>
<h3>The disease triangle</h3>
<p>Disease occurs only when a susceptible plant, a harmful pathogen and a favourable environment are present together, so removing any one of them reduces or stops it.</p>
<figure data-layout="center"><img src="${IMG}/w03-fig1-disease-triangle.png" alt="Triangle with host, pathogen and environment at its corners and disease in the middle"><figcaption>The disease triangle: disease needs a susceptible host, a virulent pathogen and a favourable environment at the same time. (Original diagram prepared for this guide; concept after Francl, 2001.)</figcaption></figure>
<ul>
  <li><strong>Host:</strong> The plant itself. It must be susceptible and at a growth stage the pathogen can attack, since resistant or healthy-aged plants may escape disease.</li>
  <li><strong>Pathogen:</strong> The living organism that causes the disease, such as a fungus, bacterium or virus. It must be virulent and active, with enough inoculum (infective material) to start an infection.</li>
  <li><strong>Environment:</strong> The surrounding conditions, such as temperature, moisture, soil and nutrition. They must favour the pathogen, for example warm, wet weather that helps fungal spores spread and infect.</li>
</ul>
<h2>Symptoms vs signs</h2>
<ul class="lesson-key-terms">
  <li><p><strong>Symptom</strong>: What you see change in the plant. It points to the kind of problem.</p></li>
  <li><p><strong>Sign</strong>: Something you see of the pathogen, which often allows a quicker and more certain identification.</p></li>
</ul>
<h3>Symptom types</h3>
<ul>
  <li><p><strong>Necrosis (tissue death)</strong></p><ul><li><strong>What it looks like:</strong> Leaf spots, blights, cankers, rots, scabs</li><li><strong>Examples:</strong> Rice blast lesions; fruit rot</li></ul></li>
  <li><p><strong>Wilting</strong></p><ul><li><strong>What it looks like:</strong> Plant droops although soil is moist; vascular tissue blocked or roots damaged</li><li><strong>Examples:</strong> Bacterial wilt; Fusarium wilt of banana</li></ul></li>
  <li><p><strong>Discolouration</strong></p><ul><li><strong>What it looks like:</strong> Yellowing (chlorosis), mosaic or mottled leaves, reddening</li><li><strong>Examples:</strong> Tungro-infected rice; nutrient deficiency</li></ul></li>
  <li><p><strong>Under-growth (hypoplasia)</strong></p><ul><li><strong>What it looks like:</strong> Stunting, small leaves, rosetting</li><li><strong>Examples:</strong> Viral diseases; root-knot nematode</li></ul></li>
  <li><p><strong>Over-growth (hyperplasia)</strong></p><ul><li><strong>What it looks like:</strong> Galls, witches' broom, excessive tillering or branching</li><li><strong>Examples:</strong> Crown gall; root-knot galls</li></ul></li>
</ul>
<h3>Signs</h3>
<ul>
  <li><strong>Mycelium / fungal growth:</strong> Cottony, felty or powdery growth on the surface (fungal threads)</li>
  <li><strong>Spore masses and fruiting bodies:</strong> Pustules, black dots, powdery or sooty coatings that contain spores</li>
  <li><strong>Sclerotia:</strong> Hard resting bodies of fungi, e.g. on rice sheaths affected by sheath blight</li>
  <li><strong>Bacterial ooze:</strong> Sticky or milky liquid from cut or diseased tissue</li>
</ul>
`.trim();

export const causesOfPlantDiseases = `
<ul class="lesson-objectives"><li><p>Distinguish the different characteristics of plant pathogens.</p></li></ul>
<h2>Causes of plant diseases: characteristics of plant pathogens</h2>
<h3>What can make a plant sick?</h3>
<p>Plant diseases and disorders are caused by living (biotic) and non-living (abiotic) factors. Fungi, bacteria, nematodes, viruses and phytoplasmas, as well as abiotic problems, can all cause plant disease. Oomycetes (water molds) and parasitic seed plants are also important pathogen groups.</p>
<figure data-layout="center"><img src="${IMG}/w04-fig1-causes-of-disease.jpg" alt="Circle diagram of the causes of disease: abiotic causes on a blue half and biotic causes on a green half"><figcaption>Causes of disease: abiotic (non-living) and biotic (living). (CCMGA)</figcaption></figure>
<ul>
  <li>On the <strong>biotic side (green)</strong>, you’ll find living causes of disease: fungi, bacteria, viruses, nematodes, insects, herbivores, and parasitic plants. These are organisms that directly infect or feed on plant tissue.</li>
  <li>On the <strong>abiotic side (blue)</strong>, the damage comes from non-living sources: drought, poor drainage, nutrient or pH imbalances, frost, chemical injury, and physical damage from tools or machinery. These don’t spread between plants but can still cause serious stress or decline.</li>
</ul>
<h2>Biotic causes</h2>
<p><strong>Viruses:</strong> Tiny particles that live inside plant cells and cause mottled, curled or stunted growth, and they are often spread by insects.</p>
<p><strong>Bacteria:</strong> Single-celled organisms that cause leaf spots, blights, wilts and soft rots, especially in wet conditions.</p>
<p><strong>Fungi:</strong> Thread-like organisms that cause spots, rusts, mildews, rots and wilts, and they spread by spores.</p>
<p><strong>Insects:</strong> Pests that chew, suck sap or bore into plants, and some also carry diseases from plant to plant.</p>
<p><strong>Parasitic plants:</strong> Plants that attach to other plants and steal their water and nutrients, such as witchweed (<em>Striga</em>).</p>
<p><strong>Herbivores:</strong> Larger animals, like rodents, birds or livestock, that eat or trample plants.</p>
<p><strong>Nematodes:</strong> Microscopic worms that attack roots, causing galls, stunting and yellowing.</p>
<figure data-layout="center"><img src="${IMG}/w04-fig2-biotic-causes-examples.jpg" alt="Seven labelled photos: yellowing rice leaves (viruses), wilting plants (bacteria), spotted mango leaves and fruit (fungi), a bug on a stem (insects), a plant with thick rounded leaves (parasitic plants), a rat (herbivores) and a nematode under the microscope (nematodes)"><figcaption>Examples of biotic causes, in the order of the list above: viruses, bacteria, fungi, insects, parasitic plants, herbivores and nematodes.</figcaption></figure>
<h2>Abiotic causes</h2>
<ul>
  <li>Plants can look sick even when no germ is involved, because problems like nutrient shortage, extreme heat, herbicide damage, flooding and drought can cause symptoms that look like disease.</li>
  <li>These problems do not spread from plant to plant, and in rice, for example, zinc deficiency shows as dusty brown spots on the upper leaves of stunted plants.</li>
  <li>Signs that point to a non-living cause include sudden onset, damage over a whole area or along a line, a link to weather, fertiliser or chemical use, and no sign of a pest or pathogen on the plant.</li>
</ul>
`.trim();

export const diseaseCycle = `
<ul class="lesson-objectives"><li><p>Discuss the concepts of plant diseases.</p></li></ul>
<h2>The disease cycle</h2>
<figure data-layout="center"><img src="${IMG}/w05-fig1-disease-cycle.png" alt="Disease cycle diagram: inoculation, penetration, infection, colonization, reproduction and dissemination, with survival between seasons"><figcaption>The disease cycle. Secondary cycles repeat steps 1–6 within a season in polycyclic diseases; the pathogen survives between seasons in residue, soil, seed and weeds.</figcaption></figure>
<ul>
  <li><strong>Inoculation:</strong> Inoculum is any part of a pathogen, such as a spore, bacterial cell or virus particle, that can start an infection when it reaches a host.</li>
  <li><strong>Penetration:</strong> Penetration is when the pathogen gets inside the plant. Some pathogens break in on their own using enzymes, while others enter through wounds or natural openings like stomata, or are carried in by insects, tools or rain.</li>
  <li><strong>Infection:</strong> The pathogen invades tissue and sets up a parasitic relationship with the host.</li>
  <li><strong>Colonization / incubation:</strong> The pathogen grows within the host. The time from infection to first symptoms is the incubation (latent) period.</li>
  <li><strong>Reproduction:</strong> New spores, cells or particles are produced, often in or on the diseased tissue (lesions, pustules, ooze).</li>
  <li><strong>Dissemination:</strong> Wind, water, insects, animals, people, tools, seed and planting material carry inoculum to new hosts.</li>
  <li><strong>Survival:</strong> Between crops the pathogen survives in crop residue, soil, seed, weeds, alternate hosts, vectors or as resting structures such as sclerotia.</li>
</ul>
<h2>Monocyclic and polycyclic diseases</h2>
<p>Diseases are described as:</p>
<ul class="lesson-key-terms">
  <li><p><strong>Monocyclic</strong>: The cycle is completed only once per season (inoculum cannot multiply on the crop quickly).</p></li>
  <li><p><strong>Polycyclic</strong>: Secondary inoculum is produced and the cycle repeats many times in one season.</p></li>
</ul>
`.trim();

export const diseaseEpidemiology = `
<ul class="lesson-objectives"><li><p>Discuss the concepts of plant diseases.</p></li></ul>
<h2>What is an epidemic?</h2>
<p><strong>Epidemiology</strong> is the study of disease in populations: how it develops and spreads in space and time and which factors affect it.</p>
<h2>Elements of an epidemic</h2>
<ol>
  <li><strong>Host factors:</strong> level of resistance, genetic uniformity, age, crop density.</li>
  <li><strong>Pathogen factors:</strong> virulence, amount of initial inoculum, reproduction rate, mode of spread.</li>
  <li><strong>Environmental factors:</strong> temperature, rainfall, humidity, wind, soil.</li>
  <li><strong>Time:</strong> the duration of the favourable period, the length of the disease cycle.</li>
  <li><strong>Human activities:</strong> planting dates, variety choice, fertiliser, irrigation, moving planting material, control measures.</li>
</ol>
<h2>Measuring disease</h2>
<p>Disease intensity is measured as incidence or severity:</p>
<ul>
  <li><strong>Incidence (%)</strong> = (number of diseased plants ÷ total plants assessed) × 100.</li>
  <li><strong>Severity (%)</strong> = average percentage of leaf (or plant) area affected, often estimated with a rating scale or standard area diagrams.</li>
</ul>
<div data-callout="info"><p><strong>Example (illustrative numbers)</strong></p><p>You assess 200 rice hills and find 36 with blast lesions. Incidence = 36 ÷ 200 × 100 = 18 percent. If the 36 diseased hills have on average 10 percent of their leaf area affected, then the average severity across all 200 hills is 18 percent × 10 percent = 1.8 percent. This shows why incidence and severity must be reported separately.</p></div>
<h2>From epidemiology to management</h2>
<p>Classic principles of plant disease control follow from the disease cycle:</p>
<ul>
  <li><strong>Exclusion</strong> (keep the pathogen out: quarantine, clean seed)</li>
  <li><strong>Eradication</strong> (remove sources: crop residue, infected plants)</li>
  <li><strong>Protection</strong> (barriers: fungicides, cultural practices)</li>
  <li><strong>Resistance</strong> (resistant varieties)</li>
  <li><strong>Therapy</strong> (treat infected plants, rarely possible for viruses and viroids)</li>
</ul>
`.trim();

export const variabilityOfPlantPathogens = `
<ul class="lesson-objectives"><li><p>Distinguish the different characteristics of plant pathogens.</p></li></ul>
<h2>Variability in plant pathogens</h2>
<ul>
  <li><strong>Races (pathotypes)</strong> are groups of isolates that differ in which resistant varieties they overcome. A variety that resists one race may be susceptible to another.</li>
  <li><strong>Pathovars (bacteria) and formae speciales (fungi)</strong> group isolates by the host they attack, as in <em>Xanthomonas oryzae</em> pv. <em>oryzae</em> (rice) or <em>Fusarium oxysporum</em> f. sp. <em>cubense</em> (banana).</li>
</ul>
<div data-callout="info"><p><strong>Example from the Philippines</strong></p><p>A milder strain of Fusarium wilt had attacked Cavendish bananas since the 1970s, but the virulent Tropical Race 4 was identified in Mindanao in 2005 and has since devastated plantations.</p></div>
<h2>Why it matters for management</h2>
<ul>
  <li>A resistant variety can stop working when a new race of the pathogen appears or becomes common.</li>
  <li>For this reason, breeders look for durable resistance that lasts over many seasons.</li>
  <li>Farmers are also advised to rotate varieties rather than plant the same one every season.</li>
  <li>Relying on a single tactic, such as one fungicide, is risky for the same reason.</li>
  <li>The best approach is to combine resistant varieties with other practices, such as clean seed, field sanitation and balanced fertilizer use, so that no single tactic has to do all the work.</li>
</ul>
`.trim();
