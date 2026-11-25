import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/animations.css';
import './components/common/common.css';
import './components/common/lesson/lesson.css';
import './components/common/lesson/lesson-layout.css';
import './components/layout/layout.css';
import './components/illustrations/illustrations.css';
import './components/student/student.css';
import './components/leaderboard/leaderboard.css';
import './components/missions/missions.css';
import './components/missions/mission-phone.css';
import './components/instructor/instructor.css';
import './pages/landing.css';
// Touch and phone sizes, last so they win over component styles.
import './styles/touch.css';

import App from './App.jsx';
import { warmUpServer } from './services/apiClient.js';

// The API host sleeps when idle; start waking it while the first page renders.
warmUpServer();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
