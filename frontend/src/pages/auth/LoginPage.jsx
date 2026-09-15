import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { Logo } from '../../components/common/Display.jsx';
import { ChoiceCards, TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import Modal from '../../components/common/Modal.jsx';
import { ROLE_HOME, ROLE_LABELS, ROLES } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getDemoAccounts, requestPasswordReset } from '../../services/authService.js';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', description: 'Access learning modules & missions', icon: 'sprout' },
  { value: ROLES.INSTRUCTOR, label: 'Instructor', description: 'Manage courses & monitor students', icon: 'user-check' },
];

const DEMO_ICONS = { student: 'sprout', instructor: 'user-check', admin: 'shield' };

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(ROLES.STUDENT);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const demoAccounts = useAsync(getDemoAccounts, []);

  const goHome = (user) => navigate(ROLE_HOME[user.role], { replace: true });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      goHome(await login({ ...form, role }));
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleDemo = async (userId) => {
    setError('');
    try {
      goHome(await loginAsDemo(userId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="auth-card">
          <div className="auth-card__header">
            <Logo light />
            <p>Principles of Crop Protection I</p>
          </div>
          <form className="auth-card__body" onSubmit={handleSubmit} noValidate>
            <span className="auth-section-label">Sign in as</span>
            <ChoiceCards name="Sign in as" options={ROLE_OPTIONS} value={role} onChange={setRole} />
            {error && (
              <div className="form-error" role="alert">
                <Icon name="alert" size={16} /> {error}
              </div>
            )}
            <TextInput
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder={role === ROLES.STUDENT ? 'juan.delacruz@dorsu.edu.ph' : 'c.reyes@dorsu.edu.ph'}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
            <TextInput
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
            <div className="auth-link-row">
              <button type="button" className="link-button" onClick={() => setResetOpen(true)}>Forgot password?</button>
            </div>
            <Button type="submit" size="lg" block isLoading={isSubmitting}>Sign in to AgriCore</Button>
            <p className="auth-card__footer">
              Don&apos;t have an account? <Link to="/register">Create one</Link>
            </p>
          </form>
        </div>

        <div className="demo-accounts">
          <div className="demo-accounts__title">
            <Icon name="sparkles" size={16} /> Prototype demo accounts
          </div>
          <p className="text-muted text-sm">No backend yet — pick an account to sign in instantly. Any password works on the form above.</p>
          <div className="demo-accounts__list">
            {(demoAccounts.data ?? []).map((account) => (
              <button key={account._id} type="button" className="demo-account" onClick={() => handleDemo(account._id)}>
                <Icon name={DEMO_ICONS[account.role]} size={18} />
                <div>
                  <strong>{ROLE_LABELS[account.role]}</strong>
                  <br />
                  <span>{account.firstName} {account.lastName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}

function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    }
  };

  const close = () => {
    setMessage('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Reset password"
      size="sm"
      footer={
        message ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={submit}>Send reset link</Button>
          </>
        )
      }
    >
      {message ? (
        <p className="text-muted">{message}</p>
      ) : (
        <TextInput label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
      )}
    </Modal>
  );
}
