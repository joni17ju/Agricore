import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_COLOR,
  HIGHLIGHT_PRESETS,
  TEXT_PRESETS,
  hexToHsv,
  hsvToHex,
  isLowContrastOnPaper,
  presetName,
  readRecentColors,
  rememberRecentColor,
} from '../../utils/colorPalette.js';
import { normalizeCssColor } from '../../utils/cssColor.js';
import Button from '../common/Button.jsx';
import Icon from '../common/Icon.jsx';

/**
 * A Word-style split colour button for the lesson editor toolbar: the main
 * half applies the last colour used, the chevron opens a menu of presets,
 * recent colours and a full colour wheel.
 *
 * The menu is portalled to <body> and positioned with fixed coordinates, so the
 * toolbar's horizontal scroll on phones and the editor's clipped corners can
 * never cut it off, and it sits above the full-screen editor layer.
 *
 * Nothing in here touches the document directly; it reports a colour (or a
 * clear) and the editor applies it — which also puts the caret back.
 */

const COPY = {
  highlight: {
    title: 'Highlight color',
    icon: 'highlighter',
    clearLabel: 'No highlight',
    clearIcon: 'ban',
    swatchName: (name) => `${name} highlight`,
    presets: HIGHLIGHT_PRESETS,
    columns: 6,
  },
  text: {
    title: 'Text color',
    icon: 'text-color',
    clearLabel: 'Automatic',
    clearIcon: 'text-color',
    swatchName: (name) => `${name} text`,
    presets: TEXT_PRESETS,
    columns: 7,
  },
};

const EDGE = 8; // keep this far from the viewport edge
const GAP = 6; // between the button and the menu

/** Keep the editor focused: buttons in the menu must not take it away. */
const keepFocus = (event) => {
  // Text fields need the default to receive a caret; everything else here is
  // a button or our own pointer-driven control.
  if (event.target.closest('input')) return;
  event.preventDefault();
};

