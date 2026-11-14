import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { GAME_TYPE_INFO } from '../../../constants/gameTypes.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard.js';
import { countMissionAttempts, createMission, updateMission } from '../../../services/missionService.js';
import { TIMED_GAME_TYPES, validateMaxXP, validateScenario, visualEditability } from '../../../utils/missionValidation.js';
import Button from '../../common/Button.jsx';
import { TextArea } from '../../common/Form.jsx';
import Icon from '../../common/Icon.jsx';
import { ConfirmDialog } from '../../common/Modal.jsx';
import { gameIcon } from '../../student/CourseMap.jsx';
import { cloneData, issuesAt, setIn } from './draft.js';
import { FieldIssues } from './fields.jsx';
import { GAME_EDITORS, TIMER_RULES } from './games/index.js';
import { XP_TIERS, parseScenarioJson } from './editorUtils.js';
import JsonPanel from './JsonPanel.jsx';
import TimerControl from './TimerControl.jsx';
import XpControl from './XpControl.jsx';
import './missionEditor.css';

/** Max XP each module was designed around: the "Medium" suggestion. */
const MODULE_TIER = { 1: 100, 2: 150, 3: 150, 4: 200, 5: 250 };

/**
 * Difficulty is not stored — scenarioData has no such field — so it is read
 * from Max XP against the module's tier, and choosing one only suggests a
 * value one tier down or up. It never locks the XP control.
 */
function difficultyFor(moduleNumber, maxXP) {
  const tier = MODULE_TIER[moduleNumber] ?? 150;
  const index = XP_TIERS.indexOf(tier);
  const suggested = {
    Easy: XP_TIERS[Math.max(0, index - 1)],
    Medium: tier,
    Hard: XP_TIERS[Math.min(XP_TIERS.length - 1, index + 1)],
  };
  const current = maxXP < tier ? 'Easy' : maxXP > tier ? 'Hard' : 'Medium';
  return { current, suggested };
}

/**
 * The game-card mission editor: banner, Max XP, countdown, the game's own
 * visual editor, an Advanced (JSON) view, and a pinned action bar.
 *
 * `source` is the mission being edited, or for a new level an unsaved
 * { maxXP, scenarioData } to start from. The draft is a plain copy that every
 * editor changes through setIn, which preserves key order and unknown fields,
 * so opening and saving without changes writes back exactly what was read.
 */
