/**
 * Verifies lesson reordering persists and stays contiguous.
 *
 * Reverses a module's lessons, checks the stored numbering, then restores the
 * original order so the seeded data is unchanged.
 *
 * Usage: node scripts/test-reorder.js [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://localhost:5000/api';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

let token = null;
async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const instructor = await call('/auth/login', { method: 'POST', body: { identifier: 'c.reyes@dorsu.edu.ph', password: 'agricore123' } });
token = instructor.data.token;

const modules = (await call('/modules')).data;
const module = modules.find((m) => m.moduleNumber === 1);
const original = (await call(`/lessons?moduleId=${module._id}`)).data;
console.log(`Module ${module.moduleNumber}: ${original.length} lessons`);
console.log('  before:', original.map((l) => `${l.lessonNumber}:${l.title.slice(0, 18)}`).join('  '));

const originalIds = original.map((l) => l._id);
const reversed = [...originalIds].reverse();

console.log('\nRejections:');
const partial = await call('/lessons/reorder', { method: 'PATCH', body: { moduleId: module._id, lessonIds: originalIds.slice(0, 2) } });
check('partial list → 400', partial.status === 400, `"${partial.data?.message}"`);
const dupes = await call('/lessons/reorder', { method: 'PATCH', body: { moduleId: module._id, lessonIds: [originalIds[0], originalIds[0], ...originalIds.slice(1, -1)] } });
check('duplicate ids → 400', dupes.status === 400, `"${dupes.data?.message}"`);
const empty = await call('/lessons/reorder', { method: 'PATCH', body: { moduleId: module._id, lessonIds: [] } });
check('empty list → 400', empty.status === 400, `"${empty.data?.message}"`);

// A student must not be able to reorder a module's lessons.
const studentLogin = await call('/auth/login', { method: 'POST', body: { identifier: '2023-0101', password: 'agricore123' } });
const studentToken = token;
token = studentLogin.data.token;
const asStudent = await call('/lessons/reorder', { method: 'PATCH', body: { moduleId: module._id, lessonIds: reversed } });
check('student → 403', asStudent.status === 403, `${asStudent.status}`);
token = studentToken;
token = instructor.data.token;

console.log('\nReorder:');
const reorder = await call('/lessons/reorder', { method: 'PATCH', body: { moduleId: module._id, lessonIds: reversed } });
check('reverse order accepted', reorder.status === 200, `${reorder.status}`);

// Read back fresh rather than trusting the response body.
const after = (await call(`/lessons?moduleId=${module._id}`)).data;
console.log('  after :', after.map((l) => `${l.lessonNumber}:${l.title.slice(0, 18)}`).join('  '));

const numbers = after.map((l) => l.lessonNumber);
check('numbering is contiguous 1..n', numbers.join(',') === original.map((_, i) => i + 1).join(','), numbers.join(','));
check('no duplicate lessonNumbers', new Set(numbers).size === numbers.length);
check(
  'order matches what was requested',
  after.map((l) => String(l._id)).join(',') === reversed.map(String).join(','),
);

console.log('\nRestore:');
const restore = await call('/lessons/reorder', { method: 'PATCH', body: { moduleId: module._id, lessonIds: originalIds } });
check('original order restored', restore.status === 200, `${restore.status}`);
const final = (await call(`/lessons?moduleId=${module._id}`)).data;
check(
  'matches the original exactly',
  final.map((l) => String(l._id)).join(',') === originalIds.map(String).join(','),
  final.map((l) => `${l.lessonNumber}:${l.title.slice(0, 14)}`).join('  '),
);

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
