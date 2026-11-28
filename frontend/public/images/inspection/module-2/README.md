# Module 2 inspection photos

Put the photos for the Module 2 mission "Diagnose the Field Samples" here.
Until a file exists, the game draws a placeholder labelled "PLACEHOLDER — add
your photo".

| File | Shows | Findings to line up (x, y in % of the photo, zoom needed) | Minimum size |
|---|---|---|---|
| `round-1-base.jpg` + `round-1-reveal.jpg` (two layers, **in place**) | Tomato leaf with late blight (easy). Base: healthy version edited with AI; reveal: the original photo | large dead area 62, 33 (2×) · lesion beside the midrib 43, 50 (3×) · lower lesion 42, 69 (3×) · spore masses 67, 43 (20×) · decoy pale trail 29, 46 | 1856 × 2784 each (same size and alignment); optional `round-1-reveal@2x.jpg` |
| `round-2.jpg` (+ `@2x`) | Leaf with mosaic / mottling, e.g. tungro (medium) | mosaic 40, 44 (3×) · mottled, curled area 63, 60 (5×) | `@2x` 3200 px |
| `round-3.jpg` (+ `@2x`, `@4x`) | Rice leaf with blast-like lesions (hard) | leaf spot 32, 50 (3×) · yellowing 82, 48 (5×, optional) · spore masses 61, 52 (10×) | `@4x` at least 4000 px wide |
| `round-4.jpg` (+ `@2x`, `@4x`) | Rice leaf with bacterial blight (expert) | water-soaked lesion 22, 49 (2×) · bacterial ooze 54, 47 (20×) | `@4x` at least 6400 px wide, or rely on the micrograph |

- Round 1 uses two layers: `round-1-base.jpg` (healthy-looking, shown at 1×)
  and `round-1-reveal.jpg` (the original diseased photo). Both must have
  exactly the same pixel size and alignment; check it with "Blink compare"
  in `?calibrate=1`. Credit: Wikimedia Commons — the author and licence are
  still to be filled in (see `creditTodo` in the content file).
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
