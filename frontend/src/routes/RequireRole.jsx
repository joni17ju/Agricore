import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/common/Display.jsx';
import { ROLE_HOME } from '../constants/roles.js';
import { useAuth } from '../context/AuthContext.jsx';

/** Only lets the signed-in user through when their role matches. */
export default function RequireRole({ role }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) return <LoadingState label="Loading AgriCore…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}

/** Sends signed-in users away from the login/register pages. */
export function RedirectIfSignedIn() {
  const { user, isReady } = useAuth();
  if (!isReady) return <LoadingState label="Loading AgriCore…" />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}