export default function MissionEditor({ source, isNew, lesson, module, onClose, onSaved, onDirtyChange, extraActions }) {
  const toast = useToast();
  const id = useId();
  const gameType = module.gameType;
  const original = useMemo(() => JSON.stringify({ maxXP: source.maxXP, scenarioData: source.scenarioData }), [source]);

  const [draft, setDraft] = useState(() => cloneData(source.scenarioData));
  const [maxXP, setMaxXP] = useState(source.maxXP);
  /*
   * A type with no visual editor yet, or content the visual editor can't
   * read, starts in the JSON view — decided once, from what was loaded.
   */
  const [jsonMode, setJsonMode] = useState(
    () => !GAME_EDITORS[gameType] || !visualEditability(gameType, source.scenarioData).ok,
  );
  const [jsonText, setJsonText] = useState(() => (jsonMode ? JSON.stringify(source.scenarioData, null, 2) : ''));
  const [jsonError, setJsonError] = useState(null);
  const [jsonNote, setJsonNote] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  const isDirty = isNew || JSON.stringify({ maxXP, scenarioData: draft }) !== original;
  const issues = useMemo(() => validateScenario(gameType, draft), [gameType, draft]);
  const xpError = validateMaxXP(maxXP);
  const editable = useMemo(() => visualEditability(gameType, draft), [gameType, draft]);
  const GameEditor = GAME_EDITORS[gameType];
  const showJson = jsonMode || !GameEditor;
  const problemCount = issues.errors.length + (xpError ? 1 : 0) + (jsonError ? 1 : 0);
  const canSave = problemCount === 0 && !isSaving;

  /*
   * The latest draft and JSON state, for handlers. Visual edits go through
   * `update` while the JSON view may be showing (the shell's title, timer and
   * instructions stay live beside it), so it has to refresh that text too.
   */
  const latest = useRef({ draft, jsonMode, jsonError });
  useEffect(() => {
    latest.current = { draft, jsonMode, jsonError };
  });

  const update = useCallback((path, valueOrUpdater) => {
    const next = setIn(latest.current.draft, path, valueOrUpdater);
    latest.current = { ...latest.current, draft: next };
    setDraft(next);
    if (latest.current.jsonMode) {
      setJsonText(JSON.stringify(next, null, 2));
      if (latest.current.jsonError) {
        // Say so, rather than silently dropping the unparsed text.
        setJsonError(null);
        setJsonNote('Your unfinished JSON edit was replaced by the change you just made in the form.');
      }
    }
  }, []);
  const at = useCallback((path) => issuesAt(issues, path), [issues]);

  // Report dirtiness up, so the page can guard its own tab switches.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (isNew) return undefined;
    let live = true;
    countMissionAttempts(source._id).then((count) => live && setAttemptCount(count)).catch(() => {});
    return () => {
      live = false;
    };
  }, [isNew, source._id]);

  const guard = useUnsavedChangesGuard(isDirty);

  // ── Advanced (JSON) ──
  const openJson = () => {
    setJsonText(JSON.stringify(draft, null, 2));
    setJsonError(null);
    setJsonNote(null);
    setJsonMode(true);
  };
  const onJsonText = (text) => {
    setJsonText(text);
    const parsed = parseScenarioJson(text);
    if (parsed.ok) {
      latest.current = { ...latest.current, draft: parsed.value };
      setDraft(parsed.value);
      setJsonError(null);
      setJsonNote(null);
    } else setJsonError(parsed.message);
  };
  const closeJson = () => {
    if (jsonError) {
      setJsonNote('Fix the JSON error first — the visual editor can only show content it can read.');
      return;
    }
    const check = visualEditability(gameType, draft);
    if (!check.ok) {
      setJsonNote(`This content can't be shown in the visual editor: ${check.reason} Keep editing it here, or fix that part first.`);
      return;
    }
    setJsonNote(null);
    setJsonMode(false);
  };

  const save = async () => {
    if (!canSave) {
      setShowProblems(true);
      return;
    }
    setIsSaving(true);
    try {
      const saved = isNew
        ? await createMission({ lessonId: lesson._id, maxXP, scenarioData: draft })
        : await updateMission(source._id, { maxXP, scenarioData: draft });
      toast.success(isNew ? 'Mission level added.' : 'Mission level saved.');
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
      setIsSaving(false);
    }
  };

  const cancel = () => (isDirty ? setConfirmDiscard(true) : onClose());

  const difficulty = difficultyFor(module.moduleNumber, maxXP);
  const titleIssues = at('title');
  const info = GAME_TYPE_INFO[gameType];
  const timed = TIMED_GAME_TYPES.includes(gameType);
  const allProblems = [
    ...(xpError ? [xpError] : []),
    ...(jsonError ? [jsonError] : []),
    ...issues.errors.map((issue) => issue.message),
  ];

  return (
    <div className="mission-editor">
      {/* ── Banner ── */}
      <header className={`me-banner me-banner--${gameType}`}>
        <span className="me-banner__icon" aria-hidden="true"><Icon name={gameIcon(gameType)} size={28} /></span>
        <div className="me-banner__main">
          <span className="me-banner__eyebrow">
            {info.label} · {isNew ? 'New level' : `Level ${source.levelNumber}`} · Module {module.moduleNumber}
          </span>
          <label htmlFor={`${id}-title`} className="visually-hidden">Mission title</label>
          <input
            id={`${id}-title`}
            className={`me-banner__title ${titleIssues.errors.length ? 'is-invalid' : ''}`}
            value={draft.title ?? ''}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Mission title"
            aria-invalid={titleIssues.errors.length > 0}
          />
          <FieldIssues {...titleIssues} />
        </div>
        <div className="me-difficulty" role="group" aria-label={`Difficulty: ${difficulty.current}. Choosing one suggests a Max XP.`}>
          <span className={`me-difficulty__badge is-${difficulty.current.toLowerCase()}`}>{difficulty.current}</span>
          <div className="me-difficulty__options">
            {Object.entries(difficulty.suggested).map(([label, xp]) => (
              <button
                key={label}
                type="button"
                className={`me-chip me-chip--sm ${difficulty.current === label ? 'is-selected' : ''}`}
                aria-pressed={difficulty.current === label}
                onClick={() => setMaxXP(xp)}
                title={`Suggest ${xp} XP`}
              >
                {label} <span className="me-chip__sub">{xp}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={`me-grid ${timed ? 'has-timer' : ''}`}>
        <XpControl value={maxXP} onChange={setMaxXP} attemptCount={attemptCount} error={xpError} />
        {timed && (
          <TimerControl
            value={draft.timeLimitSeconds}
            onChange={(seconds) => update('timeLimitSeconds', seconds)}
            error={at('timeLimitSeconds').errors[0]}
            rule={TIMER_RULES[gameType]}
          />
        )}
      </div>

      <section className="me-panel" aria-labelledby={`${id}-brief`}>
        <header className="me-panel__head">
          <h3 id={`${id}-brief`} className="me-panel__title">Briefing</h3>
        </header>
        <TextArea
          label="Instructions shown to students"
          value={draft.instructions ?? ''}
          onChange={(event) => update('instructions', event.target.value)}
          rows={2}
          error={at('instructions').errors[0]}
        />
      </section>

      {/* ── The game's own content ── */}
      <div className="me-mode">
        <h3 className="me-mode__title">Game content</h3>
        {GameEditor && (
          <button
            type="button"
            className={`me-switch ${jsonMode ? 'is-on' : ''}`}
            role="switch"
            aria-checked={jsonMode}
            onClick={jsonMode ? closeJson : openJson}
          >
            <span className="me-switch__track" aria-hidden="true"><span className="me-switch__thumb" /></span>
            <span>Advanced (JSON)</span>
          </button>
        )}
      </div>

      {showJson ? (
        <JsonPanel
          text={jsonText}
          onTextChange={onJsonText}
          parseError={jsonError}
          note={
            jsonNote ??
            (!GameEditor
              ? `A visual editor for ${info.label} missions is not available yet; edit the game content here.`
              : !editable.ok
                ? `This content can't be shown in the visual editor: ${editable.reason}`
                : null)
          }
        />
      ) : (
        <GameEditor data={draft} update={update} at={at} module={module} maxXP={maxXP} />
      )}

      {/* ── Pinned action bar ── */}
      <div className="me-bar" role="region" aria-label="Save mission">
        {showProblems && allProblems.length > 0 && (
          <ul className="me-bar__problems" id={`${id}-problems`}>
            {allProblems.map((message, index) => (
              <li key={`${index}-${message}`}><Icon name="alert" size={13} /> {message}</li>
            ))}
          </ul>
        )}
        <div className="me-bar__row">
          <span className={`me-bar__status ${isDirty ? 'is-dirty' : ''}`} aria-live="polite">
            {isNew ? '● New level — not saved yet' : isDirty ? '● Unsaved changes' : 'No changes'}
          </span>
          {problemCount > 0 && (
            <button
              type="button"
              className="me-bar__count"
              aria-expanded={showProblems}
              aria-controls={`${id}-problems`}
              onClick={() => setShowProblems((value) => !value)}
            >
              <Icon name="alert" size={14} /> {problemCount} {problemCount === 1 ? 'thing' : 'things'} to fix
            </button>
          )}
          <div className="me-bar__actions">
            {extraActions?.({ draft, maxXP, isValid: problemCount === 0, isDirty })}
            <Button variant="secondary" size="sm" onClick={cancel}>Cancel</Button>
            <Button size="sm" icon="save" onClick={save} isLoading={isSaving} disabled={!canSave}>
              {isNew ? 'Add level' : 'Save level'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        title="Discard your changes?"
        message="This mission has unsaved changes. Leaving now throws them away."
        confirmLabel="Discard changes"
      />
      <ConfirmDialog
        isOpen={Boolean(guard.pendingHref)}
        onClose={guard.cancelLeave}
        onConfirm={guard.confirmLeave}
        title="Leave without saving?"
        message="This mission has unsaved changes. Leaving the page throws them away."
        confirmLabel="Leave page"
      />
    </div>
  );
}
