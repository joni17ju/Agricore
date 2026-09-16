/**
 * Performance analytics for instructors (Proposal Figs 24, 27) and the
 * administrator overview.
 */
import { BADGES_BY_CODE } from '../constants/badges.js';
import { ROLES, USER_STATUS } from '../constants/roles.js';
import { PERFORMANCE_STATUS } from '../constants/rules.js';
import {
  average,
  computeLessonMastery,
  computeModuleCompletionRates,
  computeStudentMetrics,
  determinePerformanceStatus,
  findBlindspots,
} from '../utils/analytics.js';
import { buildStudentCurriculum } from '../utils/curriculum.js';
import { isBlank } from '../utils/validation.js';
import { db, request } from './mockDb.js';
import {
  fullName,
  getCourse,
  getMissionContext,
  getSectionStudents,
  getStudentActivity,
  requireInstructorSection,
  requireUser,
} from './serviceContext.js';

const STATUS_SEVERITY = {
  [PERFORMANCE_STATUS.AT_RISK]: 0,
  [PERFORMANCE_STATUS.SUDDEN_DROP]: 1,
  [PERFORMANCE_STATUS.IN_PROGRESS]: 2,
  [PERFORMANCE_STATUS.ON_TRACK]: 3,
};

/** Metrics, statuses and course-level analytics for a group of students. */
function analyzeStudents(students, course, now = new Date()) {
  const studentData = students.map((student) => {
    const { attempts, progress } = getStudentActivity(student._id);
    const curriculum = buildStudentCurriculum({ ...course, attempts, progress });
    const metrics = computeStudentMetrics({ attempts, curriculum, missionsById: course.missionsById, now });
    return { student, attempts, curriculum, metrics };
  });

  // Status is relative to the student's own section average.
  const sectionAverages = new Map();
  for (const sectionId of new Set(students.map((s) => s.sectionId))) {
    const inSection = studentData.filter((row) => row.student.sectionId === sectionId);
    sectionAverages.set(sectionId, average(inSection.map((row) => row.metrics.progressPercent)) ?? 0);
  }

  const rows = studentData.map(({ student, metrics }) => ({
    student,
    section: db.findById('sections', student.sectionId),
    metrics,
    status: determinePerformanceStatus(metrics, sectionAverages.get(student.sectionId)),
  }));

  const allAttempts = studentData.flatMap((row) => row.attempts);
  const lessonMastery = computeLessonMastery({ lessons: course.lessons, missions: course.missions, attempts: allAttempts });
  const moduleCompletionRates = computeModuleCompletionRates(studentData.map((row) => row.curriculum));
  const withModule = (entry) => ({ ...entry, module: course.modulesById.get(entry.moduleId) });

  return {
    rows,
    summary: {
      totalStudents: rows.length,
      averageProgress: Math.round(average(rows.map((r) => r.metrics.progressPercent)) ?? 0),
      averageAssessmentScore: Math.round(average(rows.map((r) => r.metrics.overallWeightedScore)) ?? 0),
      averageModuleCompletion: Math.round(average(moduleCompletionRates.map((m) => m.completionRate)) ?? 0),
      atRiskCount: rows.filter((r) => r.status === PERFORMANCE_STATUS.AT_RISK).length,
      suddenDropCount: rows.filter((r) => r.status === PERFORMANCE_STATUS.SUDDEN_DROP).length,
    },
    moduleCompletionRates,
    lessonMastery: lessonMastery.map(withModule),
    blindspots: findBlindspots(lessonMastery).map(withModule),
  };
}

function instructorStudents(instructorId, sectionId) {
  const instructor = requireUser(instructorId, ROLES.INSTRUCTOR);
  if (sectionId) {
    requireInstructorSection(instructorId, sectionId);
    return { instructor, students: getSectionStudents(sectionId) };
  }
  return {
    instructor,
    students: instructor.assignedSectionIds.flatMap((id) => getSectionStudents(id)),
  };
}

const sortBySeverity = (rows) =>
  [...rows].sort(
    (a, b) =>
      STATUS_SEVERITY[a.status] - STATUS_SEVERITY[b.status] ||
      a.student.lastName.localeCompare(b.student.lastName),
  );

