import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import { SESSION_EXPIRED_EVENT, getToken } from '../services/apiClient.js';
import { prefetchDashboard } from '../services/progressService.js';
import { clearSessionCaches, invalidateUser, setCourseAudience } from '../services/serviceContext.js';
import { preloadHome } from '../routes/preload.js';

/** Role and id from the stored token, without verifying it (the server does that). */
function readTokenClaims() {
  try {
    const payload = JSON.parse(atob(getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

/**
 * Warm everything the user's home page needs: its code and, for a student,
 * the dashboard data (which also brings the course outline for Modules).
 */
function warmHome({ id, role }) {
  setCourseAudience(role);
  preloadHome(role);
  if (role === 'student') prefetchDashboard(id);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  /*
   * Set when the session could not be checked at start-up because the server
   * did not answer (asleep, offline). The token is kept, so "Try again" can
   * pick up where the student was instead of treating them as signed out.
   */
  const [startupError, setStartupError] = useState(null);
  // Shown on the sign-in page after a session expired mid-use.
  const [sessionNotice, setSessionNotice] = useState(null);

  const checkSession = useCallback(() => {
    setStartupError(null);
    setIsReady(false);
    authService
      .getCurrentUser()
      .then((current) => {
        if (current) setCourseAudience(current.role);
        setUser(current);
        setIsReady(true);
      })
      .catch((error) => setStartupError(error));
  }, []);

  useEffect(() => {
    /*
     * With a saved session, start loading the home page and its data at the
     * same time as the session check, instead of one after the other. If the
     * session turns out to be invalid, the requests simply fail and nothing
     * is shown from them.
     */
    const claims = readTokenClaims();
    if (claims?.id) warmHome(claims);
    checkSession();
  }, [checkSession]);

  /*
   * A request answered "session expired" (apiClient raises the event). Without
   * this the app kept showing a signed-in screen whose every request failed.
   * Now the student is sent to sign in with a clear message, and the route
   * guard remembers where they were so signing in brings them straight back.
   */
  useEffect(() => {
    const onExpired = () => {
      setSessionNotice('Your session has expired. Sign in again to continue where you left off.');
      clearSessionCaches();
      startTransition(() => setUser(null));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    clearSessionCaches();
    const signedIn = await authService.login(credentials);
    warmHome({ id: signedIn._id, role: signedIn.role });
    setSessionNotice(null);
    setUser(signedIn);
    return signedIn;
  }, []);

  const register = useCallback(async (details) => {
    const result = await authService.register(details);
    if (!result.requiresApproval) setUser(result.user);
    return result;
  }, []);

  /*
   * The token is gone the moment this is called. Clearing `user` is a
   * transition so it lands in the same render as a navigation made in the
   * same handler — React Router applies location changes as transitions, and
   * a plain update here would render first, letting a guarded page see "signed
   * out" while still mounted and redirect to /login. Clearing `user` also stops
   * the notification poll and resets its count (NotificationProvider watches it).
   */
  const logout = useCallback(() => {
    authService.logout();
    setSessionNotice(null);
    // Nothing fetched under the old session is reused by the next one.
    clearSessionCaches();
    startTransition(() => setUser(null));
  }, []);

  const refreshUser = useCallback(async () => {
    invalidateUser();
    const current = await authService.getCurrentUser();
    setUser(current);
    return current;
  }, []);

  const value = useMemo(
    () => ({ user, isReady, startupError, retryStartup: checkSession, sessionNotice, login, register, logout, refreshUser }),
    [user, isReady, startupError, checkSession, sessionNotice, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
