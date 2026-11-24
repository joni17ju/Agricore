/**
 * AgriCore's Tiptap extensions.
 *
 * All of these render attribute-based markup (data-align, data-layout,
 * data-video, data-callout) rather than inline styles or iframes, so the saved
 * HTML passes our sanitiser's allow-list untouched. The one exception is
 * colour — text colour and highlight — which is a single inline declaration
 * in a fixed shape the sanitiser validates strictly (see utils/cssColor.js).
 */
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ReactNodeViewRenderer, NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Callout from '../common/Callout.jsx';
import VideoEmbed from '../common/VideoEmbed.jsx';
import { LEGACY_HIGHLIGHTS, normalizeCssColor } from '../../utils/cssColor.js';
import { ALIGNMENTS, CALLOUT_VARIANTS, IMAGE_LAYOUTS, LESSON_LIST_STYLES, isValidVideoId } from '../../utils/richText.js';

/**
 * Insert a block node (video, image) at the caret.
 *
 * A callout only holds paragraphs and a list item only holds list content, so
 * inserting there would silently do nothing. When the caret is nested inside
 * such a block, the media is placed just after that whole block instead.
 */
function insertBlock(node) {
  return ({ commands, state }) => {
    const { $from } = state.selection;
    return $from.depth > 1
      ? commands.insertContentAt($from.after(1), node)
      : commands.insertContent(node);
  };
}

/** Alignment as data-align="center" instead of style="text-align:center". */
export const AgriTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute('data-align') ?? element.style.textAlign;
              return ALIGNMENTS.includes(value) ? value : null;
            },
            renderHTML: (attributes) =>
              attributes.textAlign && ALIGNMENTS.includes(attributes.textAlign)
                ? { 'data-align': attributes.textAlign }
                : {},
          },
        },
      },
    ];
  },
}).configure({ types: ['heading', 'paragraph'], alignments: ALIGNMENTS });

/**
 * Any CSS colour the browser understands, as canonical #rrggbb, or null.
 *
 * Used only when reading HTML into the editor — typically a paste from Word or
 * a web page, which may say "red" or "rgb(...)" — so a colour the strict
 * stored-form rules would reject is converted on the way in instead of being
 * silently lost on save. A canvas does the conversion, so whatever colour
 * syntax the browser accepts is covered. Stored content never goes through
 * this; it goes through the strict normalizeCssColor.
 */
let colorCanvas = null;
function cssColorToHex(value) {
  const raw = String(value ?? '').replace(/['"]+/g, '').trim();
  if (!raw) return null;
  const strict = normalizeCssColor(raw);
  if (strict) return strict;
  if (typeof document === 'undefined') return null;
  colorCanvas ??= document.createElement('canvas').getContext('2d');
  // A sentinel first: an unparseable value leaves fillStyle unchanged.
  colorCanvas.fillStyle = '#010203';
  colorCanvas.fillStyle = raw;
  const parsed = colorCanvas.fillStyle;
  if (parsed === '#010203' && raw.toLowerCase() !== '#010203') return null;
  // Fully transparent ("transparent", alpha 0) is no colour at all.
  if (/^rgba\(.*,\s*0\)$/.test(parsed)) return null;
  return normalizeCssColor(parsed);
}

/**
 * Highlight with any colour, stored as one strictly-shaped inline style:
 * <mark style="background-color: #rrggbb">.
 *
 * Highlights saved before free colour existed carry data-color="green" and
 * friends. They read in as the exact hex their CSS rule paints, so the editor
 * shows them unchanged — and untouched lessons keep their data-color markup
 * and the CSS that styles it, so they render byte-for-byte as before.
 */
export const AgriHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => {
          const legacy = element.getAttribute('data-color');
          if (LEGACY_HIGHLIGHTS[legacy]) return LEGACY_HIGHLIGHTS[legacy];
          return cssColorToHex(element.style.backgroundColor);
        },
        renderHTML: (attributes) => {
          // Built from the normalised value only, in the exact form the
          // sanitiser accepts, so a save round-trips unchanged.
          const color = normalizeCssColor(attributes.color);
          return color ? { style: `background-color: ${color}` } : {};
        },
      },
    };
  },
}).configure({ multicolor: true });

/**
 * The span that carries text colour, ranked below every formatting mark.
 *
 * Marks with a higher priority wrap further out. TextStyle ships at 101 and
 * bold, italic, strike and highlight at the default 100, so the colour span
 * used to wrap them — <span style="color"><strong>…</strong></span> — and the
 * stylesheet's own colours for strong and s won over the colour the author
 * picked. At 90 the span is always innermost, directly around the text. Links
 * (1000) still wrap outside it, so a coloured link keeps its colour too.
 */
export const AgriTextStyle = TextStyle.extend({ priority: 90 });

/**
 * Text colour as <span style="color: #rrggbb">, normalised the same way as the
 * highlight. Pasted colours in any CSS syntax are converted on the way in.
 */
export const AgriTextColor = Color.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element) => cssColorToHex(element.style.color),
            renderHTML: (attributes) => {
              const color = normalizeCssColor(attributes.color);
              return color ? { style: `color: ${color}` } : {};
            },
          },
        },
      },
    ];
  },
});

/** Images carry a layout: inline, centered block, or full width. */
export const AgriImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layout: {
        default: 'center',
        parseHTML: (element) => {
          const value = element.getAttribute('data-layout');
          return IMAGE_LAYOUTS.includes(value) ? value : 'center';
        },
        renderHTML: (attributes) => ({ 'data-layout': attributes.layout ?? 'center' }),
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImage: (attrs) => insertBlock({ type: this.name, attrs }),
    };
  },
}).configure({ inline: false, allowBase64: true });

