/**
 * Item B: student data needs a signed-in user, and the leaderboard only ever
 * shows the caller's own section. Item A: terms acceptance on registration.
 * Runs on an in-memory MongoDB only (see helpers.js).
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { seedFixture, startTestServer } from './helpers.js';

let ctx;
let fx;

before(async () => {
  ctx = await startTestServer();
  fx = await seedFixture(ctx);
  // Some XP so the ranking has something to show.
  await ctx.models.MissionAttempt.create([
    { studentId: fx.ana._id, missionId: fx.mission._id, score: 90, xpEarned: 90, timeSpentSeconds: 30, isPassed: true },
    { studentId: fx.cara._id, missionId: fx.mission._id, score: 80, xpEarned: 80, timeSpentSeconds: 30, isPassed: true },
  ]);
});
after(async () => {
  await ctx?.stop();
});

describe('routes that return student data refuse anonymous requests', () => {
  const protectedRoutes = [
    ['GET', '/leaderboard'],
    ['GET', '/leaderboard?period=module'],
    ['GET', '/users'],
    ['GET', '/users/0123456789abcdef01234567'],
    ['GET', '/missionAttempts'],
    ['POST', '/missionAttempts'],
    ['POST', '/missionAttempts/start'],
    ['GET', '/progress'],
    ['PATCH', '/progress'],
    ['GET', '/sections'],
    ['GET', '/modules'],
    ['GET', '/lessons'],
    ['GET', '/missions'],
    ['GET', '/notifications'],
    ['GET', '/auth/me'],
  ];
  for (const [method, path] of protectedRoutes) {
    test(`${method} ${path} → 401`, async () => {
      const result = await ctx.call(method, path, method === 'GET' ? {} : { body: {} });
      assert.equal(result.status, 401);
    });
  }

  test('public routes stay open', async () => {
    assert.equal((await ctx.call('GET', '/health')).status, 200);
    const options = await ctx.call('GET', '/sections/options');
    assert.equal(options.status, 200);
    assert.deepEqual(Object.keys(options.body[0]).sort(), ['_id', 'sectionName']);
  });
});

describe('leaderboard scoping', () => {
  test("a student sees their own section only, with display fields only", async () => {
    const result = await ctx.call('GET', '/leaderboard', { token: fx.tokens.ana });
    assert.equal(result.status, 200);
    const names = result.body.map((row) => row.firstName).sort();
    assert.deepEqual(names, ['Ana', 'Ben']);
    for (const row of result.body) {
      for (const field of ['email', 'schoolId', 'sectionId', 'passwordHash', 'role', 'status']) {
        assert.equal(row[field], undefined, `${field} must not be sent`);
      }
      assert.ok('rank' in row && 'totalXP' in row);
    }
  });

  test("a student of another section is refused that section's board", async () => {
    const result = await ctx.call('GET', `/leaderboard?sectionId=${fx.sectionA._id}`, { token: fx.tokens.cara });
    assert.equal(result.status, 403);
    const own = await ctx.call('GET', `/leaderboard?sectionId=${fx.sectionB._id}`, { token: fx.tokens.cara });
    assert.deepEqual(own.body.map((row) => row.firstName), ['Cara']);
  });

  test('the by-module board is scoped the same way', async () => {
    const result = await ctx.call('GET', `/leaderboard?period=module&moduleId=${fx.module._id}&sectionId=${fx.sectionA._id}`, { token: fx.tokens.cara });
    assert.equal(result.status, 403);
  });

  test('an instructor sees only assigned sections', async () => {
    assert.equal((await ctx.call('GET', `/leaderboard?sectionId=${fx.sectionA._id}`, { token: fx.tokens.teachA })).status, 200);
    assert.equal((await ctx.call('GET', `/leaderboard?sectionId=${fx.sectionB._id}`, { token: fx.tokens.teachA })).status, 403);
  });
});

describe('student records', () => {
  test("a student cannot read another student's account", async () => {
    assert.equal((await ctx.call('GET', `/users/${fx.ben._id}`, { token: fx.tokens.ana })).status, 403);
    assert.equal((await ctx.call('GET', `/users/${fx.ana._id}`, { token: fx.tokens.ana })).status, 200);
  });

  test("a student cannot move themselves to another section", async () => {
    const result = await ctx.call('PATCH', `/users/${fx.ana._id}`, { token: fx.tokens.ana, body: { sectionId: fx.sectionB._id } });
    assert.equal(result.status, 403);
    const same = await ctx.call('PATCH', `/users/${fx.ana._id}`, { token: fx.tokens.ana, body: { firstName: 'Ana', sectionId: fx.sectionA._id } });
    assert.equal(same.status, 200);
  });

  test("a student cannot read another student's attempts or progress", async () => {
    assert.equal((await ctx.call('GET', `/missionAttempts?studentId=${fx.ben._id}`, { token: fx.tokens.ana })).status, 403);
    assert.equal((await ctx.call('GET', `/progress?studentId=${fx.ben._id}`, { token: fx.tokens.ana })).status, 403);
  });

  test('a student cannot mark their own lesson completed', async () => {
    const body = { studentId: fx.ana._id, lessonId: fx.lesson._id, status: 'completed' };
    assert.equal((await ctx.call('PATCH', '/progress', { token: fx.tokens.ana, body })).status, 403);
    const viewed = await ctx.call('PATCH', '/progress', { token: fx.tokens.ana, body: { ...body, status: 'in-progress' } });
    assert.equal(viewed.status, 200);
  });
});

describe('registration terms', () => {
  const details = (n) => ({
    firstName: 'New',
    lastName: `Student${n}`,
    email: `new${n}@example.test`,
    password: 'longenough1',
    schoolId: `2025-000${n}`,
    sectionId: String(fx.sectionA._id),
  });

  test('agreeing records the acceptance', async () => {
    const result = await ctx.call('POST', '/auth/register', { body: { ...details(1), acceptedTerms: true, termsVersion: '2026-11' } });
    assert.equal(result.status, 201);
    const saved = await ctx.models.User.findOne({ email: 'new1@example.test' });
    assert.equal(saved.termsAcceptance.accepted, true);
    assert.equal(saved.termsAcceptance.version, '2026-11');
    assert.ok(saved.termsAcceptance.acceptedAt instanceof Date);
  });

  test('declining is refused', async () => {
    const result = await ctx.call('POST', '/auth/register', { body: { ...details(2), acceptedTerms: false } });
    assert.equal(result.status, 400);
  });

  test('the previous form (no terms field) still works and records nothing', async () => {
    const result = await ctx.call('POST', '/auth/register', { body: details(3) });
    assert.equal(result.status, 201);
    const saved = await ctx.models.User.findOne({ email: 'new3@example.test' });
    assert.equal(saved.termsAcceptance, undefined);
  });
});
