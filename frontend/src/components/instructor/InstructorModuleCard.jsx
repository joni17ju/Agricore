import { Link } from 'react-router-dom';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import Icon from '../common/Icon.jsx';
import { ModuleCover, gameIcon } from '../student/CourseMap.jsx';

/**
 * Module card for the instructor's modules overview.
 * Reuses the student module card's shape, cover and styling (.module-card*),
 * swapping student progress for authoring counts and an edit affordance.
 */
export default function InstructorModuleCard({ module, lessonCount, missionCount, mediaCount, index }) {
  const info = GAME_TYPE_INFO[module.gameType];

  return (
    <Link
      to={`/instructor/modules/${module._id}`}
      className="module-card module-card--available anim-fade-up"
      style={{ '--i': index }}
      aria-label={`Edit Module ${module.moduleNumber}: ${module.title}`}
    >
      <div className="module-card__cover">
        <ModuleCover module={module} />
        <span className="module-card__number module-card__number--available">{module.moduleNumber}</span>
        {/* Visual affordance only — the whole card is the link target. */}
        <span className="module-card__edit" aria-hidden="true">
          <Icon name="edit" size={16} />
        </span>
      </div>

      <div className="module-card__content">
        <span className="module-card__eyebrow">
          <Icon name={gameIcon(module.gameType)} size={13} />
          Module {module.moduleNumber} · {info.label}
        </span>
        <h3>{module.title}</h3>
        <p className="module-card__desc">{info.shortDescription}</p>

        <div className="module-card__progress">
          <div className="module-card__meta">
            <span title="Lessons"><Icon name="file" size={14} /> {lessonCount} lessons</span>
            <span title="Mission levels"><Icon name="target" size={14} /> {missionCount}</span>
            <span title="Media assets"><Icon name="image" size={14} /> {mediaCount}</span>
            <Icon name="chevron-right" size={18} className="module-card__chevron" />
          </div>
        </div>
      </div>
    </Link>
  );
}
