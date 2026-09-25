# AgriCore API

Express + Mongoose backend over the seven-collection MongoDB schema:
`users`, `sections`, `modules`, `lessons`, `missions`, `missionAttempts`, `progress`.

Nothing derived is stored. Total XP, level, streak, best score, section averages
and leaderboard rank are all computed from `missionAttempts` at request time.

## Running locally

```bash
cd backend
npm install
cp .env.example .env     # then fill in the values below
npm run dev              # nodemon, restarts on change
npm start                # plain node
```

Confirm it is up and actually talking to Atlas:

```bash
curl http://localhost:5000/api/health
# {"status":"ok","database":"connected", ...}
```

`status` is `degraded` with HTTP 503 when Mongo is not connected — the process
stays up on purpose so a bad connection string looks different from a dead
server. The reason is logged to the terminal.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string, including the database name (`…mongodb.net/agricore_db?…`) |
| `JWT_SECRET` | yes | Signs and verifies JWTs. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `PORT` | no | Listen port, default `5000` |
| `CORS_ORIGINS` | no | Comma-separated browser origins allowed to call the API. Default `http://localhost:5173` |
| `BREVO_API_KEY` | for password reset | Brevo API key used to send reset codes. Without it the reset endpoints return 503 |
| `MAIL_FROM_EMAIL` | for password reset | Sender address, which must be verified in Brevo |
| `MAIL_FROM_NAME` | no | Sender display name, default `AgriCore` |

`.env` is gitignored and must never be committed. `.env.example` documents the
shape without real values.

## Scripts

| Command | What it does |
|---|---|
| `node scripts/seed.js` | Replaces all seven collections with the content in `frontend/src/data/*.js`, converting the readable string ids to real ObjectIds and rewiring every reference. Activity dates are shifted so the newest attempt is always yesterday, and every account is given the demo password. **Destructive** — it deletes existing documents first. |
| `node scripts/seed.js --dry` | Reports what would be written. Touches nothing. |
| `node scripts/verify-seed.js` | Read-only. Checks that seeded documents carry the fields the frontend reads, that every `scenarioData` matches its game type, and that no reference is orphaned. |
| `node scripts/set-passwords.js` | Resets account passwords. `seed.js` already sets them, so this is only needed to change a password or repair an account. Defaults to `agricore123`; pass `--password "…"`, `--email "…"` or `--all`. |
| `node scripts/smoke-test.js` | End-to-end check against a running API: auth, role guards, data routes, the leaderboard aggregation, and that a tampered score is ignored. It submits one real attempt and deletes it again, so it leaves no trace. |
| `node scripts/remove-test-attempts.js` | Clears zero-score attempts left by older smoke-test runs. Reports by default; pass `--apply` to delete. |
| `TEST_EMAIL=you@example.com node --env-file=.env scripts/test-password-reset.js` | Checks the reset rate limit, attempt budget, expiry and enumeration behaviour against a running API. `TEST_EMAIL` must name an existing account on an inbox you can read; two of the checks send real mail. |

The seed data is generated from the frontend mock files, so the mission
`scenarioData` shapes match exactly what the five game components render.

Re-run the seed before a demo if the data has aged oddly. Because it shifts the
whole activity history relative to the day it runs, streaks, weekly activity
and at-risk counts stay realistic rather than drifting as the fixed seed dates
recede into the past. Note that re-seeding mints new ObjectIds, so anyone signed
in is signed out.

## API

All routes are prefixed `/api`. Every route requires
`Authorization: Bearer <token>` except `/api/health`, `/api/auth/login`,
`/api/auth/register`, `/api/sections/options` and the three password-reset
routes. Those have to be public: someone registering or recovering a password
does not have a session yet.

### Auth
| Method | Path | Access |
|---|---|---|
| POST | `/auth/login` | public — returns `{ token, user }` |
| POST | `/auth/register` | public — students become active, instructors `pending` |
| GET | `/auth/me` | any signed-in user |
| POST | `/auth/change-password` | any signed-in user |
| POST | `/auth/forgot-password` | public — emails a 6-digit code |
| POST | `/auth/verify-reset-code` | public — exchanges the code for a reset token |
| POST | `/auth/reset-password` | public — sets the new password using that token |

### Data
| Method | Path | Access |
|---|---|---|
| GET | `/users?role=&sectionId=&status=&search=` | instructor, admin |
| GET/PATCH | `/users/:id` | any signed-in user |
| DELETE | `/users/:id` | admin |
| GET | `/sections`, `/sections/:id` | any signed-in user |
| GET | `/sections/options` | public — `{ _id, sectionName }` only, for the registration dropdown |
| POST/PATCH | `/sections`, `/sections/:id` | admin |
| GET | `/modules`, `/modules/:id` | any |
| POST/PATCH | `/modules`, `/modules/:id` | instructor, admin |
| GET | `/lessons?moduleId=`, `/lessons/:id` | any |
| POST/PATCH/DELETE | `/lessons`, `/lessons/:id` | instructor, admin |
| GET | `/missions?lessonId=`, `/missions/:id` | any |
| POST/PATCH/DELETE | `/missions`, `/missions/:id` | instructor, admin |
| GET | `/missionAttempts?studentId=&missionId=` | own records, or any for staff |
| POST | `/missionAttempts` | student (own records only) |
| GET | `/progress?studentId=&lessonId=` | own records, or any for staff |
| PATCH | `/progress` | own records, or any for staff |
| GET | `/leaderboard?sectionId=&limit=` | any |

