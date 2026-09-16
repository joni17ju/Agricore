# Static images

Files here are served from the site root. `public/images/login-hero.jpg` is
requested by the browser as `/images/login-hero.jpg`.

## Login hero image

Place the login page's right-panel image at:

    frontend/public/images/login-hero.jpg

- The panel crops it with `object-fit: cover`, so a portrait or square image
  works best (roughly 900×1200 or larger).
- Decorative leaf shapes and a gradient wash are layered on top of it.
- If the file is missing, the panel falls back to a green gradient and the
  layout still works.

Keep the exact filename (`login-hero.jpg`) or update `HERO_IMAGE` in
`src/pages/auth/LoginPage.jsx`.
