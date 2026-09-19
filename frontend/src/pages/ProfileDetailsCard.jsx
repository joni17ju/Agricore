import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../constants/roles.js';
import AvatarUploader from '../components/common/AvatarUploader.jsx';
import Card from '../components/common/Card.jsx';
import Icon from '../components/common/Icon.jsx';

/**
 * Account card shared by the instructor and admin profile pages: the avatar
 * uploader plus the read-only details we already hold for the signed-in user.
 * Students have their own richer profile page with XP, badges and progress.
 */
export default function ProfileDetailsCard({ extra = null }) {
  const { user } = useAuth();
  return (
    <Card className="anim-fade-up">
      <div className="profile-hero">
        <AvatarUploader size={80} />
        <div className="profile-hero__info">
          <h1>{user.firstName} {user.lastName}</h1>
          <div className="profile-meta">
            <span><Icon name="shield" size={15} /> {ROLE_LABELS[user.role]}</span>
            <span><Icon name="mail" size={15} /> {user.email}</span>
            {user.schoolId && <span><Icon name="id" size={15} /> {user.schoolId}</span>}
            {extra}
          </div>
        </div>
      </div>
    </Card>
  );
}
