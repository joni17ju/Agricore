/**
 * End-to-end smoke test against a running API. Read-only apart from the
 * mission attempt it submits (which is real student activity by design).
 *
 * Usage: node scripts/smoke-test.js [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://localhost:5000/api';
const DEMO = { email: 'juan.delacruz@dorsu.edu.ph', password: 'agricore123' };

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

console.log(`API: ${BASE}\n`);

console.log('Health:');
const health = await call('/health');
check('GET /health', health.status === 200 && health.data.database === 'connected', `${health.status} ${health.data.database}`);

console.log('\nAuth:');
const login = await call('/auth/login', { method: 'POST', body: DEMO });
check('POST /auth/login', login.status === 200 && Boolean(login.data.token), `${login.status} ${login.data.user?.firstName ?? login.data.message ?? ''}`);
const token = login.data.token;
check('token payload has no password hash', !JSON.stringify(login.data.user ?? {}).includes('passwordHash'));

const wrong = await call('/auth/login', { method: 'POST', body: { ...DEMO, password: 'definitely-wrong' } });
check('wrong password rejected', wrong.status === 401, `${wrong.status} "${wrong.data.message}"`);

const unknown = await call('/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password: 'whatever12' } });
check('unknown email gives same message (no enumeration)', unknown.data.message === wrong.data.message, `"${unknown.data.message}"`);

const me = await call('/auth/me', { token });
check('GET /auth/me', me.status === 200 && me.data.user?.email === DEMO.email, `${me.status}`);

console.log('\nAuthorisation:');
const noToken = await call('/modules');
check('no token → 401', noToken.status === 401);
const badToken = await call('/modules', { token: 'not-a-real-token' });
check('bad token → 401', badToken.status === 401, `"${badToken.data.message}"`);
const studentOnStaffRoute = await call('/users', { token });
check('student on instructor-only /users → 403', studentOnStaffRoute.status === 403, `"${studentOnStaffRoute.data.message}"`);

const otherStudent = await call('/missionAttempts?studentId=000000000000000000000000', { token });
check("student reading another student's attempts → 403", otherStudent.status === 403);

console.log('\nData:');
const modules = await call('/modules', { token });
check('GET /modules', modules.status === 200 && modules.data.length === 5, `${modules.data.length} modules`);
const lessons = await call(`/lessons?moduleId=${modules.data[0]._id}`, { token });
check('GET /lessons?moduleId', lessons.status === 200 && lessons.data.length > 0, `${lessons.data.length} lessons in module 1`);
const missions = await call(`/missions?lessonId=${lessons.data[0]._id}`, { token });
check('GET /missions?lessonId', missions.status === 200 && missions.data.length > 0, `${missions.data.length} missions`);
check('mission carries scenarioData', Boolean(missions.data[0]?.scenarioData), Object.keys(missions.data[0]?.scenarioData ?? {}).join(', '));

const studentId = login.data.user._id;
const attempts = await call(`/missionAttempts?studentId=${studentId}`, { token });
check('GET /missionAttempts?studentId', attempts.status === 200, `${attempts.data.length} attempts`);
const progress = await call(`/progress?studentId=${studentId}`, { token });
check('GET /progress?studentId', progress.status === 200, `${progress.data.length} rows`);

console.log('\nLeaderboard (computed, never stored):');
const board = await call('/leaderboard', { token });
check('GET /leaderboard', board.status === 200 && board.data.length > 0, `${board.data.length} students`);
const ordered = board.data.every((row, i) => i === 0 || board.data[i - 1].totalXP >= row.totalXP);
check('sorted by totalXP descending', ordered);
check('ranks assigned', board.data[0]?.rank === 1, `#1 ${board.data[0]?.firstName} ${board.data[0]?.lastName} ${board.data[0]?.totalXP} XP`);
const sectioned = await call(`/leaderboard?sectionId=${login.data.user.sectionId}`, { token });
check('GET /leaderboard?sectionId filters', sectioned.status === 200 && sectioned.data.length <= board.data.length, `${sectioned.data.length} in section`);

console.log('\nServer-side scoring (client score is ignored):');
const mission = missions.data[0];
const before = (await call(`/missionAttempts?studentId=${studentId}`, { token })).data.length;
const submitted = await call('/missionAttempts', {
  method: 'POST',
  token,
  body: {
    studentId,
    missionId: mission._id,
    // Deliberately wrong answers plus a cheated score the server must ignore.
    answers: { cheated: true },
    timeSpentSeconds: 30,
    score: 100,
    xpEarned: 999999,
    isPassed: true,
  },
});
check('POST /missionAttempts accepted', submitted.status === 201, `${submitted.status}`);
check('client-sent score ignored', submitted.data.score !== 100 || submitted.data.xpEarned !== 999999, `server scored ${submitted.data.score}% → ${submitted.data.xpEarned} XP`);
check('xpEarned not the cheated value', submitted.data.xpEarned !== 999999, `${submitted.data.xpEarned} XP`);
const after = (await call(`/missionAttempts?studentId=${studentId}`, { token })).data.length;
check('attempt persisted', after === before + 1, `${before} → ${after}`);
check('lesson progress upserted', ['in-progress', 'completed'].includes(submitted.data.lessonStatus), submitted.data.lessonStatus);

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
process.exit(failures === 0 ? 0 : 1);
