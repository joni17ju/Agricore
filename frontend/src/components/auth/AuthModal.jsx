import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';
import Modal from '../common/Modal.jsx';
import { ROLE_HOME } from '../../constants/roles.js';
import LoginForm from './LoginForm.jsx';
import PasswordResetFlow from './PasswordResetFlow.jsx';
import RegisterForm from './RegisterForm.jsx';

/**
 * Signing in and creating an account, as one dialog on the landing page.
 *
 * The views swap inside a single modal rather than opening a second dialog on
 * top of the first — stacked dialogs trap focus awkwardly and read as clutter.
 * That includes the password reset flow, which used to be its own modal.
 *
 * Modal supplies the close (X) button and Escape handling.
 *
 * @param {{ view: 'login'|'register'|null, onChangeView: (view) => void, onClose: () => void }} props
 */

export const AUTH_VIEWS = { LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot', PENDING: 'pending' };

const STATIC_TITLES = {
  [AUTH_VIEWS.LOGIN]: 'Welcome back',
  [AUTH_VIEWS.REGISTER]: 'Create your account',
  [AUTH_VIEWS.PENDING]: 'Registration received',
};

const DESCRIPTIONS = {
  [AUTH_VIEWS.LOGIN]: 'Sign in to your AgriCore account.',
  [AUTH_VIEWS.REGISTER]: 'Join AgriCore for Principles of Crop Protection I.',
};

export default function AuthModal({ view, onChangeView, onClose }) {
  const navigate = useNavigate();
  // The reset flow owns its own step titles and reports them up.
  const [resetTitle, setResetTitle] = useState(STATIC_TITLES[AUTH_VIEWS.LOGIN]);

  const isOpen = view !== null;

  const goHome = (user) => {
    onClose();
    navigate(ROLE_HOME[user.role], { replace: true });
  };

  /*
   * Stable identity: PasswordResetFlow reports its title from an effect keyed
   * on this callback, so a new function every render would loop.
   */
  const handleResetTitle = useCallback((title) => setResetTitle(title), []);

  // Always reopen on the sign-in step rather than wherever it was left.
  useEffect(() => {
    if (!isOpen) setResetTitle(STATIC_TITLES[AUTH_VIEWS.LOGIN]);
  }, [isOpen]);

  const title = view === AUTH_VIEWS.FORGOT ? resetTitle : STATIC_TITLES[view] ?? '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={DESCRIPTIONS[view]}
      size={view === AUTH_VIEWS.REGISTER ? 'lg' : 'md'}
    >
      {view === AUTH_VIEWS.LOGIN && (
        <LoginForm
          onSuccess={goHome}
          onForgotPassword={() => onChangeView(AUTH_VIEWS.FORGOT)}
          onRegister={() => onChangeView(AUTH_VIEWS.REGISTER)}
        />
      )}

      {view === AUTH_VIEWS.REGISTER && (
        <RegisterForm
          // A student account is active immediately, so registering signs them in.
          onSuccess={() => {
            onClose();
            navigate(ROLE_HOME.student, { replace: true });
          }}
          onPendingApproval={() => onChangeView(AUTH_VIEWS.PENDING)}
          onSignIn={() => onChangeView(AUTH_VIEWS.LOGIN)}
        />
      )}

      {view === AUTH_VIEWS.FORGOT && (
        <PasswordResetFlow
          onTitleChange={handleResetTitle}
          onCancel={onClose}
          onSignIn={() => onChangeView(AUTH_VIEWS.LOGIN)}
        />
      )}

      {view === AUTH_VIEWS.PENDING && (
        <div className="auth-view auth-pending">
          <span className="auth-pending__icon">
            <Icon name="user-check" size={28} />
          </span>
          <p>
            Instructor accounts are reviewed by the administrator. You can sign in as soon as your account is
            approved.
          </p>
          <div className="auth-view__actions">
            <Button onClick={() => onChangeView(AUTH_VIEWS.LOGIN)}>Back to sign in</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
