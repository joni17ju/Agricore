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
import { HIGHLIGHT_COLORS, IMAGE_LAYOUTS, isSafeLinkUrl, parseVideoUrl } from '../../utils/richText.js';
import { AgriHighlight, AgriImage, AgriTextAlign, CalloutNode, VideoEmbedNode } from './editorExtensions.jsx';

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const HIGHLIGHT_LABELS = { green: 'Green', amber: 'Amber', blue: 'Blue', pink: 'Pink' };
const LAYOUT_LABELS = { inline: 'Inline (text wraps)', center: 'Centered block', full: 'Full width' };

function ToolButton({ icon, label, onClick, isActive = false, disabled = false, wide = false, children }) {
  return (
    <button
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

export default function RichTextEditor({ documentKey, initialHtml, onChange, onInsertMedia }) {
  const [linkDialog, setLinkDialog] = useState(null); // { url, text }
  const [imageDialog, setImageDialog] = useState(null); // { url, alt, layout, file }
  const [videoDialog, setVideoDialog] = useState(null); // { url, error }
  const [contextMenu, setContextMenu] = useState(null); // { x, y }
  const fileInputRef = useRef(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3, 4] },
          link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
        }),
        AgriTextAlign,
        AgriHighlight,
        AgriImage,
        VideoEmbedNode,
        CalloutNode,
      ],
      content: initialHtml || '<p></p>',
      editorProps: {
        attributes: { class: 'rte__content rich-text', 'aria-label': 'Lesson content' },
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

  return (
    <div className="rte">
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

          <ToolButton icon="heading" label="Heading" isActive={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <ToolButton icon="heading" label="Subheading" isActive={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <small>3</small>
          </ToolButton>
          <ToolButton icon="file" label="Paragraph" isActive={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} />
          <ToolButton icon="quote" label="Quote" isActive={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <span className="rte__divider" />

          <ToolButton icon="list" label="Bulleted list" isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <ToolButton icon="list-ordered" label="Numbered list" isActive={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <span className="rte__divider" />

          <ToolButton icon="align-left" label="Align left" isActive={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} />
          <ToolButton icon="align-center" label="Align center" isActive={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} />
          <ToolButton icon="align-right" label="Align right" isActive={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} />
          <span className="rte__divider" />

          <span className="rte__swatches" role="group" aria-label="Highlight">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`rte__swatch rte__swatch--${color} ${editor.isActive('highlight', { color }) ? 'is-active' : ''}`}
                title={`Highlight ${HIGHLIGHT_LABELS[color]}`}
                aria-label={`Highlight ${HIGHLIGHT_LABELS[color]}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
              />
            ))}
            <ToolButton icon="x" label="Remove highlight" onClick={() => editor.chain().focus().unsetHighlight().run()} />
          </span>
          <span className="rte__divider" />

          <ToolButton icon="link" label="Insert link" isActive={editor.isActive('link')} onClick={openLinkDialog} />
          <ToolButton icon="image" label="Insert image" onClick={() => setImageDialog({ url: '', alt: '', layout: 'center', file: null })} />
          <ToolButton icon="video" label="Embed video" onClick={() => setVideoDialog({ url: '' })} />
          <span className="rte__divider" />

          <ToolButton icon="info" label="Note callout" isActive={editor.isActive('callout', { variant: 'info' })} onClick={() => editor.chain().focus().toggleCallout('info').run()} />
          <ToolButton icon="alert" label="Warning callout" isActive={editor.isActive('callout', { variant: 'warning' })} onClick={() => editor.chain().focus().toggleCallout('warning').run()} />
          <ToolButton icon="sprout" label="Tip callout" isActive={editor.isActive('callout', { variant: 'tip' })} onClick={() => editor.chain().focus().toggleCallout('tip').run()} />
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
          <ToolButton icon="highlight" label="Highlight" isActive={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: 'green' }).run()} />
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
            <Icon name="info" size={15} /> Note callout
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
    </div>
  );
}
