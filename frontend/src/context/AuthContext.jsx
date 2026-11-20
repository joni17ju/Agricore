import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import { invalidateCourse } from '../services/serviceContext.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then(setUser)
      .finally(() => setIsReady(true));
  }, []);

  const login = useCallback(async (credentials) => {
    const signedIn = await authService.login(credentials);
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
    () => ({ user, isReady, login, register, logout, refreshUser }),
    [user, isReady, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
