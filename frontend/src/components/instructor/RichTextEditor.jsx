import { useEffect, useRef } from 'react';
import Icon from '../common/Icon.jsx';

const TOOLS = [
  { icon: 'bold', label: 'Bold', command: 'bold' },
  { icon: 'italic', label: 'Italic', command: 'italic' },
  { icon: 'underline', label: 'Underline', command: 'underline' },
  { divider: true },
  { icon: 'heading', label: 'Heading', command: 'formatBlock', value: 'H2' },
  { icon: 'file', label: 'Paragraph', command: 'formatBlock', value: 'P' },
  { icon: 'quote', label: 'Quote', command: 'formatBlock', value: 'BLOCKQUOTE' },
  { divider: true },
  { icon: 'list', label: 'Bulleted list', command: 'insertUnorderedList' },
  { icon: 'list-ordered', label: 'Numbered list', command: 'insertOrderedList' },
  { divider: true },
  { icon: 'undo', label: 'Undo', command: 'undo' },
  { icon: 'redo', label: 'Redo', command: 'redo' },
];

/**
 * Lesson Content Editor (Proposal Fig 25). Uncontrolled contentEditable:
 * the initial HTML is loaded when `documentKey` changes; edits are reported
 * through `onChange`. Output is sanitized on save by the page.
 */
export default function RichTextEditor({ documentKey, initialHtml, onChange, onInsertMedia }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialHtml ?? '';
    // Only reload content when switching to another document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKey]);

  const run = (tool) => {
    editorRef.current?.focus();
    document.execCommand(tool.command, false, tool.value);
    onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="rte">
      <div className="rte__toolbar" role="toolbar" aria-label="Formatting">
        {TOOLS.map((tool, index) =>
          tool.divider ? (
            <span key={index} className="rte__divider" />
          ) : (
            <button
              key={tool.label}
              type="button"
              className="rte__tool"
              title={tool.label}
              aria-label={tool.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => run(tool)}
            >
              <Icon name={tool.icon} size={16} />
            </button>
          ),
        )}
        {onInsertMedia && (
          <>
            <span className="rte__divider" />
            <button type="button" className="rte__tool rte__tool--wide" onClick={onInsertMedia} title="Add media">
              <Icon name="image" size={16} /> Media
            </button>
          </>
        )}
      </div>
      <div
        ref={editorRef}
        className="rte__content rich-text"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Lesson content"
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}
