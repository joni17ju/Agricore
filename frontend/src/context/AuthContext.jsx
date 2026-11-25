import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import { SESSION_EXPIRED_EVENT } from '../services/apiClient.js';
import { invalidateCourse } from '../services/serviceContext.js';

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
        setUser(current);
        setIsReady(true);
      })
      .catch((error) => setStartupError(error));
  }, []);

  useEffect(() => {
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
      invalidateCourse();
      startTransition(() => setUser(null));
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (credentials) => {
    const signedIn = await authService.login(credentials);
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
    invalidateCourse();
    startTransition(() => setUser(null));
  }, []);

  const refreshUser = useCallback(async () => {
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
