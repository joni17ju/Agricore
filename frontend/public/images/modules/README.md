# Module cover images

One cover per module, shown at the top of each card on the student
Course Modules page. Files are served from the site root, so
`public/images/modules/module-1-cover.jpg` is requested as
`/images/modules/module-1-cover.jpg`.

## Filenames (exact)

| Module | File |
|---|---|
| 1 · Introduction to Crop Protection | `module-1-cover.jpg` |
| 2 · Plant Pathology | `module-2-cover.jpg` |
| 3 · Agricultural Entomology | `module-3-cover.jpg` |
| 4 · Weed Science | `module-4-cover.jpg` |
| 5 · Integrated Pest Management | `module-5-cover.jpg` |

## Size

- Aspect ratio **16:9** — every card crops to this same area.
- Recommended export: **1200 × 675 px** (800 × 450 is fine too).
- Keep files under ~300 KB for fast loading on slow connections.
- Any size or orientation still works: `object-fit: cover` crops it to the
  card, so the grid stays uniform. Keep the subject near the center.

Any module without a file falls back to a green gradient with the module's
game icon, so the grid never breaks.
