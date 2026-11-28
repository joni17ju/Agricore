# Inspection game (leaf inspection with a microscope)

A general mission game. The student looks over a photo with a zoom scope,
marks the findings in it, looks closer at a finding under a microscope and
marks what they see there, then answers a question about the cause. It is
not tied to leaves or to any module: everything comes from the mission's
`scenarioData`. Game type: `inspection`.

Module 2 (Plant Pathology) uses it first, for "Diagnose the Field Samples"
(Lesson 3, Causes of Plant Diseases).

## Files

| File | What it does |
|---|---|
| `frontend/src/components/missions/inspection/inspectionEngine.js` | The engine: plain Canvas 2D and JavaScript, no libraries. `createInspectionGame(container, options)` returns `{ destroy }`. |
| `frontend/src/components/missions/inspection/microscope.js` | The microscope: the eyepiece drawing and the placeholder micrographs. |
| `frontend/src/components/missions/inspection/InspectionGame.jsx` | Thin React wrapper: mounts the engine, passes sounds, hands the answers to the mission page. |
| `frontend/src/components/missions/inspection/inspection.css` | Styles, from the app's design tokens. |
| `backend/utils/scoring.js` (and the identical frontend copy) | `scoreInspection`: the server's scoring. |
| `backend/utils/missionValidation.js` (and the identical frontend copy) | `inspection`: the content rules the mission editor and the API check. |
| `backend/content/inspection/module-2.json` | The Module 2 content. |
| `backend/scripts/install-inspection-mission.js` | Installs a content file into an existing mission level. |
| `frontend/public/images/inspection/<module>/` | Leaf photos; micrographs in its `micro/` folder. |

## How it plays

1. **Scope (stage 1), 1× to 20×.** The photo lies on a lab bench. The zoom
   scope follows the mouse or finger (or the arrow keys). Zoom with the slider
   (logarithmic, so 1×–5× gets as much room as 5×–20×; it snaps to 1, 2, 3,
   5, 10 and 20×), the mouse wheel, a pinch or the + and − keys. The lens
   shows the magnification and a scale bar (from the round's
   `photoWidthMm`). At 1× the leaf looks almost healthy: at most a very faint
   change of colour.
2. **Symptoms appear by magnification.** Each finding shows only when the
   scope is over it at its `minZoom` or more, fading in as the player zooms
   (at once with reduced motion). Past the photo's own resolution the lens
   fades into a leaf-cell texture, or into that spot's micrograph, instead of
   blurry pixels. Click, tap or press Enter to mark: a correct mark glows,
   pops up its name, ticks the Field notebook ("Found at 5×") and adds to the
   streak. A mark on nothing — or on a finding below its magnification, where
   it still looks healthy — shakes the photo and costs one of the round's
   tries. Deep findings carry a "Needs N×" tag in the notebook.
3. **Microscope (stage 2).** On a finding with a micrograph, open the
   microscope: the 🔬 Microscope button (when the scope is over it), the
   notebook's "Look closer" button once the spot is marked, zooming past 5×
   over the spot, or the M key. The view opens with an iris transition into a
   round eyepiece.
   - Objectives 4×, 10×, 40× and 100× (buttons on the microscope, the wheel,
     a pinch, or keys 1–4 and +/−), each with a lens click.
   - Fine focus (slider on the microscope, or `[` and `]`). It starts a little
     out of focus, and each objective focuses at a slightly different point.
   - Drag (mouse or finger) or the arrow keys move the slide.
   - Tap or click (or Enter at the eyepiece pointer) to mark a feature. The
     slide must be sharp, and a feature with `minObjective` needs at least that
     objective; neither of those refusals costs a try. A mark on nothing does.
   - "Back to leaf" (button, the ← on the microscope, or Escape).
4. **Identify.** When every required leaf finding and microscope feature is
   marked (or the tries run out), the question appears with icon cards; then
   the "why" explanation and Next sample.
5. After the last round (or when the timer reaches 0) the answers are sent and
   the normal result screen shows the server's score and XP.

Hint (or H) costs a little XP: on the leaf it pulses near an unmarked symptom,
says how far to zoom ("Try a higher magnification here — about 10×") and
gives the finding's clue (or names the spot to look at under the
microscope); in the microscope it pulses near an unmarked feature and says
which objective to use.