### Two routes worth knowing about

**`POST /api/missionAttempts`** takes `{ studentId, missionId, answers, timeSpentSeconds }`
and **ignores any score sent by the client**. It re-scores `answers` against the
mission's stored `scenarioData` with the same rules the UI uses, so a tampered
request cannot award XP that was not earned. Replays only add the difference
between the new and previous best, so repeating a mission cannot farm XP. It
also upserts the lesson's progress row to `completed` once every level has a
passing attempt, otherwise `in-progress`.

**`GET /api/leaderboard`** computes ranks at request time with an aggregation
that sums `xpEarned` per student. No leaderboard collection exists and no rank
is ever stored. Students with no attempts still appear on 0 XP, and equal XP
shares a rank.

## Authentication

Passwords are hashed with bcrypt (10 rounds). Login returns a JWT whose payload
is deliberately minimal:

```json
{ "sub": "<user _id>", "role": "student|instructor|admin" }
```

Only the id and role are in the token. Name, email, section and avatar are read
from the database on every request, so a profile edit takes effect immediately
and a stale token cannot assert outdated identity. `requireAuth` rejects tokens
whose user has been deleted or deactivated; `requireRole(...)` returns 403 (not
401) when a valid session lacks the necessary role.

## Password reset

Three endpoints rather than one form, so the emailed code is never posted
alongside the new password:

1. `POST /auth/forgot-password { identifier }` — an email address or a school
   ID, the same rule the login form uses. Generates a six-digit code, stores
   only its SHA-256, and emails the code through Brevo.
2. `POST /auth/verify-reset-code { identifier, code }` — on success the code
   is cleared immediately (single use) and a short-lived reset token is
   returned in its place.
3. `POST /auth/reset-password { resetToken, newPassword }` — sets the hash and
   clears the reset state, which consumes the token. It deliberately does not
   sign the user in.

The in-flight reset lives in a `passwordReset` subdocument on the user, not in
a new collection, so the seven-collection schema is unchanged.

Rules, all in `utils/passwordReset.js`:

| Rule | Value |
|---|---|
| Code length | 6 digits, from `crypto.randomInt` |
| Expiry | 15 minutes |
| Wrong guesses before the code is burned | 5 |
| Codes per account per 15 minutes | 3 |

Two things worth knowing:

- **The request step never reveals whether an account exists.** Unknown
  identifiers, known ones and rate-limited ones all return the same message.
  The cost is that a user who has hit the limit sees success and gets no
  email, so the UI states the limit up front.
- **The reset token is not a session.** It is signed with `JWT_SECRET` like a
  normal token, so it carries `purpose: "password_reset"` and `requireAuth`
  refuses any token that has a purpose claim. Without that guard it would
  satisfy `jwt.verify` on every authenticated route.

Email sending is `mail/send.js` (Brevo's HTTP API via `fetch` — no email
library, and no SMTP port for a host to block) and the branded template is
`mail/resetCodeEmail.js` (table-based, fully inline styles, with a plain-text
part). The template's palette is copied from the frontend's design tokens by
hand and has to be updated by hand if the brand colours change.

## Known follow-ups

**Badges are not yet authoritative on the server.** Mission scoring was
deliberately moved server-side so a tampered client cannot award itself XP —
`POST /api/missionAttempts` ignores any score in the request and re-scores the
answers itself. Badge evaluation did *not* move: the frontend still runs
`utils/badgeRules.js` after a submit and writes the result through
`PATCH /api/users/:id`, which accepts `earnedBadges`. A crafted request could
therefore grant itself any badge.

This is the same class of trust problem as the XP one, and it should be closed
the same way before any final defence: port `badgeRules.js` alongside the
already-ported `scoring.js` and `gamification.js`, evaluate badges inside the
mission-attempt controller, and drop `earnedBadges` from the editable field
list in `controllers/user.controller.js`.

Lower priority: the instructor analytics screens issue one activity request per
student (roughly 50 requests for 21 students), which makes them take a few
seconds to settle. Correct, but a bulk endpoint would fix it.

## Deployment notes

Everything that changes once the app is deployed is an environment variable —
no code edit is needed:

1. **Backend (Render)** — set `MONGODB_URI`, `JWT_SECRET`, `BREVO_API_KEY` and
   `MAIL_FROM_EMAIL` to the same values used locally, and point `CORS_ORIGINS`
   at the deployed frontend origin, e.g.
   `CORS_ORIGINS=https://<your-app>.vercel.app`. Multiple origins are
   comma-separated, so keep `http://localhost:5173` in the list if you still
   develop locally. Render sets `PORT` itself. Reset email needs no extra
   network setup: Brevo is called over HTTPS, so the outbound SMTP ports that
   free hosts commonly block are not involved.
2. **Frontend (Vercel)** — set `VITE_API_URL` in the project's environment
   settings to the deployed API base, e.g.
   `https://<your-service>.onrender.com/api`. Vite only exposes variables
   prefixed `VITE_`, and they are baked in at build time, so the project must be
   redeployed after changing it.

Atlas must also allow connections from Render's outbound IPs — either add them
to the cluster's IP access list, or allow `0.0.0.0/0` if that is acceptable for
a student project.
