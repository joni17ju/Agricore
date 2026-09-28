import { useState } from 'react';
import Button from '../common/Button.jsx';
import { SelectInput, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import { ROLES } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listSectionOptions } from '../../services/sectionService.js';

/**
 * The create-account form on its own, with no page chrome around it.
 *
 * Instructor sign-ups need administrator approval, so a successful submit does
 * not always mean a session: `onSuccess` is called only when the account is
 * usable, and `onPendingApproval` when it is waiting to be approved.
 *
 * Switching to sign-in is the panel's job, so there is no secondary action
 * here — just the one primary button.
 *
 * @param {{ onSuccess: () => void, onPendingApproval: () => void }} props
 */

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', icon: 'sprout' },
  { value: ROLES.INSTRUCTOR, label: 'Instructor', icon: 'user-check' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  schoolId: '',
  sectionId: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterForm({ onSuccess, onPendingApproval }) {
  const { register } = useAuth();
  // Public endpoint: whoever is filling this in has no account yet.
  const sections = useAsync(listSectionOptions, []);
  const [role, setRole] = useState(ROLES.STUDENT);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const roleIndex = ROLE_OPTIONS.findIndex((option) => option.value === role);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await register({ ...form, role });
      if (result.requiresApproval) onPendingApproval();
      else onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div>
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

      <div className="login-row login-field">
        <TextInput label="First name" value={form.firstName} onChange={update('firstName')} placeholder="Juan" required />
        <TextInput label="Last name" value={form.lastName} onChange={update('lastName')} placeholder="Dela Cruz" required />
      </div>

      <div className="login-field">
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
        <div className="login-row login-field">
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
          {/* A failed load would otherwise be an empty dropdown with no explanation. */}
          <SelectInput
            label="Section"
            value={form.sectionId}
            onChange={update('sectionId')}
            placeholder={
              sections.isLoading
                ? 'Loading sections…'
                : sections.error
                  ? 'Sections unavailable'
                  : 'Select your section'
            }
            options={(sections.data ?? []).map((section) => ({ value: section._id, label: section.sectionName }))}
            error={sections.error ? 'Could not load sections. Check your connection and refresh.' : undefined}
            disabled={sections.isLoading || Boolean(sections.error)}
            required
          />
        </div>
      )}

      <div className="login-row login-field">
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

      <p className="register-hint">
        <Icon name="info" size={14} />
        {role === ROLES.STUDENT
          ? 'Use at least 8 characters. Student accounts are active right away.'
          : 'Use at least 8 characters. Instructor accounts need administrator approval.'}
      </p>

      <div className="login-actions login-actions--single">
        <Button type="submit" size="lg" isLoading={isSubmitting}>Create account</Button>
      </div>
    </form>
  );
}
