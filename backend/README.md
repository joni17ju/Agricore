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

`.env` is gitignored and must never be committed. `.env.example` documents the
shape without real values.

## Scripts

| Command | What it does |
|---|---|
| `node scripts/seed.js` | Replaces all seven collections with the content in `frontend/src/data/*.js`, converting the readable string ids to real ObjectIds and rewiring every reference. **Destructive** — it deletes existing documents first. |
| `node scripts/seed.js --dry` | Reports what would be written. Touches nothing. |
| `node scripts/verify-seed.js` | Read-only. Checks that seeded documents carry the fields the frontend reads, that every `scenarioData` matches its game type, and that no reference is orphaned. |
| `node scripts/set-passwords.js` | Replaces the seeded placeholder password hashes with real bcrypt hashes so the demo accounts can sign in. Defaults to password `agricore123`; pass `--password "…"`, `--email "…"` or `--all`. |

The seed data is generated from the frontend mock files, so the mission
`scenarioData` shapes match exactly what the five game components render.

## API

All routes are prefixed `/api`. Every route except `/api/health`,
`/api/auth/login` and `/api/auth/register` requires
`Authorization: Bearer <token>`.

### Auth
| Method | Path | Access |
|---|---|---|
| POST | `/auth/login` | public — returns `{ token, user }` |
| POST | `/auth/register` | public — students become active, instructors `pending` |
| GET | `/auth/me` | any signed-in user |
| POST | `/auth/change-password` | any signed-in user |

### Data
| Method | Path | Access |
|---|---|---|
| GET | `/users?role=&sectionId=&status=&search=` | instructor, admin |
| GET/PATCH | `/users/:id` | any signed-in user |
| DELETE | `/users/:id` | admin |
| GET | `/sections`, `/sections/:id` | any |
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

## Deployment notes

Two values must change once the app is deployed, and both are environment
variables — no code edit is needed:

1. **Backend (Render)** — set `MONGODB_URI`, `JWT_SECRET`, and `CORS_ORIGINS`
   to the deployed frontend origin, e.g.
   `CORS_ORIGINS=https://<your-app>.vercel.app`. Multiple origins are
   comma-separated, so keep `http://localhost:5173` in the list if you still
   develop locally. Render sets `PORT` itself.
2. **Frontend (Vercel)** — set `VITE_API_URL` in the project's environment
   settings to the deployed API base, e.g.
   `https://<your-service>.onrender.com/api`. Vite only exposes variables
   prefixed `VITE_`, and they are baked in at build time, so the project must be
   redeployed after changing it.

Atlas must also allow connections from Render's outbound IPs — either add them
to the cluster's IP access list, or allow `0.0.0.0/0` if that is acceptable for
a student project.
