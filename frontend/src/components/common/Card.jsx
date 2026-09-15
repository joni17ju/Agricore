import Icon from './Icon.jsx';

export default function Card({ title, icon, actions, children, className = '', padded = true, style, as: Tag = 'section', ...props }) {
  return (
    <Tag className={`card ${padded ? 'card--padded' : ''} ${className}`} style={style} {...props}>
      {(title || actions) && (
        <header className="card__header">
          {title && (
            <h2 className="card__title">
              {icon && <Icon name={icon} size={18} />}
              {title}
            </h2>
          )}
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}
