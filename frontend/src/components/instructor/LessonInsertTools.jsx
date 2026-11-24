/**
 * Editor controls for the lesson layout: the Insert menu, its dialogs
 * (learning objectives, key terms, figure with caption) and the "How to
 * format a lesson" help panel.
 *
 * Everything inserted here is ordinary allowed markup — a marked bullet list,
 * a callout div, a <figure> — so it passes the sanitiser, survives saving and
 * reopening, and can be edited afterwards like any other text. Nothing depends
 * on special heading text.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../common/Button.jsx';
import { CALLOUT_LABELS } from '../common/Callout.jsx';
import { SelectInput, TextArea, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import Modal from '../common/Modal.jsx';
import { IMAGE_LAYOUTS, LESSON_LIST_STYLES } from '../../utils/richText.js';
import { insertLessonList } from './editorExtensions.jsx';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const LAYOUT_LABELS = { inline: 'Beside the text', center: 'Centred block', full: 'Full width' };

/** "Insert" menu button with a keyboard-navigable list of lesson elements. */
export function InsertMenu({ editor, onOpenDialog }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const items = [
    { key: 'objectives', icon: 'check-circle', label: 'Learning objectives', hint: 'Numbered box at the top of the lesson', run: () => onOpenDialog('objectives') },
    { key: 'terms', icon: 'list', label: 'Key terms', hint: 'Term and meaning pairs', run: () => onOpenDialog('terms') },
    { key: 'figure', icon: 'image', label: 'Figure with caption', hint: 'Picture numbered “Figure N.”', run: () => onOpenDialog('figure') },
    { key: 'tip', icon: 'sprout', label: `${CALLOUT_LABELS.tip} box`, hint: 'The one point to remember', run: () => editor.chain().focus().toggleCallout('tip').run() },
    { key: 'info', icon: 'info', label: `${CALLOUT_LABELS.info} box`, hint: 'Local example or observation', run: () => editor.chain().focus().toggleCallout('info').run() },
    { key: 'warning', icon: 'alert', label: `${CALLOUT_LABELS.warning} box`, hint: 'Safety or common mistake', run: () => editor.chain().focus().toggleCallout('warning').run() },
    { key: 'divider', icon: 'divider', label: 'Divider line', hint: 'Thin rule between parts', run: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    const onPointer = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const onMenuKeyDown = (event) => {
    const entries = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const index = entries.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <span className="rte-insert">
      <button
        ref={buttonRef}
        type="button"
        className={`rte__tool rte__tool--wide rte-insert__button ${open ? 'is-active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="plus" size={16} /> Insert
      </button>
      {open && (
        <div ref={menuRef} className="rte-insert__menu" role="menu" aria-label="Insert a lesson element" onKeyDown={onMenuKeyDown}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="rte-insert__item"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(false);
                item.run();
              }}
            >
              <Icon name={item.icon} size={16} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.readAsDataURL(file);
  });
}

/**
 * The three insert dialogs. `kind` is 'objectives' | 'terms' | 'figure' | null.
 * @param {{ title: string, url: string }[]} mediaImages pictures already in this lesson's media library
 */
export function InsertDialogs({ editor, kind, onClose, mediaImages = [] }) {
  return (
    <>
      <ObjectivesDialog editor={editor} isOpen={kind === 'objectives'} onClose={onClose} />
      <KeyTermsDialog editor={editor} isOpen={kind === 'terms'} onClose={onClose} />
      <FigureInsertDialog editor={editor} isOpen={kind === 'figure'} onClose={onClose} mediaImages={mediaImages} />
    </>
  );
}

function ObjectivesDialog({ editor, isOpen, onClose }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const lines = text.split('\n').map((line) => line.replace(/^\s*([-•*]|\d+[.)])\s*/, '').trim()).filter(Boolean);

  const insert = () => {
    if (lines.length === 0) {
      setError('Write at least one objective.');
      return;
    }
    insertLessonList(editor, LESSON_LIST_STYLES.OBJECTIVES, lines.map((line) => [{ type: 'text', text: line }]));
    setText('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert learning objectives"
      description="Shown to students as a numbered “Learning objectives” box. Put it at the top of the lesson."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="check" onClick={insert}>Insert objectives</Button>
        </>
      )}
    >
      <div className="stack">
        {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
        <TextArea
          label="Objectives, one per line"
          hint="Start each with a verb students can show: Define…, Explain…, Classify…"
          rows={6}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'Define a weed and explain why the definition depends on context.\nClassify weeds by form and life cycle.'}
          autoFocus
        />
        <p className="text-sm text-muted">{lines.length} objective{lines.length === 1 ? '' : 's'}. You can still edit, add or remove them in the lesson afterwards.</p>
      </div>
    </Modal>
  );
}

function KeyTermsDialog({ editor, isOpen, onClose }) {
  const empty = () => ({ term: '', meaning: '' });
  const [rows, setRows] = useState([empty(), empty()]);
  const [error, setError] = useState('');
  const update = (index, field, value) => setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const insert = () => {
    const filled = rows.map((row) => ({ term: row.term.trim(), meaning: row.meaning.trim() })).filter((row) => row.term);
    if (filled.length === 0) {
      setError('Add at least one term.');
      return;
    }
    insertLessonList(
      editor,
      LESSON_LIST_STYLES.KEY_TERMS,
      filled.map((row) => [
        { type: 'text', text: row.term, marks: [{ type: 'bold' }] },
        ...(row.meaning ? [{ type: 'text', text: `: ${row.meaning}` }] : []),
      ]),
    );
    setRows([empty(), empty()]);
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Insert key terms"
      description="Shown to students as a “Key terms” list: each term beside its meaning."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon="check" onClick={insert}>Insert key terms</Button>
        </>
      )}
    >
      <div className="stack">
        {error && <div className="form-error"><Icon name="alert" size={16} /> {error}</div>}
        {rows.map((row, index) => (
          <div key={index} className="rte-terms-row">
            <TextInput label={`Term ${index + 1}`} value={row.term} onChange={(event) => update(index, 'term', event.target.value)} placeholder="Seed bank" autoFocus={index === 0} />
            <TextInput label="Meaning" value={row.meaning} onChange={(event) => update(index, 'meaning', event.target.value)} placeholder="Viable seeds stored in the soil" />
            <button
              type="button"
              className="icon-btn icon-btn--ghost icon-btn--sm rte-terms-row__remove"
              aria-label={`Remove term ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
        <div>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => setRows((current) => [...current, empty()])}>Add another term</Button>
        </div>
      </div>
    </Modal>
  );
}

function FigureInsertDialog({ editor, isOpen, onClose, mediaImages }) {
  const blank = { file: null, url: '', library: '', caption: '', alt: '', layout: 'center', error: '' };
  const [form, setForm] = useState(blank);
  const set = (patch) => setForm((current) => ({ ...current, ...patch, error: '' }));
  const preview = useMemo(() => (form.file ? URL.createObjectURL(form.file) : form.library || form.url || ''), [form.file, form.library, form.url]);
  useEffect(() => () => { if (form.file) URL.revokeObjectURL(preview); }, [form.file, preview]);

  const close = () => {
    setForm(blank);
    onClose();
  };

  const insert = async () => {
    let src = form.library || form.url.trim();
    if (form.file) {
      if (form.file.size > MAX_IMAGE_BYTES) {
        setForm((current) => ({ ...current, error: 'Pictures must be 1.5 MB or smaller. Add larger files in the Media tab first.' }));
        return;
      }
      src = await readImageFile(form.file).catch(() => null);
    }
    if (!src) {
      setForm((current) => ({ ...current, error: 'Choose a picture, pick one from this lesson’s media, or paste an image link.' }));
      return;
    }
    editor.chain().focus().insertFigure({
      src,
      alt: form.alt.trim() || form.caption.trim(),
      layout: form.layout,
      caption: form.caption.trim(),
    }).run();
    close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Insert figure"
      description="A picture with a caption. The “Figure N.” number is added automatically, in order."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button icon="image" onClick={insert}>Insert figure</Button>
        </>
      )}
    >
      <div className="stack">
        {form.error && <div className="form-error"><Icon name="alert" size={16} /> {form.error}</div>}
        <label className={`dropzone ${form.file ? 'has-file' : ''}`}>
          <input type="file" accept="image/*" className="visually-hidden" onChange={(event) => set({ file: event.target.files[0] ?? null, library: '', url: '' })} />
          {preview ? (
            <div className="dropzone__preview">
              <img src={preview} alt="Preview of the chosen picture" />
              <span className="text-sm text-muted">{form.file ? `${form.file.name} · click to change` : 'Click to upload a different picture'}</span>
            </div>
          ) : (
            <>
              <span className="dropzone__icon"><Icon name="upload" size={26} /></span>
              <strong>Upload a picture</strong>
              <span className="text-sm text-muted">PNG, JPG or WebP up to 1.5 MB</span>
            </>
          )}
        </label>
        {mediaImages.length > 0 && (
          <SelectInput
            label="…or choose from this lesson’s media"
            value={form.library}
            onChange={(event) => set({ library: event.target.value, file: null, url: '' })}
            placeholder="Choose a picture"
            options={mediaImages.map((image) => ({ value: image.url, label: image.title || 'Untitled picture' }))}
          />
        )}
        <TextInput label="…or image link" value={form.url} onChange={(event) => set({ url: event.target.value, file: null, library: '' })} placeholder="https://…" />
        <TextInput
          label="Caption"
          hint="Students see “Figure N.” before it. Leave it empty for a picture without a number."
          value={form.caption}
          onChange={(event) => set({ caption: event.target.value })}
          placeholder="Vegetative propagules of creeping perennial weeds"
        />
        <div className="form-grid">
          <TextInput label="Alt text" hint="Read aloud by screen readers. Uses the caption if empty." value={form.alt} onChange={(event) => set({ alt: event.target.value })} />
          <SelectInput
            label="Placement"
            value={form.layout}
            onChange={(event) => set({ layout: event.target.value })}
            options={IMAGE_LAYOUTS.map((layout) => ({ value: layout, label: LAYOUT_LABELS[layout] }))}
          />
        </div>
      </div>
    </Modal>
  );
}

