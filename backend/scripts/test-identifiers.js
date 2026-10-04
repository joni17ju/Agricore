/**
 * Verifies school-ID registration rules and email-or-ID login.
 *
 * Creates one throwaway student and deletes it again, so the seeded data is
 * unchanged when the run finishes.
 *
 * Usage: node scripts/test-identifiers.js [baseUrl]
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const PASSWORD = 'testing-pass-1234';
const NEW_ID = '2026-9911';
const EXISTING_ID = '2023-0101';
const EXISTING_EMAIL = 'juan.delacruz@dorsu.edu.ph';
const SEED_PASSWORD = 'agricore123';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const login = (identifier, password) => call('/auth/login', { method: 'POST', body: { identifier, password } });

// A section id is needed for student registration.
// Any signed-in account can read sections; an instructor is used now that
// the administrator role is gone.
const loginStaff = await call('/auth/login', { method: 'POST', body: { identifier: 'c.reyes@dorsu.edu.ph', password: SEED_PASSWORD } });
const sectionsRes = await fetch(`${BASE}/sections`, { headers: { Authorization: `Bearer ${loginStaff.data.token}` } });
const sections = await sectionsRes.json();
const sectionId = sections[0]?._id;

console.log('Registration — school ID rules:');
const base = { role: 'student', firstName: 'Test', lastName: 'Student', password: PASSWORD, sectionId };

const missing = await call('/auth/register', { method: 'POST', body: { ...base, email: 'id.test1@dorsu.edu.ph' } });
check('missing school ID → 400', missing.status === 400, `"${missing.data?.message}"`);

for (const bad of ['23-0795', '2023-795', 'abc', '0000-0000', '2023_0795']) {
  const res = await call('/auth/register', { method: 'POST', body: { ...base, email: `id.${bad.replace(/\W/g, '')}@dorsu.edu.ph`, schoolId: bad } });
  check(`format "${bad}" → 400`, res.status === 400, `"${res.data?.message}"`);
}

const duplicate = await call('/auth/register', { method: 'POST', body: { ...base, email: 'id.dupe@dorsu.edu.ph', schoolId: EXISTING_ID } });
check('duplicate school ID → 409', duplicate.status === 409, `"${duplicate.data?.message}"`);

const created = await call('/auth/register', { method: 'POST', body: { ...base, email: 'id.newstudent@dorsu.edu.ph', schoolId: NEW_ID } });
check('valid school ID → 201', created.status === 201, `${created.status} schoolId=${created.data?.user?.schoolId}`);
check('stored ID matches what was sent', created.data?.user?.schoolId === NEW_ID, created.data?.user?.schoolId);

// Instructor accounts are no longer self-registered; the route refuses them.
const instructor = await call('/auth/register', { method: 'POST', body: { role: 'instructor', firstName: 'Test', lastName: 'Instructor', email: 'id.instructor@dorsu.edu.ph', password: PASSWORD } });
check('registering as an instructor → 403', instructor.status === 403, `${instructor.status}`);

console.log('\nLogin — email or school ID:');
const byEmail = await login(EXISTING_EMAIL, SEED_PASSWORD);
check('login by email → 200', byEmail.status === 200, byEmail.data?.user?.email);

const byId = await login(EXISTING_ID, SEED_PASSWORD);
check('login by school ID → 200', byId.status === 200, byId.data?.user?.email);

check(
  'both identifiers resolve to the same account',
  byEmail.data?.user?._id && byEmail.data.user._id === byId.data?.user?._id,
  byId.data?.user?._id,
);

/*
 * A freshly registered student is pending, so the identifier resolves but the
 * account is not usable yet. The 403 is the proof that the school ID matched —
 * an unknown identifier returns 401 instead, as the checks below show.
 */
const newAccountById = await login(NEW_ID, PASSWORD);
check('new account resolves by its school ID → 403 pending', newAccountById.status === 403, `${newAccountById.status}`);
check('and the reason is approval, not credentials', /waiting for approval/i.test(newAccountById.data?.message ?? ''), newAccountById.data?.message);

const wrongPassword = await login(EXISTING_ID, 'not-the-password');
check('school ID with wrong password → 401', wrongPassword.status === 401, `"${wrongPassword.data?.message}"`);

const unknownId = await login('1999-0001', SEED_PASSWORD);
check('unknown school ID → 401', unknownId.status === 401, `"${unknownId.data?.message}"`);
check(
  'unknown ID and wrong password share a message (no enumeration)',
  unknownId.data?.message === wrongPassword.data?.message,
);

const staffById = await login('FAC-2012-014', SEED_PASSWORD);
check('staff ID format also works → 200', staffById.status === 200, staffById.data?.user?.email);

// Clean up the accounts this run created.
console.log('\nCleanup:');
await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const result = await mongoose.connection.db
  .collection('users')
  // Only the student exists: the instructor registration is refused now.
  .deleteMany({ email: { $in: ['id.newstudent@dorsu.edu.ph', 'id.instructor@dorsu.edu.ph'] } });
check('test accounts removed', result.deletedCount === 1, `${result.deletedCount} deleted`);
await mongoose.disconnect();

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
