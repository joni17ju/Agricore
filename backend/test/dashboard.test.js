/**
 * GET /dashboard and the lean lesson list. In-memory MongoDB only (helpers.js).
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { seedFixture, startTestServer } from './helpers.js';

let ctx;
let fx;
before(async () => {
  ctx = await startTestServer();
  fx = await seedFixture(ctx);
  await ctx.models.Lesson.updateOne({ _id: fx.lesson._id }, { contentBody: '<h2>Intro:</h2><p>First <b>real</b> paragraph.</p><p>More text.</p>' });
  const week = 7 * 24 * 60 * 60 * 1000;
  await ctx.models.MissionAttempt.create([
    { studentId: fx.ana._id, missionId: fx.mission._id, score: 90, xpEarned: 90, timeSpentSeconds: 30, isPassed: true },
    { studentId: fx.ben._id, missionId: fx.mission._id, score: 80, xpEarned: 50, timeSpentSeconds: 30, isPassed: true, attemptedAt: new Date(Date.now() - 2 * week) },
    { studentId: fx.cara._id, missionId: fx.mission._id, score: 100, xpEarned: 100, timeSpentSeconds: 30, isPassed: true },
  ]);
});
after(async () => {
  await ctx?.stop();
});

test('the dashboard needs a signed-in student', async () => {
  assert.equal((await ctx.call('GET', '/dashboard')).status, 401);
  assert.equal((await ctx.call('GET', '/dashboard', { token: fx.tokens.teachA })).status, 403);
});

test("the dashboard returns the student's own data in one response", async () => {
  const { status, body } = await ctx.call('GET', '/dashboard', { token: fx.tokens.ana });
  assert.equal(status, 200);
  assert.equal(String(body.user._id), String(fx.ana._id));
  assert.equal(body.user.passwordHash, undefined);
  assert.equal(body.user.passwordReset, undefined);
  assert.equal(body.section.sectionName, 'Test A');
  assert.equal(body.attempts.length, 1);
  assert.ok(body.attempts.every((a) => String(a.studentId) === String(fx.ana._id)));
  assert.equal(body.course.modules.length, 1);
  assert.equal(body.course.missions.length, 1);
  assert.equal(body.course.lessons[0].contentBody, '<p>First real paragraph.</p>');
  // Own section only, display fields only.
  assert.deepEqual(body.leaderboard.rows.map((r) => r.firstName), ['Ana', 'Ben']);
  for (const row of body.leaderboard.rows) {
    assert.equal(row.email, undefined);
    assert.equal(row.avatarUrl, null);
  }
});

test('the leaderboard ranks the same with the aggregation (week and overall)', async () => {
  const overall = (await ctx.call('GET', '/leaderboard', { token: fx.tokens.ana })).body;
  assert.deepEqual(overall.map((r) => [r.firstName, r.totalXP, r.rank]), [['Ana', 90, 1], ['Ben', 50, 2]]);
  const week = (await ctx.call('GET', '/leaderboard?period=week', { token: fx.tokens.ana })).body;
  assert.deepEqual(week.map((r) => [r.firstName, r.totalXP]), [['Ana', 90], ['Ben', 0]]);
  // A week ago Ben (50) led Ana (0).
  assert.equal(overall.find((r) => r.firstName === 'Ben').previousRank, 1);
  const mod = (await ctx.call('GET', `/leaderboard?period=module&moduleId=${fx.module._id}`, { token: fx.tokens.ana })).body;
  assert.deepEqual(mod.map((r) => r.totalXP), [90, 50]);
});

test('lessons can be listed without their full text', async () => {
  const full = (await ctx.call('GET', '/lessons', { token: fx.tokens.ana })).body;
  const summary = (await ctx.call('GET', '/lessons?fields=summary', { token: fx.tokens.ana })).body;
  assert.match(full[0].contentBody, /More text/);
  assert.equal(summary[0].contentBody, '<p>First real paragraph.</p>');
  assert.equal(summary[0].isSummary, true);
  assert.equal(summary[0].title, full[0].title);
});
