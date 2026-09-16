/**
 * Mock database — the ONLY module that touches the mock data files.
 *
 * It seeds an in-memory copy of the 7 collections from `src/data/`, persists it to
 * localStorage so demo changes survive a refresh, and wraps every read/write in
 * `request()` to imitate an async API call (latency + copied results).
 *
 * When the Express/MongoDB backend is ready, services replace `request(() => db…)`
 * with real HTTP calls; pages and components do not change.
 */
import users from '../data/users.js';
import sections from '../data/sections.js';
import modules from '../data/modules.js';
import lessons from '../data/lessons.js';
import missions from '../data/missions.js';
import missionAttempts from '../data/missionAttempts.js';
import progress from '../data/progress.js';
import { MOCK_LATENCY_MS, MOCK_SEED_ANCHOR_DAY } from '../constants/rules.js';
import { addDays, calendarDaysBetween } from '../utils/dates.js';

/** Bump this when the seed data shape changes so saved demo data is rebuilt. */
const STORAGE_KEY = 'agricore.mockdb.v2';

const ID_PREFIXES = {
  users: 'usr',
  sections: 'sec',
  modules: 'mod',
  lessons: 'les',
  missions: 'mis',
  missionAttempts: 'att',
  progress: 'prg',
  asset: 'asset', // lesson media sub-documents
};

/** Error shaped like an HTTP error response so pages can handle both the same way. */
export class ServiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function getStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Seeded activity ends on MOCK_SEED_ANCHOR_DAY. Shift those dates so the anchor day
 * becomes "yesterday" relative to when the demo database is created.
 */
function shiftSeedDates(db) {
  const anchor = new Date(`${MOCK_SEED_ANCHOR_DAY}T12:00:00`);
  const offsetDays = calendarDaysBetween(anchor, new Date()) - 1;
  if (offsetDays === 0) return db;
  const shift = (iso) => addDays(iso, offsetDays).toISOString();

  db.missionAttempts.forEach((attempt) => {
    attempt.attemptedAt = shift(attempt.attemptedAt);
  });
  db.users.forEach((user) => {
    user.earnedBadges.forEach((badge) => {
      badge.earnedAt = shift(badge.earnedAt);
    });
  });
  return db;
}

function createSeedDatabase() {
  return shiftSeedDates(clone({ users, sections, modules, lessons, missions, missionAttempts, progress }));
}

function loadDatabase() {
  const storage = getStorage();
  const saved = storage?.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      storage.removeItem(STORAGE_KEY);
    }
  }
  const seeded = createSeedDatabase();
  storage?.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

let database = loadDatabase();

function persist() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(database));
  } catch {
    throw new ServiceError('Browser storage is full. Remove large media files or reset the demo data.', 413);
  }
}

function collection(name) {
  const records = database[name];
  if (!records) throw new Error(`Unknown collection "${name}"`);
  return records;
}

export function createId(collectionName) {
  const prefix = ID_PREFIXES[collectionName] ?? 'doc';
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Synchronous data access, used inside `request()` callbacks. Results are live — never return them without cloning. */
export const db = {
  all(name) {
    return collection(name);
  },

  find(name, predicate) {
    return collection(name).filter(predicate);
  },

  findOne(name, predicate) {
    return collection(name).find(predicate) ?? null;
  },

  findById(name, id) {
    return collection(name).find((record) => record._id === id) ?? null;
  },

  insert(name, document) {
    const record = { _id: createId(name), ...clone(document) };
    collection(name).push(record);
    persist();
    return record;
  },

  update(name, id, changes) {
    const record = db.findById(name, id);
    if (!record) throw new ServiceError('Record not found.', 404);
    Object.assign(record, clone(changes));
    persist();
    return record;
  },

  remove(name, id) {
    const records = collection(name);
    const index = records.findIndex((record) => record._id === id);
    if (index === -1) throw new ServiceError('Record not found.', 404);
    const [removed] = records.splice(index, 1);
    persist();
    return removed;
  },

  removeWhere(name, predicate) {
    const records = collection(name);
    const kept = records.filter((record) => !predicate(record));
    const removedCount = records.length - kept.length;
    database[name] = kept;
    if (removedCount) persist();
    return removedCount;
  },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a mock "request": waits a little, runs the handler, and returns a copy of the
 * result so callers can never mutate the database by accident.
 */
export async function request(handler, { latency = MOCK_LATENCY_MS } = {}) {
  await wait(latency);
  return clone(await handler());
}

/** Restore the original seeded demo data. */
export function resetDatabase() {
  database = createSeedDatabase();
  persist();
}
