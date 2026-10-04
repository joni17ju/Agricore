/**
 * Two account types. The administrator role was removed once the programme
 * head took those duties over as an instructor; everything the administrator
 * could do is now an instructor action.
 */
export const ROLES = Object.freeze({
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.STUDENT]: 'Student',
  [ROLES.INSTRUCTOR]: 'Instructor',
});

/** Where each role lands after signing in. */
export const ROLE_HOME = Object.freeze({
  [ROLES.STUDENT]: '/student',
  [ROLES.INSTRUCTOR]: '/instructor',
});

export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  PENDING: 'pending',
  INACTIVE: 'inactive',
});

export const USER_STATUS_LABELS = Object.freeze({
  [USER_STATUS.ACTIVE]: 'Active',
  [USER_STATUS.PENDING]: 'Pending',
  [USER_STATUS.INACTIVE]: 'Inactive',
});
