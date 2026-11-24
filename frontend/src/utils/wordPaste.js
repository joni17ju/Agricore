/**
 * Clean HTML pasted from Microsoft Word before the editor reads it.
 *
 * Word's clipboard HTML carries its own classes, inline styles, conditional
 * comments, <o:p> tags and fonts, and writes lists as paragraphs with a typed
 * bullet ("·", "1.") instead of <ul>/<ol>. Left alone, the editor would keep
 * the bullets as text and turn Word's colours into lesson colours.
 *
 * Kept: headings (Word Heading 1–3 → lesson sections, subsections and minor
 * headings), paragraphs, bulleted and numbered lists (nesting included), bold,
 * italic, underline, links, and images whose source the browser can load.
 * Stripped: everything else. Word refers to pictures by a path on the
 * author's computer (file:///…), which a browser cannot read; those are
 * counted so the editor can say so.
 */

export function isWordHtml(html) {
  return /urn:schemas-microsoft-com:office|class="?Mso|mso-list|<o:p>/i.test(html ?? '');
}

const KEEP = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'A', 'IMG', 'BR']);
const HEADING_MAP = { H1: 'H2', H2: 'H3', H3: 'H4', H4: 'H4', H5: 'H4', H6: 'H4' };
const ORDERED_MARKER = /^\(?([0-9]+|[a-z]|[ivxlc]+)[.)]$/i;

const isListParagraph = (node) =>
  node.nodeType === Node.ELEMENT_NODE &&
  node.tagName === 'P' &&
  (/MsoListParagraph/i.test(node.getAttribute('class') ?? '') || /mso-list:\s*l\d/i.test(node.getAttribute('style') ?? ''));

/** Nesting level from Word's "mso-list:l0 level2 lfo1" style (1-based). */
const listLevel = (node) => Number((node.getAttribute('style') ?? '').match(/level(\d+)/i)?.[1] ?? 1);

/** The typed bullet or number Word puts before a list item, and whether it reads as a number. */
function takeMarker(paragraph) {
  const ignored = [...paragraph.querySelectorAll('span')].find((span) => /mso-list:\s*Ignore/i.test(span.getAttribute('style') ?? ''));
  let marker = '';
  if (ignored) {
    marker = ignored.textContent.replace(/ /g, ' ').trim();
    ignored.remove();
  } else {
    const first = paragraph.firstChild;
    const match = first?.nodeType === Node.TEXT_NODE ? first.nodeValue.match(/^\s*([·•o§▪\-–]|\(?[0-9a-z]+[.)])\s+/i) : null;
    if (match) {
      marker = match[1];
      first.nodeValue = first.nodeValue.slice(match[0].length);
    }
  }
  return ORDERED_MARKER.test(marker);
}

/** Word list paragraphs → nested <ul>/<ol>. */
function rebuildLists(doc) {
  const paragraphs = [...doc.body.querySelectorAll('p')].filter(isListParagraph);
  const visited = new Set();
  for (const start of paragraphs) {
    if (visited.has(start)) continue;
    // A run of consecutive list paragraphs (whitespace between them is ignored).
    const run = [];
    let node = start;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim()) {
        node = node.nextSibling;
        continue;
      }
      if (!isListParagraph(node)) break;
      run.push(node);
      visited.add(node);
      node = node.nextSibling;
    }

    const anchor = doc.createComment('list');
    start.before(anchor);
    const stack = []; // [{ level, list, ordered, id }]
    for (const paragraph of run) {
      const level = listLevel(paragraph);
      const ordered = takeMarker(paragraph);
      // Word numbers each separate list (mso-list:l0, l1, …); a new one starts a new list.
      const id = (paragraph.getAttribute('style') ?? '').match(/mso-list:\s*(l\d+)/i)?.[1] ?? null;
      while (stack.length && stack.at(-1).level > level) stack.pop();
      const top = stack.at(-1);
      if (top && top.level === level && (top.ordered !== ordered || (level === 1 && top.id !== id))) stack.pop();
      if (!stack.length || stack.at(-1).level < level) {
        const list = doc.createElement(ordered ? 'ol' : 'ul');
        const parentItem = stack.length ? stack.at(-1).list.lastElementChild : null;
        if (parentItem) parentItem.append(list);
        else anchor.before(list);
        stack.push({ level, list, ordered, id });
      }
      const item = doc.createElement('li');
      item.append(...paragraph.childNodes);
      stack.at(-1).list.append(item);
      paragraph.remove();
    }
    anchor.remove();
  }
}

/** Keep the allowed elements with only the attributes that matter; unwrap the rest. */
function strip(node, counts) {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    let element = child;
    const tag = element.tagName.toUpperCase();

    if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'META' || tag === 'LINK' || tag === 'XML' || tag.includes(':')) {
      // <o:p>, <v:imagedata> and friends carry nothing a lesson can use.
      if (tag === 'V:IMAGEDATA' || tag === 'V:SHAPE') counts.images += tag === 'V:IMAGEDATA' ? 1 : 0;
      element.remove();
      continue;
    }
    if (HEADING_MAP[tag]) {
      const heading = node.ownerDocument.createElement(HEADING_MAP[tag]);
      heading.append(...element.childNodes);
      element.replaceWith(heading);
      element = heading;
    }
    const finalTag = element.tagName.toUpperCase();
    if (finalTag === 'IMG') {
      const src = element.getAttribute('src') ?? '';
      if (!/^(https?:|data:image\/)/i.test(src)) {
        counts.images += 1;
        element.remove();
        continue;
      }
    }

    strip(element, counts);

    if (!KEEP.has(finalTag)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    for (const attribute of [...element.attributes]) {
      const keep = (finalTag === 'A' && attribute.name === 'href') || (finalTag === 'IMG' && (attribute.name === 'src' || attribute.name === 'alt'));
      if (!keep) element.removeAttribute(attribute.name);
    }
    // Word wraps blank lines in empty paragraphs; drop them.
    if (finalTag === 'P' && !element.textContent.replace(/ /g, ' ').trim() && !element.querySelector('img')) element.remove();
  }
}

/**
 * @returns {{ html: string, droppedImages: number }}
 */
export function cleanWordHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  rebuildLists(doc);
  const counts = { images: 0 };
  strip(doc.body, counts);
  return { html: doc.body.innerHTML, droppedImages: counts.images };
}
