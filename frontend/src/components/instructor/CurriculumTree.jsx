import { useState } from 'react';
import Icon from '../common/Icon.jsx';

/**
 * Curriculum Navigation tree (Proposal Fig 25): Modules → Module → Lesson → media.
 * @param {{ type: 'module' | 'lesson', id: string }} selected
 */
export default function CurriculumTree({ structure, selected, onSelect }) {
  const [expanded, setExpanded] = useState(() => new Set(['root', structure[0]?.module._id]));

  const toggle = (id) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav className="tree" aria-label="Curriculum navigation">
      <button type="button" className="tree__row tree__row--root" onClick={() => toggle('root')} aria-expanded={expanded.has('root')}>
        <Icon name={expanded.has('root') ? 'chevron-down' : 'chevron-right'} size={14} />
        <Icon name="folder" size={16} />
        Modules
      </button>
      {expanded.has('root') && (
        <ul className="tree__list">
          {structure.map(({ module, lessons }) => {
            const isOpen = expanded.has(module._id);
            const isSelected = selected?.type === 'module' && selected.id === module._id;
            return (
              <li key={module._id}>
                <div className={`tree__row ${isSelected ? 'is-selected' : ''}`}>
                  <button type="button" className="tree__toggle" onClick={() => toggle(module._id)} aria-label={isOpen ? 'Collapse' : 'Expand'} aria-expanded={isOpen}>
                    <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={14} />
                  </button>
                  <button type="button" className="tree__label" onClick={() => { onSelect({ type: 'module', id: module._id }); if (!isOpen) toggle(module._id); }}>
                    <Icon name="folder" size={16} />
                    Module {module.moduleNumber}
                  </button>
                </div>
                {isOpen && (
                  <ul className="tree__list">
                    {lessons.map(({ lesson, missions }) => {
                      const lessonSelected = selected?.type === 'lesson' && selected.id === lesson._id;
                      return (
                        <li key={lesson._id}>
                          <button type="button" className={`tree__row tree__row--lesson ${lessonSelected ? 'is-selected' : ''}`} onClick={() => onSelect({ type: 'lesson', id: lesson._id })}>
                            <Icon name="file" size={15} />
                            <span className="tree__text">Lesson {module.moduleNumber}.{lesson.lessonNumber} {lesson.title}</span>
                            {lessonSelected && <Icon name="edit" size={13} className="tree__edit" />}
                          </button>
                          {lessonSelected && (
                            <ul className="tree__list tree__list--meta">
                              <li><Icon name="image" size={13} /> {lesson.mediaAssets.length} media</li>
                              <li><Icon name="target" size={13} /> {missions.length} mission level{missions.length === 1 ? '' : 's'}</li>
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
