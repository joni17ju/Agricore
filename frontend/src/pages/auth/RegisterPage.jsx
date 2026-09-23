import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { Logo } from '../../components/common/Display.jsx';
import { SelectInput, TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ROLES } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listSections } from '../../services/sectionService.js';

/**
 * Right-panel image. Drop your own file at either path:
 *   frontend/public/images/register-hero.jpg  (preferred)
 *   frontend/public/images/login-hero.jpg     (used if the first is missing)
 * With neither present the panel falls back to a green gradient.
 */
const HERO_IMAGES = ['/images/register-hero.jpg', '/images/login-hero.jpg'];

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', icon: 'sprout' },
  { value: ROLES.INSTRUCTOR, label: 'Instructor', icon: 'user-check' },
];

const EMPTY_FORM = { firstName: '', lastName: '', email: '', schoolId: '', sectionId: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const sections = useAsync(listSections, []);
  const [role, setRole] = useState(ROLES.STUDENT);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const roleIndex = ROLE_OPTIONS.findIndex((option) => option.value === role);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await register({ ...form, role });
      if (result.requiresApproval) setPendingApproval(true);
      else navigate('/student', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        {/* ── Form panel ── */}
        <div className="login-panel">
          <div className="login-panel__inner">
            <div className="login-brand anim-fade-up" style={{ '--i': 0 }}>
              <Logo />
            </div>

            {pendingApproval ? (
              <div className="register-pending anim-scale-in">
                <span className="register-pending__icon">
                  <Icon name="user-check" size={30} />
                </span>
                <h1>Registration received</h1>
                <p>
                  Instructor accounts are reviewed by the administrator. You can sign in as soon as your account is
                  approved.
                </p>
                <Button size="lg" icon="arrow-left" to="/login">Back to sign in</Button>
              </div>
            ) : (
              <>
                <header className="login-heading anim-fade-up" style={{ '--i': 1 }}>
                  <h1>Create your account</h1>
                  <p>Join AgriCore for Principles of Crop Protection I.</p>
                </header>

                <form className="login-form" onSubmit={handleSubmit} noValidate>
                  {/* Role selection — same state and logic, shown as a segmented toggle. */}
                  <div className="anim-fade-up" style={{ '--i': 2 }}>
                    <span className="login-form__label">Register as</span>
                    <div className="role-toggle" role="radiogroup" aria-label="Register as">
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

                  <div className="login-row login-field anim-fade-up" style={{ '--i': 3 }}>
                    <TextInput label="First name" value={form.firstName} onChange={update('firstName')} placeholder="Juan" required />
                    <TextInput label="Last name" value={form.lastName} onChange={update('lastName')} placeholder="Dela Cruz" required />
                  </div>

                  <div className="login-field anim-fade-up" style={{ '--i': 4 }}>
                    <TextInput
                      label="Email address"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder="you@dorsu.edu.ph"
                      required
                    />
                  </div>

                  {/* Students identify themselves by school ID; instructors are issued one
                      by the institution, so it is not collected at sign-up. */}
                  {role === ROLES.STUDENT && (
                    <div className="login-row login-field anim-fade-up" style={{ '--i': 5 }}>
                      <TextInput
                        label="School ID number"
                        value={form.schoolId}
                        onChange={update('schoolId')}
                        placeholder="2023-0795"
                        hint="Format: YYYY-NNNN"
                        inputMode="numeric"
                        maxLength={9}
                        required
                      />
                      <SelectInput
                        label="Section | Batch"
                        value={form.sectionId}
                        onChange={update('sectionId')}
                        placeholder="Select your section"
                        options={(sections.data ?? []).map((section) => ({ value: section._id, label: section.sectionName }))}
                        required
                      />
                    </div>
                  )}

                  <div className="login-row login-field anim-fade-up" style={{ '--i': 6 }}>
                    <TextInput
                      label="Password"
                      type="password"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={update('password')}
                      placeholder="••••••••"
                      required
                    />
                    <TextInput
                      label="Confirm password"
                      type="password"
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <p className="register-hint anim-fade-up" style={{ '--i': 7 }}>
                    <Icon name="info" size={14} />
                    {role === ROLES.STUDENT
                      ? 'Use at least 8 characters. Student accounts are active right away.'
                      : 'Use at least 8 characters. Instructor accounts need administrator approval.'}
                  </p>

                  <div className="login-actions login-actions--single anim-fade-up" style={{ '--i': 8 }}>
                    <Button type="submit" size="lg" isLoading={isSubmitting}>Create account</Button>
                  </div>
                </form>

                <p className="login-fineprint anim-fade-up" style={{ '--i': 9 }}>
                  Already have an account? <Link to="/login">Sign in</Link> · Prototype build, mock data only.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Visual panel: your image + decorative overlays ── */}
        <div className={`login-visual ${heroIndex < HERO_IMAGES.length ? '' : 'has-fallback'}`} aria-hidden="true">
          {heroIndex < HERO_IMAGES.length && (
            <img
              className="login-visual__photo"
              src={HERO_IMAGES[heroIndex]}
              alt=""
              onError={() => setHeroIndex((index) => index + 1)}
            />
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
    </div>
  );
}
