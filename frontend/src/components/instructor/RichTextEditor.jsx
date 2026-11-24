/**
 * Lesson Content Editor (Proposal Fig 25).
 *
 * Tiptap provides the document model; every control, menu and style here is
 * ours — our Icon set, tokens and button styles — so no default library styling
 * is used. Output is an HTML string that passes our sanitiser's allow-list.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Button from '../common/Button.jsx';
import { SelectInput, TextInput } from '../common/Form.jsx';
import Icon from '../common/Icon.jsx';
import Modal from '../common/Modal.jsx';
import { DEFAULT_COLOR, readRecentColors } from '../../utils/colorPalette.js';
import { IMAGE_LAYOUTS, isSafeLinkUrl, parseVideoUrl } from '../../utils/richText.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cleanWordHtml, isWordHtml } from '../../utils/wordPaste.js';
import { CALLOUT_LABELS } from '../common/Callout.jsx';
import ColorMenu from './ColorMenu.jsx';
import {
  AgriHighlight,
  AgriImage,
  AgriTextAlign,
  AgriTextColor,
  AgriTextStyle,
  CalloutNode,
  FigureNode,
  LegacySectionHints,
  LessonListStyle,
  ListRoles,
  VideoEmbedNode,
} from './editorExtensions.jsx';
import { FormattingHelp, InsertDialogs, InsertMenu } from './LessonInsertTools.jsx';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const LAYOUT_LABELS = { inline: 'Inline (text wraps)', center: 'Centered block', full: 'Full width' };

function ToolButton({ icon, label, onClick, isActive = false, disabled = false, wide = false, buttonRef, children }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`rte__tool ${wide ? 'rte__tool--wide' : ''} ${isActive ? 'is-active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/** How long the closing animation of full-screen mode runs (matches the CSS). */
const FULLSCREEN_CLOSE_MS = 160;

/**
 * `fullscreenContext` is what the full-screen header shows and does — the
 * lesson title, its "Module X, Lesson Y" label, the dirty/saving state the
 * workspace already tracks, and its Save handler. Nothing about saving lives
 * here; the header only surfaces the workspace's own.
 *
 * @param {{ title: string, meta: string, isDirty: boolean, isSaving: boolean, onSave?: () => void } | null} fullscreenContext
 * @param {(isFullscreen: boolean) => void} [onFullscreenChange]
 */