/**
 * Instructor dashboard overview.
 * @param {string} instructorId
 * @param {{ sectionId?: string }} options  omit sectionId for all assigned sections
 */
export function getInstructorDashboard(instructorId, { sectionId } = {}) {
  return request(() => {
    const { instructor, students } = instructorStudents(instructorId, sectionId);
    const analysis = analyzeStudents(students, getCourse());
    return {
      instructor,
      sections: instructor.assignedSectionIds.map((id) => db.findById('sections', id)).filter(Boolean),
      selectedSectionId: sectionId ?? null,
      ...analysis,
      rows: sortBySeverity(analysis.rows),
    };
  });
}

/**
 * Student Performance page: mastery heatmap and individual records.
 * @param {{ sectionId?: string, search?: string, status?: string }} filters
 */
export function getStudentPerformance(instructorId, { sectionId, search, status } = {}) {
  return request(() => {
    const { instructor, students } = instructorStudents(instructorId, sectionId);
    const analysis = analyzeStudents(students, getCourse());
    const term = search?.trim().toLowerCase();
    const rows = analysis.rows.filter(
      (row) =>
        (!status || row.status === status) &&
        (isBlank(term) ||
          fullName(row.student).toLowerCase().includes(term) ||
          (row.student.schoolId ?? '').toLowerCase().includes(term)),
    );
    return {
      sections: instructor.assignedSectionIds.map((id) => db.findById('sections', id)).filter(Boolean),
      summary: analysis.summary,
      lessonMastery: analysis.lessonMastery,
      rows: sortBySeverity(rows),
    };
  });
}

/** Full performance history of one student (instructor "view" action). */
export function getStudentPerformanceDetail(instructorId, studentId) {
  return request(() => {
    const student = requireUser(studentId, ROLES.STUDENT);
    requireInstructorSection(instructorId, student.sectionId);
    const course = getCourse();
    const sectionAnalysis = analyzeStudents(getSectionStudents(student.sectionId, { includeInactive: true }), course);
    const row = sectionAnalysis.rows.find((item) => item.student._id === studentId);
    const { attempts, progress } = getStudentActivity(studentId);
    const curriculum = buildStudentCurriculum({ ...course, attempts, progress });

    return {
      ...row,
      modules: curriculum.map((entry) => ({
        module: entry.module,
        state: entry.state,
        completedLessons: entry.completedLessons,
        totalLessons: entry.totalLessons,
        passedLevels: entry.passedLevels,
        totalLevels: entry.totalLevels,
      })),
      attempts: [...attempts]
        .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
        .map((attempt) => {
          const mission = course.missionsById.get(attempt.missionId);
          return { attempt, mission, ...(mission ? getMissionContext(mission, course) : {}) };
        }),
      badges: student.earnedBadges.map((badge) => ({ ...BADGES_BY_CODE[badge.code], earnedAt: badge.earnedAt })),
    };
  });
}

/** Administrator dashboard counts. */
export function getAdminOverview() {
  return request(() => {
    const users = db.all('users');
    const count = (predicate) => users.filter(predicate).length;
    const sections = db.all('sections');
    return {
      students: count((u) => u.role === ROLES.STUDENT),
      activeStudents: count((u) => u.role === ROLES.STUDENT && u.status === USER_STATUS.ACTIVE),
      instructors: count((u) => u.role === ROLES.INSTRUCTOR),
      pendingInstructors: users.filter((u) => u.role === ROLES.INSTRUCTOR && u.status === USER_STATUS.PENDING),
      administrators: count((u) => u.role === ROLES.ADMIN),
      inactiveUsers: count((u) => u.status === USER_STATUS.INACTIVE),
      sections: sections.length,
      sectionsWithoutInstructor: sections.filter((s) => !s.instructorId),
      studentsWithoutSection: count((u) => u.role === ROLES.STUDENT && !db.findById('sections', u.sectionId)),
      modules: db.all('modules').length,
      lessons: db.all('lessons').length,
      missions: db.all('missions').length,
    };
  });
}
