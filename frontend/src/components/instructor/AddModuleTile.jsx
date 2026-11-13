import { useEffect, useRef, useState } from 'react';
import { GAME_TYPE_INFO, GAME_TYPES } from '../../constants/gameTypes.js';
import { createModule } from '../../services/moduleService.js';
import Button from '../common/Button.jsx';
import { SelectInput, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import Modal from '../common/Modal.jsx';

/**
 * The "+" slot at the end of the module grid, and the dialog it opens.
 *
 * It is one component because the tile has no other job: the grid needs a
 * cell that looks like a card, and the only thing it does is open this form.
 */
export default function AddModuleTile({ nextNumber, onCreated }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="module-card module-card--add"
        onClick={() => setIsOpen(true)}
        aria-label="Add module"
        title="Add module"
      >
        <span className="module-card--add__plus" aria-hidden="true">
          <Icon name="plus" size={44} strokeWidth={1.6} />
        </span>
      </button>

      <AddModuleDialog
        isOpen={isOpen}
        nextNumber={nextNumber}
        onClose={() => setIsOpen(false)}
        onCreated={(module) => {
          setIsOpen(false);
          onCreated?.(module);
        }}
      />
    </>
  );
}

function AddModuleDialog({ isOpen, nextNumber, onClose, onCreated }) {
  /*
   * Decision-Making is the default because it is the one game type whose
   * scenarios need no artwork, so a brand-new module can be authored and
   * played without waiting on assets.
   */
  const [form, setForm] = useState({ title: '', gameType: GAME_TYPES.DECISION_MAKING });
  const [coverFile, setCoverFile] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const coverInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ title: '', gameType: GAME_TYPES.DECISION_MAKING });
      setCoverFile(null);
      setError('');
      setIsSaving(false);
    }
  }, [isOpen]);

  const submit = async () => {
    if (!form.title.trim()) {
      setError('Module title is required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      onCreated(await createModule({ ...form, coverFile }));
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Module"
      description={`Added to the end of the course as Module ${nextNumber}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="plus" onClick={submit} isLoading={isSaving}>Create module</Button>
        </>
      }
    >
      <div className="stack">
        {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
        <TextInput
          label="Module title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="e.g. Postharvest Protection"
          required
          autoFocus
        />
        <SelectInput
          label="Mission game type"
          value={form.gameType}
          onChange={(event) => setForm({ ...form, gameType: event.target.value })}
          options={Object.values(GAME_TYPES).map((value) => ({ value, label: GAME_TYPE_INFO[value].label }))}
          hint={GAME_TYPE_INFO[form.gameType].shortDescription}
          required
        />
        {/* Reuses the form field wrapper so the label matches the inputs above. */}
        <div className="field">
          <span className="field__label">Cover image (optional)</span>
          <div className="row">
            <Button variant="secondary" icon="image" onClick={() => coverInputRef.current?.click()}>
              {coverFile ? 'Change image' : 'Choose image'}
            </Button>
            {coverFile && (
              <>
                <span className="text-sm text-muted">{coverFile.name}</span>
                <Button variant="ghost" icon="x" onClick={() => setCoverFile(null)}>Remove</Button>
              </>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
          />
          <span className="field__hint">
            Without one, the module shows the gradient cover until you upload an image from its page.
          </span>
        </div>
        <p className="text-sm text-muted">
          The module starts empty — add its lessons next. Its game type is fixed for every mission inside it.
        </p>
      </div>
    </Modal>
  );
}
