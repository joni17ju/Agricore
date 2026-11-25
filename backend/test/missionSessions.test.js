/**
 * Item D: one active attempt per mission level, and a submission recorded at
 * most once. Runs on an in-memory MongoDB only (see helpers.js).
 */
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { ageSession, seedFixture, startTestServer } from './helpers.js';

let ctx;
let fx;

before(async () => {
  ctx = await startTestServer();
});
after(async () => {
  await ctx?.stop();
});
beforeEach(async () => {
  const { models } = ctx;
  await Promise.all(Object.values(models).filter((m) => m?.deleteMany).map((m) => m.deleteMany({})));
  fx = await seedFixture(ctx);
});

const start = (token, missionId = fx.mission._id) =>
  ctx.call('POST', '/missionAttempts/start', { token, body: { missionId } });

const submit = (token, studentId, attemptId, choice = 'good') =>
  ctx.call('POST', '/missionAttempts', {
    token,
    body: { attemptId, studentId, missionId: fx.mission._id, answers: { choices: { s1: choice } }, timeSpentSeconds: 999 },
  });

const attemptCount = () => ctx.models.MissionAttempt.countDocuments({ studentId: fx.ana._id });

describe('mission sessions', () => {
  test('start requires a signed-in student', async () => {
    assert.equal((await ctx.call('POST', '/missionAttempts/start', { body: { missionId: fx.mission._id } })).status, 401);
    assert.equal((await start(fx.tokens.teachA)).status, 403);
    const ok = await start(fx.tokens.ana);
    assert.equal(ok.status, 201);
    assert.ok(ok.body.attemptId);
  });

  test('two parallel starts leave exactly one active attempt, and the other is refused on submit', async () => {
    const [first, second] = await Promise.all([start(fx.tokens.ana), start(fx.tokens.ana)]);
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    const active = await ctx.models.MissionSession.find({ studentId: fx.ana._id, isActive: true });
    assert.equal(active.length, 1, 'only one in-progress attempt per mission level');

    const live = String(active[0]._id);
    const stale = [first.body.attemptId, second.body.attemptId].map(String).find((id) => id !== live);
    await ageSession(ctx.models, live);
    await ageSession(ctx.models, stale);

    const staleResult = await submit(fx.tokens.ana, fx.ana._id, stale);
    assert.equal(staleResult.status, 409);
    assert.equal(staleResult.body.code, 'attempt_replaced');

    const liveResult = await submit(fx.tokens.ana, fx.ana._id, live);
    assert.equal(liveResult.status, 201);
    assert.equal(await attemptCount(), 1);
  });

  test('two parallel submits of the same attempt record it once', async () => {
    const { body } = await start(fx.tokens.ana);
    await ageSession(ctx.models, body.attemptId);
    const results = await Promise.all([
      submit(fx.tokens.ana, fx.ana._id, body.attemptId),
      submit(fx.tokens.ana, fx.ana._id, body.attemptId),
      submit(fx.tokens.ana, fx.ana._id, body.attemptId),
    ]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409]);
    assert.equal(await attemptCount(), 1);
    const xp = await ctx.models.MissionAttempt.find({ studentId: fx.ana._id }).then((rows) => rows.reduce((s, r) => s + r.xpEarned, 0));
    assert.equal(xp, 100, 'XP awarded once');
  });

  test('resubmitting a submitted attempt is refused and records nothing', async () => {
    const { body } = await start(fx.tokens.ana);
    await ageSession(ctx.models, body.attemptId);
    assert.equal((await submit(fx.tokens.ana, fx.ana._id, body.attemptId)).status, 201);
    const again = await submit(fx.tokens.ana, fx.ana._id, body.attemptId);
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'attempt_already_submitted');
    assert.equal(await attemptCount(), 1);
  });

  test('a stale attempt (replaced by a later start) is refused', async () => {
    const first = await start(fx.tokens.ana);
    await ageSession(ctx.models, first.body.attemptId);
    const second = await start(fx.tokens.ana);
    assert.equal(second.status, 201);
    const result = await submit(fx.tokens.ana, fx.ana._id, first.body.attemptId);
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'attempt_replaced');
    assert.equal(await attemptCount(), 0);
  });

  test("submitting another student's attempt is refused", async () => {
    const { body } = await start(fx.tokens.ana);
    await ageSession(ctx.models, body.attemptId);
    // As Ben, naming himself but carrying Ana's attempt id.
    const asBen = await submit(fx.tokens.ben, fx.ben._id, body.attemptId);
    assert.equal(asBen.status, 403);
    assert.equal(asBen.body.code, 'attempt_forbidden');
    // As Ben, naming Ana: the route refuses before anything else.
    const forAna = await submit(fx.tokens.ben, fx.ana._id, body.attemptId);
    assert.equal(forAna.status, 403);
    assert.equal(await ctx.models.MissionAttempt.countDocuments(), 0);
    // Ana's own attempt is still usable.
    assert.equal((await submit(fx.tokens.ana, fx.ana._id, body.attemptId)).status, 201);
  });

  test('a submission too fast to be real is refused, and can be sent again later', async () => {
    const { body } = await start(fx.tokens.ana);
    const tooFast = await submit(fx.tokens.ana, fx.ana._id, body.attemptId);
    assert.equal(tooFast.status, 422);
    assert.equal(tooFast.body.code, 'attempt_too_fast');
    assert.equal(await attemptCount(), 0);
    await ageSession(ctx.models, body.attemptId);
    assert.equal((await submit(fx.tokens.ana, fx.ana._id, body.attemptId)).status, 201);
  });

  test('invalid or unknown attempt ids are refused', async () => {
    const junk = await submit(fx.tokens.ana, fx.ana._id, 'not-an-id');
    assert.equal(junk.status, 400);
    const unknown = await submit(fx.tokens.ana, fx.ana._id, '0123456789abcdef01234567');
    assert.equal(unknown.status, 404);
    assert.equal(await attemptCount(), 0);
  });

  test('play time is measured by the server, not taken from the client', async () => {
    const { body } = await start(fx.tokens.ana);
    await ageSession(ctx.models, body.attemptId, 42);
    const result = await submit(fx.tokens.ana, fx.ana._id, body.attemptId);
    assert.equal(result.status, 201);
    assert.ok(Math.abs(result.body.attempt.timeSpentSeconds - 42) <= 2, `got ${result.body.attempt.timeSpentSeconds}`);
    assert.equal(String(result.body.attempt.sessionId), String(body.attemptId));
  });

  test('a replay after a pass adds no XP twice', async () => {
    for (let i = 0; i < 2; i += 1) {
      const { body } = await start(fx.tokens.ana);
      await ageSession(ctx.models, body.attemptId);
      assert.equal((await submit(fx.tokens.ana, fx.ana._id, body.attemptId)).status, 201);
    }
    const rows = await ctx.models.MissionAttempt.find({ studentId: fx.ana._id });
    assert.equal(rows.length, 2);
    assert.equal(rows.reduce((s, r) => s + r.xpEarned, 0), 100);
  });

  test('old clients without an attempt id still work until the cut-off date', async () => {
    const result = await ctx.call('POST', '/missionAttempts', {
      token: fx.tokens.ana,
      body: { studentId: fx.ana._id, missionId: fx.mission._id, answers: { choices: { s1: 'good' } }, timeSpentSeconds: 20 },
    });
    assert.equal(result.status, 201);
  });
});
