/**
 * Test harness: the real Express app on an in-memory MongoDB.
 *
 * Nothing here can reach the Atlas database. dotenv is never loaded, and
 * startTestServer() refuses to run if MONGODB_URI is set to anything but the
 * in-memory server it just created.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.JWT_SECRET = 'test-only-secret';
delete process.env.MONGODB_URI;

export async function startTestServer() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('agricore-test');
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)/.test(uri)) throw new Error(`Refusing to test against ${uri}`);
  await mongoose.connect(uri);

  const models = await import('../models/index.js');
  // Build every index first: the one-active-session rule lives in an index.
  await Promise.all(Object.values(models).filter((m) => m?.syncIndexes).map((m) => m.syncIndexes()));

  const { createApp } = await import('../app.js');
  const { issueToken } = await import('../middleware/auth.js');
  const app = createApp({ corsOrigins: 'http://localhost:5173' });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  async function call(method, path, { token, body } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    await mongo.stop();
  }

  return { call, stop, models, issueToken };
}

/** Two sections, two students in each, one instructor per section, and one decision mission. */
export async function seedFixture({ models, issueToken }) {
  const { Section, User, Module, Lesson, Mission } = models;
  const [sectionA, sectionB] = await Section.create([{ sectionName: 'Test A' }, { sectionName: 'Test B' }]);
  const make = (role, name, extra) =>
    User.create({
      role,
      firstName: name,
      lastName: 'Tester',
      email: `${name.toLowerCase()}@example.test`,
      passwordHash: 'x',
      schoolId: role === 'student' ? `2024-${String(Math.floor(Math.random() * 9000) + 1000)}` : null,
      ...extra,
    });
  const ana = await make('student', 'Ana', { sectionId: sectionA._id });
  const ben = await make('student', 'Ben', { sectionId: sectionA._id });
  const cara = await make('student', 'Cara', { sectionId: sectionB._id });
  const teachA = await make('instructor', 'TeachA', { assignedSectionIds: [sectionA._id] });
  await Section.updateOne({ _id: sectionA._id }, { instructorId: teachA._id });

  const module = await Module.create({ moduleNumber: 1, title: 'Test module', gameType: 'decision-making' });
  const lesson = await Lesson.create({ moduleId: module._id, lessonNumber: 1, title: 'Test lesson' });
  const mission = await Mission.create({
    lessonId: lesson._id,
    levelNumber: 1,
    maxXP: 100,
    scenarioData: {
      title: 'Test mission',
      scenarios: [{ id: 's1', choices: [{ id: 'good', points: 100 }, { id: 'bad', points: 0 }] }],
    },
  });

  return {
    sectionA,
    sectionB,
    ana,
    ben,
    cara,
    teachA,
    module,
    lesson,
    mission,
    tokens: {
      ana: issueToken(ana),
      ben: issueToken(ben),
      cara: issueToken(cara),
      teachA: issueToken(teachA),
    },
  };
}

/** Moves a session's start back in time, so tests need not wait out the minimum play time. */
export async function ageSession(models, attemptId, seconds = 30) {
  await models.MissionSession.updateOne(
    { _id: attemptId },
    { $set: { startedAt: new Date(Date.now() - seconds * 1000) } },
  );
}
