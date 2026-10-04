# AgriCore API

Express + Mongoose backend over the MongoDB schema:
`users`, `sections`, `modules`, `lessons`, `missions`, `missionAttempts`, `progress`,
`notifications`.

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
| `node scripts/seed.js` | Replaces all seven collections with the content in `frontend/src/data/*.js`, converting the readable string ids to real ObjectIds and rewiring every reference. Activity dates are shifted so the newest attempt is always yesterday, and every account is given the same starting password. **Destructive** — it deletes existing documents first. |
| `node scripts/seed.js --dry` | Reports what would be written. Touches nothing. |
| `node scripts/verify-seed.js` | Read-only. Checks that seeded documents carry the fields the frontend reads, that every `scenarioData` matches its game type, and that no reference is orphaned. |
| `node scripts/set-passwords.js` | Resets account passwords. `seed.js` already sets them, so this is only needed to change a password or repair an account. Defaults to `agricore123`; pass `--password "…"`, `--email "…"` or `--all`. |
| `node scripts/smoke-test.js` | End-to-end check against a running API: auth, role guards, data routes, the leaderboard aggregation, and that a tampered score is ignored. It submits one real attempt and deletes it again, so it leaves no trace. |
| `node scripts/remove-test-attempts.js` | Clears zero-score attempts left by older smoke-test runs. Reports by default; pass `--apply` to delete. |
| `node --env-file=.env scripts/remove-admin-role.js` | Reports administrator and pending-instructor accounts left in the database. Add `--apply` to delete them and unassign any sections they held. |
| `node --env-file=.env scripts/test-roles.js` | Checks student approval, the instructor's management powers, and the safety rules — that a student is refused on every instructor-only route, and that an instructor cannot promote a student, edit another instructor, or delete themselves. Removes everything it creates. |
| `node --env-file=.env scripts/test-notifications.js` | Submits a real mission attempt for a throwaway student and checks that badges are awarded, notifications are written, replays do not duplicate, marking read works and one user cannot touch another's rows. Removes everything it created. |
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
| GET | `/users?role=&sectionId=&status=&search=` | instructor |
| GET/PATCH | `/users/:id` | any signed-in user |
| POST | `/users` | instructor — students only |
| DELETE | `/users/:id` | instructor — students only |
| GET | `/sections`, `/sections/:id` | any signed-in user |
| GET | `/sections/options` | public — `{ _id, sectionName }` only, for the registration dropdown |
| POST/PATCH/DELETE | `/sections`, `/sections/:id` | instructor |
| GET | `/modules`, `/modules/:id` | any |
| POST/PATCH | `/modules`, `/modules/:id` | instructor |
| GET | `/lessons?moduleId=`, `/lessons/:id` | any |
| POST/PATCH/DELETE | `/lessons`, `/lessons/:id` | instructor |
| GET | `/missions?lessonId=`, `/missions/:id` | any |
| POST/PATCH/DELETE | `/missions`, `/missions/:id` | instructor |
| GET | `/missionAttempts?studentId=&missionId=` | own records, or any for staff |
| POST | `/missionAttempts` | student (own records only) |
| GET | `/progress?studentId=&lessonId=` | own records, or any for staff |
| PATCH | `/progress` | own records, or any for staff |
| GET | `/leaderboard?sectionId=&limit=` | any |
| GET | `/notifications?limit=&before=&unreadOnly=` | own only |
| GET | `/notifications/unread-count` | own only |
| PATCH | `/notifications/:id/read` | own only |
| PATCH | `/notifications/read-all` | own only |

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
{ "sub": "<user _id>", "role": "student|instructor" }
```

Only the id and role are in the token. Name, email, section and avatar are read
from the database on every request, so a profile edit takes effect immediately
and a stale token cannot assert outdated identity. `requireAuth` rejects tokens
whose user has been deleted or deactivated; `requireRole(...)` returns 403 (not
401) when a valid session lacks the necessary role.

There is no public endpoint that lists accounts. An earlier
`GET /auth/demo-accounts` powered one-click sign-in buttons on the login page;
it returned real names, emails and roles to anyone unauthenticated, so both it
and the buttons were removed once the app moved to real authentication. Seeded
accounts still exist and are signed into by typing the email or school ID and
password like any other account.

## Accounts and approval

Two roles: **student** and **instructor**. The administrator role was removed
once the programme head took those duties over as an instructor, so everything
the administrator did — adding students, changing sections, managing sections —
is now an instructor action.

Students self-register through `POST /auth/register` and land as `pending`.
They cannot sign in until an instructor approves them; a correct password on a
pending account returns 403 with "waiting for approval by your instructor"
rather than a generic refusal, so the person knows it is not a typo.

**Instructors are never self-registered.** `/auth/register` refuses any role
but student, and `POST /users` refuses any role but student, so no route in
the app can mint an account with management permissions. Instructor accounts
come from the seed or directly from the database.

Three rules guard the management routes, enforced per target in
`controllers/user.controller.js`:

- an instructor cannot change another instructor's account,
- an instructor cannot deactivate or delete their own account,
- a student may only ever change their own record.

Roles cannot be changed through `PATCH /users/:id` at all — promoting a
student would hand out every management permission in the app.

To clear the administrator out of an existing database, see
`scripts/remove-admin-role.js`.

## Notifications

Events on the server write a row per recipient; nothing is created from the
client. There is deliberately no create endpoint — a client that can post its
own notifications is a client that can lie to the person reading them.

| Event | Goes to |
|---|---|
| Badge earned | the student |
| Mission passed, first time only | the student |
| Module cleared | the student |
| A student crosses into at-risk | instructors of that section |
| A student registers | every active instructor |
| A student account is approved | that student |

Replays are excluded on purpose: passing the same mission again does not notify
a second time, or grinding one mission would fill the bell. At-risk fires on the
transition into it, not on every later attempt while the student stays below the
line.

Every read and write is scoped to `req.user._id` inside the controller, so no
route exists on which one user can see or mark another's rows — not even an
instructor.

Delivery to the browser is polled, not pushed: there is no socket layer and one
bell does not justify adding one. `NotificationContext` asks for the unread
count every 30 seconds, pauses while the tab is hidden, and refreshes on focus.
Worst case a notification raised by someone else's action appears within that
window.

## Badges

Badges are awarded by the server, inside `POST /api/missionAttempts`, from
stored attempts. `utils/badgeRules.js` and `constants/badges.js` are ports of
their frontend counterparts and must be kept in step with them — the frontend
still reads the catalogue for names, icons and artwork, it just no longer
decides who has earned what.

This closed a real hole: badges used to be evaluated in the browser and written
back through `PATCH /api/users/:id`, so a crafted request could grant itself
any badge. `earnedBadges` is no longer in that route's editable field list.

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

**A bulk activity endpoint for instructor analytics — still open.** The
analytics screens issue one activity request per student (roughly 50 requests
for 21 students), so they take a few seconds to settle. The results are
correct; it is the number of round trips that is wrong, and one endpoint
returning activity for a set of students would remove them.

The visible symptom is handled for now but the cause is not. On the roster, the
Section and Progress columns arrive from this slow call while the rest of the
row arrives from the much faster roster call, so they used to render "—" and 0%
for several seconds and read as missing data. They now show a loading
placeholder (`Skeleton` in `components/common/Display.jsx`) until the call
lands. That is presentation only — the requests are unchanged, and the other
instructor analytics screens still have the same lag.

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
