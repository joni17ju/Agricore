import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button.jsx';
import { EmptyState, Logo } from '../../components/common/Display.jsx';
import { ChoiceCards, SelectInput, TextInput } from '../../components/common/Form.jsx';
import Icon from '../../components/common/Icon.jsx';
import { ROLES } from '../../constants/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { listSections } from '../../services/sectionService.js';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student', description: 'Enroll and learn', icon: 'sprout' },
  { value: ROLES.INSTRUCTOR, label: 'Instructor', description: 'Teach and manage', icon: 'user-check' },
];

const EMPTY_FORM = { firstName: '', lastName: '', email: '', sectionId: '', password: '', confirmPassword: '' };

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

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <Logo light />
          <p>Create your account</p>
        </div>

        {pendingApproval ? (
          <div className="auth-card__body">
            <EmptyState
              icon="user-check"
              title="Registration received"
              message="Instructor accounts are reviewed by the administrator. You can sign in once your account is approved."
              action={<Button to="/login" icon="arrow-left">Back to sign in</Button>}
            />
          </div>
        ) : (
          <form className="auth-card__body" onSubmit={handleSubmit} noValidate>
            <span className="auth-section-label">Register as</span>
            <ChoiceCards name="Register as" options={ROLE_OPTIONS} value={role} onChange={setRole} />
            {error && (
              <div className="form-error" role="alert">
                <Icon name="alert" size={16} /> {error}
              </div>
            )}
            <div className="form-grid">
              <TextInput label="First name" value={form.firstName} onChange={update('firstName')} placeholder="Juan" required />
              <TextInput label="Last name" value={form.lastName} onChange={update('lastName')} placeholder="Dela Cruz" required />
              <div className="span-2">
                <TextInput label="Email address" type="email" value={form.email} onChange={update('email')} placeholder="you@dorsu.edu.ph" required />
              </div>
              {role === ROLES.STUDENT && (
                <div className="span-2">
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
              <TextInput label="Password" type="password" value={form.password} onChange={update('password')} hint="At least 8 characters" required />
              <TextInput label="Confirm password" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
            </div>
            <Button type="submit" size="lg" block isLoading={isSubmitting}>Create account</Button>
            <p className="auth-card__footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
