import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../constants/roles.js';
import AccountDetails from '../components/common/AccountDetails.jsx';
import AvatarUploader from '../components/common/AvatarUploader.jsx';
import Card from '../components/common/Card.jsx';
import SecurityCard from '../components/common/SecurityCard.jsx';

/**
 * Account page shared by the instructor and admin profiles: the avatar
 * uploader, the account fields as a labelled grid, and the security section.
 * Students have their own richer profile page with XP, badges and progress.
 *
 * @param {{ extraFields?: { label: string, value: React.ReactNode, icon?: string }[] }} props
 */
export default function ProfileDetailsCard({ extraFields = [] }) {
  const { user } = useAuth();

  return (
    <>
      <Card className="anim-fade-up">
        <div className="profile-hero">
          <AvatarUploader size={80} />
          <div className="profile-hero__info">
            <h1>{user.firstName} {user.lastName}</h1>
            <span className="profile-hero__role">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>

        <h2 className="section-heading">Account information</h2>
        <AccountDetails
          fields={[
            { label: 'Full name', value: `${user.firstName} ${user.lastName}`, icon: 'user' },
            { label: 'Email address', value: user.email, icon: 'mail' },
            { label: 'ID number', value: user.schoolId, icon: 'id' },
            { label: 'Role', value: ROLE_LABELS[user.role], icon: 'shield' },
            ...extraFields,
          ]}
        />
      </Card>

      <SecurityCard />
    </>
  );
}
