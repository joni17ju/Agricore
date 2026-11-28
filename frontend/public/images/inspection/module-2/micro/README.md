# Module 2 micrographs

Micrographs for the microscope view of "Diagnose the Field Samples". Until a
file exists, the game draws a placeholder labelled "PLACEHOLDER micrograph —
add your image".

Square images work best: `NAME.jpg` about 1600 × 1600 px, and
`NAME@2x.jpg` about 3200 × 3200 px (used when present).

| File | Show | Features to line up (x, y in % of the image) |
|---|---|---|
| `round-1-abiotic.jpg` | Leaf cells of a zinc-deficient rice leaf: brown dead cells beside green cells, no sign of a pathogen | brown dead cells 42, 44 · green cells 74, 70 (10× or more) |
| `round-2-virus.jpg` | Leaf cells of a mosaic leaf: pale (chlorotic) and dark green cells, no fungal threads or ooze | pale cells 30, 38 · dark green cells 70, 64 (10× or more) |
| `round-3-fungus.jpg` | Fungal spore masses on a rice blast-like lesion: hyphae and spores (e.g. a tape or scraping mount) | fungal threads 30, 62 (10× or more) · spores 64, 36 (40× or more) |
| `round-4-bacteria.jpg` | Bacterial ooze streaming from a cut leaf edge in water (ooze test), with single cells. Also shown in the scope at 20× over the ooze spot. | ooze 34, 50 (4×) · single bacteria 72, 34 (100×) |

- Each image spans the width set by `fieldWidthUm` in the content file
  (500, 500, 400 and 300 µm for rounds 1–4); adjust it so the scale bar is right.
- Use only images you took yourself or that have a licence allowing reuse,
  and put the credit in the finding's `micrograph.credit`.
- If the features are in other places in your image, open the mission with
  `?calibrate=1`, open the microscope, click each feature and update the
  x/y values (see `docs/inspection-game.md`).
