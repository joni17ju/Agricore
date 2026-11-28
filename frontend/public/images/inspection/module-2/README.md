# Module 2 inspection photos

Put the photos for the Module 2 mission "Diagnose the Field Samples" here.
Until a file exists, the game draws a placeholder labelled "PLACEHOLDER — add
your photo".

| File | Shows | Findings to line up (x, y in % of the photo, zoom needed) | Minimum size |
|---|---|---|---|
| `round-1.jpg` (+ `@2x`) | Upper rice leaf with zinc deficiency (easy) | dusty brown spots 30, 50 (2×) · 67, 50 (3×) | 1600 px wide; `@2x` 3200 px |
| `round-2.jpg` (+ `@2x`) | Leaf with mosaic / mottling, e.g. tungro (medium) | mosaic 40, 44 (3×) · mottled, curled area 63, 60 (5×) | `@2x` 3200 px |
| `round-3.jpg` (+ `@2x`, `@4x`) | Rice leaf with blast-like lesions (hard) | leaf spot 32, 50 (3×) · yellowing 82, 48 (5×, optional) · spore masses 61, 52 (10×) | `@4x` at least 4000 px wide |
| `round-4.jpg` (+ `@2x`, `@4x`) | Rice leaf with bacterial blight (expert) | water-soaked lesion 22, 49 (2×) · bacterial ooze 54, 47 (20×) | `@4x` at least 6400 px wide, or rely on the micrograph |

- `round-N.jpg`: about 1600 × 1200 px (4:3), under 300 KB.
- `round-N@2x.jpg`: the same photo at about 3200 × 2400 px, used inside the
  zoom scope. `round-N@4x.jpg` (optional) keeps 10×–20× sharp. Missing files
  fall back to the smaller one; past the photo's resolution the game fades
  into drawn detail or the micrograph.
- At 1× the leaf should look almost healthy: pick photos (and `minZoom`
  values) where the symptoms really need magnification.
- Use only photos you took yourself or that have a licence allowing reuse,
  and put the credit in the round's `credit` field.
- Micrographs for the microscope view go in `micro/` (see `micro/README.md`).
- When your photo's symptoms are in other places, open the mission with
  `?calibrate=1` and update the x/y values (see `docs/inspection-game.md`).
