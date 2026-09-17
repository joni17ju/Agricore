import { VIDEO_PROVIDERS, isValidVideoId, videoPlayerUrl } from '../../utils/richText.js';
import Icon from './Icon.jsx';

const PROVIDER_LABELS = {
  [VIDEO_PROVIDERS.YOUTUBE]: 'YouTube',
  [VIDEO_PROVIDERS.VIMEO]: 'Vimeo',
};

/**
 * Plays an embedded lesson video.
 *
 * The player URL is built from a validated provider + id, never from stored
 * markup, and the frame is sandboxed. Lesson content only ever stores
 * <div data-video="…" data-id="…">; this component is what turns it into a
 * real player with the provider's own play/pause controls.
 */
export default function VideoEmbed({ provider, videoId, title = 'Lesson video' }) {
  const source = videoPlayerUrl(provider, videoId);

  if (!source || !isValidVideoId(provider, videoId)) {
    return (
      <div className="video-embed video-embed--invalid" role="note">
        <Icon name="alert" size={18} />
        <span>This video link could not be read.</span>
      </div>
    );
  }

  return (
    <figure className="video-embed">
      <div className="video-embed__frame">
        <iframe
          src={source}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
      <figcaption className="video-embed__caption">
        <Icon name="play" size={13} /> {PROVIDER_LABELS[provider] ?? 'Video'}
      </figcaption>
    </figure>
  );
}
