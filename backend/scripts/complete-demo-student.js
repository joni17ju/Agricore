/**
 * Complete the demo student's course: every lesson completed and every
 * mission passed, exactly as if the student had played them.
 *
 *   node scripts/complete-demo-student.js            dry run: lists what would change
 *   node scripts/complete-demo-student.js --apply    backs up, then writes
 *
 * Only the demo student "Juan Dela Cruz" is touched (found by name, role
 * student; the script stops if there is not exactly one). It uses the app's
 * own rules:
 *   - each mission he has not passed gets one attempt, scored by the server's
 *     scoreMission() from answers built for that game (90–100%), with XP from
 *     calculateXpAward() against his earlier attempts (replays only add the
 *     improvement); missions he already passed are left as they are;
 *   - attempts are spread over the last six days in course order, with
 *     realistic play times, so his streak and the order of unlocks look real;
 *   - every lesson's progress is set to completed (the app sets it once every
 *     level in the lesson is passed);
 *   - badges come from the app's evaluateNewBadges(), checked attempt by
 *     attempt, then once more with his real section rank;
 *   - the notifications the app sends him for real completions (mission
 *     passed, module cleared, badge earned) are created; older ones are marked
 *     read. Nothing is sent to instructors.
 * XP, level, streak and rank are not stored: the app computes them from the
 * attempts.
 *
 * --apply first writes his current User, Progress, MissionAttempt and
 * Notification documents to backups/demo-student-before-<timestamp>.json
 * (git-ignored). Running it again changes nothing.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { Lesson, Mission, MissionAttempt, Module, Notification, NOTIFICATION_TYPES, Progress, User } from '../models/index.js';
import { BADGES_BY_CODE } from '../constants/badges.js';
import { missionGameType } from '../constants/gameTypes.js';
import { PROGRESS_STATUS } from '../constants/rules.js';
import { scoreMission } from '../utils/scoring.js';
import { calculateLevel, calculateStreak, calculateTotalXP, calculateXpAward } from '../utils/gamification.js';
import { evaluateNewBadges } from '../utils/badgeRules.js';
import { findSectionRank } from '../utils/awards.js';

const apply = process.argv.includes('--apply');
const FIRST = 'Juan';
const LAST = 'Dela Cruz';
const DAYS = 6;

/** A small deterministic random number from a string (same choices on every run). */
const pick = (text, n) => [...String(text)].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 9973, 17) % n;

/* ── Answers a strong student would give, per game, with slight variations ── */