const HELP = [
  { element: 'Section heading', how: 'Toolbar: Heading. Numbered automatically 1, 2, 3 and listed under “On this page”.' },
  { element: 'Subsection heading', how: 'Toolbar: Subheading. Numbered 1.1, 1.2 under its section.' },
  { element: 'Key term in a sentence', how: 'Select the word, then Bold. Students see it with a light ochre underline.' },
  { element: 'Bulleted or numbered list', how: 'Toolbar: Bulleted list or Numbered list. Press Tab inside a list to indent.' },
  { element: 'Learning objectives', how: 'Insert → Learning objectives. Type one per line. Place it first in the lesson.' },
  { element: 'Key terms', how: 'Insert → Key terms. Type each term and its meaning; shown as a two-column list.' },
  { element: `${CALLOUT_LABELS.tip}, ${CALLOUT_LABELS.info}, ${CALLOUT_LABELS.warning}`, how: 'Put the caret in a paragraph, then Insert → the box you want. Choose it again to remove the box.' },
  { element: 'Figure with caption', how: 'Insert → Figure with caption. Upload or choose a picture and type the caption; “Figure N.” is added for you.' },
  { element: 'Quotation', how: 'Toolbar: Quote. Shown as a marginal note labelled “Key idea”.' },
  { element: 'Divider', how: 'Insert → Divider line, between two parts of a lesson.' },
  { element: 'Pasting from Word', how: 'Headings, lists, bold, italic and links are kept; Word colours and fonts are removed. Add Word pictures with Insert → Figure.' },
];

/** Collapsible "How to format a lesson" panel shown above the editor. */
export function FormattingHelp() {
  return (
    <details className="rte-help">
      <summary>
        <Icon name="help" size={15} />
        How to format a lesson
      </summary>
      <dl className="rte-help__list">
        {HELP.map((entry) => (
          <div key={entry.element} className="rte-help__row">
            <dt>{entry.element}</dt>
            <dd>{entry.how}</dd>
          </div>
        ))}
      </dl>
      <p className="rte-help__note">The Student view tab shows the lesson exactly as students will read it.</p>
    </details>
  );
}
