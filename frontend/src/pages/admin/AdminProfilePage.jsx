import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import ProfileDetailsCard from '../ProfileDetailsCard.jsx';

/** Administrator account page: profile picture and account details. */
export default function AdminProfilePage() {
  useDocumentTitle('Profile');
  return (
    <div className="page">
      <ProfileDetailsCard />
    </div>
  );
}
