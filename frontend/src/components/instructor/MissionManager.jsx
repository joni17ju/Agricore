/**
 * Mission level management for instructors.
 * Common fields are edited with a form; the game-specific content of a level
 * (spots, targets, tactics, …) is edited as structured JSON.
 */
import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { GAME_TYPE_INFO } from '../../constants/gameTypes.js';
import { createMission, deleteMission, updateMission } from '../../services/missionService.js';
import { missionCode } from '../../utils/format.js';
import Button, { IconButton } from '../common/Button.jsx';
import { EmptyState } from '../common/Display.jsx';
import { TextArea, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import Modal, { ConfirmDialog } from '../common/Modal.jsx';

const COMMON_KEYS = ['title', 'instructions', 'timeLimitSeconds'];

function splitScenario(scenarioData) {
  const content = Object.fromEntries(Object.entries(scenarioData).filter(([key]) => !COMMON_KEYS.includes(key)));
  return JSON.stringify(content, null, 2);
}

export function MissionManager({ lesson, module, missions, templateMission, onChanged }) {
  const toast = useToast();
  const [editing, setEditing] = useState(null); // mission or { isNew: true }
  const [toDelete, setToDelete] = useState(null);

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

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="text-muted text-sm">
          Game type: <strong>{GAME_TYPE_INFO[module.gameType].label}</strong> (fixed for Module {module.moduleNumber}). Levels are numbered across the module.
        </p>
        <Button size="sm" icon="plus" onClick={() => setEditing({ isNew: true })} disabled={!templateMission}>Add Level</Button>
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
                <IconButton icon="edit" label="Edit mission" size="sm" onClick={() => setEditing(mission)} />
                <IconButton icon="trash" label="Delete mission" size="sm" variant="danger" onClick={() => setToDelete(mission)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <MissionEditorModal
        mission={editing}
        lesson={lesson}
        templateMission={templateMission}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
      />
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

function MissionEditorModal({ mission, lesson, templateMission, onClose, onSaved }) {
  const toast = useToast();
  const isNew = mission?.isNew;
  const source = isNew ? templateMission : mission;
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!mission || !source) return;
    setError('');
    setForm({
      title: isNew ? 'New level' : source.scenarioData.title,
      instructions: source.scenarioData.instructions ?? '',
      maxXP: String(source.maxXP),
      timeLimitSeconds: source.scenarioData.timeLimitSeconds ? String(source.scenarioData.timeLimitSeconds) : '',
      content: splitScenario(source.scenarioData),
    });
  }, [mission, source, isNew]);

  const save = async () => {
    setError('');
    let content;
    try {
      content = JSON.parse(form.content);
    } catch {
      setError('Game content is not valid JSON. Check brackets, commas and quotes.');
      return;
    }
    const scenarioData = {
      title: form.title,
      instructions: form.instructions,
      ...(form.timeLimitSeconds && { timeLimitSeconds: Number(form.timeLimitSeconds) }),
      ...content,
    };
    setIsSaving(true);
    try {
      if (isNew) await createMission({ lessonId: lesson._id, maxXP: form.maxXP, scenarioData });
      else await updateMission(mission._id, { maxXP: form.maxXP, scenarioData });
      toast.success(isNew ? 'Mission level added.' : 'Mission level saved.');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  return (
    <Modal
      isOpen={Boolean(mission)}
      onClose={onClose}
      title={isNew ? 'Add mission level' : 'Edit mission level'}
      description={isNew ? 'The new level starts as a copy of an existing level in this module.' : undefined}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="save" onClick={save} isLoading={isSaving}>Save level</Button>
        </>
      }
    >
      {form && (
        <div className="stack">
          {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
          <div className="form-grid">
            <div className="span-2"><TextInput label="Mission title" value={form.title} onChange={update('title')} required /></div>
            <div className="span-2"><TextArea label="Instructions" value={form.instructions} onChange={update('instructions')} rows={2} /></div>
            <TextInput label="Max XP" type="number" min="1" value={form.maxXP} onChange={update('maxXP')} required />
            <TextInput label="Countdown (seconds)" type="number" min="0" value={form.timeLimitSeconds} onChange={update('timeLimitSeconds')} hint="Leave empty for no timer" />
            <div className="span-2">
              <TextArea
                label="Game content (JSON)"
                value={form.content}
                onChange={update('content')}
                className="code-input"
                rows={14}
                hint="Scenario data specific to this game type: choices, symptom spots, columns, targets or tactics."
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

