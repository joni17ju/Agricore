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
 * Students self-register and land as pending, so a successful submit never
 * means a session: `onPendingApproval` is called and the panel shows the
 * waiting-for-approval view. `onSuccess` remains for any future account type
 * that is usable immediately.
 *
 * Switching to sign-in is the panel's job, so there is no secondary action
 * here — just the one primary button.
 *
 * @param {{ onSuccess: () => void, onPendingApproval: () => void }} props
 */

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
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await register({ ...form, role: ROLES.STUDENT });
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
        Use at least 8 characters. Your instructor approves new accounts before you can sign in.
      </p>

      <div className="login-actions login-actions--single">
        <Button type="submit" size="lg" isLoading={isSubmitting}>Create account</Button>
      </div>
    </form>
  );
}
