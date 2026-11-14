/**
 * Mission level management for instructors: the list of a lesson's levels,
 * and the visual mission editor for one of them.
 */
import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { createMission, deleteMission } from '../../services/missionService.js';
import { missionCode } from '../../utils/format.js';
import Button, { IconButton } from '../common/Button.jsx';
import { EmptyState } from '../common/Display.jsx';
import Icon from '../common/Icon.jsx';
import { ConfirmDialog } from '../common/Modal.jsx';
import { cloneData } from './missionEditor/draft.js';
import MissionEditor from './missionEditor/MissionEditor.jsx';

export function MissionManager({ lesson, module, missions, templateMission, moduleLevelCount, onChanged, onDirtyChange }) {
  const toast = useToast();
  // { source, isNew } while the editor is open.
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [duplicating, setDuplicating] = useState(null);

  /**
   * Copy a level to the end of this lesson. The server numbers it after the
   * last level, exactly as for a new one; the copy keeps every setting.
   */
  const duplicate = async (mission) => {
    setDuplicating(mission._id);
    try {
      const scenarioData = cloneData(mission.scenarioData);
      scenarioData.title = `${mission.scenarioData.title} (copy)`.slice(0, 160);
      const copy = await createMission({ lessonId: lesson._id, maxXP: mission.maxXP, scenarioData });
      toast.success(`Duplicated as level ${copy.levelNumber}.`);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDuplicating(null);
    }
  };
  const nextLevel = missions.reduce((top, m) => Math.max(top, m.levelNumber), 0) + 1;

  const confirmDelete = async () => {
    try {
      const result = await deleteMission(toDelete._id);
      toast.success(`Mission level deleted${result.removedAttempts ? ` with ${result.removedAttempts} attempt(s)` : ''}.`);
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
    setToDelete(null);
  };

  /** A new level starts as a copy of a level in this module, retitled. */
  const startNew = () => {
    const scenarioData = cloneData(templateMission.scenarioData);
    scenarioData.title = 'New level';
    setEditing({ isNew: true, source: { maxXP: templateMission.maxXP, scenarioData } });
  };

  if (editing) {
    return (
      <MissionEditor
        key={editing.isNew ? 'new' : editing.source._id}
        source={editing.source}
        isNew={editing.isNew}
        lesson={lesson}
        module={module}
        levelNumber={editing.isNew ? nextLevel : editing.source.levelNumber}
        totalLevels={Math.max(moduleLevelCount ?? 0, editing.isNew ? (moduleLevelCount ?? 0) + 1 : 0)}
        onDirtyChange={onDirtyChange}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="text-muted text-sm">
          Game type: <strong>{GAME_TYPE_INFO[module.gameType].label}</strong> (fixed for Module {module.moduleNumber}). Levels are numbered across the module.
        </p>
        <Button size="sm" icon="plus" onClick={startNew} disabled={!templateMission}>Add Level</Button>
      </div>

      {missions.length === 0 ? (
        <EmptyState icon="target" title="No mission levels" message="Add a level so students can practice this topic." />
      ) : (
        <ul className="manage-list">
          {missions.map((mission, index) => (
            <li key={mission._id} className="anim-fade-up" style={{ '--i': index }}>
              <span className="manage-list__icon"><Icon name="target" size={18} /></span>
              <div className="manage-list__text">
                <strong>{mission.scenarioData.title}</strong>
                <small>
                  {missionCode(module, mission)} · {mission.maxXP} XP
                  {mission.scenarioData.timeLimitSeconds ? ` · ${mission.scenarioData.timeLimitSeconds}s timer` : ''}
                </small>
              </div>
              <div className="cell-actions">
                <IconButton icon="edit" label={`Edit ${mission.scenarioData.title}`} size="sm" onClick={() => setEditing({ isNew: false, source: mission })} />
                <IconButton
                  icon="copy"
                  label={`Duplicate ${mission.scenarioData.title}`}
                  size="sm"
                  disabled={duplicating === mission._id}
                  onClick={() => duplicate(mission)}
                />
                <IconButton icon="trash" label={`Delete ${mission.scenarioData.title}`} size="sm" variant="danger" onClick={() => setToDelete(mission)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete mission level?"
        message="Students' attempts on this level will also be deleted. This cannot be undone."
        confirmLabel="Delete level"
      />
    </div>
  );
}
