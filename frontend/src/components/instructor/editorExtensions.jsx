/**
 * AgriCore's Tiptap extensions.
 *
 * All of these render attribute-based markup (data-align, data-color,
 * data-layout, data-video, data-callout) rather than inline styles or iframes,
 * so the saved HTML passes our sanitiser's allow-list untouched.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Callout from '../common/Callout.jsx';
import VideoEmbed from '../common/VideoEmbed.jsx';
import { ALIGNMENTS, CALLOUT_VARIANTS, HIGHLIGHT_COLORS, IMAGE_LAYOUTS, isValidVideoId } from '../../utils/richText.js';

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

/** Highlight as data-color="green" (a fixed palette, no free-form colours). */
export const AgriHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-color');
          return HIGHLIGHT_COLORS.includes(value) ? value : null;
        },
        renderHTML: (attributes) =>
          attributes.color && HIGHLIGHT_COLORS.includes(attributes.color) ? { 'data-color': attributes.color } : {},
      },
    };
  },
}).configure({ multicolor: true });

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
