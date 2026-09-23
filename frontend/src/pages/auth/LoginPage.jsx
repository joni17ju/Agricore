import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { Logo } from '../../components/common/Display.jsx';
import { TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import Modal from '../../components/common/Modal.jsx';
import { ROLE_HOME, ROLE_LABELS, ROLES } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { getDemoAccounts, requestPasswordReset } from '../../services/authService.js';

/**
 * Drop your own hero image here and it appears in the right panel:
 *   frontend/public/images/login-hero.jpg
 * Until then, the panel falls back to a soft green gradient.
 */
const HERO_IMAGE = '/images/login-hero.jpg';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', icon: 'sprout' },
  { value: ROLES.INSTRUCTOR, label: 'Instructor', icon: 'user-check' },
];

const DEMO_ICONS = { student: 'sprout', instructor: 'user-check', admin: 'shield' };

export default function LoginPage() {
  useDocumentTitle('Sign in');
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(ROLES.STUDENT);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [hasHeroImage, setHasHeroImage] = useState(true);
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

  const roleIndex = ROLE_OPTIONS.findIndex((option) => option.value === role);

  return (
    <div className="login-shell">
      <div className="login-card">
        {/* ── Form panel ── */}
        <div className="login-panel">
          <div className="login-panel__inner">
            <div className="login-brand anim-fade-up" style={{ '--i': 0 }}>
              <Logo />
            </div>

            <header className="login-heading anim-fade-up" style={{ '--i': 1 }}>
              <h1>Welcome Back!</h1>
              <p>Please log in to your AgriCore account.</p>
            </header>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {/* Role selection — same state and logic as before, shown as a segmented toggle. */}
              <div className="anim-fade-up" style={{ '--i': 2 }}>
                <span className="login-form__label">Sign in as</span>
                <div className="role-toggle" role="radiogroup" aria-label="Sign in as">
                  <span className="role-toggle__indicator" style={{ transform: `translateX(${roleIndex * 100}%)` }} aria-hidden="true" />
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={role === option.value}
                      className={`role-toggle__option ${role === option.value ? 'is-active' : ''}`}
                      onClick={() => setRole(option.value)}
                    >
                      <Icon name={option.icon} size={17} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="form-error" role="alert">
                  <Icon name="alert" size={16} /> {error}
                </div>
              )}

              <div className="login-field anim-fade-up" style={{ '--i': 3 }}>
                <TextInput
                  label={role === ROLES.STUDENT ? 'Email or school ID' : 'Email address'}
                  /* Not type="email": the browser would reject a school ID. */
                  type="text"
                  autoComplete="username"
                  placeholder={role === ROLES.STUDENT ? 'juan.delacruz@dorsu.edu.ph or 2023-0101' : 'c.reyes@dorsu.edu.ph'}
                  hint={role === ROLES.STUDENT ? 'Sign in with your email address or your school ID number.' : undefined}
                  value={form.identifier}
                  onChange={(event) => setForm({ ...form, identifier: event.target.value })}
                  required
                />
              </div>

              <div className="login-field anim-fade-up" style={{ '--i': 4 }}>
                <TextInput
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
              </div>

              <div className="login-form__row anim-fade-up" style={{ '--i': 5 }}>
                <button type="button" className="link-button" onClick={() => setResetOpen(true)}>Forgot password?</button>
              </div>

              <div className="login-actions anim-fade-up" style={{ '--i': 6 }}>
                <Button type="submit" size="lg" isLoading={isSubmitting}>Login</Button>
                <Button variant="secondary" size="lg" to="/register">Create account</Button>
              </div>
            </form>

            <section className="login-demo anim-fade-up" style={{ '--i': 7 }}>
              <div className="login-demo__title">
                <Icon name="sparkles" size={15} /> Prototype demo accounts
              </div>
              <p>No backend yet — pick an account to sign in instantly. Any password works on the form above.</p>
              <div className="login-demo__list">
                {(demoAccounts.data ?? []).map((account) => (
                  <button
                    key={account._id}
                    type="button"
                    className="login-demo__account"
                    title={`${ROLE_LABELS[account.role]} — ${account.firstName} ${account.lastName}`}
                    onClick={() => handleDemo(account._id)}
                  >
                    <Icon name={DEMO_ICONS[account.role]} size={17} />
                    <span>
                      <strong>{ROLE_LABELS[account.role]}</strong>
                      <small>{account.firstName} {account.lastName}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <p className="login-fineprint anim-fade-up" style={{ '--i': 8 }}>
              Prototype build for Principles of Crop Protection I · mock data only, no real authentication.
            </p>
          </div>
        </div>

        {/* ── Visual panel: your image + decorative overlays ── */}
        <div className={`login-visual ${hasHeroImage ? '' : 'has-fallback'}`} aria-hidden="true">
          {hasHeroImage && (
            <img className="login-visual__photo" src={HERO_IMAGE} alt="" onError={() => setHasHeroImage(false)} />
          )}
          <span className="login-visual__wash" />
          <svg className="login-visual__shapes" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
            <path className="shape shape--a" d="M40 90 Q150 20 250 80 Q170 170 40 90 Z" />
            <path className="shape shape--b" d="M300 420 Q400 360 392 470 Q330 540 300 420 Z" />
            <path className="shape shape--c" d="M-30 330 Q90 280 140 380 Q60 470 -30 330 Z" />
            <circle className="shape shape--d" cx="330" cy="150" r="58" />
            <path className="shape shape--e" d="M120 520 Q210 470 260 560 Q180 610 120 520 Z" />
          </svg>
          <span className="login-visual__glass login-visual__glass--one" />
          <span className="login-visual__glass login-visual__glass--two" />
        </div>

        {/* Floating accent — AgriCore sprout motif on the seam between panels */}
        <span className="login-seed" aria-hidden="true">
          <span className="login-seed__orb">
            <Icon name="sprout" size={24} />
          </span>
        </span>
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