**Phones.** A quick tap marks where the finger touched; dragging moves the
scope above the finger. In the microscope, pinch changes the objective and a
drag moves the slide; the objective and focus controls sit on the microscope
(beside it on a phone held sideways) and are at least 44 px. On weak devices
the eyepiece keeps only its vignette and focus blur (no soft edge, glow or
colour fringe). With `prefers-reduced-motion`, the iris and lens-switch
animations, sway, parallax and particles are off.

## Content format (`scenarioData`)

```json
{
  "title": "Diagnose the Field Samples",
  "instructions": "Shown on the mission intro.",
  "timeLimitSeconds": 600,
  "triesPerRound": 5,
  "wrongMarkPenalty": 5,
  "hintPenalty": 5,
  "rounds": [
    {
      "id": "r1",
      "subject": "Rice leaf with spreading lesions",
      "image": "/images/inspection/module-2/round-1.jpg",
      "imageHiRes": "/images/inspection/module-2/round-1@2x.jpg",
      "credit": "Photo: your name, licence",
      "placeholder": { "shape": "narrow-leaf", "color": "#5f9a3c" },
      "findings": [
        {
          "id": "f2", "name": "Spore masses (a sign)", "description": "Shown in the notebook once found.",
          "x": 61, "y": 52, "radius": 6, "required": true, "detail": "spores", "minZoom": 10, "deep": true, "clue": "…",
          "micrograph": {
            "image": "/images/inspection/module-2/micro/round-1-fungus.jpg",
            "imageHiRes": "/images/inspection/module-2/micro/round-1-fungus@2x.jpg",
            "credit": "Micrograph: your name, licence",
            "fieldWidthUm": 400,
            "focus": 52,
            "placeholder": { "kind": "fungus" },
            "features": [
              { "id": "m1", "name": "Fungal threads (mycelium)", "description": "…", "x": 30, "y": 62, "radius": 13, "minObjective": 10, "look": "hyphae" },
              { "id": "m2", "name": "Spores", "description": "…", "x": 64, "y": 36, "radius": 11, "minObjective": 40, "look": "spores" }
            ]
          }
        }
      ],
      "question": "What causes these symptoms and signs?",
      "choices": [
        { "id": "fungus", "label": "Fungus", "description": "Short hint on the card", "icon": "fungus" },
        { "id": "virus", "label": "Virus", "icon": "virus" }
      ],
      "correctChoiceId": "fungus",
      "explanation": "Shown after the answer and on the result screen."
    }
  ]
}
```

- `rounds`: 1 to 8 (3 to 5 plays best). Each round has 1 to 12 findings (at
  least one `required`) and 2 to 6 choices.
- Finding `x`, `y`: the centre in percent of the photo (0–100). `radius`: in
  percent of the photo's width (2–30). `required: false` makes it optional.
- `minZoom` (1–20, default 2): the magnification the finding needs to be seen
  and marked. `deep: true` marks a challenge finding (shown as "Needs N×").
  `clue`: a short pointer used by the hint, so every finding stays fair.
- Round `level` (optional): a label such as "Easy" or "Expert challenge".
  `photoWidthMm`: how wide the photo is in real life (for the scale bar,
  default 50). `imageUltra`: an extra-large photo for 10×–20× (by default the
  game tries `round-N@4x.jpg` next to `round-N@2x.jpg`).
- `detail`: what the scope reveals over the finding: `lesion`, `spores`,
  `halo`, `water-soaked`, `ooze`, `mosaic` or `dust`.
- `micrograph` (optional, per finding): the microscope view of that spot.
  - `image` / `imageHiRes`: the micrograph (square works best, about
    1600 px and 3200 px). Missing files show a labelled placeholder.
  - `credit`: shown on the microscope.
  - `fieldWidthUm`: how many micrometres the whole image spans at 4×; it sets
    the scale bar (default 200).
  - `focus`: where it is sharp on the 0–100 focus slider at 4× (15–85,
    default 55).
  - `placeholder.kind`: the placeholder slide: `fungus`, `bacteria`, `virus`
    or `abiotic`.
  - `features`: 1 to 8 things to mark, with `x`, `y`, `radius` in percent of
    the micrograph, `required` (default true), `minObjective` (4, 10, 40 or
    100) and `look` (placeholder drawing only: `hyphae`, `spores`,
    `bacteria`, `ooze`, `pale-cells`, `dark-cells`, `dead-cells`,
    `healthy-cells`).
- `icon` on a choice: `fungus`, `bacterium`, `virus`, `abiotic`, `insect`,
  `weed`; anything else shows a magnifier.