const centre = (spot) => ({ x: spot.x, y: spot.y });
const answerSets = {
  'decision-making': (d) => {
    const best = Object.fromEntries(d.scenarios.map((s) => [s.id, s.choices.reduce((a, c) => (c.points > a.points ? c : a)).id]));
    const sets = [{ choices: best }];
    for (const s of d.scenarios) {
      const second = [...s.choices].sort((a, b) => b.points - a.points)[1];
      if (second) sets.push({ choices: { ...best, [s.id]: second.id } });
    }
    return sets;
  },
  identification: (d) => {
    const perfect = { marks: d.symptomSpots.map(centre), pathogenGuesses: [d.correctPathogenId] };
    return [perfect, { ...perfect, marks: [...perfect.marks, { x: 2, y: 2 }] }];
  },
  matching: (d, t) => {
    const selections = Object.fromEntries(d.columns.map((c) => [c.key, c.correctOptionId]));
    const left = Math.max(0, (Number(d.timeLimitSeconds) || 0) - t);
    return [{ selections, timeRemainingSeconds: left }, { selections, timeRemainingSeconds: 0 }];
  },
  'drag-and-drop': (d) => [{ placements: Object.fromEntries(d.targets.map((t) => [t.id, t.correctLabelId])) }],
  'strategy-management': (d) => {
    const sets = [{ pestId: d.correctPestId, tacticIds: d.bestTacticIds }];
    const others = d.tactics.filter((t) => !d.bestTacticIds.includes(t.id));
    for (const o of others.slice(0, 3)) sets.push({ pestId: d.correctPestId, tacticIds: [...d.bestTacticIds.slice(0, -1), o.id] });
    return sets;
  },
  inspection: (d) => {
    const perfect = {
      rounds: Object.fromEntries(
        d.rounds.map((r) => [
          r.id,
          {
            marks: r.findings.filter((f) => f.required !== false).map(centre),
            features: r.findings.flatMap((f) => (f.micrograph?.features ?? []).map((x) => ({ findingId: f.id, x: x.x, y: x.y }))),
            choiceId: r.correctChoiceId,
            hintsUsed: 0,
          },
        ]),
      ),
    };
    const hinted = structuredClone(perfect);
    hinted.rounds[d.rounds[0].id].hintsUsed = 1;
    return [perfect, hinted];
  },
};

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 20000 });
const host = new URL(process.env.MONGODB_URI.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname;
console.log(`Database: ${/mongodb\.net$/.test(host) ? 'MongoDB Atlas cluster' : 'not Atlas (local or other)'}, "${mongoose.connection.name}"`);

try {
  // ── The account ──
  const similar = await User.find({ $or: [{ firstName: /juan/i }, { lastName: /dela\s*cruz/i }] }).select('firstName lastName role email').lean();
  const matches = similar.filter((u) => u.role === 'student' && u.firstName === FIRST && u.lastName === LAST);
  console.log(`Accounts with a similar name: ${similar.map((u) => `${u.firstName} ${u.lastName} (${u.role})`).join(', ') || 'none'}`);
  if (matches.length !== 1) throw new Error(`Expected exactly one student named ${FIRST} ${LAST}, found ${matches.length}. Nothing was changed.`);
  const student = await User.findById(matches[0]._id);
  const sid = student._id;

  // ── The course, in order ──
  const modules = await Module.find().sort({ moduleNumber: 1 }).lean();
  const lessons = await Lesson.find().select('_id moduleId lessonNumber title').lean();
  const missions = await Mission.find().lean();
  const lessonOrder = (l) => modules.findIndex((m) => String(m._id) === String(l.moduleId)) * 1000 + l.lessonNumber;
  const orderedLessons = lessons.filter((l) => modules.some((m) => String(m._id) === String(l.moduleId))).sort((a, b) => lessonOrder(a) - lessonOrder(b));
  const orderedMissions = orderedLessons.flatMap((l) => missions.filter((m) => String(m.lessonId) === String(l._id)).sort((a, b) => a.levelNumber - b.levelNumber));
  const lessonOf = (m) => lessons.find((l) => String(l._id) === String(m.lessonId));
  const moduleOf = (m) => modules.find((x) => String(x._id) === String(lessonOf(m).moduleId));

  // ── What he has now ──
  const existing = await MissionAttempt.find({ studentId: sid }).lean();
  const progressBefore = await Progress.find({ studentId: sid }).lean();
  const passedBefore = new Set(existing.filter((a) => a.isPassed).map((a) => String(a.missionId)));
  const xpBefore = calculateTotalXP(existing);
  console.log(`\n${student.firstName} ${student.lastName}: ${existing.length} attempts, ${passedBefore.size}/${missions.length} missions passed, ${progressBefore.filter((p) => p.status === PROGRESS_STATUS.COMPLETED).length}/${lessons.length} lessons completed, ${xpBefore} XP (level ${calculateLevel(xpBefore).level}), badges: ${(student.earnedBadges ?? []).map((b) => b.code).join(', ') || 'none'}`);

  // ── New attempts for the missions not yet passed ──
  const todo = orderedMissions.filter((m) => !passedBefore.has(String(m._id)));
  const now = new Date();
  const dayStart = (offset) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    d.setHours(9, 0, 0, 0);
    return d;
  };
  const planned = [];
  const all = existing.map((a) => ({ ...a, missionId: String(a.missionId) }));
  todo.forEach((mission, i) => {
    const type = missionGameType(moduleOf(mission), mission);
    const d = mission.scenarioData;
    const limit = Number(d.timeLimitSeconds) || 0;
    // Play time: 35–55% of a countdown, otherwise 1–4 minutes.
    const time = limit ? Math.round(limit * (0.35 + pick(`${mission._id}t`, 21) / 100)) : 60 + pick(`${mission._id}t`, 180);
    const candidates = (answerSets[type]?.(d, time) ?? [])
      .map((answers) => ({ answers, ...scoreMission({ gameType: type, scenarioData: d, answers }) }))
      .filter((c) => c.isPassed && c.score >= 90);
    if (!candidates.length) throw new Error(`No passing answers could be built for ${moduleOf(mission).title} level ${mission.levelNumber} (${type}).`);
    const chosen = candidates[pick(String(mission._id), candidates.length)];
    // Course order over the last DAYS days, during the afternoon and evening; never in the future.
    const day = DAYS - 1 - Math.floor((i * DAYS) / todo.length);
    const at = new Date(dayStart(day).getTime() + (5 * 3600 + (i % 8) * 1500 + pick(`${mission._id}m`, 900)) * 1000);
    const attemptedAt = at > now ? new Date(now.getTime() - (todo.length - i) * 60000) : at;
    const previous = all.filter((a) => a.missionId === String(mission._id));
    const xpEarned = calculateXpAward({ maxXP: mission.maxXP, score: chosen.score, isPassed: true, previousAttempts: previous.map((a) => ({ score: a.score, isPassed: a.isPassed })) });
    const row = { studentId: sid, missionId: mission._id, score: chosen.score, xpEarned, timeSpentSeconds: time, isPassed: true, attemptedAt };
    planned.push({ row, mission, type });
    all.push({ ...row, missionId: String(mission._id) });
  });
  planned.sort((a, b) => a.row.attemptedAt - b.row.attemptedAt);

  // ── Badges, attempt by attempt, with the app's rules ──
  const missionsById = new Map(missions.map((m) => [String(m._id), m]));
  const clearedFrom = (passedIds) =>
    modules
      .filter((mod) => {
        const ms = missions.filter((m) => String(lessonOf(m)?.moduleId) === String(mod._id));
        return ms.length > 0 && ms.every((m) => passedIds.has(String(m._id)));
      })
      .map((mod) => mod.moduleNumber);
  const earned = new Set((student.earnedBadges ?? []).map((b) => b.code));
  const newBadges = [];
  const newlyCleared = [];
  const running = existing.map((a) => ({ missionId: String(a.missionId), score: a.score, isPassed: a.isPassed, timeSpentSeconds: a.timeSpentSeconds, attemptedAt: a.attemptedAt }));
  const passedNow = new Set(passedBefore);
  let clearedSoFar = new Set(clearedFrom(passedNow));
  for (const { row } of planned) {
    running.push({ missionId: String(row.missionId), score: row.score, isPassed: true, timeSpentSeconds: row.timeSpentSeconds, attemptedAt: row.attemptedAt });
    passedNow.add(String(row.missionId));
    const cleared = clearedFrom(passedNow);
    for (const n of cleared) if (!clearedSoFar.has(n)) newlyCleared.push({ moduleNumber: n, at: row.attemptedAt });
    clearedSoFar = new Set(cleared);
    const codes = evaluateNewBadges({ attempts: running, missionsById, clearedModuleNumbers: cleared, earnedCodes: [...earned], sectionRank: null, now: row.attemptedAt });
    for (const code of codes) {
      earned.add(code);
      newBadges.push({ code, earnedAt: row.attemptedAt });
    }
  }

  // ── The plan ──
  const xpAfter = xpBefore + planned.reduce((s, p) => s + p.row.xpEarned, 0);
  const progressTodo = orderedLessons.filter((l) => progressBefore.find((p) => String(p.lessonId) === String(l._id))?.status !== PROGRESS_STATUS.COMPLETED);
  console.log(`\nWould add ${planned.length} attempt(s) (all for ${student.firstName} ${student.lastName}):`);
  for (const { row, mission, type } of planned) {
    console.log(`  M${moduleOf(mission).moduleNumber} L${lessonOf(mission).lessonNumber} level ${mission.levelNumber} [${type}] "${mission.scenarioData.title}": ${row.score}% +${row.xpEarned} XP, ${row.timeSpentSeconds}s, ${row.attemptedAt.toISOString().slice(0, 16)}`);
  }
  console.log(`Would mark ${progressTodo.length} lesson(s) completed.`);
  console.log(`Modules newly cleared: ${newlyCleared.map((c) => c.moduleNumber).join(', ') || 'none'}`);
  console.log(`Badges earned along the way: ${newBadges.map((b) => b.code).join(', ') || 'none'} (Top Grower is checked after, from his section rank)`);
  console.log(`XP ${xpBefore} → ${xpAfter} (level ${calculateLevel(xpBefore).level} → ${calculateLevel(xpAfter).level}); streak after: ${calculateStreak(running, now)} day(s)`);

  if (!apply) {
    console.log('\nDry run: nothing was changed. Run with --apply to write it.');
  } else if (planned.length === 0 && progressTodo.length === 0 && newBadges.length === 0) {
    console.log('\nNothing to do: the course is already complete.');
  } else {
    // ── Backup ──
    const dir = path.resolve('backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `demo-student-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const userDoc = student.toObject();
    delete userDoc.passwordHash;
    delete userDoc.passwordReset;
    fs.writeFileSync(file, JSON.stringify({ user: userDoc, progress: progressBefore, missionAttempts: existing, notifications: await Notification.find({ userId: sid }).lean() }, null, 2));
    console.log(`\nBacked up his documents to ${file} (${fs.statSync(file).size} bytes; the password hash is not included)`);

    // ── Write ──
    if (planned.length) await MissionAttempt.insertMany(planned.map((p) => p.row));
    for (const l of orderedLessons) {
      await Progress.updateOne({ studentId: sid, lessonId: l._id }, { $set: { status: PROGRESS_STATUS.COMPLETED } }, { upsert: true });
    }
    // Section rank now that the attempts exist (Top Grower).
    const fresh = await User.findById(sid);
    const rank = await findSectionRank(fresh);
    const finalAttempts = await MissionAttempt.find({ studentId: sid }).lean();
    const late = evaluateNewBadges({
      attempts: finalAttempts.map((a) => ({ missionId: String(a.missionId), score: a.score, isPassed: a.isPassed, timeSpentSeconds: a.timeSpentSeconds, attemptedAt: a.attemptedAt })),
      missionsById,
      clearedModuleNumbers: clearedFrom(new Set(finalAttempts.filter((a) => a.isPassed).map((a) => String(a.missionId)))),
      earnedCodes: [...earned],
      sectionRank: rank,
      now,
    });
    for (const code of late) newBadges.push({ code, earnedAt: now });
    const toAdd = newBadges.filter((b) => !(fresh.earnedBadges ?? []).some((e) => e.code === b.code));
    if (toAdd.length) await User.updateOne({ _id: sid }, { $push: { earnedBadges: { $each: toAdd } } });

    // Notifications he would have received; those from earlier days are marked read.
    const today = dayStart(0);
    const note = (at, row) => ({ ...row, userId: sid, createdAt: at, updatedAt: at, isRead: at < today, readAt: at < today ? at : null });
    const notes = [
      ...planned.map(({ row, mission }) => note(row.attemptedAt, {
        type: NOTIFICATION_TYPES.MISSION_PASSED,
        title: `Mission passed: ${mission.scenarioData?.title || `${lessonOf(mission).title} · Level ${mission.levelNumber}`}`,
        body: `${moduleOf(mission).title} · scored ${row.score}%${row.xpEarned > 0 ? ` · +${row.xpEarned} XP` : ''}`,
        link: '/student/missions',
        meta: { missionId: String(mission._id), score: row.score, xpEarned: row.xpEarned },
      })),
      ...newlyCleared.map(({ moduleNumber, at }) => {
        const mod = modules.find((m) => m.moduleNumber === moduleNumber);
        return note(at, { type: NOTIFICATION_TYPES.MODULE_CLEARED, title: `Module ${moduleNumber} cleared`, body: `You have finished every mission in ${mod.title}.`, link: '/student/modules', meta: { moduleId: String(mod._id), moduleNumber } });
      }),
      ...toAdd.map(({ code, earnedAt }) => {
        const badge = BADGES_BY_CODE[code];
        return note(earnedAt, { type: NOTIFICATION_TYPES.BADGE_EARNED, title: `Badge earned: ${badge.name}`, body: badge.description, link: '/student/achievements', meta: { badgeCode: badge.code, icon: badge.icon } });
      }),
    ];
    if (notes.length) await Notification.collection.insertMany(notes);
    console.log(`Applied: ${planned.length} attempts, ${orderedLessons.length} lessons completed, badges added: ${toAdd.map((b) => b.code).join(', ') || 'none'}, ${notes.length} notifications. Section rank: ${rank ?? 'no section'}.`);
  }
} finally {
  await mongoose.disconnect();
}
