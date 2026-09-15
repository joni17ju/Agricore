import { EmptyState } from '../components/common/Display.jsx';
import Button from '../components/common/Button.jsx';
import { ROLE_HOME } from '../constants/roles.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="auth-page">
      <EmptyState
        icon="map"
        title="Page not found"
        message="The page you are looking for does not exist or has moved."
        action={<Button to={user ? ROLE_HOME[user.role] : '/login'} icon="home">Go to {user ? 'dashboard' : 'sign in'}</Button>}
      />
    </div>
  );
}
