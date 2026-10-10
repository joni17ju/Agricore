/**
 * Seed `missionAttempts` collection — intentionally empty.
 *
 * Juan's attempts are generated during the seed by
 * backend/scripts/lib/studentCompletion.js, which scores them with the same
 * `xpForScore` the mission controller uses. Hand-written attempts would drift
 * from the scoring rules the moment those rules changed.
 */
const missionAttempts = [];

export default missionAttempts;
