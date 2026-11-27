import { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';

/**
 * Paints one of the app's own SVG illustrations (leaf, weed, pest) onto a
 * texture for the 3D scenes. Using the very same drawing as the 2D games
 * keeps every symptom spot and drop target exactly where the mission data
 * puts it (in percent of the drawing).
 *
 * @param {React.ReactElement} element  the illustration, e.g. <LeafSpecimen … />
 * @param {[number, number]} size  pixel size of the texture (keep the drawing's aspect ratio)
 * @param {string} key  changes when the drawing should be redrawn
 */
export function useSvgTexture(element, [width, height], key) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let made = null;
    let markup = renderToStaticMarkup(element);
    if (!markup.includes('xmlns=')) markup = markup.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    markup = markup.replace('<svg', `<svg width="${width}" height="${height}"`);
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      made = new THREE.CanvasTexture(canvas);
      made.colorSpace = THREE.SRGBColorSpace;
      made.anisotropy = 4;
      setTexture(made);
      URL.revokeObjectURL(url);
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
    return () => {
      cancelled = true;
      made?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height]);

  return texture;
}
