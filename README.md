# AgriCore

**A Gamified Web-Based Learning Platform for Principles of Crop Protection I**
BS Agriculture · Davao Oriental State University (DOrSU)
BSIT Capstone Project — Apilan, Balante, Cabrizos

AgriCore supplements classroom instruction with a Learn → Practice → Apply flow across the
five syllabus modules of Principles of Crop Protection I. Each module ends its lessons with
missions that use a different game mechanic:

| Module | Title | Game type |
|---|---|---|
| I | Introduction to Crop Protection | Decision-Making |
| II | Plant Pathology | Identification |
| III | Agricultural Entomology | Matching |
| IV | Weed Science | Drag-and-Drop |
| V | Integrated Pest Management | Strategy & Management |

Students earn XP, levels and badges and are ranked on a section leaderboard. Instructors
manage lesson content and monitor student performance. Administrators manage accounts,
roles and sections.

## Project structure

```
agricore/
├── frontend/              React + Vite frontend (current stage)
├── backend/               Node.js + Express + MongoDB (planned, not yet started)
├── AgriCore_Proposal.pdf  Capstone proposal — source of truth
└── README.md
```

## Current stage: frontend only

The frontend runs on its own using **mock data** (`frontend/src/data/`) accessed through a
**service layer** (`frontend/src/services/`). No backend, database or real authentication is
connected yet. Mock changes are saved to the browser's localStorage.

## Running the frontend

Requires Node.js 20.19+ (Node 24 LTS recommended).

```bash
cd frontend
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other scripts:

```bash
npm run build     # production build into frontend/dist
npm run preview   # serve the production build
npm run lint      # lint with oxlint
npm run seed      # regenerate mock activity data (attempts, progress, badges)
```