/**
 * Video placeholder node.
 * Stored as <div data-video="youtube" data-id="…"> and rendered in the editor
 * with the same <VideoEmbed> the student viewer uses.
 */
export const VideoEmbedNode = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      provider: { default: null, parseHTML: (element) => element.getAttribute('data-video') },
      videoId: { default: null, parseHTML: (element) => element.getAttribute('data-id') },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-video]',
        getAttrs: (element) =>
          isValidVideoId(element.getAttribute('data-video'), element.getAttribute('data-id')) && null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-video': HTMLAttributes.provider, 'data-id': HTMLAttributes.videoId })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },

  addCommands() {
    return {
      // Takes parseVideoUrl() output directly: { provider, id }.
      insertVideoEmbed: ({ provider, id }) => insertBlock({ type: this.name, attrs: { provider, videoId: id } }),
    };
  },
});

function VideoNodeView({ node, selected }) {
  return (
    <NodeViewWrapper className={`rte-node ${selected ? 'is-selected' : ''}`} data-drag-handle>
      <VideoEmbed provider={node.attrs.provider} videoId={node.attrs.videoId} />
    </NodeViewWrapper>
  );
}

/** Callout box node: info / warning / tip, with editable paragraphs inside. */
export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (element) => {
          const value = element.getAttribute('data-callout');
          return CALLOUT_VARIANTS.includes(value) ? value : 'info';
        },
        renderHTML: (attributes) => ({ 'data-callout': attributes.variant ?? 'info' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      setCallout:
        (variant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      toggleCallout:
        (variant) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { variant }),
    };
  },
});

function CalloutNodeView({ node, selected }) {
  return (
    <NodeViewWrapper className={`rte-node ${selected ? 'is-selected' : ''}`}>
      <Callout variant={node.attrs.variant}>
        <NodeViewContent />
      </Callout>
    </NodeViewWrapper>
  );
}

const LIST_STYLE_VALUES = Object.values(LESSON_LIST_STYLES);

/**
 * A bullet list can be marked as the lesson's learning objectives or its key
 * terms. The mark is a class on the <ul> (the one class lesson content may
 * carry), so the reader shows the right box and the role survives saving,
 * reopening and editing. Unmarked lists stay plain bullet lists.
 */
export const LessonListStyle = Extension.create({
  name: 'lessonListStyle',
  addGlobalAttributes() {
    return [
      {
        types: ['bulletList'],
        attributes: {
          listStyle: {
            default: null,
            parseHTML: (element) => LIST_STYLE_VALUES.find((value) => element.classList.contains(value)) ?? null,
            renderHTML: (attributes) => (LIST_STYLE_VALUES.includes(attributes.listStyle) ? { class: attributes.listStyle } : {}),
          },
        },
      },
    ];
  },
});

/**
 * A figure: an image with a caption the author types under it. Stored as
 * <figure data-layout><img src alt><figcaption>…</figcaption></figure>; the
 * "Figure N." number is never stored — the editor and the reader both count
 * captioned figures, so numbers stay right when figures move.
 */
export const FigureNode = Node.create({
  name: 'figure',
  group: 'block',
  content: 'inline*',
  marks: 'bold italic link',
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      layout: { default: 'center' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
        getAttrs: (element) => {
          const img = element.querySelector('img');
          if (!img?.getAttribute('src')) return false;
          const layout = element.getAttribute('data-layout') ?? img.getAttribute('data-layout');
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') ?? '',
            layout: IMAGE_LAYOUTS.includes(layout) ? layout : 'center',
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    return [
      'figure',
      { 'data-layout': IMAGE_LAYOUTS.includes(node.attrs.layout) ? node.attrs.layout : 'center' },
      ['img', { src: node.attrs.src, alt: node.attrs.alt ?? '' }],
      ['figcaption', 0],
    ];
  },

  addCommands() {
    return {
      insertFigure:
        ({ src, alt = '', layout = 'center', caption = '' }) =>
        (props) =>
          insertBlock({
            type: this.name,
            attrs: { src, alt, layout },
            content: caption ? [{ type: 'text', text: caption }] : [],
          })(props),
    };
  },
});

/** Bullet-list JSON for the objectives and key-terms inserts. */
export function lessonListContent(listStyle, items) {
  return {
    type: 'bulletList',
    attrs: { listStyle },
    content: items.map((item) => ({ type: 'listItem', content: [{ type: 'paragraph', content: item }] })),
  };
}

/** Insert a lesson list (objectives or key terms) as its own block. */
export const insertLessonList = (editor, listStyle, items) =>
  editor.chain().focus().command(insertBlock(lessonListContent(listStyle, items))).run();

/*
 * Lessons imported before the Insert buttons existed mark their objectives,
 * key terms and references with plain headings. The reader turns those into
 * boxes or back matter (see components/common/lesson/lessonContent.jsx); here
 * they are left unnumbered and labelled, so the editor's section numbers match
 * what students see. Display only — the stored content is untouched.
 */
const LEGACY_SECTION_HINTS = [
  [/^learning (outcomes|objectives)$/i, 'Students see this section as the Learning objectives box'],
  [/^key terms$/i, 'Students see this section as the Key terms list'],
  [/^(references|references and reading list|sources|reading list)$/i, 'Back matter: not numbered'],
];

export const LegacySectionHints = Extension.create({
  name: 'legacySectionHints',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('legacySectionHints'),
        props: {
          decorations(state) {
            const decorations = [];
            state.doc.forEach((node, offset) => {
              if (node.type.name !== 'heading' || node.attrs.level !== 2) return;
              const match = LEGACY_SECTION_HINTS.find(([pattern]) => pattern.test(node.textContent.trim()));
              if (match) decorations.push(Decoration.node(offset, offset + node.nodeSize, { class: 'is-unnumbered', 'data-hint': match[1] }));
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