export default function RichTextEditor({
  documentKey,
  initialHtml,
  onChange,
  onInsertMedia,
  mediaImages = [],
  fullscreenContext = null,
  onFullscreenChange,
}) {
  const [linkDialog, setLinkDialog] = useState(null); // { url, text }
  const [imageDialog, setImageDialog] = useState(null); // { url, alt, layout, file }
  const [videoDialog, setVideoDialog] = useState(null); // { url, error }
  const [contextMenu, setContextMenu] = useState(null); // { x, y }
  const [insertDialog, setInsertDialog] = useState(null); // 'objectives' | 'terms' | 'figure'
  const fileInputRef = useRef(null);
  const toast = useToast();
  // Word refers to its pictures by a path on the author's computer, which no browser can read.
  const pasteNoticeRef = useRef(null);
  pasteNoticeRef.current = (count) =>
    toast.info(`${count} picture${count === 1 ? '' : 's'} from Word could not be pasted. Add ${count === 1 ? 'it' : 'them'} with Insert → Figure with caption.`);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
          link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
        }),
        AgriTextAlign,
        AgriHighlight,
        AgriTextStyle,
        AgriTextColor,
        AgriImage,
        VideoEmbedNode,
        CalloutNode,
        FigureNode,
        LessonListStyle,
        LegacySectionHints,
        ListRoles,
      ],
      content: initialHtml || '<p></p>',
      /*
       * Re-render on every transaction, selection-only ones included. Tiptap 3
       * no longer does by default, and content edits only reached the toolbar
       * because onChange re-renders the page; moving the caret did not, so
       * the active states (bold, alignment, the colour bars) kept showing
       * wherever the caret had last been typed into.
       */
      shouldRerenderOnTransaction: true,
      editorProps: {
        // lesson-prose: the editor surface uses the shared lesson reading style.
        attributes: { class: 'rte__content rich-text lesson-prose', 'aria-label': 'Lesson content' },
        /*
         * Word's clipboard HTML: keep headings, lists, bold, italic, links and
         * loadable images; drop Word's styles, colours and list bullets typed
         * as text. Other sources paste as before.
         */
        transformPastedHTML: (html) => {
          if (!isWordHtml(html)) return html;
          const { html: clean, droppedImages } = cleanWordHtml(html);
          if (droppedImages > 0) pasteNoticeRef.current?.(droppedImages);
          return clean;
        },
        // Pasting a video link drops in a player instead of a bare link.
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain')?.trim();
          if (!text) return false;
          const video = parseVideoUrl(text);
          if (!video) return false;
          event.preventDefault();
          editorRef.current?.chain().focus().insertVideoEmbed(video).run();
          return true;
        },
      },
      onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    },
    [documentKey],
  );

  const editorRef = useRef(null);
  editorRef.current = editor;

  // Load a different lesson's content into the same editor instance.
  useEffect(() => {
    if (editor && !editor.isDestroyed && initialHtml !== undefined && editor.getHTML() !== initialHtml) {
      editor.commands.setContent(initialHtml || '<p></p>', { emitUpdate: false });
    }
    // Only when switching documents — typing must not reset the caret.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKey, editor]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  useEffect(() => {
    if (!contextMenu) return undefined;
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, [contextMenu, closeContextMenu]);

  /*
   * Full-screen (focus) mode.
   *
   * 'on' and 'closing' both render the fixed layer; 'closing' only exists so
   * the exit animation has a frame to play in. The editor element itself never
   * moves in the tree, which is what keeps its selection and history intact.
   */
  const [fullscreenPhase, setFullscreenPhase] = useState('off');
  const isFullscreen = fullscreenPhase !== 'off';
  const rootRef = useRef(null);
  const fullscreenButtonRef = useRef(null);
  const contextMenuRef = useRef(contextMenu);
  contextMenuRef.current = contextMenu;

  const enterFullscreen = useCallback(() => setFullscreenPhase('on'), []);
  const exitFullscreen = useCallback(() => {
    // No exit animation plays under reduced motion, so do not wait for one.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setFullscreenPhase((phase) => (phase === 'on' ? (reduced ? 'off' : 'closing') : phase));
    if (reduced) requestAnimationFrame(() => fullscreenButtonRef.current?.focus());
  }, []);

  // Let the closing animation finish, then drop the layer and hand focus back
  // to the toggle, so a keyboard user lands where they left.
  useEffect(() => {
    if (fullscreenPhase !== 'closing') return undefined;
    const timeout = setTimeout(() => {
      setFullscreenPhase('off');
      fullscreenButtonRef.current?.focus();
    }, FULLSCREEN_CLOSE_MS);
    return () => clearTimeout(timeout);
  }, [fullscreenPhase]);

  useEffect(() => {
    onFullscreenChange?.(isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  useEffect(() => {
    if (!isFullscreen) return undefined;

    /*
     * Scroll lock on the page behind, restored to exactly what it was — also on
     * unmount, so navigating away mid-mode cannot leave the page stuck. The
     * dialogs set and restore the same property around their own lifetime, and
     * because they restore to the value they found, they hand "hidden" back.
     */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Keep the caret where it was; the DOM did not move, but be explicit.
    const focusFrame = requestAnimationFrame(() => {
      if (!editorRef.current?.isDestroyed) editorRef.current?.commands.focus();
    });

    const onKeyDown = (event) => {
      if (event.defaultPrevented) return;
      // A dialog on top owns the keyboard: Escape closes it, Tab stays in it.
      if (document.querySelector('.modal-backdrop.is-open')) return;
      // So does an open colour menu: it lives in a portal outside this layer.
      if (document.querySelector('[data-rte-popover]')) return;

      if (event.key === 'Escape') {
        if (contextMenuRef.current) {
          setContextMenu(null);
          return;
        }
        event.preventDefault();
        exitFullscreen();
        return;
      }

      // Focus trap: Tab cycles through the layer's own controls and the text.
      if (event.key === 'Tab') {
        const root = rootRef.current;
        if (!root) return;
        const focusable = [...root.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
        )].filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (!root.contains(active)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    /*
     * Capture phase: a keydown inside the ProseMirror view does not bubble
     * back out to the document, so a bubble listener would never hear Escape
     * pressed while writing — the one place it is pressed most.
     */
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen, exitFullscreen]);

  if (!editor) return <div className="rte rte--loading">Loading editor…</div>;

  const openLinkDialog = () => {
    const previous = editor.getAttributes('link').href ?? '';
    const { from, to } = editor.state.selection;
    setLinkDialog({ url: previous, text: editor.state.doc.textBetween(from, to, ' ') });
  };

  const applyLink = () => {
    const { url, text } = linkDialog;
    const video = parseVideoUrl(url);
    if (video) {
      editor.chain().focus().insertVideoEmbed(video).run();
      setLinkDialog(null);
      return;
    }
    if (!isSafeLinkUrl(url)) {
      setLinkDialog({ ...linkDialog, error: 'Enter a valid http(s) or mailto link.' });
      return;
    }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty) chain.insertContent(`<a href="${url}">${text || url}</a>`);
    else chain.extendMarkRange('link').setLink({ href: url });
    chain.run();
    setLinkDialog(null);
  };

  const applyImage = async () => {
    const { url, alt, layout, file } = imageDialog;
    let src = url;
    if (file) {
      if (file.size > MAX_IMAGE_BYTES) {
        setImageDialog({ ...imageDialog, error: 'Images must be 1.5 MB or smaller. Use the Media tab for larger files.' });
        return;
      }
      src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('The file could not be read.'));
        reader.readAsDataURL(file);
      }).catch(() => null);
      if (!src) {
        setImageDialog({ ...imageDialog, error: 'The file could not be read.' });
        return;
      }
    }
    if (!src) {
      setImageDialog({ ...imageDialog, error: 'Choose a file or paste an image URL.' });
      return;
    }
    editor.chain().focus().setImage({ src, alt: alt || '', layout: layout || 'center' }).run();
    setImageDialog(null);
  };

  const applyVideo = () => {
    const video = parseVideoUrl(videoDialog.url);
    if (!video) {
      setVideoDialog({ ...videoDialog, error: 'Paste a YouTube or Vimeo link.' });
      return;
    }
    editor.chain().focus().insertVideoEmbed(video).run();
    setVideoDialog(null);
  };

  const imageActive = editor.isActive('image');
  const currentLayout = editor.getAttributes('image').layout ?? 'center';

  const fullscreenLabel = fullscreenContext?.title
    ? `Editing ${fullscreenContext.title} in full screen`
    : 'Lesson editor in full screen';

  return (
    <div
      ref={rootRef}
      className={`rte ${isFullscreen ? 'rte--fullscreen' : ''} ${fullscreenPhase === 'closing' ? 'is-closing' : ''}`}
      {...(isFullscreen ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': fullscreenLabel } : {})}
    >
      {/* Full-screen header: what is being edited, whether it is saved, and the way out. */}
      {isFullscreen && (
        <header className="rte__fsbar">
          <div className="rte__fsbar-text">
            <strong>{fullscreenContext?.title ?? 'Lesson content'}</strong>
            {fullscreenContext?.meta && <small>{fullscreenContext.meta}</small>}
          </div>
          {fullscreenContext && (
            <span className={`rte__fsbar-status ${fullscreenContext.isDirty ? 'is-dirty' : ''}`} aria-live="polite">
              {fullscreenContext.isDirty ? '● Unsaved changes' : 'All changes saved'}
            </span>
          )}
          <div className="rte__fsbar-actions">
            {fullscreenContext?.onSave && (
              <Button
                size="sm"
                icon="save"
                onClick={fullscreenContext.onSave}
                disabled={!fullscreenContext.isDirty}
                isLoading={fullscreenContext.isSaving}
              >
                Save Lesson
              </Button>
            )}
            <Button size="sm" variant="secondary" icon="collapse" onClick={exitFullscreen}>
              Exit full screen
            </Button>
          </div>
        </header>
      )}

      {/* Toolbar and contextbar stick together, so neither can cover the other. */}
      <div className="rte__chrome">
        <div className="rte__toolbar" role="toolbar" aria-label="Formatting">
          <ToolButton icon="undo" label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
          <ToolButton icon="redo" label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
          <span className="rte__divider" />

          <ToolButton icon="bold" label="Bold" isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolButton icon="italic" label="Italic" isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolButton icon="underline" label="Underline" isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolButton icon="minus" label="Strikethrough" isActive={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <span className="rte__divider" />

          <ToolButton icon="heading" label="Heading (numbered section)" isActive={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolButton icon="heading" label="Subheading (numbered subsection)" isActive={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <small>3</small>
          </ToolButton>
          <ToolButton icon="file" label="Paragraph" isActive={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} />
          <ToolButton icon="quote" label={`Quote (shown as ${CALLOUT_LABELS.tip})`} isActive={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <span className="rte__divider" />

          <ToolButton icon="list" label="Bulleted list" isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolButton icon="list-ordered" label="Numbered list" isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <span className="rte__divider" />

          <ToolButton icon="align-left" label="Align left" isActive={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
          <ToolButton icon="align-center" label="Align center" isActive={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
          <ToolButton icon="align-right" label="Align right" isActive={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
          <span className="rte__divider" />

          {/*
            Word-style split buttons. Each applies through a focus() chain, which
            puts the caret and selection back — and with nothing selected,
            setMark stores the colour for the next text typed.
          */}
          <ColorMenu
            kind="highlight"
            activeColor={editor.getAttributes('highlight').color}
            onApply={(color) => editor.chain().focus().setHighlight({ color }).run()}
            onClear={() => editor.chain().focus().unsetHighlight().run()}
          />
          <ColorMenu
            kind="text"
            activeColor={editor.getAttributes('textStyle').color}
            onApply={(color) => editor.chain().focus().setColor(color).run()}
            onClear={() => editor.chain().focus().unsetColor().run()}
          />
          <span className="rte__divider" />

          <ToolButton icon="link" label="Insert link" isActive={editor.isActive('link')} onClick={openLinkDialog} />
          <ToolButton icon="image" label="Insert image" onClick={() => setImageDialog({ url: '', alt: '', layout: 'center', file: null })} />
          <ToolButton icon="video" label="Embed video" onClick={() => setVideoDialog({ url: '' })} />
          <span className="rte__divider" />

          <InsertMenu editor={editor} onOpenDialog={setInsertDialog} />
          <ToolButton icon="sprout" label={`${CALLOUT_LABELS.tip} box`} isActive={editor.isActive('callout', { variant: 'tip' })} onClick={() => editor.chain().focus().toggleCallout('tip').run()} />
          <ToolButton icon="info" label={`${CALLOUT_LABELS.info} box`} isActive={editor.isActive('callout', { variant: 'info' })} onClick={() => editor.chain().focus().toggleCallout('info').run()} />
          <ToolButton icon="alert" label={`${CALLOUT_LABELS.warning} box`} isActive={editor.isActive('callout', { variant: 'warning' })} onClick={() => editor.chain().focus().toggleCallout('warning').run()} />
          <ToolButton icon="divider" label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
          <ToolButton icon="eraser" label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} />

          {onInsertMedia && (
            <>
              <span className="rte__divider" />
              <ToolButton icon="folder" label="Media library" wide onClick={onInsertMedia}>
                Media
              </ToolButton>
            </>
          )}

          {/* Always the last control, pinned right, so it never moves between modes. */}
          <span className="rte__toolbar-end">
            <ToolButton
              icon={isFullscreen ? 'collapse' : 'expand'}
              label={isFullscreen ? 'Exit full screen' : 'Full screen'}
              isActive={isFullscreen}
              buttonRef={fullscreenButtonRef}
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            />
          </span>
        </div>

        {/* Image layout controls appear only while an image is selected. */}
        {imageActive && (
          <div className="rte__contextbar" role="toolbar" aria-label="Image layout">
            <span className="rte__contextbar-label"><Icon name="image" size={14} /> Image</span>
            {IMAGE_LAYOUTS.map((layout) => (
              <ToolButton
                key={layout}
                label={LAYOUT_LABELS[layout]}
                wide
                isActive={currentLayout === layout}
                onClick={() => editor.chain().focus().updateAttributes('image', { layout }).run()}
              >
                {LAYOUT_LABELS[layout]}
              </ToolButton>
            ))}
            <ToolButton icon="trash" label="Remove image" onClick={() => editor.chain().focus().deleteSelection().run()} />
          </div>
        )}
      </div>

      <FormattingHelp />

      <div
        className="rte__surface"
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {editor && (
        <BubbleMenu editor={editor} className="rte__bubble">
          <ToolButton icon="bold" label="Bold" isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <ToolButton icon="italic" label="Italic" isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <ToolButton icon="underline" label="Underline" isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <ToolButton icon="highlight" label="Highlight" isActive={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: readRecentColors('highlight')[0] ?? DEFAULT_COLOR.highlight }).run()} />
          <ToolButton icon="link" label="Add link" isActive={editor.isActive('link')} onClick={openLinkDialog} />
        </BubbleMenu>
      )}

      {contextMenu && (
        <div className="rte__menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu">
          <button type="button" role="menuitem" onClick={() => { openLinkDialog(); closeContextMenu(); }}>
            <Icon name="link" size={15} /> Add link
          </button>
          <button type="button" role="menuitem" onClick={() => { setImageDialog({ url: '', alt: '', layout: 'center', file: null }); closeContextMenu(); }}>
            <Icon name="image" size={15} /> Insert image
          </button>
          <button type="button" role="menuitem" onClick={() => { setVideoDialog({ url: '' }); closeContextMenu(); }}>
            <Icon name="video" size={15} /> Embed video
          </button>
          <span className="rte__menu-divider" />
          <button type="button" role="menuitem" onClick={() => { editor.chain().focus().toggleCallout('info').run(); closeContextMenu(); }}>
            <Icon name="info" size={15} /> {CALLOUT_LABELS.info} box
          </button>
          <button type="button" role="menuitem" onClick={() => { editor.chain().focus().setHorizontalRule().run(); closeContextMenu(); }}>
            <Icon name="divider" size={15} /> Divider
          </button>
          <span className="rte__menu-divider" />
          <button type="button" role="menuitem" onClick={() => { editor.chain().focus().unsetAllMarks().run(); closeContextMenu(); }}>
            <Icon name="eraser" size={15} /> Clear formatting
          </button>
        </div>
      )}

      {/* ── Dialogs ── */}
      <Modal
        isOpen={Boolean(linkDialog)}
        onClose={() => setLinkDialog(null)}
        title="Insert link"
        description="A YouTube or Vimeo link becomes a playable video."
        size="sm"
        footer={
          <>
            {editor.isActive('link') && (
              <Button variant="ghost" icon="trash" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkDialog(null); }}>Remove</Button>
            )}
            <Button variant="secondary" onClick={() => setLinkDialog(null)}>Cancel</Button>
            <Button icon="link" onClick={applyLink}>Insert</Button>
          </>
        }
      >
        {linkDialog && (
          <div className="stack">
            {linkDialog.error && <div className="form-error"><Icon name="alert" size={16} /> {linkDialog.error}</div>}
            <TextInput label="URL" value={linkDialog.url} onChange={(e) => setLinkDialog({ ...linkDialog, url: e.target.value })} placeholder="https://…" autoFocus />
            {editor.state.selection.empty && (
              <TextInput label="Link text" value={linkDialog.text} onChange={(e) => setLinkDialog({ ...linkDialog, text: e.target.value })} placeholder="Text to show" />
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(imageDialog)}
        onClose={() => setImageDialog(null)}
        title="Insert image"
        description="Upload a file (max 1.5 MB) or paste an image URL."
        footer={
          <>
            <Button variant="secondary" onClick={() => setImageDialog(null)}>Cancel</Button>
            <Button icon="image" onClick={applyImage}>Insert</Button>
          </>
        }
      >
        {imageDialog && (
          <div className="stack">
            {imageDialog.error && <div className="form-error"><Icon name="alert" size={16} /> {imageDialog.error}</div>}
            <label className={`dropzone ${imageDialog.file ? 'has-file' : ''}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(event) => setImageDialog({ ...imageDialog, file: event.target.files[0] ?? null, error: '' })}
              />
              {imageDialog.file ? (
                <div className="dropzone__preview">
                  <img src={URL.createObjectURL(imageDialog.file)} alt="Preview" />
                  <span className="text-sm text-muted">{imageDialog.file.name} · click to change</span>
                </div>
              ) : (
                <>
                  <span className="dropzone__icon"><Icon name="upload" size={26} /></span>
                  <strong>Choose an image</strong>
                  <span className="text-sm text-muted">PNG, JPG or WebP up to 1.5 MB</span>
                </>
              )}
            </label>
            <TextInput label="…or image URL" value={imageDialog.url} onChange={(e) => setImageDialog({ ...imageDialog, url: e.target.value, file: null })} placeholder="https://…" />
            <div className="form-grid">
              <TextInput label="Alt text" value={imageDialog.alt} onChange={(e) => setImageDialog({ ...imageDialog, alt: e.target.value })} placeholder="Describe the image" />
              <SelectInput
                label="Layout"
                value={imageDialog.layout}
                onChange={(e) => setImageDialog({ ...imageDialog, layout: e.target.value })}
                options={IMAGE_LAYOUTS.map((layout) => ({ value: layout, label: LAYOUT_LABELS[layout] }))}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(videoDialog)}
        onClose={() => setVideoDialog(null)}
        title="Embed video"
        description="Paste a YouTube or Vimeo link. It plays inline for students."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVideoDialog(null)}>Cancel</Button>
            <Button icon="video" onClick={applyVideo}>Embed</Button>
          </>
        }
      >
        {videoDialog && (
          <div className="stack">
            {videoDialog.error && <div className="form-error"><Icon name="alert" size={16} /> {videoDialog.error}</div>}
            <TextInput label="Video URL" value={videoDialog.url} onChange={(e) => setVideoDialog({ ...videoDialog, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" autoFocus />
          </div>
        )}
      </Modal>

      <InsertDialogs editor={editor} kind={insertDialog} onClose={() => setInsertDialog(null)} mediaImages={mediaImages} />
    </div>
  );
}