export default function ColorMenu({ kind, activeColor, onApply, onClear }) {
  const copy = COPY[kind];
  const [recents, setRecents] = useState(() => readRecentColors(kind));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('swatches'); // 'swatches' | 'picker'
  const [byKeyboard, setByKeyboard] = useState(false);
  const anchorRef = useRef(null);
  const chevronRef = useRef(null);
  const menuRef = useRef(null);

  const lastUsed = recents[0] ?? DEFAULT_COLOR[kind];
  const active = normalizeCssColor(activeColor);
  // The bar shows the colour at the caret; with none there, the colour the
  // main half is about to apply.
  const barColor = active ?? lastUsed;

  const close = useCallback(({ refocus = 'none' } = {}) => {
    setOpen(false);
    setView('swatches');
    if (refocus === 'chevron') chevronRef.current?.focus();
  }, []);

  const apply = (hex) => {
    const color = normalizeCssColor(hex);
    if (!color) return;
    setRecents(rememberRecentColor(kind, color));
    close();
    onApply(color);
  };

  const clear = () => {
    close();
    onClear();
  };

  // ── Dismissal: outside press and Escape ──
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      // The menu owns Escape while it is open: it closes, nothing else does.
      event.preventDefault();
      event.stopPropagation();
      const focusInMenu = menuRef.current?.contains(document.activeElement);
      close({ refocus: byKeyboard || focusInMenu ? 'chevron' : 'none' });
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, byKeyboard, close]);

  // ── Placement: below the button, shifted or flipped to stay on screen ──
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const place = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;

    const left = Math.max(EDGE, Math.min(anchor.left, viewportWidth - width - EDGE));
    let top = anchor.bottom + GAP;
    const fitsBelow = top + height <= viewportHeight - EDGE;
    const fitsAbove = anchor.top - GAP - height >= EDGE;
    if (!fitsBelow && fitsAbove) top = anchor.top - GAP - height;
    else if (!fitsBelow) top = Math.max(EDGE, viewportHeight - height - EDGE);
    setPosition({ top: Math.round(top), left: Math.round(left) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    // The toolbar scrolls sideways on phones, and the picker view is taller
    // than the swatches; follow both.
    const observer = new ResizeObserver(place);
    if (menuRef.current) observer.observe(menuRef.current);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, view, place]);

  // Opened from the keyboard: move into the menu so the arrow keys work.
  // Opened with the mouse: leave focus (and the visible selection) in the text.
  useEffect(() => {
    if (!open || !byKeyboard) return;
    const frame = requestAnimationFrame(() => {
      const target =
        menuRef.current?.querySelector('[data-grid="presets"] [tabindex="0"]') ??
        menuRef.current?.querySelector('button, input, [tabindex="0"]');
      target?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, byKeyboard, view]);

  const toggle = (event) => {
    // detail is 0 for a click synthesised from Enter or Space.
    setByKeyboard(event.detail === 0);
    setView('swatches');
    setOpen((value) => !value);
  };

  // Tab cycles inside the open menu rather than wandering off into the page.
  const trapTab = (event) => {
    if (event.key !== 'Tab') return;
    const items = [...menuRef.current.querySelectorAll('button:not([disabled]), input, [tabindex="0"]')];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement);
    event.preventDefault();
    const next = event.shiftKey ? (index <= 0 ? items.length - 1 : index - 1) : (index + 1) % items.length;
    items[next].focus();
  };

  const mainLabel = `${copy.title}: apply ${presetName(kind, lastUsed) ?? lastUsed}`;

  return (
    <>
      <span ref={anchorRef} className={`rte-color ${open ? 'is-open' : ''}`}>
        <button
          type="button"
          className="rte__tool rte-color__main"
          title={copy.title}
          aria-label={mainLabel}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply(lastUsed)}
        >
          <Icon name={copy.icon} size={16} />
          <span className="rte-color__bar" style={{ background: barColor }} aria-hidden="true" />
        </button>
        <button
          ref={chevronRef}
          type="button"
          className="rte__tool rte-color__chevron"
          title={copy.title}
          aria-label={`${copy.title} options`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggle}
        >
          <Icon name="chevron-down" size={12} strokeWidth={2.4} />
        </button>
      </span>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="color-menu"
            role="dialog"
            aria-label={copy.title}
            data-rte-popover=""
            style={{ top: position.top, left: position.left }}
            onMouseDown={keepFocus}
            onKeyDown={trapTab}
          >
            {view === 'swatches' ? (
              <SwatchView
                kind={kind}
                copy={copy}
                active={active}
                recents={recents}
                onPick={apply}
                onClear={clear}
                onMore={() => setView('picker')}
              />
            ) : (
              <ColorPicker
                kind={kind}
                initial={active ?? lastUsed}
                onCancel={() => close({ refocus: byKeyboard ? 'chevron' : 'none' })}
                onConfirm={apply}
              />
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Presets, the clear action, recent colours and the way to the wheel. */
function SwatchView({ kind, copy, active, recents, onPick, onClear, onMore }) {
  return (
    <div className="color-menu__body">
      <SwatchGrid
        id="presets"
        label={`${copy.title} presets`}
        columns={copy.columns}
        swatches={copy.presets.map((preset) => ({ hex: preset.hex, name: copy.swatchName(preset.name) }))}
        active={active}
        onPick={onPick}
      />

      <button type="button" className={`color-menu__row ${active ? '' : 'is-current'}`} aria-pressed={!active} onClick={onClear}>
        <Icon name={copy.clearIcon} size={15} />
        <span>{copy.clearLabel}</span>
        {!active && <Icon name="check" size={14} className="color-menu__tick" />}
      </button>

      <div className="color-menu__section">
        <span className="color-menu__heading" id={`recent-${kind}`}>Recent colors</span>
        {recents.length > 0 ? (
          <SwatchGrid
            id="recents"
            label="Recent colors"
            columns={copy.columns}
            swatches={recents.map((hex) => {
              const name = presetName(kind, hex);
              return { hex, name: name ? copy.swatchName(name) : `Custom ${kind === 'text' ? 'text' : 'highlight'} ${hex}` };
            })}
            active={active}
            onPick={onPick}
          />
        ) : (
          <p className="color-menu__empty">Colors you use will appear here.</p>
        )}
      </div>

      <button type="button" className="color-menu__row" onClick={onMore}>
        <span className="color-menu__wheel-icon" aria-hidden="true" />
        <span>More colors…</span>
      </button>
    </div>
  );
}

/**
 * A grid of swatch buttons with a roving tab stop: Tab enters and leaves the
 * grid as one stop, the arrow keys move inside it, Enter or Space applies.
 */
function SwatchGrid({ id, label, columns, swatches, active, onPick }) {
  const startIndex = Math.max(0, swatches.findIndex((swatch) => swatch.hex === active));
  const [focusIndex, setFocusIndex] = useState(startIndex);
  const refs = useRef([]);

  const move = (event) => {
    const last = swatches.length - 1;
    const steps = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns };
    let next = null;
    if (event.key in steps) next = Math.min(last, Math.max(0, focusIndex + steps[event.key]));
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      className="color-menu__grid"
      role="group"
      aria-label={label}
      data-grid={id}
      style={{ '--cols': columns }}
      onKeyDown={move}
    >
      {swatches.map((swatch, index) => {
        const selected = swatch.hex === active;
        return (
          <button
            key={swatch.hex}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            className={`color-swatch ${selected ? 'is-selected' : ''} ${isNearWhite(swatch.hex) ? 'is-light' : ''}`}
            style={{ '--swatch': swatch.hex }}
            title={swatch.name}
            aria-label={swatch.name}
            aria-pressed={selected}
            tabIndex={index === focusIndex ? 0 : -1}
            onFocus={() => setFocusIndex(index)}
            onClick={() => onPick(swatch.hex)}
          >
            {selected && <Icon name="check" size={13} strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

/** Very pale swatches get an outline so they are not lost on the white menu. */
const isNearWhite = (hex) => hexToHsv(hex).v > 0.93 && hexToHsv(hex).s < 0.08;

/**
 * "More colors": a hue/saturation wheel, a brightness slider, a hex field and
 * a live preview, with OK and Cancel.
 *
 * Built here rather than with <input type="color">: that control opens a
 * different native dialog in every browser — a spectrum square in Chrome, the
 * old Windows colour dialog from Firefox on Windows — none of which is a wheel,
 * none of which can sit inside this menu, and none with an OK/Cancel we can
 * hook. This is a few gradients and some trigonometry; no dependency.
 *
 * The wheel is an exact HSV rendering: a conic gradient of pure hues with a
 * radial white-to-transparent fade over it gives (1 − s)·white + s·hue at
 * every radius — HSV at full brightness — and a black layer at opacity 1 − v
 * applies the brightness. So the point under the cursor is the colour you get.
 */
function ColorPicker({ kind, initial, onCancel, onConfirm }) {
  const [hsv, setHsv] = useState(() => hexToHsv(initial));
  const [hexDraft, setHexDraft] = useState(initial);
  const [hexError, setHexError] = useState(false);

  const preview = useMemo(() => hsvToHex(hsv), [hsv]);
  const lowContrast = kind === 'text' && isLowContrastOnPaper(preview);

  const update = (next) => {
    setHsv(next);
    setHexDraft(hsvToHex(next));
    setHexError(false);
  };

  // ── Wheel: angle from the top, clockwise, is hue; distance is saturation ──
  const fromWheelPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = event.clientX - (rect.left + radius);
    const dy = event.clientY - (rect.top + radius);
    const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const s = Math.min(1, Math.hypot(dx, dy) / radius);
    update({ ...hsv, h, s });
  };

  const fromSliderPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const v = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    update({ ...hsv, v });
  };

  /** Drag handling shared by the wheel and the slider; reads the element it is on. */
  const dragWith = (handler) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      handler(event);
    },
    onPointerMove: (event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) handler(event);
    },
  });

  const onWheelKey = (event) => {
    const step = event.shiftKey ? 15 : 5;
    const moves = {
      ArrowLeft: { h: (hsv.h - step + 360) % 360 },
      ArrowRight: { h: (hsv.h + step) % 360 },
      ArrowUp: { s: Math.min(1, hsv.s + step / 100) },
      ArrowDown: { s: Math.max(0, hsv.s - step / 100) },
    };
    if (!moves[event.key]) return;
    event.preventDefault();
    update({ ...hsv, ...moves[event.key] });
  };

  const onSliderKey = (event) => {
    const step = (event.shiftKey ? 10 : 2) / 100;
    const values = {
      ArrowLeft: hsv.v - step,
      ArrowDown: hsv.v - step,
      ArrowRight: hsv.v + step,
      ArrowUp: hsv.v + step,
      Home: 0,
      End: 1,
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    update({ ...hsv, v: Math.min(1, Math.max(0, values[event.key])) });
  };

  const onHexChange = (event) => {
    const raw = event.target.value.trim();
    setHexDraft(raw);
    // Accept "abc", "#abc" and the six-digit forms as they are typed.
    const candidate = raw.startsWith('#') ? raw : `#${raw}`;
    const color = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(candidate) ? normalizeCssColor(candidate) : null;
    setHexError(!color && raw.length > 0);
    if (color) setHsv(hexToHsv(color));
  };

  const confirm = () => {
    if (hexError) return;
    onConfirm(preview);
  };

  const thumbAngle = (hsv.h * Math.PI) / 180;
  const thumb = { left: `${50 + 50 * hsv.s * Math.sin(thumbAngle)}%`, top: `${50 - 50 * hsv.s * Math.cos(thumbAngle)}%` };
  const fullBright = hsvToHex({ ...hsv, v: 1 });

  return (
    <div className="color-picker">
      <div className="color-picker__wheel-wrap">
        <div
          className="color-wheel"
          role="slider"
          tabIndex={0}
          aria-label="Color wheel"
          aria-roledescription="color wheel"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={Math.round(hsv.h)}
          aria-valuetext={`Hue ${Math.round(hsv.h)} degrees, saturation ${Math.round(hsv.s * 100)} percent`}
          onKeyDown={onWheelKey}
          {...dragWith(fromWheelPointer)}
        >
          <span className="color-wheel__shade" style={{ opacity: 1 - hsv.v }} />
          <span className="color-wheel__thumb" style={{ ...thumb, background: preview }} />
        </div>
      </div>

      <div className="color-picker__field">
        <span className="color-menu__heading" id="brightness-label">Brightness</span>
        <div
          className="color-slider"
          role="slider"
          tabIndex={0}
          aria-labelledby="brightness-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.v * 100)}
          aria-valuetext={`${Math.round(hsv.v * 100)} percent`}
          style={{ '--slider-end': fullBright }}
          onKeyDown={onSliderKey}
          {...dragWith(fromSliderPointer)}
        >
          <span className="color-slider__thumb" style={{ left: `${hsv.v * 100}%`, background: preview }} />
        </div>
      </div>

      <div className="color-picker__row">
        <label className="color-picker__hex">
          <span className="color-menu__heading">Hex</span>
          <input
            type="text"
            value={hexDraft}
            onChange={onHexChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                confirm();
              }
            }}
            maxLength={7}
            spellCheck={false}
            autoComplete="off"
            aria-label="Hex color"
            aria-invalid={hexError}
            className={`input ${hexError ? 'is-invalid' : ''}`}
          />
        </label>
        <div className="color-picker__preview" aria-label={`New color ${preview}, current color ${initial}`} role="img">
          <span style={{ background: preview }} title={`New: ${preview}`} />
          <span style={{ background: initial }} title={`Current: ${initial}`} />
        </div>
      </div>

      {hexError && <p className="color-picker__note is-error">Enter a hex color like #1a73e8.</p>}
      {lowContrast && (
        <p className="color-picker__note is-warning" role="status">
          <Icon name="alert" size={14} /> This color may be hard to read on the white page.
        </p>
      )}

      <div className="color-picker__actions">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={confirm} disabled={hexError}>OK</Button>
      </div>
    </div>
  );
}
