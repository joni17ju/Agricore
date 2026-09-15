import Icon from '../common/Icon.jsx';

const TYPE_META = {
  image: { icon: 'image', label: 'Photo' },
  video: { icon: 'video', label: 'Instructional video' },
  animation: { icon: 'film', label: '2D animation' },
};

/**
 * Lesson media (Proposal Scope 4: photographs, short videos, 2D animations).
 * Uploaded files render for real; built-in placeholders show a labeled frame.
 */
export default function MediaAsset({ asset, compact = false }) {
  const meta = TYPE_META[asset.type] ?? TYPE_META.image;

  let content;
  const isVideoFile = asset.url?.startsWith('data:video') || /\.(mp4|webm|ogg)$/i.test(asset.url ?? '');
  if (asset.url && !isVideoFile) {
    content = <img src={asset.url} alt={asset.title} loading="lazy" />;
  } else if (asset.url) {
    content = <video src={asset.url} controls preload="metadata" />;
  } else {
    content = (
      <div className={`media-placeholder media-placeholder--${asset.type}`}>
        <span className="media-placeholder__icon">
          <Icon name={asset.type === 'image' ? 'image' : 'play'} size={compact ? 22 : 30} />
        </span>
        {!compact && <span className="media-placeholder__label">{meta.label} placeholder</span>}
      </div>
    );
  }

  return (
    <figure className={`media-asset ${compact ? 'media-asset--compact' : ''}`}>
      <div className="media-asset__frame">{content}</div>
      {!compact && (
        <figcaption>
          <strong>
            <Icon name={meta.icon} size={14} /> {asset.title}
          </strong>
          {asset.caption && <span>{asset.caption}</span>}
        </figcaption>
      )}
    </figure>
  );
}
