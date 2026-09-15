import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/tokens.css';
import './styles/base.css';
import './styles/animations.css';
import './components/common/common.css';
import './components/layout/layout.css';
import './components/illustrations/illustrations.css';
import './components/student/student.css';
import './components/leaderboard/leaderboard.css';
import './components/missions/missions.css';
import './components/instructor/instructor.css';
import './components/admin/admin.css';

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