- `timeLimitSeconds` and max XP: editable in Edit Mission Settings (the timer
  accepts 10–600 seconds).

## Scoring (on the server)

The browser sends only
`{ rounds: { [roundId]: { marks: [{x, y, zoom}], features: [{findingId, x, y}], choiceId, hintsUsed } } }`.
A leaf mark counts for a finding only inside its circle **and** at a
reported `zoom` at or above the finding's `minZoom`; a mark below it (or
without a zoom, which counts as 1×) is treated as a mark on nothing.
The server scores it with `scoreInspection`; the score shown in the HUD is
only a preview.

Per round: up to 50 points for the required items found (leaf findings and
microscope features together: 50 × found ÷ required), 50 for the correct
answer, minus `wrongMarkPenalty` for each mark on nothing on the leaf or in
the microscope (counted up to `triesPerRound`) and `hintPenalty` for each
hint, clamped to 0–100. The mission score is the average of the rounds. The
usual rules apply: 70% passes, and a replay awards only the XP above the
student's best earlier result. Rounds without micrographs score exactly as
before.

## The Module 2 difficulty ladder

| Round | Level | Sample (cause) | Findings and the zoom they need |
|---|---|---|---|
| r1 | Easy | Rice leaf, zinc deficiency (abiotic) | dusty brown spots 2×, more spots 3× |
| r2 | Medium | Mosaic leaf (virus) | mosaic 3×, mottled curled area **5×** (deep) |
| r3 | Hard | Rice blast-like lesions (fungus) | leaf spot 3×, optional yellowing 5×, spore masses **10×** (deep) |
| r4 | Expert challenge | Bacterial blight (bacterium) | blight lesion 2×, bacterial ooze **20×** (deep, seen as microscope detail) |

Every round also has a micrograph with two features to mark under the
microscope.

## Photos and micrographs

- Leaf photos: `frontend/public/images/inspection/<module>/round-N.jpg`
  (about 1600 × 1200), `round-N@2x.jpg` (about twice that) and, for rounds
  that need 10× or more, `round-N@4x.jpg` (at least 4000 px wide; 6400 px for
  20×). Above the photo's own resolution the game fades into detail drawn in
  code or the micrograph, so a smaller photo still works, just less sharply.
- With real photos, choose `minZoom` so the symptom really is hard to see
  below it: the game hides drawn detail, but a real photo shows what it
  shows at 1×.
- Micrographs: `frontend/public/images/inspection/<module>/micro/` with the
  names in the content file (Module 2: see `micro/README.md`).
- Use only images you took yourself or that have a licence allowing reuse,
  and fill in the credits; they are shown in the game. Until a file exists,
  the game draws a clearly labelled placeholder.

## Calibration mode

Add `?calibrate=1` to the mission address, e.g.
`/student/missions/<id>/play?calibrate=1`, and start it. There is no timer and
nothing is submitted.

- On the leaf: every finding's circle is drawn with its id, x/y and minZoom,
  and the notebook shows every "Needs N×" tag. A click shows and copies
  `"x": 31.5, "y": 49.8, "minZoom": 5` (the suggested minZoom is the current
  magnification, rounded down to 1, 2, 3, 5, 10 or 20). "Preview: 1× 5× 10×
  20×" buttons show the leaf as a player would see it at that magnification.
- In the microscope: every feature's circle is drawn with its id, x/y and
  minimum objective; a click shows and copies the micrograph's
  `"x": …, "y": …`. Focus and objective limits do not apply.

Paste the values into the content file and install it again.

## Installing a mission

```
cd backend
node scripts/install-inspection-mission.js                # dry run
node scripts/install-inspection-mission.js --apply        # backs up, then writes
```

The defaults convert Module 2 level 3 ("Yellowing Rice Leaves") with
`content/inspection/module-2.json`; running it again refreshes the content.
The mission keeps its id, level and max XP, so attempts and progress stay
linked; only `gameType` and `scenarioData` change. A backup goes to
`backend/backups/` first. To restore, write the backup's `gameType` and
`scenarioData` back.

## Reusing it for another module

1. Write `backend/content/inspection/module-N.json` in the format above.
2. Add photos to `frontend/public/images/inspection/module-N/` (and
   micrographs to its `micro/` folder).
3. Check the positions with `?calibrate=1`.
4. Install: `node scripts/install-inspection-mission.js --module N --level L --title "Current mission title" --content content/inspection/module-N.json`.

No engine changes are needed.
